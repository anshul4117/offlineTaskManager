import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/index.js';
import { createRecord, updateRecord, resolveConflict } from '../services/localDb.js';
import { syncEngine } from '../services/syncEngine.js';

describe('Conflict Detection and User-Controlled Resolution', () => {
  beforeEach(async () => {
    await db.records.clear();
    await db.outbox.clear();
    await db.meta.clear();
    vi.restoreAllMocks();

    // Mock syncEngine triggerSync so it doesn't try actual network calls during DB state tests
    vi.spyOn(syncEngine, 'triggerSync').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Keep Mine (keep_local) updates baseVersion to serverRecord.version and enqueues new outbox operation', async () => {
    const record = await createRecord('Local Title', 'Local Body', 'note');

    const serverSnap = {
      id: record.id,
      title: 'Server Title',
      content: 'Server Body',
      type: 'note' as const,
      version: 3,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    // Simulate 409 conflict state in IndexedDB
    await db.records.update(record.id, {
      conflict: true,
      serverRecord: serverSnap
    });

    await resolveConflict(record.id, 'keep_local');

    // Verify record state in Dexie
    const resolvedRecord = await db.records.get(record.id);
    expect(resolvedRecord).toBeDefined();
    expect(resolvedRecord?.conflict).toBe(false);
    expect(resolvedRecord?.serverRecord).toBeUndefined();
    expect(resolvedRecord?.pending).toBe(true);
    expect(resolvedRecord?.version).toBe(3); // Updated to match server baseVersion
    expect(resolvedRecord?.title).toBe('Local Title');

    // Verify new outbox operation created with baseVersion = 3
    const outboxOps = await db.outbox.where('recordId').equals(record.id).toArray();
    expect(outboxOps).toHaveLength(1);
    expect(outboxOps[0].baseVersion).toBe(3);
    expect(outboxOps[0].status).toBe('pending');

    // Verify triggerSync auto-call
    expect(syncEngine.triggerSync).toHaveBeenCalledTimes(1);
  });

  it('Keep Theirs (keep_server) overwrites local record with server snapshot and removes outbox operation', async () => {
    const record = await createRecord('Local Stale Title', 'Local Stale Body', 'note');

    const serverSnap = {
      id: record.id,
      title: 'Server Authoritative Title',
      content: 'Server Authoritative Body',
      type: 'task' as const,
      version: 5,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    await db.records.update(record.id, {
      conflict: true,
      serverRecord: serverSnap
    });

    await resolveConflict(record.id, 'keep_server');

    const resolvedRecord = await db.records.get(record.id);
    expect(resolvedRecord).toBeDefined();
    expect(resolvedRecord?.title).toBe('Server Authoritative Title');
    expect(resolvedRecord?.content).toBe('Server Authoritative Body');
    expect(resolvedRecord?.type).toBe('task');
    expect(resolvedRecord?.version).toBe(5);
    expect(resolvedRecord?.pending).toBe(false);
    expect(resolvedRecord?.conflict).toBe(false);

    // Outbox should have no pending operations for this record
    const outboxOps = await db.outbox.where('recordId').equals(record.id).toArray();
    expect(outboxOps).toHaveLength(0);
  });

  it('Merge Manually (merge) writes merged content and enqueues update with server baseVersion', async () => {
    const record = await createRecord('My Draft Title', 'My Draft Body', 'note');

    const serverSnap = {
      id: record.id,
      title: 'Cloud Title',
      content: 'Cloud Body',
      type: 'note' as const,
      version: 2,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    await db.records.update(record.id, {
      conflict: true,
      serverRecord: serverSnap
    });

    const mergedTitle = 'Merged Unified Title';
    const mergedContent = 'Merged Body Content Details';

    await resolveConflict(record.id, 'merge', { title: mergedTitle, content: mergedContent });

    const resolvedRecord = await db.records.get(record.id);
    expect(resolvedRecord?.title).toBe('Merged Unified Title');
    expect(resolvedRecord?.content).toBe('Merged Body Content Details');
    expect(resolvedRecord?.version).toBe(2);
    expect(resolvedRecord?.pending).toBe(true);
    expect(resolvedRecord?.conflict).toBe(false);

    const outboxOps = await db.outbox.where('recordId').equals(record.id).toArray();
    expect(outboxOps).toHaveLength(1);
    expect(outboxOps[0].baseVersion).toBe(2);
    expect(outboxOps[0].payload.title).toBe('Merged Unified Title');
  });

  it('handles remote-delete conflict resolution with Keep Theirs', async () => {
    const record = await createRecord('Edited Locally', 'Content', 'note');

    const serverSnap = {
      id: record.id,
      title: 'Remote Title',
      content: 'Remote Body',
      type: 'note' as const,
      version: 4,
      updatedAt: new Date().toISOString(),
      deleted: true // Server deleted record!
    };

    await db.records.update(record.id, {
      conflict: true,
      serverRecord: serverSnap
    });

    // Resolving with Keep Theirs applies the remote deletion locally
    await resolveConflict(record.id, 'keep_server');

    const resolvedRecord = await db.records.get(record.id);
    expect(resolvedRecord?.deleted).toBe(true);
    expect(resolvedRecord?.conflict).toBe(false);
    expect(resolvedRecord?.pending).toBe(false);
  });

  it('persists conflict state across re-queries simulating page reloads', async () => {
    const record = await createRecord('Persisted Note', 'Body', 'note');
    const serverSnap = {
      id: record.id,
      title: 'Persisted Server',
      content: 'Persisted Server Body',
      type: 'note' as const,
      version: 2,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    await db.records.update(record.id, {
      conflict: true,
      serverRecord: serverSnap
    });

    // Re-query database to simulate reload
    const reloadedRecord = await db.records.get(record.id);
    expect(reloadedRecord?.conflict).toBe(true);
    expect(reloadedRecord?.serverRecord).toBeDefined();
    expect(reloadedRecord?.serverRecord?.title).toBe('Persisted Server');
  });
});
