import React from 'react';
import type { LocalRecord } from '../types/index.js';
import { Edit2, Trash2, RotateCcw, AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

interface ItemCardProps {
  item: LocalRecord;
  onEdit: (item: LocalRecord) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onResolveConflict?: (item: LocalRecord) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onRestore,
  onResolveConflict
}) => {
  const formattedDate = new Date(item.updatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generate deterministic technical tags for Stitch visual design
  const tagText = item.type === 'note' ? '#specs' : '#database';
  const checksum = `#${item.id.slice(0, 6)}`;

  return (
    <div
      onClick={() => onEdit(item)}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: item.conflict
          ? '1px solid var(--accent-red-border)'
          : item.pending
          ? '1px solid #d8b4fe'
          : '1px solid var(--border-color)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: 'var(--shadow-subtle)',
        opacity: item.deleted ? 0.6 : 1,
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
      }}
    >
      <div>
        {/* Card Top Header Pill Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div>
            {item.conflict ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-red-bg)',
                color: 'var(--accent-red-text)',
                fontWeight: 700
              }}>
                <AlertTriangle size={12} />
                Branch Conflict
              </span>
            ) : item.pending ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-purple-bg)',
                color: 'var(--accent-purple-text)',
                fontWeight: 700
              }}>
                <Clock size={12} />
                Pending • Queued in Outbox
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-green-bg)',
                color: 'var(--accent-green-text)',
                fontWeight: 700
              }}>
                <CheckCircle2 size={12} />
                Synced
              </span>
            )}
          </div>

          <div style={{ color: 'var(--text-muted)' }}>
            {formattedDate} • {item.version > 0 ? 'v' + item.version : 'offline'}
          </div>
        </div>

        {/* Conflict Divergence Banner (Stitch Spec) */}
        {item.conflict && (
          <div style={{
            margin: '8px 0 12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-red-bg)',
            border: '1px solid var(--accent-red-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--accent-red-text)', fontWeight: 600 }}>
              Diverged from MacBook Pro (2 diffs)
            </span>
            {onResolveConflict && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolveConflict(item);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--text-primary)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                Review
              </button>
            )}
          </div>
        )}

        {/* Title */}
        <h3 style={{
          fontSize: '16px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '8px',
          textDecoration: item.deleted ? 'line-through' : 'none'
        }}>
          {item.title || '(Untitled)'}
        </h3>

        {/* Content Body */}
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          marginBottom: '16px',
          maxHeight: '100px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {item.content}
        </p>
      </div>

      {/* Card Technical Metadata & Action Footer */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-color)',
          marginTop: '6px'
        }}>
          <div>Checksum: <strong style={{ color: 'var(--text-secondary)' }}>{checksum}</strong></div>
          <div style={{
            backgroundColor: '#f1f5f9',
            padding: '2px 6px',
            borderRadius: '4px',
            color: 'var(--text-secondary)'
          }}>
            {tagText}
          </div>
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          {item.conflict && onResolveConflict ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResolveConflict(item);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent-red-text)',
                backgroundColor: 'transparent'
              }}
            >
              <span>Resolving</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Payload: {Math.max(0.1, (item.content.length / 1024)).toFixed(1)} KB
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {item.deleted ? (
              onRestore && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(item.id);
                  }}
                  title="Restore Record from Tombstone"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--accent-green-bg)',
                    color: 'var(--accent-green-text)',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  <RotateCcw size={13} />
                  Restore
                </button>
              )
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  title="Edit Record"
                  style={{
                    padding: '5px',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  title="Soft Delete"
                  style={{
                    padding: '5px',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: 'var(--accent-red-text)'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
