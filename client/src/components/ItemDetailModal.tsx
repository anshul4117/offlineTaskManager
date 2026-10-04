import React from 'react';
import type { LocalRecord } from '../types/index.js';
import { X, Edit2, Trash2, Clock, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, FileText, CheckSquare } from 'lucide-react';

interface ItemDetailModalProps {
  isOpen: boolean;
  item: LocalRecord | null;
  onClose: () => void;
  onEdit: (item: LocalRecord) => void;
  onDelete: (item: LocalRecord) => void;
  onResolveConflict?: (item: LocalRecord) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  isOpen,
  item,
  onClose,
  onEdit,
  onDelete,
  onResolveConflict
}) => {
  if (!isOpen || !item) return null;

  const itemTypeName = item.type === 'note' ? 'Note' : 'Task';
  const formattedDate = new Date(item.updatedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const checksum = `#${item.id.slice(0, 8)}`;
  const payloadKb = Math.max(0.1, (item.content.length / 1024)).toFixed(1);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Top Navigation Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#fafaf9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              title="Back to List"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#ffffff',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: item.type === 'note' ? 'var(--accent-lime)' : 'var(--accent-purple-bg)',
                color: item.type === 'note' ? 'var(--accent-lime-text)' : 'var(--accent-purple-text)',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}>
                {item.type === 'note' ? <FileText size={12} /> : <CheckSquare size={12} />}
                {itemTypeName}
              </span>

              {item.conflict ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-red-bg)',
                  color: 'var(--accent-red-text)',
                  fontSize: '11px',
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
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-purple-bg)',
                  color: 'var(--accent-purple-text)',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  <Clock size={12} />
                  Pending Sync
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-green-bg)',
                  color: 'var(--accent-green-text)',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  <CheckCircle2 size={12} />
                  Synced (v{item.version})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Metadata Subheader Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px dashed var(--border-color)'
          }}>
            <span>Updated: <strong style={{ color: 'var(--text-secondary)' }}>{formattedDate}</strong></span>
            <span>ID: <strong style={{ color: 'var(--text-secondary)' }}>{checksum}</strong></span>
            <span>Payload: <strong style={{ color: 'var(--text-secondary)' }}>{payloadKb} KB</strong></span>
          </div>

          {/* Branch Conflict Warning Banner */}
          {item.conflict && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-red-bg)',
              border: '1px solid var(--accent-red-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-red-text)', marginBottom: '2px' }}>
                  Version Conflict Detected
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--accent-red-text)', opacity: 0.9 }}>
                  This record diverged between your local IndexedDB and server.
                </p>
              </div>

              {onResolveConflict && (
                <button
                  onClick={() => {
                    onClose();
                    onResolveConflict(item);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--text-primary)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <span>Resolve Conflict</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          {/* Read-Only Title */}
          <h1 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '16px',
            lineHeight: '1.3'
          }}>
            {item.title || '(Untitled Record)'}
          </h1>

          {/* Read-Only Content Container */}
          <div style={{
            backgroundColor: 'var(--bg-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            padding: '20px',
            minHeight: '140px',
            fontSize: '14px',
            color: 'var(--text-primary)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {item.content || <em style={{ color: 'var(--text-muted)' }}>No content provided.</em>}
          </div>
        </div>

        {/* Modal Action Footer Bar (Edit & Delete Bottom-Right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: '#fafaf9'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Delete Button (Bottom Right) */}
            <button
              onClick={() => onDelete(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-red-bg)',
                color: 'var(--accent-red-text)',
                border: '1px solid var(--accent-red-border)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>

            {/* Edit Button (Bottom Right) */}
            <button
              onClick={() => onEdit(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-lime)',
                color: 'var(--accent-lime-text)',
                border: '1px solid var(--accent-lime)',
                fontSize: '13px',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(210, 242, 74, 0.3)',
                cursor: 'pointer'
              }}
            >
              <Edit2 size={16} />
              <span>Edit {itemTypeName}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
