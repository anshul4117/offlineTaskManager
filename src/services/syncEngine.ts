import { db } from '../db/index.js';
import { connectivityMonitor } from './connectivity.js';
import type {
  PushSyncRequest,
  PushSyncResponse,
  PullSyncResponse,
  OutboxOperation,
  LocalRecord
} from '../types/index.js';

export type SyncStateStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncEngineStatus {
  status: SyncStateStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  pendingCount: number;
}

type SyncStatusListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private isSyncingLock = false;
  private status: SyncStateStatus = 'idle';
  private lastError: string | null = null;
  private lastSyncedAt: string | null = null;
  private listeners: Set<SyncStatusListener> = new Set();
  private backoffDelayMs = 1000;
  private maxBackoffMs = 30000;

  constructor() {
    this.loadLastSyncedAt();
  }

  private async loadLastSyncedAt(): Promise<void> {
    try {
      const metaItem = await db.meta.get('lastSyncedAt');
      if (metaItem) {
        this.lastSyncedAt = metaItem.value;
      }
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to load lastSyncedAt from meta store:', err);
    }
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    db.outbox.count().then((pendingCount) => {
      const currentStatus: SyncEngineStatus = {
        status: this.status,
        lastSyncedAt: this.lastSyncedAt,
        lastError: this.lastError,
        pendingCount
      };
      this.listeners.forEach((listener) => listener(currentStatus));
    });
  }

  /**
   * Main entrypoint to trigger synchronization safely.
   * Prevents duplicate/concurrent sync executions.
   */
  public async sync(): Promise<boolean> {
    if (this.isSyncingLock) {
      console.log('[SyncEngine] Sync already in progress. Skipping duplicate execution.');
      return false;
    }

    // Check connectivity before proceeding
    const isReachable = await connectivityMonitor.checkHealth();
    if (!isReachable) {
      this.status = 'error';
      this.lastError = 'Server is unreachable or device is offline.';
      this.notifyListeners();
      return false;
    }

    this.isSyncingLock = true;
    this.status = 'syncing';
    this.lastError = null;
    this.notifyListeners();

    try {
      // 1. Push Phase
      await this.pushPhase();

      // 2. Pull Phase
      await this.pullPhase();

      this.status = 'success';
      this.backoffDelayMs = 1000; // Reset backoff delay on success
      this.notifyListeners();
      return true;
    } catch (err: any) {
      this.status = 'error';
      this.lastError = err?.message || 'Sync failed due to network or server error.';
      this.scheduleRetry();
      this.notifyListeners();
      return false;
    } finally {
      this.isSyncingLock = false;
    }
  }

  private scheduleRetry(): void {
    console.warn(`[SyncEngine] Scheduling automatic retry in ${this.backoffDelayMs}ms...`);
    setTimeout(() => {
      if (connectivityMonitor.getState().isFullyConnected) {
        this.sync();
      }
    }, this.backoffDelayMs);

    // Bounded exponential backoff
    this.backoffDelayMs = Math.min(this.backoffDelayMs * 2, this.maxBackoffMs);
  }

  /**
   * Pushes pending outbox operations to server
   */
  private async pushPhase(): Promise<void> {
    const pendingOps = await db.outbox.orderBy('timestamp').toArray();
    if (pendingOps.length === 0) {
      return;
    }

    const payload: PushSyncRequest = {
      operations: pendingOps.map((op) => ({
        opId: op.opId,
        recordId: op.recordId,
        type: op.type,
        payload: op.payload,
        baseVersion: op.baseVersion,
        timestamp: op.timestamp
      }))
    };

    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status !== 200 && response.status !== 409) {
      const errorText = await response.text();
      throw new Error(`Push failed with HTTP ${response.status}: ${errorText}`);
    }

    const data: PushSyncResponse = await response.json();

    // Process push results inside Dexie transaction
    await db.transaction('rw', [db.records, db.outbox], async () => {
      for (const resItem of data.results) {
        if (resItem.status === 'applied') {
          // Remove operation from outbox
          await db.outbox.delete(resItem.opId);

          // Update record version and status
          const rec = await db.records.get(resItem.recordId);
          if (rec) {
            // Check if there are remaining pending operations for this record
            const remaining = await db.outbox.where('recordId').equals(resItem.recordId).toArray();
            await db.records.put({
              ...rec,
              version: resItem.newVersion !== undefined ? resItem.newVersion : rec.version,
              pending: remaining.length > 0,
              conflict: false
            });
          }
        } else if (resItem.status === 'ignored') {
          // Operation already processed on server, remove from outbox
          await db.outbox.delete(resItem.opId);
        } else if (resItem.status === 'conflict') {
          // Version conflict detected by server!
          await db.outbox.delete(resItem.opId);

          const rec = await db.records.get(resItem.recordId);
          if (rec && resItem.serverRecord) {
            await db.records.put({
              ...rec,
              conflict: true,
              serverRecord: resItem.serverRecord
            });
          }
        }
      }
    });
  }

  /**
   * Pulls updated server records using lastSyncedAt cursor
   */
  private async pullPhase(): Promise<void> {
    const metaItem = await db.meta.get('lastSyncedAt');
    const since = metaItem ? metaItem.value : null;

    const url = since ? `/api/sync/pull?since=${encodeURIComponent(since)}` : '/api/sync/pull';

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      throw new Error(`Pull failed with HTTP ${response.status}`);
    }

    const data: PullSyncResponse = await response.json();

    await db.transaction('rw', [db.records, db.meta], async () => {
      for (const sRec of data.records) {
        const localRec = await db.records.get(sRec.id);

        if (!localRec) {
          // Record doesn't exist locally, insert from server
          const newLocalRecord: LocalRecord = {
            id: sRec.id,
            title: sRec.title,
            content: sRec.content,
            type: sRec.type,
            version: sRec.version,
            updatedAt: sRec.updatedAt,
            deleted: sRec.deleted,
            pending: false,
            conflict: false
          };
          await db.records.put(newLocalRecord);
        } else {
          // Local record exists
          if (localRec.pending || localRec.conflict) {
            // Local record has unpushed changes or existing conflict
            if (localRec.version !== sRec.version) {
              await db.records.put({
                ...localRec,
                conflict: true,
                serverRecord: {
                  id: sRec.id,
                  title: sRec.title,
                  content: sRec.content,
                  type: sRec.type,
                  version: sRec.version,
                  updatedAt: sRec.updatedAt,
                  deleted: sRec.deleted
                }
              });
            }
          } else {
            // Safe to update local record with server state
            await db.records.put({
              id: sRec.id,
              title: sRec.title,
              content: sRec.content,
              type: sRec.type,
              version: sRec.version,
              updatedAt: sRec.updatedAt,
              deleted: sRec.deleted,
              pending: false,
              conflict: false
            });
          }
        }
      }

      // Update lastSyncedAt in meta store using serverTime
      if (data.serverTime) {
        await db.meta.put({ key: 'lastSyncedAt', value: data.serverTime });
        this.lastSyncedAt = data.serverTime;
      }
    });
  }
}

export const syncEngine = new SyncEngine();
