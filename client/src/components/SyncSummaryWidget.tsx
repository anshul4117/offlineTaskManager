import React from 'react';
import { RefreshCw, Zap, ShieldCheck, Database } from 'lucide-react';

interface SyncSummaryWidgetProps {
  totalNotesCount: number;
  pendingCount: number;
  conflictCount: number;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onOpenOutboxInspector: () => void;
}

export const SyncSummaryWidget: React.FC<SyncSummaryWidgetProps> = ({
  totalNotesCount,
  pendingCount,
  conflictCount,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onOpenOutboxInspector
}) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-dark-banner)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      color: '#ffffff',
      boxShadow: 'var(--shadow-banner)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header Status Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: isOnline && !isSimulatedOffline ? 'var(--accent-lime)' : 'var(--accent-red-bg)',
            color: isOnline && !isSimulatedOffline ? 'var(--accent-lime-text)' : 'var(--accent-red-text)',
            fontSize: '12px',
            fontWeight: 800
          }}>
            <Zap size={13} />
            {isSimulatedOffline
              ? 'Offline Mode'
              : pendingCount > 0
              ? `Syncing • ${pendingCount} in queue`
              : 'IndexedDB Live'}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            P2P MESH BUFFER
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          <ShieldCheck size={14} color="var(--accent-lime)" />
          <span>ZERO DATA LOSS RUNTIME</span>
        </div>
      </div>

      {/* Main Stats Row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
          Local IndexedDB: <strong style={{ color: '#ffffff', fontSize: '16px' }}>{totalNotesCount} notes saved</strong>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-lime)', fontFamily: 'var(--font-mono)' }}>
          {pendingCount} queued commits
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '8px',
        width: '100%',
        backgroundColor: '#2d3748',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '20px',
        display: 'flex'
      }}>
        <div style={{
          width: `${Math.max(10, Math.min(100, (totalNotesCount / (totalNotesCount + pendingCount || 1)) * 100))}%`,
          backgroundColor: 'var(--accent-lime)',
          height: '100%',
          transition: 'width 0.3s ease'
        }} />
        {pendingCount > 0 && (
          <div style={{
            width: `${Math.min(50, pendingCount * 15)}%`,
            backgroundColor: 'var(--accent-purple-bg)',
            height: '100%'
          }} />
        )}
      </div>

      {/* Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenOutboxInspector}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-lime)',
              color: 'var(--accent-lime-text)',
              fontWeight: 800,
              fontSize: '13px'
            }}
          >
            <RefreshCw size={14} />
            <span>Sync Queue</span>
          </button>

          <button
            onClick={onToggleSimulatedOffline}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <span>{isSimulatedOffline ? 'Go Online' : 'Simulate Offline'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          <span>Last synced 2 min ago</span>
          <span>IndexedDB v4 / Store #09</span>
        </div>
      </div>
    </div>
  );
};
