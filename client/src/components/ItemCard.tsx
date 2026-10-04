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
  const timeAgo = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const payloadSizeKB = (Math.max(0.4, (item.content.length + item.title.length) / 1024)).toFixed(1);
  const tagLabel = item.type === 'note' ? '#specs' : '#database';

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: item.conflict
        ? '1px solid var(--accent-red-text)'
        : item.pending
        ? '1px solid #c084fc'
        : '1px solid var(--border-color)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
      opacity: item.deleted ? 0.6 : 1,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
    }}>
      <div>
        {/* Top Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          {/* Status Badge Pill */}
          <div>
            {item.conflict ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-red-bg)',
                color: 'var(--accent-red-text)',
                border: '1px solid var(--accent-red-text)'
              }}>
                <AlertTriangle size={12} />
                Branch Conflict
              </span>
            ) : item.pending ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-purple-bg)',
                color: 'var(--accent-purple-text)'
              }}>
                <Clock size={12} />
                Pending • Queued in Outbox
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-green-bg)',
                color: 'var(--accent-green-text)'
              }}>
                <CheckCircle2 size={12} />
                Synced
              </span>
            )}
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {timeAgo(item.updatedAt)} • offline
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '16px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '8px',
          lineHeight: '1.3',
          textDecoration: item.deleted ? 'line-through' : 'none'
        }}>
          {item.title || '(Untitled)'}
        </h3>

        {/* Content Snippet */}
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          marginBottom: '16px',
          maxHeight: '80px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {item.content}
        </p>

        {/* Conflict Warning Box */}
        {item.conflict && item.serverRecord && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-red-bg)',
            color: 'var(--accent-red-text)',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Diverged from MacBook Pro (2 diffs)</span>
            {onResolveConflict && (
              <button
                onClick={() => onResolveConflict(item)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-red-text)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '11px'
                }}
              >
                Review
              </button>
            )}
          </div>
        )}
      </div>

      {/* Monospace Footer Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-color)',
        marginTop: '8px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Payload: {payloadSizeKB} KB</span>
          <span style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-light)',
            color: 'var(--text-secondary)',
            fontWeight: 700
          }}>
            {tagLabel}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.deleted ? (
            onRestore && (
              <button
                onClick={() => onRestore(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--accent-green-text)',
                  fontWeight: 800
                }}
              >
                <RotateCcw size={13} />
                Restore
              </button>
            )
          ) : (
            <>
              <button
                onClick={() => onEdit(item)}
                title="Edit Note"
                style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)' }}
              >
                <Edit2 size={15} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                title="Trash Note"
                style={{ backgroundColor: 'transparent', color: 'var(--accent-red-text)' }}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
