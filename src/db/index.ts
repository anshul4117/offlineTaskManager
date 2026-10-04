import Dexie, { type Table } from 'dexie';
import type { LocalRecord, OutboxOperation, SyncMeta } from '../types/index.js';

export class AppDatabase extends Dexie {
  records!: Table<LocalRecord, string>;
  outbox!: Table<OutboxOperation, string>;
  meta!: Table<SyncMeta, string>;

  constructor() {
    super('OfflineNotesAppDB');

    this.version(1).stores({
      records: 'id, type, updatedAt, deleted, pending, conflict',
      outbox: 'opId, recordId, status, timestamp',
      meta: 'key'
    });
  }
}

export const db = new AppDatabase();
