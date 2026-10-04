import React from 'react';
import { FolderPlus, FileText } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onCreateNew?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records in IndexedDB',
  description = 'Create a new note or task. All changes save directly to local storage.',
  onCreateNew
}) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: 'var(--bg-card)',
      borderRadius: '16px',
      border: '1px dashed var(--border-color)',
      color: 'var(--text-muted)'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        backgroundColor: 'var(--bg-dark)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        color: 'var(--accent-primary)'
      }}>
        <FileText size={28} />
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {title}
      </h3>
      <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '360px', margin: '6px auto 20px' }}>
        {description}
      </p>

      {onCreateNew && (
        <button
          onClick={onCreateNew}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <FolderPlus size={16} />
          Create First Record
        </button>
      )}
    </div>
  );
};
