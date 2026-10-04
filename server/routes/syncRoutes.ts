import { Router, type Request, type Response } from 'express';
import { processPushOperations, getPullRecords, type PushOperationInput } from '../services/syncService.js';

export const syncRouter = Router();

// POST /api/sync/push
syncRouter.post('/push', (req: Request, res: Response) => {
  try {
    const operations: PushOperationInput[] = Array.isArray(req.body)
      ? req.body
      : req.body?.operations || [];

    if (!Array.isArray(operations)) {
      res.status(400).json({ error: 'Invalid payload: operations must be an array' });
      return;
    }

    const { results, hasConflict, processedAt } = processPushOperations(operations);

    const statusCode = hasConflict ? 409 : 200;
    res.status(statusCode).json({
      results,
      processedAt
    });
  } catch (error: any) {
    console.error('Error processing push operations:', error);
    res.status(500).json({
      error: 'Failed to process push operations',
      details: error.message || String(error)
    });
  }
});

// GET /api/sync/pull
syncRouter.get('/pull', (req: Request, res: Response) => {
  try {
    const since = req.query.since as string | undefined;
    const data = getPullRecords(since);
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Error processing pull sync:', error);
    res.status(500).json({
      error: 'Failed to process pull synchronization',
      details: error.message || String(error)
    });
  }
});
