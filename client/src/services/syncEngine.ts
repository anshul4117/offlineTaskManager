import { db } from '../db/index.js';
import type { OutboxOperation, LocalRecord } from '../types/index.js';
import { connectivityMonitor } from './connectivity.js';

export interface PushResultItem {
  opId: string;
  recordId: string;
  status: 'applied' | 'ignored' | 'conflict';
  newVersion?: number;
  error?: string;
  serverRecord?: {
    id: string;
    title: string;
    content: string;
    type: 'note' | 'task';
    version: number;
    updatedAt: string;
    deleted: boolean;
  };
}

export interface PullResponse {
  records: Array<{
    id: string;
    title: string;
    content: string;
    type: 'note' | 'task';
    version: number;
    updatedAt: string;
    deleted: boolean;
  }>;
  serverTime: string;
}

export type SyncEngineState = 'idle' | 'syncing' | 'synced' | 'error';

class SyncEngine {
  private isSyncingLock = false;
  private state: SyncEngineState = 'idle';
  private listeners: Array<(state: SyncEngineState) => void> = [];
  private backoffTimerId: ReturnType<typeof setTimeout> | null = null;
  private currentRetryCount = 0;

  constructor() {
    // Automatically trigger sync when full connectivity is established
    connectivityMonitor.subscribe((connState) => {
      if (connState.isFullyConnected && !this.isSyncingLock) {
        this.triggerSync();
      }
    });
  }

  public getSyncState(): SyncEngineState {
    return this.state;
  }

  public isSyncing(): boolean {
    return this.isSyncingLock;
  }

  public subscribe(listener: (state: SyncEngineState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(newState: SyncEngineState) {
    this.state = newState;
    this.listeners.forEach((l) => l(newState));
  }

  /**
   * Main entry point to trigger synchronization cycle.
   */
  public async triggerSync(): Promise<void> {
    if (this.isSyncingLock) {
      return; // Single-lock concurrency protection: drop duplicate triggers
    }

    const conn = connectivityMonitor.getState();
    if (!conn.isFullyConnected) {
      return;
    }

    this.isSyncingLock = true;
    this.notify('syncing');

    if (this.backoffTimerId) {
      clearTimeout(this.backoffTimerId);
      this.backoffTimerId = null;
    }

    try {
      await this.performPush();
      await this.performPull();
      this.currentRetryCount = 0;
      this.notify('synced');
    } catch (error: any) {
      console.error('[SyncEngine] Synchronization failed:', error);
      this.notify('error');
      this.scheduleRetry();
    } finally {
      this.isSyncingLock = false;
    }
  }

  /**
   * Pushes pending outbox operations to POST /api/sync/push
   */
  private async performPush(): Promise<void> {
    const allOps = await db.outbox.orderBy('timestamp').toArray();
    // Filter out operations marked as conflict to prevent infinite retries
    const opsToPush = allOps.filter((op) => op.status !== 'conflict');

    if (opsToPush.length === 0) {
      return;
    }

    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ operations: opsToPush })
    });

    if (!response.ok && response.status !== 409) {
      throw new Error(`HTTP ${response.status} error pushing operations: ${response.statusText}`);
    }

    const data: { results: PushResultItem[]; processedAt: string } = await response.json();
    const results = data.results || [];

    await db.transaction('rw', [db.records, db.outbox], async () => {
      for (const res of results) {
        if (res.status === 'applied' || res.status === 'ignored') {
          // Operation succeeded or was safely ignored by server
          await db.outbox.delete(res.opId);

          const localRecord = await db.records.get(res.recordId);
          if (localRecord) {
            // Check if there are remaining outbox ops for this record
            const remainingOps = await db.outbox.where('recordId').equals(res.recordId).toArray();
            const hasMorePending = remainingOps.length > 0;

            await db.records.update(res.recordId, {
              version: res.newVersion !== undefined ? res.newVersion : localRecord.version,
              pending: hasMorePending,
              conflict: false
            });
          }
        } else if (res.status === 'conflict') {
          // Stale version conflict returned by server
          const op = await db.outbox.get(res.opId);
          if (op) {
            await db.outbox.update(res.opId, {
              status: 'conflict',
              lastError: res.error || 'Version conflict'
            });
          }

          const localRecord = await db.records.get(res.recordId);
          if (localRecord) {
            await db.records.update(res.recordId, {
              conflict: true,
              serverRecord: res.serverRecord || null
            });
          }
        }
      }
    });
  }

  /**
   * Pulls remote updates from GET /api/sync/pull?since=<lastSyncedAt>
   */
  private async performPull(): Promise<void> {
    const metaItem = await db.meta.get('lastSyncedAt');
    const lastSyncedAt = metaItem ? metaItem.value : undefined;

    const url = lastSyncedAt
      ? `/api/sync/pull?since=${encodeURIComponent(lastSyncedAt)}`
      : '/api/sync/pull';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} error pulling remote changes: ${response.statusText}`);
    }

    const data: PullResponse = await response.json();
    const remoteRecords = data.records || [];
    const serverTime = data.serverTime;

    if (remoteRecords.length > 0) {
      await db.transaction('rw', [db.records], async () => {
        for (const remote of remoteRecords) {
          const local = await db.records.get(remote.id);

          if (local && (local.pending || local.conflict)) {
            // Protect local unpushed changes or existing conflict
            if (local.version !== remote.version && !local.conflict) {
              await db.records.update(remote.id, {
                conflict: true,
                serverRecord: remote
              });
            }
          } else {
            // Apply remote record safely into IndexedDB
            const updatedLocal: LocalRecord = {
              id: remote.id,
              title: remote.title,
              content: remote.content,
              type: remote.type,
              version: remote.version,
              updatedAt: remote.updatedAt,
              deleted: remote.deleted,
              pending: false,
              conflict: false
            };
            await db.records.put(updatedLocal);
          }
        }
      });
    }

    if (serverTime) {
      await db.meta.put({ key: 'lastSyncedAt', value: serverTime });
    }
  }

  /**
   * Bounded exponential backoff retry scheduling.
   */
  private scheduleRetry(): void {
    this.currentRetryCount++;
    // Bounded exponential backoff: 1s, 2s, 4s, 8s, 16s, up to 30s max
    const delay = Math.min(1000 * Math.pow(2, this.currentRetryCount - 1), 30000);
    console.log(`[SyncEngine] Scheduling sync retry attempt #${this.currentRetryCount} in ${delay}ms`);

    this.backoffTimerId = setTimeout(() => {
      this.triggerSync();
    }, delay);
  }
}

export const syncEngine = new SyncEngine();
