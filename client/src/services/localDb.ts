import { db } from '../db/index.js';
import type { LocalRecord, ItemType } from '../types/index.js';

export const MAX_CONTENT_LENGTH = 50000; // 50KB content limit safeguard

/**
 * Creates a new record in Dexie IndexedDB with a client-generated UUID.
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

  await db.records.put(record);
  return record;
}

/**
 * Updates an existing record in Dexie IndexedDB.
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

  await db.records.put(updatedRecord);
  return updatedRecord;
}

/**
 * Performs a soft-delete tombstone on a record in Dexie IndexedDB.
 * Deleted records remain in IndexedDB with `deleted: true` flag.
 */
export async function deleteRecord(id: string): Promise<void> {
  const existing = await db.records.get(id);
  if (!existing) return;

  const now = new Date().toISOString();

  // If created offline and never synced (version === 0), remove directly
  if (existing.version === 0) {
    await db.records.delete(id);
    return;
  }

  // Otherwise, set soft delete tombstone
  const updatedRecord: LocalRecord = {
    ...existing,
    deleted: true,
    pending: true,
    updatedAt: now
  };

  await db.records.put(updatedRecord);
}

/**
 * Restores a soft-deleted record from tombstone state.
 */
export async function restoreRecord(id: string): Promise<void> {
  const existing = await db.records.get(id);
  if (!existing) return;

  const now = new Date().toISOString();
  await db.records.put({
    ...existing,
    deleted: false,
    pending: true,
    updatedAt: now
  });
}

/**
 * Permanently deletes a record from IndexedDB.
 */
export async function purgeRecord(id: string): Promise<void> {
  await db.records.delete(id);
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
