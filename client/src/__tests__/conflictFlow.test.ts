import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/index.js';
import { createRecord, updateRecord, resolveConflict, getRecord } from '../services/localDb.js';
import { syncEngine } from '../services/syncEngine.js';

describe('Conflict Resolution Lifecycle Integration', () => {
  beforeEach(async () => {
    await db.records.clear();
    await db.outbox.clear();
    await db.meta.clear();
    vi.restoreAllMocks();
    vi.spyOn(syncEngine, 'triggerSync').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles missing serverRecord gracefully by fallback', async () => {
    const record = await createRecord('Local Note', 'Local Body', 'note');

    // Set conflict = true without serverRecord attached
    await db.records.update(record.id, { conflict: true, serverRecord: undefined });

    // Calling resolveConflict should not bail out, but resolve using fallback serverSnap
    await resolveConflict(record.id, 'keep_local');

    const resolved = await getRecord(record.id);
    expect(resolved?.conflict).toBe(false);
    expect(resolved?.pending).toBe(true);

    const outboxOps = await db.outbox.where('recordId').equals(record.id).toArray();
    expect(outboxOps.length).toBeGreaterThan(0);
  });

  it('completes Keep Mine flow: conflict -> pending -> synced simulation', async () => {
    const record = await createRecord('Device A Title', 'Device A Content', 'task');

    const serverSnap = {
      id: record.id,
      title: 'Server Diverged Title',
      content: 'Server Diverged Content',
      type: 'task' as const,
      version: 4,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    await db.records.update(record.id, { conflict: true, serverRecord: serverSnap });

    // Step 1: Keep Mine
    await resolveConflict(record.id, 'keep_local');

    let localState = await getRecord(record.id);
    expect(localState?.conflict).toBe(false);
    expect(localState?.pending).toBe(true);
    expect(localState?.version).toBe(4);
    expect(localState?.title).toBe('Device A Title');

    // Step 2: Simulate sync success (server acknowledges baseVersion 4 and returns version 5)
    await db.transaction('rw', [db.records, db.outbox], async () => {
      const ops = await db.outbox.where('recordId').equals(record.id).toArray();
      for (const op of ops) {
        await db.outbox.delete(op.opId);
      }
      await db.records.update(record.id, {
        version: 5,
        pending: false,
        conflict: false
      });
    });

    localState = await getRecord(record.id);
    expect(localState?.pending).toBe(false);
    expect(localState?.conflict).toBe(false);
    expect(localState?.version).toBe(5);
  });

  it('completes Keep Theirs flow: conflict -> synced', async () => {
    const record = await createRecord('Local Draft', 'Local Content', 'note');

    const serverSnap = {
      id: record.id,
      title: 'Server Master Title',
      content: 'Server Master Content',
      type: 'note' as const,
      version: 2,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    await db.records.update(record.id, { conflict: true, serverRecord: serverSnap });

    await resolveConflict(record.id, 'keep_server');

    const resolved = await getRecord(record.id);
    expect(resolved?.title).toBe('Server Master Title');
    expect(resolved?.content).toBe('Server Master Content');
    expect(resolved?.version).toBe(2);
    expect(resolved?.pending).toBe(false);
    expect(resolved?.conflict).toBe(false);

    const ops = await db.outbox.where('recordId').equals(record.id).toArray();
    expect(ops).toHaveLength(0);
  });

  it('completes Merge Manually flow: conflict -> pending -> outbox queued with server baseVersion', async () => {
    const record = await createRecord('Draft v1', 'Local Notes', 'task');

    const serverSnap = {
      id: record.id,
      title: 'Cloud v2',
      content: 'Cloud Notes',
      type: 'task' as const,
      version: 2,
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    await db.records.update(record.id, { conflict: true, serverRecord: serverSnap });

    await resolveConflict(record.id, 'merge', {
      title: 'Merged Task Title',
      content: 'Merged Task Content combining local & cloud'
    });

    const mergedRecord = await getRecord(record.id);
    expect(mergedRecord?.title).toBe('Merged Task Title');
    expect(mergedRecord?.content).toBe('Merged Task Content combining local & cloud');
    expect(mergedRecord?.version).toBe(2);
    expect(mergedRecord?.pending).toBe(true);
    expect(mergedRecord?.conflict).toBe(false);

    const ops = await db.outbox.where('recordId').equals(record.id).toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].baseVersion).toBe(2);
    expect(ops[0].payload.title).toBe('Merged Task Title');
  });
});
