import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'path';
import { getHealthStatus } from './db.js';

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
