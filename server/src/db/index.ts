import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const defaultDbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.resolve(process.cwd(), 'server', 'data', 'app.db');

const dbPath = process.env.DATABASE_PATH || defaultDbPath;

// Ensure target directory exists before initializing SQLite database
if (dbPath !== ':memory:') {
  const dbDir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema according to approved specification
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'note',
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS operations (
    op_id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'update',
    processed_at TEXT NOT NULL
  );
`);

// Migrate existing tables if created prior to column additions
try {
  const opColumns = db.prepare("PRAGMA table_info(operations)").all() as Array<{ name: string }>;
  if (!opColumns.some((col) => col.name === 'type')) {
    db.exec("ALTER TABLE operations ADD COLUMN type TEXT NOT NULL DEFAULT 'update'");
  }
} catch (err) {
  console.warn('[DB Migration] Operations table column check warning:', err);
}

export function getHealthStatus(): boolean {
  try {
    const result = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    return result?.alive === 1;
  } catch (error) {
    return false;
  }
}
