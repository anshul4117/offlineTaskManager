import React, { useState, useEffect } from 'react';
import type { LocalRecord, ItemType } from '../types/index.js';
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
  }, [editingItem, initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() && !content.trim()) {
      setError('Please provide a title or content.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(title.trim(), content.trim(), type, editingItem?.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save record.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        width: '100%',
        maxWidth: '520px',
        boxShadow: 'var(--shadow-main)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {editingItem ? 'Edit Item' : `New ${type === 'note' ? 'Note' : 'Task'}`}
          </h2>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--accent-danger)',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Item Type
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
                  backgroundColor: type === 'note' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-dark)',
                  color: type === 'note' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${type === 'note' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  fontWeight: 600,
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
                  backgroundColor: type === 'task' ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-dark)',
                  color: type === 'task' ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  border: `1px solid ${type === 'task' ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                  fontWeight: 600,
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
                backgroundColor: 'var(--bg-dark)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Content Textarea */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Content / Details
            </label>
            <textarea
              placeholder="Enter details..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-dark)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
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
                backgroundColor: 'transparent',
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
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
