import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'path';
import { db, getHealthStatus } from './db.js';
import type { PushSyncRequest, PushResultItem, PushSyncResponse, PullSyncResponse, ItemType } from '../src/types/index.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const isHealthy = getHealthStatus();
  if (!isHealthy) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Push Sync Endpoint
app.post('/api/sync/push', (req: Request, res: Response) => {
  const body = req.body as PushSyncRequest;

  if (!body || !Array.isArray(body.operations)) {
    res.status(400).json({ error: 'Invalid request body. Expected operations array.' });
    return;
  }

  const results: PushResultItem[] = [];
  let hasConflict = false;

  const processTransaction = db.transaction(() => {
    for (const op of body.operations) {
      if (!op.opId || !op.recordId || !op.type || !op.payload) {
        results.push({
          opId: op.opId || 'unknown',
          recordId: op.recordId || 'unknown',
          status: 'conflict',
          error: 'Missing required operation fields'
        });
        hasConflict = true;
        continue;
      }

      // 1. Idempotency Check: check if operation was already processed
      const existingOp = db.prepare('SELECT op_id FROM operations WHERE op_id = ?').get(op.opId);
      if (existingOp) {
        results.push({
          opId: op.opId,
          recordId: op.recordId,
          status: 'ignored'
        });
        continue;
      }

      // 2. Fetch existing server record
      const existingRecord = db.prepare('SELECT * FROM records WHERE id = ?').get(op.recordId) as any;

      // 3. Process based on record existence and baseVersion
      if (!existingRecord) {
        // Record does not exist on server yet
        const newVersion = 1;
        const updatedAt = op.payload.updatedAt || new Date().toISOString();
        const isDeleted = op.payload.deleted ? 1 : 0;

        db.prepare(`
          INSERT INTO records (id, title, content, type, version, updated_at, deleted)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          op.recordId,
          op.payload.title || '',
          op.payload.content || '',
          op.payload.type || 'note',
          newVersion,
          updatedAt,
          isDeleted
        );

        db.prepare('INSERT INTO operations (op_id, record_id, processed_at) VALUES (?, ?, ?)').run(
          op.opId,
          op.recordId,
          new Date().toISOString()
        );

        results.push({
          opId: op.opId,
          recordId: op.recordId,
          status: 'applied',
          newVersion
        });
      } else {
        // Record exists on server
        const currentServerVersion = Number(existingRecord.version);

        // Version-based conflict detection
        if (op.baseVersion !== currentServerVersion) {
          hasConflict = true;
          results.push({
            opId: op.opId,
            recordId: op.recordId,
            status: 'conflict',
            error: `Stale base version ${op.baseVersion}. Current server version is ${currentServerVersion}.`,
            serverRecord: {
              id: existingRecord.id,
              title: existingRecord.title,
              content: existingRecord.content,
              type: existingRecord.type as ItemType,
              version: currentServerVersion,
              updatedAt: existingRecord.updated_at,
              deleted: Boolean(existingRecord.deleted)
            }
          });
          continue;
        }

        // Apply update or deletion
        const newVersion = currentServerVersion + 1;
        const updatedAt = op.payload.updatedAt || new Date().toISOString();
        const isDeleted = op.type === 'delete' || op.payload.deleted ? 1 : 0;

        db.prepare(`
          UPDATE records
          SET title = ?, content = ?, type = ?, version = ?, updated_at = ?, deleted = ?
          WHERE id = ?
        `).run(
          op.payload.title || '',
          op.payload.content || '',
          op.payload.type || 'note',
          newVersion,
          updatedAt,
          isDeleted,
          op.recordId
        );

        db.prepare('INSERT INTO operations (op_id, record_id, processed_at) VALUES (?, ?, ?)').run(
          op.opId,
          op.recordId,
          new Date().toISOString()
        );

        results.push({
          opId: op.opId,
          recordId: op.recordId,
          status: 'applied',
          newVersion
        });
      }
    }
  });

  try {
    processTransaction();
    const responseBody: PushSyncResponse = {
      results,
      processedAt: new Date().toISOString()
    };

    if (hasConflict) {
      res.status(409).json(responseBody);
    } else {
      res.status(200).json(responseBody);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process sync operations', details: err?.message });
  }
});

// Pull Sync Endpoint
app.get('/api/sync/pull', (req: Request, res: Response) => {
  const since = req.query.since as string | undefined;

  try {
    let rows: any[];
    if (since) {
      rows = db.prepare('SELECT * FROM records WHERE updated_at > ? ORDER BY updated_at ASC').all(since);
    } else {
      rows = db.prepare('SELECT * FROM records ORDER BY updated_at ASC').all();
    }

    const records = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      type: r.type as ItemType,
      version: Number(r.version),
      updatedAt: r.updated_at,
      deleted: Boolean(r.deleted)
    }));

    const response: PullSyncResponse = {
      records,
      serverTime: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to pull sync records', details: err?.message });
  }
});

// Serve frontend static assets in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Application build files not found.');
    }
  });
});
