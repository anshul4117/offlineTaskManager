import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { db } from '../db.js';

describe('Server Synchronization Endpoints (/api/sync)', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM operations').run();
    db.prepare('DELETE FROM records').run();
  });

  it('POST /api/sync/push applies a create operation', async () => {
    const recordId = 'rec-test-101';
    const opId = 'op-test-101';

    const pushPayload = {
      operations: [
        {
          opId,
          recordId,
          type: 'create',
          payload: {
            id: recordId,
            title: 'Test Note Title',
            content: 'Test note body content',
            type: 'note',
            updatedAt: new Date().toISOString(),
            deleted: false
          },
          baseVersion: 0,
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await request(app).post('/api/sync/push').send(pushPayload);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toEqual({
      opId,
      recordId,
      status: 'applied',
      newVersion: 1
    });

    const dbRecord = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) as any;
    expect(dbRecord).toBeDefined();
    expect(dbRecord.title).toBe('Test Note Title');
    expect(dbRecord.version).toBe(1);
  });

  it('POST /api/sync/push handles idempotent duplicate opId', async () => {
    const recordId = 'rec-test-102';
    const opId = 'op-test-102';

    const pushPayload = {
      operations: [
        {
          opId,
          recordId,
          type: 'create',
          payload: {
            id: recordId,
            title: 'Initial Note',
            content: 'Initial Content',
            type: 'note',
            updatedAt: new Date().toISOString(),
            deleted: false
          },
          baseVersion: 0,
          timestamp: new Date().toISOString()
        }
      ]
    };

    // First push
    await request(app).post('/api/sync/push').send(pushPayload);

    // Second duplicate push with exact same opId
    const res2 = await request(app).post('/api/sync/push').send(pushPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.results[0].status).toBe('ignored');
    expect(res2.body.results[0].opId).toBe(opId);
  });

  it('POST /api/sync/push detects stale baseVersion and returns 409 Conflict', async () => {
    const recordId = 'rec-test-103';
    
    // Create record at version 1
    await request(app).post('/api/sync/push').send({
      operations: [
        {
          opId: 'op-create-103',
          recordId,
          type: 'create',
          payload: { id: recordId, title: 'V1 Title', content: 'V1 Content', type: 'note', updatedAt: new Date().toISOString(), deleted: false },
          baseVersion: 0,
          timestamp: new Date().toISOString()
        }
      ]
    });

    // Valid update to version 2
    await request(app).post('/api/sync/push').send({
      operations: [
        {
          opId: 'op-update-103-v2',
          recordId,
          type: 'update',
          payload: { id: recordId, title: 'V2 Title', content: 'V2 Content', type: 'note', updatedAt: new Date().toISOString(), deleted: false },
          baseVersion: 1,
          timestamp: new Date().toISOString()
        }
      ]
    });

    // Stale update sending baseVersion = 1 when server is at version 2
    const staleRes = await request(app).post('/api/sync/push').send({
      operations: [
        {
          opId: 'op-update-stale',
          recordId,
          type: 'update',
          payload: { id: recordId, title: 'Stale Title Edit', content: 'Stale Body', type: 'note', updatedAt: new Date().toISOString(), deleted: false },
          baseVersion: 1, // Stale!
          timestamp: new Date().toISOString()
        }
      ]
    });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.results[0].status).toBe('conflict');
    expect(staleRes.body.results[0].serverRecord).toBeDefined();
    expect(staleRes.body.results[0].serverRecord.version).toBe(2);
    expect(staleRes.body.results[0].serverRecord.title).toBe('V2 Title');
  });

  it('GET /api/sync/pull retrieves updated records and cursor', async () => {
    const recordId = 'rec-test-104';
    const now = new Date().toISOString();

    await request(app).post('/api/sync/push').send({
      operations: [
        {
          opId: 'op-pull-104',
          recordId,
          type: 'create',
          payload: { id: recordId, title: 'Pull Target', content: 'Pull Content', type: 'task', updatedAt: now, deleted: false },
          baseVersion: 0,
          timestamp: now
        }
      ]
    });

    const pullRes = await request(app).get('/api/sync/pull');

    expect(pullRes.status).toBe(200);
    expect(pullRes.body.records).toBeDefined();
    expect(pullRes.body.serverTime).toBeDefined();

    const record = pullRes.body.records.find((r: any) => r.id === recordId);
    expect(record).toBeDefined();
    expect(record.title).toBe('Pull Target');
    expect(record.type).toBe('task');
  });

  it('POST /api/sync/push restores a server-deleted record when baseVersion matches current server version (Keep Mine)', async () => {
    const recordId = 'rec-test-105';
    const now = new Date().toISOString();

    // 1. Create record -> v1
    await request(app).post('/api/sync/push').send({
      operations: [
        {
          opId: 'op-create-105',
          recordId,
          type: 'create',
          payload: { id: recordId, title: 'Original Title', content: 'Original Body', type: 'note', updatedAt: now, deleted: false },
          baseVersion: 0,
          timestamp: now
        }
      ]
    });

    // 2. Delete record on server -> v2 (deleted = 1)
    await request(app).post('/api/sync/push').send({
      operations: [
        {
          opId: 'op-delete-105',
          recordId,
          type: 'delete',
          payload: { id: recordId, title: 'Original Title', content: 'Original Body', type: 'note', updatedAt: now, deleted: true },
          baseVersion: 1,
          timestamp: now
        }
      ]
    });

    const deletedDbRecord = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) as any;
    expect(deletedDbRecord.deleted).toBe(1);
    expect(deletedDbRecord.version).toBe(2);

    // 3. User selects Keep Mine: pushes update op with baseVersion = 2 and deleted = false
    const restoreRes = await request(app).post('/api/sync/push').send({
      operations: [
        {
          opId: 'op-keep-mine-105',
          recordId,
          type: 'update',
          payload: { id: recordId, title: 'Restored Local Title', content: 'Restored Local Content', type: 'note', updatedAt: now, deleted: false },
          baseVersion: 2, // matches current server version!
          timestamp: now
        }
      ]
    });

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.results[0]).toEqual({
      opId: 'op-keep-mine-105',
      recordId,
      status: 'applied',
      newVersion: 3
    });

    const restoredDbRecord = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) as any;
    expect(restoredDbRecord.deleted).toBe(0);
    expect(restoredDbRecord.version).toBe(3);
    expect(restoredDbRecord.title).toBe('Restored Local Title');
    expect(restoredDbRecord.content).toBe('Restored Local Content');
  });
});
