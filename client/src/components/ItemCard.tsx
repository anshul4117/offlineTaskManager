import React from 'react';
import type { LocalRecord } from '../types/index.js';
import { Edit2, Trash2, FileText, CheckSquare, RotateCcw, Clock } from 'lucide-react';

interface ItemCardProps {
  item: LocalRecord;
  onEdit: (item: LocalRecord) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onRestore
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
        borderRadius: '16px',
        border: item.deleted
          ? '1px dashed var(--accent-danger)'
          : '1px solid var(--border-color)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        opacity: item.deleted ? 0.6 : 1,
        transition: 'transform 0.15s ease, border-color 0.15s ease'
      }}
    >
      <div>
        {/* Top Header Badges */}
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
              color: item.type === 'note' ? 'var(--accent-primary)' : '#8b5cf6'
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

          {/* Pending / Deleted Status Indicator */}
          <div>
            {item.deleted ? (
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: 'var(--accent-danger)'
              }}>
                Tombstone (Deleted)
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
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent-warning)'
              }}>
                <Clock size={12} />
                IndexedDB Local
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

        {/* Content Body */}
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          marginBottom: '16px',
          maxHeight: '140px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {item.content}
        </p>
      </div>

      {/* Footer Meta & Actions */}
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
          {item.deleted ? (
            onRestore && (
              <button
                onClick={() => onRestore(item.id)}
                title="Restore Record from Tombstone"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: 'var(--accent-success)',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <RotateCcw size={14} />
                Restore
              </button>
            )
          ) : (
            <>
              <button
                onClick={() => onEdit(item)}
                title="Edit Record"
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)'
                }}
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                title="Soft Delete (Tombstone)"
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--accent-danger)'
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
