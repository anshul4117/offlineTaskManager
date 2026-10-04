import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/index.js';
import { syncEngine } from '../services/syncEngine.js';
import { createRecord } from '../services/localDb.js';
import { connectivityMonitor } from '../services/connectivity.js';

describe('Client Synchronization Engine (syncEngine)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    await db.records.clear();
    await db.outbox.clear();
    await db.meta.clear();
    vi.restoreAllMocks();

    // Ensure connectivity state is fully connected for sync triggers
    vi.spyOn(connectivityMonitor, 'getState').mockReturnValue({
      isBrowserOnline: true,
      isServerReachable: true,
      isFullyConnected: true,
      statusText: 'Online',
      lastCheckedAt: new Date().toISOString()
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('pushes pending outbox operations and updates local record status on success', async () => {
    const record = await createRecord('Test Push Note', 'Content', 'note');

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/sync/push')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                opId: (await db.outbox.toArray())[0]?.opId,
                recordId: record.id,
                status: 'applied',
                newVersion: 1
              }
            ],
            processedAt: new Date().toISOString()
          })
        };
      }
      if (url.includes('/api/sync/pull')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            records: [],
            serverTime: new Date().toISOString()
          })
        };
      }
      return { ok: false, status: 404 };
    });

    await syncEngine.triggerSync();

    // Outbox should be cleared of applied operations
    const outboxOps = await db.outbox.toArray();
    expect(outboxOps).toHaveLength(0);

    // Record should be updated to version 1 with pending = false
    const updatedRecord = await db.records.get(record.id);
    expect(updatedRecord).toBeDefined();
    expect(updatedRecord?.version).toBe(1);
    expect(updatedRecord?.pending).toBe(false);
    expect(updatedRecord?.conflict).toBe(false);
  });

  it('handles 409 Conflict by marking local record conflict = true and setting serverRecord', async () => {
    const record = await createRecord('Conflict Note', 'Local Edit', 'note');

    const serverSnap = {
      id: record.id,
      title: 'Server Title',
      content: 'Server Body',
      type: 'note' as const,
      version: 2,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/sync/push')) {
        return {
          ok: false,
          status: 409,
          json: async () => ({
            results: [
              {
                opId: (await db.outbox.toArray())[0]?.opId,
                recordId: record.id,
                status: 'conflict',
                error: 'Stale base version',
                serverRecord: serverSnap
              }
            ],
            processedAt: new Date().toISOString()
          })
        };
      }
      if (url.includes('/api/sync/pull')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ records: [], serverTime: new Date().toISOString() })
        };
      }
      return { ok: false, status: 404 };
    });

    await syncEngine.triggerSync();

    const localRecord = await db.records.get(record.id);
    expect(localRecord?.conflict).toBe(true);
    expect(localRecord?.serverRecord).toBeDefined();
    expect(localRecord?.serverRecord?.title).toBe('Server Title');
  });

  it('pulls remote records into local IndexedDB and updates lastSyncedAt cursor', async () => {
    const remoteRecordId = crypto.randomUUID();
    const serverTime = new Date().toISOString();

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/sync/push')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [], processedAt: serverTime })
        };
      }
      if (url.includes('/api/sync/pull')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            records: [
              {
                id: remoteRecordId,
                title: 'Remote Note',
                content: 'Remote Body',
                type: 'note',
                version: 1,
                updatedAt: serverTime,
                deleted: false
              }
            ],
            serverTime
          })
        };
      }
      return { ok: false, status: 404 };
    });

    await syncEngine.triggerSync();

    const pulled = await db.records.get(remoteRecordId);
    expect(pulled).toBeDefined();
    expect(pulled?.title).toBe('Remote Note');
    expect(pulled?.version).toBe(1);

    const metaCursor = await db.meta.get('lastSyncedAt');
    expect(metaCursor?.value).toBe(serverTime);
  });

  it('protects local pending records from being overwritten by pull sync', async () => {
    // Create local unpushed record
    const record = await createRecord('My Unpushed Note', 'Local Body', 'note');

    const remoteRecord = {
      id: record.id,
      title: 'Overwrite Remote Title',
      content: 'Overwrite Remote Body',
      type: 'note' as const,
      version: 2,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/sync/push')) {
        // Push returns 409
        return {
          ok: false,
          status: 409,
          json: async () => ({
            results: [
              {
                opId: (await db.outbox.toArray())[0]?.opId,
                recordId: record.id,
                status: 'conflict',
                serverRecord: remoteRecord
              }
            ]
          })
        };
      }
      if (url.includes('/api/sync/pull')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ records: [remoteRecord], serverTime: new Date().toISOString() })
        };
      }
      return { ok: false, status: 404 };
    });

    await syncEngine.triggerSync();

    // Local title must NOT be silently overwritten
    const local = await db.records.get(record.id);
    expect(local?.title).toBe('My Unpushed Note');
    expect(local?.conflict).toBe(true);
  });
});
