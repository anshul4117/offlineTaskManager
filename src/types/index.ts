export type ItemType = 'note' | 'task';

export interface LocalRecord {
  id: string; // UUID
  title: string;
  content: string;
  type: ItemType;
  updatedAt: string; // ISO string
  version: number; // Integer version
  deleted: boolean; // Tombstone for soft deletes
  pending: boolean; // Has unpushed local changes
  conflict: boolean; // Flag indicating conflict with server
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

export interface ServerRecord {
  id: string;
  title: string;
  content: string;
  type: ItemType;
  version: number;
  updated_at: string;
  deleted: number; // 0 or 1 in SQLite
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  database: 'connected';
}

export interface PushOperationPayload {
  opId: string;
  recordId: string;
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
  timestamp: string;
}

export interface PushSyncRequest {
  operations: PushOperationPayload[];
}

export interface PushResultItem {
  opId: string;
  recordId: string;
  status: 'applied' | 'ignored' | 'conflict';
  newVersion?: number;
  serverRecord?: {
    id: string;
    title: string;
    content: string;
    type: ItemType;
    version: number;
    updatedAt: string;
    deleted: boolean;
  };
  error?: string;
}

export interface PushSyncResponse {
  results: PushResultItem[];
  processedAt: string;
}

export interface PullSyncResponse {
  records: Array<{
    id: string;
    title: string;
    content: string;
    type: ItemType;
    version: number;
    updatedAt: string;
    deleted: boolean;
  }>;
  serverTime: string;
}
