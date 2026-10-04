import React, { useState, useEffect } from 'react';
import type { LocalRecord, ItemType } from '../types/index.js';
import { MAX_CONTENT_LENGTH } from '../services/localDb.js';
import { X, FileText, CheckSquare, Save } from 'lucide-react';

interface ItemEditorModalProps {
  isOpen: boolean;
  initialType?: ItemType;
  editingItem?: LocalRecord | null;
  onClose: () => void;
  onSave: (title: string, content: string, type: ItemType, id?: string) => Promise<void>;
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  isOpen,
  initialType = 'note',
  editingItem,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<ItemType>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setContent(editingItem.content);
      setType(editingItem.type);
    } else {
      setTitle('');
      setContent('');
      setType(initialType);
    }
    setError(null);
  }, [editingItem?.id, initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() && !content.trim()) {
      setError('Please enter a title or content for your record.');
      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Content is too large! Maximum allowed is ${MAX_CONTENT_LENGTH.toLocaleString()} characters.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(title, content, type, editingItem?.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save record to IndexedDB.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentLength = content.length;
  const isNearLimit = contentLength > MAX_CONTENT_LENGTH * 0.9;

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editingItem ? 'Note Details & Editor' : `New ${type === 'note' ? 'Note' : 'Task'}`}
              </h2>
              {editingItem && (
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: editingItem.conflict
                    ? 'var(--accent-red-bg)'
                    : editingItem.pending
                    ? 'var(--accent-purple-bg)'
                    : 'var(--accent-green-bg)',
                  color: editingItem.conflict
                    ? 'var(--accent-red-text)'
                    : editingItem.pending
                    ? 'var(--accent-purple-text)'
                    : 'var(--accent-green-text)'
                }}>
                  {editingItem.conflict
                    ? 'Branch Conflict'
                    : editingItem.pending
                    ? 'Pending Sync'
                    : `Synced (v${editingItem.version})`}
                </span>
              )}
            </div>
            {editingItem && (
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Updated: {new Date(editingItem.updatedAt).toLocaleTimeString()} • #{editingItem.id.slice(0, 8)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-red-bg)',
              color: 'var(--accent-red-text)',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid var(--accent-red-border)'
            }}>
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setType('note')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: type === 'note' ? 'var(--accent-lime)' : 'var(--bg-light)',
                  color: type === 'note' ? 'var(--accent-lime-text)' : 'var(--text-secondary)',
                  border: `1px solid ${type === 'note' ? 'var(--accent-lime)' : 'var(--border-color)'}`,
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                <FileText size={16} />
                Note
              </button>
              <button
                type="button"
                onClick={() => setType('task')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: type === 'task' ? 'var(--accent-purple-bg)' : 'var(--bg-light)',
                  color: type === 'task' ? 'var(--accent-purple-text)' : 'var(--text-secondary)',
                  border: `1px solid ${type === 'task' ? 'var(--accent-purple-text)' : 'var(--border-color)'}`,
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                <CheckSquare size={16} />
                Task
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Title
            </label>
            <input
              type="text"
              placeholder="Enter title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Content Textarea & Counter */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Content
              </label>
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: isNearLimit ? 'var(--accent-red-text)' : 'var(--text-muted)',
                fontWeight: isNearLimit ? 700 : 400
              }}>
                {contentLength.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()} chars
              </span>
            </div>
            <textarea
              placeholder="Enter details..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                color: 'var(--text-primary)',
                border: isNearLimit ? '1px solid var(--accent-red-border)' : '1px solid var(--border-color)',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-lime)',
                color: 'var(--accent-lime-text)',
                fontSize: '13px',
                fontWeight: 800,
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving to IndexedDB...' : 'Save to IndexedDB'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
