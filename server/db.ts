import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './server.db';
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'note',
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS operations (
    op_id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    processed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_records_updated_at ON records(updated_at);
  CREATE INDEX IF NOT EXISTS idx_operations_record_id ON operations(record_id);
`);

export function getHealthStatus(): boolean {
  try {
    const result = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    return result?.alive === 1;
  } catch (error) {
    return false;
  }
}
