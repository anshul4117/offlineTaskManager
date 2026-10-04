import React from 'react';
import { RefreshCw, Shield, AlertTriangle, Layers } from 'lucide-react';

interface SyncSummaryWidgetProps {
  totalNotesCount: number;
  pendingCount: number;
  conflictCount: number;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing?: boolean;
  onToggleSimulatedOffline: () => void;
  onOpenOutboxInspector: () => void;
  onSyncNow?: () => void;
}

export const SyncSummaryWidget: React.FC<SyncSummaryWidgetProps> = ({
  totalNotesCount,
  pendingCount,
  conflictCount,
  isOnline,
  isSimulatedOffline,
  isSyncing = false,
  onToggleSimulatedOffline,
  onOpenOutboxInspector,
  onSyncNow
}) => {
  const getStatusLabel = () => {
    if (isSimulatedOffline) return 'Offline Mode (Local Storage Active)';
    if (conflictCount > 0) return `Conflict Detected • ${conflictCount} in conflict`;
    if (isSyncing) return `Syncing • Processing queue...`;
    if (pendingCount > 0) return `Pending • ${pendingCount} in queue`;
    return 'Synced • All changes persistent';
  };

  const getStatusColor = () => {
    if (isSimulatedOffline) return { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171' };
    if (conflictCount > 0) return { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171' };
    if (isSyncing || pendingCount > 0) return { bg: 'rgba(210, 242, 74, 0.2)', text: 'var(--accent-lime)' };
    return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399' };
  };

  const statusColors = getStatusColor();

  return (
    <div style={{
      backgroundColor: 'var(--bg-dark-banner)',
      color: 'var(--text-dark-banner)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        {/* Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: statusColors.bg,
            color: statusColors.text,
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'currentColor'
            }} />
            {getStatusLabel()}
          </span>

          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            P2P MESH BUFFER
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenOutboxInspector}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <Layers size={14} />
            <span>{pendingCount} in queue</span>
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
        <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
          Local IndexedDB: <strong style={{ color: '#ffffff' }}>{totalNotesCount} notes saved</strong>
        </span>
        <span style={{ fontSize: '13px', color: 'var(--accent-lime)' }}>
          {pendingCount} queued commits
        </span>
      </div>

      {/* Dual Progress Meter */}
      <div style={{
        height: '6px',
        borderRadius: '3px',
        backgroundColor: '#2d3440',
        overflow: 'hidden',
        marginBottom: '20px',
        display: 'flex'
      }}>
        <div style={{
          width: totalNotesCount > 0 ? `${Math.min(100, (totalNotesCount / (totalNotesCount + pendingCount)) * 100)}%` : '70%',
          backgroundColor: '#38bdf8'
        }} />
        <div style={{
          width: pendingCount > 0 ? `${Math.min(100, (pendingCount / (totalNotesCount + pendingCount)) * 100)}%` : '30%',
          backgroundColor: 'var(--accent-lime)'
        }} />
      </div>

      {/* Button Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onSyncNow || onOpenOutboxInspector}
            disabled={isSyncing || isSimulatedOffline}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isSyncing || isSimulatedOffline ? '#475569' : 'var(--accent-lime)',
              color: isSyncing || isSimulatedOffline ? '#94a3b8' : 'var(--accent-lime-text)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isSyncing || isSimulatedOffline ? 'not-allowed' : 'pointer',
              opacity: isSyncing || isSimulatedOffline ? 0.7 : 1
            }}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <button
            onClick={onToggleSimulatedOffline}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            {isSimulatedOffline ? 'Go Online' : 'Simulate Offline'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          <Shield size={14} color="var(--accent-lime)" />
          <span>Zero data loss runtime</span>
        </div>
      </div>

      {/* Sub Footer Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #2d3440', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
        <span>Last synced 2 min ago</span>
        <span>IndexedDB v4 / Store #09</span>
      </div>
    </div>
  );
};
