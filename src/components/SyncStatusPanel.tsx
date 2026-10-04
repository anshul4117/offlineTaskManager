import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/index.js';
import { X, Layers, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncStatusPanel: React.FC<SyncStatusPanelProps> = ({ isOpen, onClose }) => {
  const outboxOps = useLiveQuery(() => db.outbox.orderBy('timestamp').toArray(), []);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        width: '100%',
        maxWidth: '700px',
        boxShadow: 'var(--shadow-main)',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} color="var(--accent-primary)" />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                IndexedDB Outbox Queue Inspector
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Live representation of uncommitted local mutation operations
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {!outboxOps || outboxOps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="var(--accent-success)" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '15px', fontWeight: 600 }}>Outbox queue is empty!</p>
              <p style={{ fontSize: '13px' }}>All local mutations have been safely synchronized to the SQLite server.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {outboxOps.map((op) => (
                <div
                  key={op.opId}
                  style={{
                    backgroundColor: 'var(--bg-dark)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: op.type === 'create'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : op.type === 'update'
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)',
                        color: op.type === 'create'
                          ? 'var(--accent-success)'
                          : op.type === 'update'
                          ? 'var(--accent-primary)'
                          : 'var(--accent-danger)'
                      }}>
                        {op.type}
                      </span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        opId: {op.opId.slice(0, 8)}...
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {new Date(op.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    <div>Record ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{op.recordId.slice(0, 8)}...</span></div>
                    <div>Base Version: <span style={{ fontWeight: 600, color: 'var(--accent-warning)' }}>v{op.baseVersion}</span></div>
                    <div>Title: <span style={{ color: 'var(--text-primary)' }}>{op.payload.title || '(Untitled)'}</span></div>
                    <div>Status: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{op.status}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
