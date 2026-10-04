import { Router, type Request, type Response } from 'express';
import { processPushOperations, getPullRecords, type PushOperationInput } from '../services/syncService.js';

export const syncRouter = Router();

const MAX_SYNC_BATCH = 100;
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST /api/sync/push
syncRouter.post('/push', (req: Request, res: Response, next) => {
  try {
    const operations: PushOperationInput[] = Array.isArray(req.body)
      ? req.body
      : req.body?.operations || [];

    if (!Array.isArray(operations)) {
      res.status(400).json({ error: 'Invalid payload: operations must be an array' });
      return;
    }

    if (operations.length > MAX_SYNC_BATCH) {
      res.status(400).json({ error: `Sync batch exceeds maximum limit of ${MAX_SYNC_BATCH} operations` });
      return;
    }

    // Validate individual operation structural constraints
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (!op || typeof op !== 'object') {
        res.status(400).json({ error: `Invalid operation object at index ${i}` });
        return;
      }

      if (typeof op.opId !== 'string' || !op.opId.trim() || op.opId.length > 100) {
        res.status(400).json({ error: `Invalid or malformed opId at index ${i}` });
        return;
      }

      if (typeof op.recordId !== 'string' || !op.recordId.trim() || op.recordId.length > 100) {
        res.status(400).json({ error: `Invalid or malformed recordId at index ${i}` });
        return;
      }

      if (!['create', 'update', 'delete'].includes(op.type)) {
        res.status(400).json({ error: `Invalid operation type '${op.type}' at index ${i}` });
        return;
      }

      if (typeof op.baseVersion !== 'number' || op.baseVersion < 0) {
        res.status(400).json({ error: `Invalid baseVersion at index ${i}` });
        return;
      }

      if (!op.payload || typeof op.payload !== 'object') {
        res.status(400).json({ error: `Missing payload object at index ${i}` });
        return;
      }

      if (op.payload.title && typeof op.payload.title === 'string' && op.payload.title.length > MAX_TITLE_LENGTH) {
        res.status(400).json({ error: `Title at index ${i} exceeds maximum limit of ${MAX_TITLE_LENGTH} characters` });
        return;
      }

      if (op.payload.content && typeof op.payload.content === 'string' && op.payload.content.length > MAX_CONTENT_LENGTH) {
        res.status(400).json({ error: `Content at index ${i} exceeds maximum limit of ${MAX_CONTENT_LENGTH} characters` });
        return;
      }
    }

    const { results, hasConflict, processedAt } = processPushOperations(operations);

    const statusCode = hasConflict ? 409 : 200;
    res.status(statusCode).json({
      results,
      processedAt
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/sync/pull
syncRouter.get('/pull', (req: Request, res: Response, next) => {
  try {
    const since = req.query.since as string | undefined;

    if (since && isNaN(Date.parse(since))) {
      res.status(400).json({ error: 'Invalid since parameter: must be a valid ISO-8601 timestamp string' });
      return;
    }

    const data = getPullRecords(since);
    res.status(200).json(data);
  } catch (error: any) {
    next(error);
  }
});
