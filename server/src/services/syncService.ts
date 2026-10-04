import { db } from '../db/index.js';

export interface PushOperationInput {
  opId: string;
  recordId: string;
  type: 'create' | 'update' | 'delete';
  payload: {
    id: string;
    title: string;
    content: string;
    type?: 'note' | 'task';
    updatedAt: string;
    deleted: boolean;
  };
  baseVersion: number;
  timestamp: string;
}

export interface ServerRecord {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'task';
  version: number;
  updated_at: string;
  deleted: number;
}

export interface ClientServerRecord {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'task';
  version: number;
  updatedAt: string;
  deleted: boolean;
}

export interface PushResultItem {
  opId: string;
  recordId: string;
  status: 'applied' | 'ignored' | 'conflict';
  newVersion?: number;
  error?: string;
  serverRecord?: ClientServerRecord;
}

function formatServerRecordForClient(row: ServerRecord): ClientServerRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type || 'note',
    version: row.version,
    updatedAt: row.updated_at,
    deleted: row.deleted === 1
  };
}

export function processPushOperations(operations: PushOperationInput[]): {
  results: PushResultItem[];
  hasConflict: boolean;
  processedAt: string;
} {
  const processedAt = new Date().toISOString();
  let hasConflict = false;
  const results: PushResultItem[] = [];

  const checkOpStmt = db.prepare('SELECT op_id FROM operations WHERE op_id = ?');
  const insertOpStmt = db.prepare('INSERT INTO operations (op_id, record_id, type, processed_at) VALUES (?, ?, ?, ?)');
  const getRecordStmt = db.prepare('SELECT * FROM records WHERE id = ?');
  
  const insertRecordStmt = db.prepare(
    'INSERT INTO records (id, title, content, type, version, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  
  const updateRecordStmt = db.prepare(
    'UPDATE records SET title = ?, content = ?, type = ?, version = ?, updated_at = ?, deleted = ? WHERE id = ?'
  );

  const deleteRecordStmt = db.prepare(
    'UPDATE records SET version = ?, updated_at = ?, deleted = 1 WHERE id = ?'
  );

  const runBatch = db.transaction((ops: PushOperationInput[]) => {
    for (const op of ops) {
      // 1. Idempotency Check
      const existingOp = checkOpStmt.get(op.opId);
      if (existingOp) {
        const existingRec = getRecordStmt.get(op.recordId) as ServerRecord | undefined;
        results.push({
          opId: op.opId,
          recordId: op.recordId,
          status: 'ignored',
          newVersion: existingRec ? existingRec.version : undefined
        });
        continue;
      }

      // 2. Fetch server record state
      const serverRec = getRecordStmt.get(op.recordId) as ServerRecord | undefined;

      // 3. Evaluate operation logic
      if (op.type === 'create') {
        if (serverRec) {
          if (op.baseVersion !== serverRec.version) {
            hasConflict = true;
            results.push({
              opId: op.opId,
              recordId: op.recordId,
              status: 'conflict',
              error: `Record already exists on server at version ${serverRec.version} (baseVersion sent: ${op.baseVersion}).`,
              serverRecord: formatServerRecordForClient(serverRec)
            });
            continue;
          }
        }

        const version = 1;
        insertRecordStmt.run(
          op.payload.id,
          op.payload.title || '',
          op.payload.content || '',
          op.payload.type || 'note',
          version,
          op.payload.updatedAt || processedAt,
          op.payload.deleted ? 1 : 0
        );

        insertOpStmt.run(op.opId, op.recordId, op.type, processedAt);

        results.push({
          opId: op.opId,
          recordId: op.recordId,
          status: 'applied',
          newVersion: version
        });
      } else if (op.type === 'update') {
        if (!serverRec) {
          hasConflict = true;
          results.push({
            opId: op.opId,
            recordId: op.recordId,
            status: 'conflict',
            error: 'Record does not exist on server.',
            serverRecord: undefined
          });
          continue;
        }

        if (op.baseVersion !== serverRec.version) {
          hasConflict = true;
          results.push({
            opId: op.opId,
            recordId: op.recordId,
            status: 'conflict',
            error: serverRec.deleted === 1 
              ? 'Record has been deleted on server.' 
              : `Stale base version ${op.baseVersion}. Current server version is ${serverRec.version}.`,
            serverRecord: formatServerRecordForClient(serverRec)
          });
          continue;
        }

        const newVersion = serverRec.version + 1;
        updateRecordStmt.run(
          op.payload.title,
          op.payload.content,
          op.payload.type || serverRec.type || 'note',
          newVersion,
          op.payload.updatedAt || processedAt,
          op.payload.deleted ? 1 : 0,
          op.recordId
        );

        insertOpStmt.run(op.opId, op.recordId, op.type, processedAt);

        results.push({
          opId: op.opId,
          recordId: op.recordId,
          status: 'applied',
          newVersion
        });
      } else if (op.type === 'delete') {
        if (!serverRec) {
          insertOpStmt.run(op.opId, op.recordId, op.type, processedAt);
          results.push({
            opId: op.opId,
            recordId: op.recordId,
            status: 'applied',
            newVersion: 1
          });
          continue;
        }

        if (op.baseVersion !== serverRec.version) {
          hasConflict = true;
          results.push({
            opId: op.opId,
            recordId: op.recordId,
            status: 'conflict',
            error: `Stale base version ${op.baseVersion} for deletion. Current server version is ${serverRec.version}.`,
            serverRecord: formatServerRecordForClient(serverRec)
          });
          continue;
        }

        const newVersion = serverRec.version + 1;
        deleteRecordStmt.run(newVersion, op.payload.updatedAt || processedAt, op.recordId);
        insertOpStmt.run(op.opId, op.recordId, op.type, processedAt);

        results.push({
          opId: op.opId,
          recordId: op.recordId,
          status: 'applied',
          newVersion
        });
      }
    }
  });

  runBatch(operations);

  return { results, hasConflict, processedAt };
}

export function getPullRecords(since?: string): {
  records: ClientServerRecord[];
  serverTime: string;
} {
  const serverTime = new Date().toISOString();
  let rows: ServerRecord[];

  if (since) {
    const stmt = db.prepare('SELECT * FROM records WHERE updated_at > ? ORDER BY updated_at ASC');
    rows = stmt.all(since) as ServerRecord[];
  } else {
    const stmt = db.prepare('SELECT * FROM records ORDER BY updated_at ASC');
    rows = stmt.all() as ServerRecord[];
  }

  const records = rows.map(formatServerRecordForClient);

  return { records, serverTime };
}
