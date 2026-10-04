import { db } from '../db/index.js';
import type { LocalRecord, ItemType, OutboxOperation } from '../types/index.js';

export const MAX_CONTENT_LENGTH = 50000; // 50KB content limit safeguard

/**
 * Creates a new record in Dexie IndexedDB with a client-generated UUID
 * and enqueues a 'create' outbox operation.
 */
export async function createRecord(
  title: string,
  content: string,
  type: ItemType = 'note'
): Promise<LocalRecord> {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!trimmedTitle && !trimmedContent) {
    throw new Error('Record must have at least a title or content.');
  }

  if (trimmedContent.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content exceeds maximum allowed size of ${MAX_CONTENT_LENGTH.toLocaleString()} characters.`);
  }

  const recordId = crypto.randomUUID();
  const opId = crypto.randomUUID();
  const now = new Date().toISOString();

  const record: LocalRecord = {
    id: recordId,
    title: trimmedTitle || '(Untitled)',
    content: trimmedContent,
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
      title: record.title,
      content: record.content,
      type: record.type,
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
 * Updates an existing record in Dexie IndexedDB with outbox queue coalescing rules:
 * Rule 1: create -> update = update existing 'create' outbox operation payload.
 * Rule 2: update -> update = update existing 'update' outbox operation payload, preserving original baseVersion.
 */
export async function updateRecord(
  id: string,
  title: string,
  content: string,
  type?: ItemType
): Promise<LocalRecord> {
  const existing = await db.records.get(id);
  if (!existing) {
    throw new Error(`Record with ID "${id}" was not found in IndexedDB.`);
  }

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!trimmedTitle && !trimmedContent) {
    throw new Error('Record must have at least a title or content.');
  }

  if (trimmedContent.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content exceeds maximum allowed size of ${MAX_CONTENT_LENGTH.toLocaleString()} characters.`);
  }

  const now = new Date().toISOString();

  const updatedRecord: LocalRecord = {
    ...existing,
    title: trimmedTitle || '(Untitled)',
    content: trimmedContent,
    type: type || existing.type,
    updatedAt: now,
    pending: true,
    conflict: false
  };

  await db.transaction('rw', [db.records, db.outbox], async () => {
    // Save updated local record
    await db.records.put(updatedRecord);

    // Fetch existing outbox ops for this record
    const existingOps = await db.outbox.where('recordId').equals(id).toArray();
    const createOp = existingOps.find((op) => op.type === 'create');
    const updateOp = existingOps.find((op) => op.type === 'update');

    if (createOp) {
      // Coalescing Rule 1: create -> update = update payload of original 'create' operation
      await db.outbox.put({
        ...createOp,
        payload: {
          id,
          title: updatedRecord.title,
          content: updatedRecord.content,
          type: updatedRecord.type,
          updatedAt: now,
          deleted: false
        },
        timestamp: now
      });
    } else if (updateOp) {
      // Coalescing Rule 2: update -> update = update payload of 'update' op, preserving original baseVersion!
      await db.outbox.put({
        ...updateOp,
        payload: {
          id,
          title: updatedRecord.title,
          content: updatedRecord.content,
          type: updatedRecord.type,
          updatedAt: now,
          deleted: false
        },
        timestamp: now
      });
    } else {
      // Insert new 'update' operation
      const opId = crypto.randomUUID();
      const outboxOp: OutboxOperation = {
        opId,
        recordId: id,
        type: 'update',
        payload: {
          id,
          title: updatedRecord.title,
          content: updatedRecord.content,
          type: updatedRecord.type,
          updatedAt: now,
          deleted: false
        },
        baseVersion: existing.version,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      };
      await db.outbox.put(outboxOp);
    }
  });

  return updatedRecord;
}

/**
 * Performs a soft-delete on a record with outbox queue coalescing rules:
 * Rule 4: create -> delete before sync (version === 0) = cancel all outbox ops & remove record directly.
 * Rule 3: update -> delete = replace update op with single 'delete' op, preserving original baseVersion.
 */
export async function deleteRecord(id: string): Promise<void> {
  const existing = await db.records.get(id);
  if (!existing) return;

  const now = new Date().toISOString();

  await db.transaction('rw', [db.records, db.outbox], async () => {
    // Coalescing Rule 4: Record created offline and never synced (version === 0)
    if (existing.version === 0) {
      // Remove all pending outbox operations for this record
      const pendingOps = await db.outbox.where('recordId').equals(id).toArray();
      for (const op of pendingOps) {
        await db.outbox.delete(op.opId);
      }
      // Remove local record from IndexedDB
      await db.records.delete(id);
      return;
    }

    // Coalescing Rule 3: Record was synced (version > 0)
    const existingOps = await db.outbox.where('recordId').equals(id).toArray();
    let baseVersion = existing.version;

    // Remove any existing pending update ops
    for (const op of existingOps) {
      if (op.type === 'update') {
        baseVersion = op.baseVersion; // Preserve original baseVersion
      }
      await db.outbox.delete(op.opId);
    }

    // Create tombstone local record
    const tombstoneRecord: LocalRecord = {
      ...existing,
      deleted: true,
      pending: true,
      updatedAt: now
    };

    // Insert single 'delete' outbox operation
    const opId = crypto.randomUUID();
    const deleteOp: OutboxOperation = {
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
      baseVersion,
      timestamp: now,
      status: 'pending',
      retryCount: 0
    };

    await db.records.put(tombstoneRecord);
    await db.outbox.put(deleteOp);
  });
}

/**
 * Restores a soft-deleted tombstone.
 */
export async function restoreRecord(id: string): Promise<void> {
  const existing = await db.records.get(id);
  if (!existing) return;

  const now = new Date().toISOString();
  await db.transaction('rw', [db.records, db.outbox], async () => {
    await db.records.put({
      ...existing,
      deleted: false,
      pending: true,
      updatedAt: now
    });

    // Remove old delete ops and insert update op
    const existingOps = await db.outbox.where('recordId').equals(id).toArray();
    for (const op of existingOps) {
      await db.outbox.delete(op.opId);
    }

    const opId = crypto.randomUUID();
    const updateOp: OutboxOperation = {
      opId,
      recordId: id,
      type: 'update',
      payload: {
        id,
        title: existing.title,
        content: existing.content,
        type: existing.type,
        updatedAt: now,
        deleted: false
      },
      baseVersion: existing.version,
      timestamp: now,
      status: 'pending',
      retryCount: 0
    };
    await db.outbox.put(updateOp);
  });
}

/**
 * Retrieves a single record by ID.
 */
export async function getRecord(id: string): Promise<LocalRecord | undefined> {
  return await db.records.get(id);
}

/**
 * Lists all active (non-deleted) records.
 */
export async function getActiveRecords(): Promise<LocalRecord[]> {
  return await db.records.filter((r) => !r.deleted).toArray();
}

/**
 * Gets all outbox operations ordered by timestamp.
 */
export async function getOutboxOperations(): Promise<OutboxOperation[]> {
  return await db.outbox.orderBy('timestamp').toArray();
}
