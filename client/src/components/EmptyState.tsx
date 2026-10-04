import React from 'react';
import { FolderPlus, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  type?: 'notes' | 'pending' | 'conflicts' | 'trash' | 'search';
  onCreateNew?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'Create a new note or task. All changes save directly to local storage.',
  type = 'notes',
  onCreateNew
}) => {
  const getIcon = () => {
    switch (type) {
      case 'pending':
        return <Clock size={28} color="var(--accent-purple-text)" />;
      case 'conflicts':
        return <CheckCircle2 size={28} color="var(--accent-green-text)" />;
      case 'trash':
        return <FileText size={28} color="var(--text-muted)" />;
      default:
        return <FileText size={28} color="var(--accent-lime-text)" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'pending':
        return 'var(--accent-purple-bg)';
      case 'conflicts':
        return 'var(--accent-green-bg)';
      default:
        return 'var(--bg-sidebar)';
    }
  };

  return (
    <div style={{
      textAlign: 'center',
      padding: '56px 24px',
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border-color)',
      color: 'var(--text-secondary)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: getBgColor(),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        {getIcon()}
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '380px', margin: '6px auto 20px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
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
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-lime)',
            color: 'var(--accent-lime-text)',
            fontWeight: 800,
            fontSize: '13px',
            boxShadow: '0 2px 8px rgba(210, 242, 74, 0.4)'
          }}
        >
          <FolderPlus size={16} />
          <span>Create Note</span>
        </button>
      )}
    </div>
  );
};
