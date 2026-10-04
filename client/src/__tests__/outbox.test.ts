import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/index.js';
import { createRecord, updateRecord, deleteRecord, getOutboxOperations } from '../services/localDb.js';

describe('IndexedDB Outbox Queue & Coalescing Rules (Phase 4)', () => {
  beforeEach(async () => {
    await db.records.clear();
    await db.outbox.clear();
    await db.meta.clear();
  });

  it('creates an outbox operation with unique opId and baseVersion 0 on record creation', async () => {
    const record = await createRecord('Note Title', 'Note Body', 'note');

    const outboxOps = await getOutboxOperations();
    expect(outboxOps).toHaveLength(1);
    expect(outboxOps[0].opId).toBeDefined();
    expect(outboxOps[0].opId).toHaveLength(36); // UUID format
    expect(outboxOps[0].recordId).toBe(record.id);
    expect(outboxOps[0].type).toBe('create');
    expect(outboxOps[0].baseVersion).toBe(0);
    expect(outboxOps[0].payload.title).toBe('Note Title');
    expect(outboxOps[0].status).toBe('pending');
  });

  it('Rule 1: create -> update coalesces into 1 updated create operation', async () => {
    const record = await createRecord('Original Title', 'Original Body', 'note');

    // First update
    await updateRecord(record.id, 'Updated Title 1', 'Updated Body 1', 'note');

    // Second update
    await updateRecord(record.id, 'Updated Title 2', 'Updated Body 2', 'task');

    const outboxOps = await getOutboxOperations();
    expect(outboxOps).toHaveLength(1); // Coalesced into 1 operation!
    expect(outboxOps[0].type).toBe('create');
    expect(outboxOps[0].payload.title).toBe('Updated Title 2');
    expect(outboxOps[0].payload.content).toBe('Updated Body 2');
    expect(outboxOps[0].payload.type).toBe('task');
  });

  it('Rule 2: update -> update coalesces into 1 update operation preserving original baseVersion', async () => {
    // Simulate a synced record from server with version = 2
    const syncedId = crypto.randomUUID();
    await db.records.put({
      id: syncedId,
      title: 'Server Note',
      content: 'Server Content',
      type: 'note',
      updatedAt: new Date().toISOString(),
      version: 2,
      deleted: false,
      pending: false,
      conflict: false
    });

    // First update
    await updateRecord(syncedId, 'Local Edit 1', 'Content 1', 'note');
    // Second update
    await updateRecord(syncedId, 'Local Edit 2', 'Content 2', 'note');

    const outboxOps = await getOutboxOperations();
    expect(outboxOps).toHaveLength(1);
    expect(outboxOps[0].type).toBe('update');
    expect(outboxOps[0].baseVersion).toBe(2); // Preserves original baseVersion = 2!
    expect(outboxOps[0].payload.title).toBe('Local Edit 2');
  });

  it('Rule 3: update -> delete replaces update with 1 delete operation preserving original baseVersion', async () => {
    // Simulate a synced record from server with version = 3
    const syncedId = crypto.randomUUID();
    await db.records.put({
      id: syncedId,
      title: 'Synced Item',
      content: 'Content',
      type: 'note',
      updatedAt: new Date().toISOString(),
      version: 3,
      deleted: false,
      pending: false,
      conflict: false
    });

    // Local edit
    await updateRecord(syncedId, 'Edited Title', 'Edited Content', 'note');

    // Soft delete
    await deleteRecord(syncedId);

    const outboxOps = await getOutboxOperations();
    expect(outboxOps).toHaveLength(1);
    expect(outboxOps[0].type).toBe('delete');
    expect(outboxOps[0].baseVersion).toBe(3); // Preserves original baseVersion = 3!
    expect(outboxOps[0].payload.deleted).toBe(true);
  });

  it('Rule 4: create -> delete before sync cancels all outbox ops and removes local record', async () => {
    // Record created offline (version === 0)
    const record = await createRecord('Temporary Note', 'Temporary Content', 'note');

    let outboxOps = await getOutboxOperations();
    expect(outboxOps).toHaveLength(1);

    // Delete before synchronization
    await deleteRecord(record.id);

    outboxOps = await getOutboxOperations();
    expect(outboxOps).toHaveLength(0); // All outbox operations cancelled!

    const storedRecord = await db.records.get(record.id);
    expect(storedRecord).toBeUndefined(); // Local record safely removed!
  });

  it('outbox operations persist in IndexedDB store', async () => {
    await createRecord('Persistent Note 1', 'Body 1', 'note');
    await createRecord('Persistent Note 2', 'Body 2', 'task');

    const outboxOps = await getOutboxOperations();
    expect(outboxOps).toHaveLength(2);
    expect(outboxOps[0].recordId).not.toEqual(outboxOps[1].recordId);
  });
});
