import { db } from '../db/index.js';
import type { LocalRecord, ItemType, OutboxOperation } from '../types/index.js';

/**
 * Creates a new local record with a client-generated UUID
 * and enqueues a 'create' operation in the outbox.
 */
export async function createRecord(
  title: string,
  content: string,
  type: ItemType = 'note'
): Promise<LocalRecord> {
  const recordId = crypto.randomUUID();
  const opId = crypto.randomUUID();
  const now = new Date().toISOString();

  const record: LocalRecord = {
    id: recordId,
    title,
    content,
    type,
    updatedAt: now,
    version: 0, // 0 indicates un-synced local creation
    deleted: false,
    pending: true,
    conflict: false
  };

  const outboxOp: OutboxOperation = {
    opId,
    recordId,
    type: 'create',
    payload: {
      id: recordId,
      title,
      content,
      type,
      updatedAt: now,
      deleted: false
    },
    baseVersion: 0,
    timestamp: now,
    status: 'pending',
    retryCount: 0
  };

  await db.transaction('rw', [db.records, db.outbox], async () => {
    await db.records.put(record);
    await db.outbox.put(outboxOp);
  });

  return record;
}

/**
 * Updates an existing local record
 * and enqueues an 'update' operation in the outbox.
 */
export async function updateRecord(
  id: string,
  title: string,
  content: string,
  type?: ItemType
): Promise<LocalRecord> {
  const existing = await db.records.get(id);
  if (!existing) {
    throw new Error(`Record with id ${id} not found.`);
  }

  const opId = crypto.randomUUID();
  const now = new Date().toISOString();

  const updatedRecord: LocalRecord = {
    ...existing,
    title,
    content,
    type: type || existing.type,
    updatedAt: now,
    pending: true,
    conflict: false,
    serverRecord: undefined
  };

  const outboxOp: OutboxOperation = {
    opId,
    recordId: id,
    type: 'update',
    payload: {
      id,
      title,
      content,
      type: updatedRecord.type,
      updatedAt: now,
      deleted: updatedRecord.deleted
    },
    baseVersion: existing.version,
    timestamp: now,
    status: 'pending',
    retryCount: 0
  };

  await db.transaction('rw', [db.records, db.outbox], async () => {
    await db.records.put(updatedRecord);
    await db.outbox.put(outboxOp);
  });

  return updatedRecord;
}

/**
 * Soft-deletes a record (or permanently removes if created offline and never synced).
 * Handles edge case: "create then delete before first synchronization"
 */
export async function deleteRecord(id: string): Promise<void> {
  const existing = await db.records.get(id);
  if (!existing) return;

  const now = new Date().toISOString();

  await db.transaction('rw', [db.records, db.outbox], async () => {
    // Edge case: Record created offline and never synced (version === 0)
    if (existing.version === 0) {
      // Remove all pending outbox ops for this record
      const pendingOps = await db.outbox.where('recordId').equals(id).toArray();
      for (const op of pendingOps) {
        await db.outbox.delete(op.opId);
      }
      // Remove local record
      await db.records.delete(id);
      return;
    }

    // Otherwise, perform soft delete tombstone
    const updatedRecord: LocalRecord = {
      ...existing,
      deleted: true,
      pending: true,
      updatedAt: now,
      conflict: false
    };

    const opId = crypto.randomUUID();
    const outboxOp: OutboxOperation = {
      opId,
      recordId: id,
      type: 'delete',
      payload: {
        id,
        title: existing.title,
        content: existing.content,
        type: existing.type,
        updatedAt: now,
        deleted: true
      },
      baseVersion: existing.version,
      timestamp: now,
      status: 'pending',
      retryCount: 0
    };

    await db.records.put(updatedRecord);
    await db.outbox.put(outboxOp);
  });
}

/**
 * Resolves a version conflict on a local record.
 * Options:
 * - 'keep_local': Re-enqueues local changes with baseVersion set to server's current version.
 * - 'keep_server': Overwrites local record with server record, clearing conflict flag.
 * - 'merge': Overwrites with merged title/content with baseVersion set to server version and enqueues update.
 */
export async function resolveConflict(
  id: string,
  resolution: 'keep_local' | 'keep_server' | 'merge',
  mergedContent?: { title: string; content: string }
): Promise<void> {
  const record = await db.records.get(id);
  if (!record || !record.serverRecord) {
    // If no server record snapshot, just clear conflict flag
    if (record) {
      await db.records.update(id, { conflict: false, serverRecord: undefined });
    }
    return;
  }

  const serverSnap = record.serverRecord;
  const now = new Date().toISOString();

  await db.transaction('rw', [db.records, db.outbox], async () => {
    if (resolution === 'keep_server') {
      // Clear outbox pending ops for this record
      const pendingOps = await db.outbox.where('recordId').equals(id).toArray();
      for (const op of pendingOps) {
        await db.outbox.delete(op.opId);
      }

      await db.records.put({
        id: serverSnap.id,
        title: serverSnap.title,
        content: serverSnap.content,
        type: serverSnap.type,
        version: serverSnap.version,
        updatedAt: serverSnap.updatedAt,
        deleted: serverSnap.deleted,
        pending: false,
        conflict: false,
        serverRecord: undefined
      });
    } else if (resolution === 'keep_local') {
      const opId = crypto.randomUUID();
      const outboxOp: OutboxOperation = {
        opId,
        recordId: id,
        type: 'update',
        payload: {
          id,
          title: record.title,
          content: record.content,
          type: record.type,
          updatedAt: now,
          deleted: record.deleted
        },
        baseVersion: serverSnap.version, // Use server version as new base version!
        timestamp: now,
        status: 'pending',
        retryCount: 0
      };

      await db.records.update(id, {
        pending: true,
        conflict: false,
        serverRecord: undefined,
        updatedAt: now
      });
      await db.outbox.put(outboxOp);
    } else if (resolution === 'merge' && mergedContent) {
      const opId = crypto.randomUUID();
      const outboxOp: OutboxOperation = {
        opId,
        recordId: id,
        type: 'update',
        payload: {
          id,
          title: mergedContent.title,
          content: mergedContent.content,
          type: record.type,
          updatedAt: now,
          deleted: false
        },
        baseVersion: serverSnap.version,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      };

      await db.records.put({
        id,
        title: mergedContent.title,
        content: mergedContent.content,
        type: record.type,
        version: serverSnap.version,
        updatedAt: now,
        deleted: false,
        pending: true,
        conflict: false,
        serverRecord: undefined
      });
      await db.outbox.put(outboxOp);
    }
  });
}
