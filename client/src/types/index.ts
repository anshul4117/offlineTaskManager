export type ItemType = 'note' | 'task';

export interface LocalRecord {
  id: string; // Client-generated UUID
  title: string;
  content: string;
  type: ItemType;
  updatedAt: string; // ISO 8601 string
  version: number; // Integer version (0 = un-synced local creation)
  deleted: boolean; // Soft delete tombstone flag
  pending: boolean; // Unpushed local mutation flag
  conflict: boolean; // Conflict flag with server
  serverRecord?: {
    id: string;
    title: string;
    content: string;
    type: ItemType;
    version: number;
    updatedAt: string;
    deleted: boolean;
  } | null;
}

export type OperationType = 'create' | 'update' | 'delete';

export interface OutboxOperation {
  opId: string; // UUID
  recordId: string; // UUID
  type: OperationType;
  payload: {
    id: string;
    title: string;
    content: string;
    type: ItemType;
    updatedAt: string;
    deleted: boolean;
  };
  baseVersion: number;
  timestamp: string; // ISO string
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface SyncMeta {
  key: string;
  value: string;
}
