import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface BulkDeleteConfirmationModalProps {
  isOpen: boolean;
  mode: 'selected' | 'clear_all';
  count: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const BulkDeleteConfirmationModal: React.FC<BulkDeleteConfirmationModalProps> = ({
  isOpen,
  mode,
  count,
  onClose,
  onConfirm
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || count <= 0) return null;

  const isClearAll = mode === 'clear_all';
  const title = isClearAll ? 'Clear all trash?' : `Delete ${count} item${count === 1 ? '' : 's'} permanently?`;
  const message = isClearAll
    ? `All ${count} deleted item${count === 1 ? '' : 's'} will be permanently removed from IndexedDB.`
    : `The ${count} selected item${count === 1 ? '' : 's'} will be permanently removed from IndexedDB.`;

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('[BulkDeleteConfirmationModal] Error executing purge:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
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
          maxWidth: '440px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          padding: '24px',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-red-bg)',
            color: 'var(--accent-red-text)',
            border: '1px solid var(--accent-red-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={22} />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {title}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {message}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
              This action cannot be undone. Restoring these items will no longer be possible.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Buttons Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
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
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-red-bg)',
              color: 'var(--accent-red-text)',
              border: '1px solid var(--accent-red-border)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              opacity: isProcessing ? 0.7 : 1
            }}
          >
            <Trash2 size={16} />
            <span>{isProcessing ? 'Deleting...' : isClearAll ? 'Clear All Trash' : 'Delete Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
