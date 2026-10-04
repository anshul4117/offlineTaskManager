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

export type OutboxStatus = 'pending' | 'syncing' | 'error' | 'conflict';

export interface OutboxOperation {
  opId: string; // Client-generated UUID for idempotency
  recordId: string; // Associated record ID (UUID)
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
  timestamp: string; // ISO 8601 string
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
}

export interface SyncMeta {
  key: string;
  value: string;
}

export interface ConnectivityState {
  isBrowserOnline: boolean;
  isServerReachable: boolean;
  isFullyConnected: boolean;
  statusText: 'Online' | 'Offline' | 'Server Unreachable';
  lastCheckedAt: string | null;
}

export interface SyncStatusSummary {
  status: 'idle' | 'syncing' | 'synced' | 'error';
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
}
