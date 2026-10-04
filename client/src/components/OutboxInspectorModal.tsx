import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/index.js';
import { X, Layers, CheckCircle2, Clock, Info } from 'lucide-react';

interface OutboxInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OutboxInspectorModal: React.FC<OutboxInspectorModalProps> = ({ isOpen, onClose }) => {
  const outboxOps = useLiveQuery(() => db.outbox.orderBy('timestamp').toArray(), []);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        width: '100%',
        maxWidth: '720px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} color="var(--accent-primary)" />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                IndexedDB Outbox Operations Queue
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Phase 4 — Live Outbox Mutation Operations Queue
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {!outboxOps || outboxOps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={40} color="var(--accent-success)" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '15px', fontWeight: 600 }}>Outbox Queue is empty</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                Create, edit, or delete notes to generate queued outbox operations.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent-primary)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <Info size={16} />
                <span>
                  Showing {outboxOps.length} queued mutation {outboxOps.length === 1 ? 'operation' : 'operations'}. Operations coalesce automatically.
                </span>
              </div>

              {outboxOps.map((op) => (
                <div
                  key={op.opId}
                  style={{
                    backgroundColor: 'var(--bg-dark)',
                    borderRadius: '10px',
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
                        padding: '2px 8px',
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
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {new Date(op.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    <div>Record ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{op.recordId.slice(0, 8)}...</span></div>
                    <div>Base Version: <span style={{ fontWeight: 600, color: 'var(--accent-warning)' }}>v{op.baseVersion}</span></div>
                    <div>Title: <span style={{ color: 'var(--text-primary)' }}>{op.payload.title || '(Untitled)'}</span></div>
                    <div>Status: <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--accent-warning)' }}>{op.status}</span></div>
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
