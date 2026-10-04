import React from 'react';
import type { LocalRecord } from '../types/index.js';
import { Edit2, Trash2, AlertTriangle, Clock, CheckCircle2, RotateCcw, FileText, CheckSquare } from 'lucide-react';

interface ItemCardProps {
  item: LocalRecord;
  onEdit: (item: LocalRecord) => void;
  onDelete: (id: string) => void;
  onResolveConflict: (item: LocalRecord) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onResolveConflict
}) => {
  const formattedDate = new Date(item.updatedAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: item.conflict
          ? '1px solid var(--accent-danger)'
          : item.pending
          ? '1px solid rgba(245, 158, 11, 0.4)'
          : '1px solid var(--border-color)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: 'var(--shadow-main)',
        opacity: item.deleted ? 0.6 : 1,
        transition: 'transform 0.15s ease, border-color 0.15s ease'
      }}
    >
      {/* Top Metadata Row */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Type Badge */}
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: item.type === 'note' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
              color: item.type === 'note' ? 'var(--accent-primary)' : 'var(--accent-purple)'
            }}>
              {item.type === 'note' ? <FileText size={12} /> : <CheckSquare size={12} />}
              {item.type}
            </span>

            {/* Version Badge */}
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-dark)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)'
            }}>
              v{item.version}
            </span>
          </div>

          {/* Sync Status Badge */}
          <div>
            {item.conflict ? (
              <span
                onClick={() => onResolveConflict(item)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: 'var(--accent-danger)',
                  cursor: 'pointer',
                  border: '1px solid var(--accent-danger)'
                }}
              >
                <AlertTriangle size={12} />
                Conflict! Resolve
              </span>
            ) : item.pending ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent-warning)'
              }}>
                <Clock size={12} />
                Unsynced
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-success)'
              }}>
                <CheckCircle2 size={12} />
                Synced
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '8px',
          textDecoration: item.deleted ? 'line-through' : 'none'
        }}>
          {item.title || '(Untitled)'}
        </h3>

        {/* Content */}
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          marginBottom: '16px',
          maxHeight: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {item.content}
        </p>
      </div>

      {/* Card Footer Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-color)',
        marginTop: '8px'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {formattedDate}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.conflict ? (
            <button
              onClick={() => onResolveConflict(item)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-danger)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '12px'
              }}
            >
              Resolve
            </button>
          ) : (
            <>
              {!item.deleted && (
                <button
                  onClick={() => onEdit(item)}
                  title="Edit Record"
                  style={{
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    transition: 'color 0.2s'
                  }}
                >
                  <Edit2 size={16} />
                </button>
              )}

              <button
                onClick={() => onDelete(item.id)}
                title={item.deleted ? 'Permanently Delete' : 'Soft Delete'}
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--accent-danger)',
                  transition: 'color 0.2s'
                }}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
