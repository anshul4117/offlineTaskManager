import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { db } from '../db.js';

describe('Server API Endpoints', () => {
  beforeEach(() => {
    // Clear test database tables before each test
    db.prepare('DELETE FROM operations').run();
    db.prepare('DELETE FROM records').run();
  });

  describe('GET /api/health', () => {
    it('returns status 200 with database status connected', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/sync/push', () => {
    it('successfully pushes a new record operation', async () => {
      const pushPayload = {
        operations: [
          {
            opId: 'op-create-1',
            recordId: 'rec-1',
            type: 'create',
            payload: {
              id: 'rec-1',
              title: 'Test Note',
              content: 'Content for test note',
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
        opId: 'op-create-1',
        recordId: 'rec-1',
        status: 'applied',
        newVersion: 1
      });

      // Verify SQLite record state
      const record = db.prepare('SELECT * FROM records WHERE id = ?').get('rec-1') as any;
      expect(record).toBeDefined();
      expect(record.title).toBe('Test Note');
      expect(record.version).toBe(1);
    });

    it('safely ignores duplicate operation (idempotency)', async () => {
      const pushPayload = {
        operations: [
          {
            opId: 'op-create-dup',
            recordId: 'rec-dup',
            type: 'create',
            payload: {
              id: 'rec-dup',
              title: 'Dup Note',
              content: 'Content',
              type: 'note',
              updatedAt: new Date().toISOString(),
              deleted: false
            },
            baseVersion: 0,
            timestamp: new Date().toISOString()
          }
        ]
      };

      // First call
      await request(app).post('/api/sync/push').send(pushPayload);

      // Second call with same opId
      const res = await request(app).post('/api/sync/push').send(pushPayload);
      expect(res.status).toBe(200);
      expect(res.body.results[0]).toEqual({
        opId: 'op-create-dup',
        recordId: 'rec-dup',
        status: 'ignored'
      });
    });

    it('detects version conflicts when baseVersion is stale', async () => {
      // Setup initial server record (version = 1)
      db.prepare(`
        INSERT INTO records (id, title, content, type, version, updated_at, deleted)
        VALUES ('rec-conflict', 'Server Note', 'Original Server Body', 'note', 2, ?, 0)
      `).run(new Date().toISOString());

      const pushPayload = {
        operations: [
          {
            opId: 'op-stale-update',
            recordId: 'rec-conflict',
            type: 'update',
            payload: {
              id: 'rec-conflict',
              title: 'Client Edit',
              content: 'Client Body',
              type: 'note',
              updatedAt: new Date().toISOString(),
              deleted: false
            },
            baseVersion: 1, // Stale base version! Current server version is 2
            timestamp: new Date().toISOString()
          }
        ]
      };

      const res = await request(app).post('/api/sync/push').send(pushPayload);
      expect(res.status).toBe(409); // 409 Conflict
      expect(res.body.results[0].status).toBe('conflict');
      expect(res.body.results[0].serverRecord).toBeDefined();
      expect(res.body.results[0].serverRecord.title).toBe('Server Note');
      expect(res.body.results[0].serverRecord.version).toBe(2);
    });

    it('handles soft deletes correctly', async () => {
      // Setup initial record version = 1
      db.prepare(`
        INSERT INTO records (id, title, content, type, version, updated_at, deleted)
        VALUES ('rec-del', 'To Delete', 'Content', 'note', 1, ?, 0)
      `).run(new Date().toISOString());

      const pushPayload = {
        operations: [
          {
            opId: 'op-delete-1',
            recordId: 'rec-del',
            type: 'delete',
            payload: {
              id: 'rec-del',
              title: 'To Delete',
              content: 'Content',
              type: 'note',
              updatedAt: new Date().toISOString(),
              deleted: true
            },
            baseVersion: 1,
            timestamp: new Date().toISOString()
          }
        ]
      };

      const res = await request(app).post('/api/sync/push').send(pushPayload);
      expect(res.status).toBe(200);
      expect(res.body.results[0].status).toBe('applied');
      expect(res.body.results[0].newVersion).toBe(2);

      const record = db.prepare('SELECT * FROM records WHERE id = ?').get('rec-del') as any;
      expect(record.deleted).toBe(1);
    });
  });

  describe('GET /api/sync/pull', () => {
    it('pulls all records when no since cursor is provided', async () => {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO records (id, title, content, type, version, updated_at, deleted)
        VALUES ('rec-p1', 'P1', 'Content 1', 'note', 1, ?, 0)
      `).run(now);

      const res = await request(app).get('/api/sync/pull');
      expect(res.status).toBe(200);
      expect(res.body.records).toHaveLength(1);
      expect(res.body.records[0].id).toBe('rec-p1');
      expect(res.body.serverTime).toBeDefined();
    });

    it('filters records updated after the since cursor', async () => {
      const t1 = '2026-10-04T10:00:00.000Z';
      const t2 = '2026-10-04T11:00:00.000Z';

      db.prepare(`
        INSERT INTO records (id, title, content, type, version, updated_at, deleted)
        VALUES ('rec-old', 'Old', 'Old content', 'note', 1, ?, 0)
      `).run(t1);

      db.prepare(`
        INSERT INTO records (id, title, content, type, version, updated_at, deleted)
        VALUES ('rec-new', 'New', 'New content', 'task', 1, ?, 0)
      `).run(t2);

      const res = await request(app).get(`/api/sync/pull?since=${t1}`);
      expect(res.status).toBe(200);
      expect(res.body.records).toHaveLength(1);
      expect(res.body.records[0].id).toBe('rec-new');
    });
  });
});
