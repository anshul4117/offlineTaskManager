import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'path';
import { getHealthStatus } from './db/index.js';
import { syncRouter } from './routes/syncRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : '*';

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

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

// Sync Endpoints
app.use('/api/sync', syncRouter);

// Production Static File Serving for client/dist
const distPath = path.resolve(process.cwd(), 'client', 'dist');
app.use(express.static(distPath));

// SPA Fallback for non-API routes
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
    return;
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Production client build not found. Run "npm run build" first.');
    }
  });
});

app.use(errorHandler);
