import { db } from '../db/index.js';
import type { LocalRecord, ItemType, OutboxOperation } from '../types/index.js';
import { syncEngine } from './syncEngine.js';

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
    await db.records.put(updatedRecord);

    const existingOps = await db.outbox.where('recordId').equals(id).toArray();
    const createOp = existingOps.find((op) => op.type === 'create');
    const updateOp = existingOps.find((op) => op.type === 'update');

    if (createOp) {
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
    if (existing.version === 0) {
      const pendingOps = await db.outbox.where('recordId').equals(id).toArray();
      for (const op of pendingOps) {
        await db.outbox.delete(op.opId);
      }
      await db.records.delete(id);
      return;
    }

    const existingOps = await db.outbox.where('recordId').equals(id).toArray();
    let baseVersion = existing.version;

    for (const op of existingOps) {
      if (op.type === 'update') {
        baseVersion = op.baseVersion;
      }
      await db.outbox.delete(op.opId);
    }

    const tombstoneRecord: LocalRecord = {
      ...existing,
      deleted: true,
      pending: true,
      updatedAt: now
    };

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
 * Resolves a version conflict on a local record.
 */
export async function resolveConflict(
  id: string,
  resolution: 'keep_local' | 'keep_server' | 'merge',
  mergedContent?: { title: string; content: string }
): Promise<void> {
  const record = await db.records.get(id);
  if (!record || !record.serverRecord) {
    if (record) {
      await db.records.update(id, { conflict: false, serverRecord: undefined });
    }
    return;
  }

  const serverSnap = record.serverRecord;
  const now = new Date().toISOString();

  await db.transaction('rw', [db.records, db.outbox], async () => {
    // Always clear old outbox ops for this record to avoid duplicate or conflicting stale operations
    const pendingOps = await db.outbox.where('recordId').equals(id).toArray();
    for (const op of pendingOps) {
      await db.outbox.delete(op.opId);
    }

    if (resolution === 'keep_server') {
      if (serverSnap.deleted) {
        // Apply remote delete locally
        await db.records.put({
          id: serverSnap.id,
          title: serverSnap.title,
          content: serverSnap.content,
          type: serverSnap.type,
          version: serverSnap.version,
          updatedAt: serverSnap.updatedAt,
          deleted: true,
          pending: false,
          conflict: false,
          serverRecord: undefined
        });
      } else {
        await db.records.put({
          id: serverSnap.id,
          title: serverSnap.title,
          content: serverSnap.content,
          type: serverSnap.type,
          version: serverSnap.version,
          updatedAt: serverSnap.updatedAt,
          deleted: false,
          pending: false,
          conflict: false,
          serverRecord: undefined
        });
      }
    } else if (resolution === 'keep_local') {
      const opId = crypto.randomUUID();
      const outboxOp: OutboxOperation = {
        opId,
        recordId: id,
        type: record.deleted ? 'delete' : 'update',
        payload: {
          id,
          title: record.title,
          content: record.content,
          type: record.type,
          updatedAt: now,
          deleted: record.deleted
        },
        baseVersion: serverSnap.version,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      };

      await db.records.update(id, {
        version: serverSnap.version,
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

  // Trigger automatic sync after resolution if an outbox mutation was enqueued
  if (resolution === 'keep_local' || resolution === 'merge') {
    syncEngine.triggerSync().catch((err) => console.error('[resolveConflict] Auto-sync error:', err));
  }
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
