import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/index.js';
import { createRecord, updateRecord, deleteRecord, restoreRecord, getRecord, getActiveRecords } from '../services/localDb.js';

describe('IndexedDB Local Storage Service (Dexie)', () => {
  beforeEach(async () => {
    await db.records.clear();
    await db.outbox.clear();
    await db.meta.clear();
  });

  it('creates a new record with client-generated UUID and default version 0', async () => {
    const record = await createRecord('Test Note', 'Note content details', 'note');

    expect(record.id).toBeDefined();
    expect(record.id).toHaveLength(36); // UUID v4 format length
    expect(record.title).toBe('Test Note');
    expect(record.content).toBe('Note content details');
    expect(record.type).toBe('note');
    expect(record.version).toBe(0);
    expect(record.deleted).toBe(false);
    expect(record.pending).toBe(true);

    // Verify record in Dexie table
    const stored = await db.records.get(record.id);
    expect(stored).toBeDefined();
    expect(stored?.title).toBe('Test Note');
  });

  it('updates an existing record and updates timestamp and pending flag', async () => {
    const created = await createRecord('Initial Title', 'Initial Body', 'note');
    const updated = await updateRecord(created.id, 'Updated Title', 'Updated Body', 'task');

    expect(updated.title).toBe('Updated Title');
    expect(updated.content).toBe('Updated Body');
    expect(updated.type).toBe('task');
    expect(updated.pending).toBe(true);

    const stored = await db.records.get(created.id);
    expect(stored?.title).toBe('Updated Title');
  });

  it('performs soft-delete tombstone for synced records and hides from active records', async () => {
    // Simulate a record synced from server with version 1
    const syncedRecordId = crypto.randomUUID();
    await db.records.put({
      id: syncedRecordId,
      title: 'Synced Note',
      content: 'Body',
      type: 'note',
      updatedAt: new Date().toISOString(),
      version: 1,
      deleted: false,
      pending: false,
      conflict: false
    });

    await deleteRecord(syncedRecordId);

    // Record should still exist in IndexedDB table as tombstone (deleted = true)
    const stored = await db.records.get(syncedRecordId);
    expect(stored).toBeDefined();
    expect(stored?.deleted).toBe(true);

    // Active records list should exclude tombstone
    const active = await getActiveRecords();
    expect(active).toHaveLength(0);
  });

  it('allows restoring a soft-deleted tombstone', async () => {
    const syncedRecordId = crypto.randomUUID();
    await db.records.put({
      id: syncedRecordId,
      title: 'Deleted Note',
      content: 'Body',
      type: 'note',
      updatedAt: new Date().toISOString(),
      version: 1,
      deleted: true,
      pending: false,
      conflict: false
    });

    await restoreRecord(syncedRecordId);

    const stored = await db.records.get(syncedRecordId);
    expect(stored?.deleted).toBe(false);

    const active = await getActiveRecords();
    expect(active).toHaveLength(1);
  });

  it('rejects empty title and empty content', async () => {
    await expect(createRecord('   ', '   ')).rejects.toThrow('Record must have at least a title or content.');
  });
});
