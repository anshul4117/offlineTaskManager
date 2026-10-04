import React from 'react';
import {
  CheckCircle2,
  WifiOff,
  Clock,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  HardDrive,
  Cloud,
  CloudOff,
  Check,
  RotateCcw,
  ArrowRight,
  Wifi,
  Layers
} from 'lucide-react';

export type SyncHeroState = 'synced' | 'offline' | 'pending' | 'syncing' | 'conflict' | 'error';

export interface SyncSummaryWidgetProps {
  totalNotesCount: number;
  pendingCount: number;
  conflictCount: number;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing?: boolean;
  isError?: boolean;
  lastSyncedAt?: string | null;
  forcedState?: SyncHeroState; // Optional dev state preview toggle
  onToggleSimulatedOffline?: () => void;
  onOpenOutboxInspector: () => void;
  onSyncNow?: () => void;
  onResolveConflict?: () => void;
}

function getRelativeTimeString(isoDateString?: string | null): { relative: string; exact: string } {
  if (!isoDateString) return { relative: 'Never', exact: 'Not synced yet' };
  try {
    const date = new Date(isoDateString);
    const exact = date.toLocaleString();
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 30) return { relative: 'Just now', exact };
    if (diffSec < 60) return { relative: '1 min ago', exact };
    if (diffMin < 60) return { relative: `${diffMin} min ago`, exact };
    if (diffHour < 24) return { relative: `${diffHour} hr${diffHour === 1 ? '' : 's'} ago`, exact };
    return { relative: `${diffDay} day${diffDay === 1 ? '' : 's'} ago`, exact };
  } catch {
    return { relative: 'Unknown', exact: '' };
  }
}

export const SyncSummaryWidget: React.FC<SyncSummaryWidgetProps> = ({
  totalNotesCount,
  pendingCount,
  conflictCount,
  isOnline,
  isSimulatedOffline,
  isSyncing = false,
  isError = false,
  lastSyncedAt,
  forcedState,
  onToggleSimulatedOffline,
  onOpenOutboxInspector,
  onSyncNow,
  onResolveConflict
}) => {
  // Determine effective hero state
  const effectiveState: SyncHeroState = forcedState || (
    conflictCount > 0
      ? 'conflict'
      : (isSimulatedOffline || !isOnline)
      ? 'offline'
      : isError
      ? 'error'
      : isSyncing
      ? 'syncing'
      : pendingCount > 0
      ? 'pending'
      : 'synced'
  );

  const effectiveOnline = !isSimulatedOffline && isOnline;
  const timeInfo = getRelativeTimeString(lastSyncedAt);

  // Content configurations per state
  const stateConfigs = {
    synced: {
      pillText: 'Synced',
      pillIcon: <CheckCircle2 size={13} />,
      pillStyle: { backgroundColor: 'rgba(74, 222, 128, 0.18)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' },
      headline: "You're all caught up",
      subtext: 'Everything is saved on this device and in the cloud.',
      buttonText: 'Sync now',
      buttonStyle: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' },
      buttonDisabled: false
    },
    offline: {
      pillText: 'Offline',
      pillIcon: <WifiOff size={13} />,
      pillStyle: { backgroundColor: 'rgba(161, 161, 170, 0.2)', color: '#d4d4d8', border: '1px solid rgba(161, 161, 170, 0.3)' },
      headline: "You're offline",
      subtext: 'Your work is safe on this device. It will sync when you\'re back online.',
      buttonText: 'Sync now',
      buttonStyle: { backgroundColor: '#3f3f46', color: '#a1a1aa', border: '1px solid #52525b' },
      buttonDisabled: true
    },
    pending: {
      pillText: `Pending (${pendingCount})`,
      pillIcon: <Clock size={13} />,
      pillStyle: { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' },
      headline: `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`,
      subtext: "They'll upload automatically when you're online.",
      buttonText: 'Sync now',
      buttonStyle: { backgroundColor: 'var(--accent-lime)', color: 'var(--accent-lime-text)', border: '1px solid var(--accent-lime)' },
      buttonDisabled: false
    },
    syncing: {
      pillText: 'Syncing',
      pillIcon: <RefreshCw size={13} className="animate-spin" />,
      pillStyle: { backgroundColor: 'rgba(212, 232, 106, 0.2)', color: 'var(--accent-lime)', border: '1px solid rgba(212, 232, 106, 0.3)' },
      headline: `Syncing ${pendingCount > 0 ? pendingCount : 1} change${pendingCount === 1 ? '' : 's'}...`,
      subtext: 'Please keep the app open.',
      buttonText: 'Syncing...',
      buttonStyle: { backgroundColor: 'rgba(212, 232, 106, 0.3)', color: 'var(--accent-lime)', border: '1px solid rgba(212, 232, 106, 0.4)' },
      buttonDisabled: true
    },
    conflict: {
      pillText: `Conflict (${conflictCount})`,
      pillIcon: <AlertTriangle size={13} />,
      pillStyle: { backgroundColor: 'rgba(255, 122, 89, 0.2)', color: '#FF7A59', border: '1px solid rgba(255, 122, 89, 0.4)' },
      headline: `${conflictCount} note${conflictCount === 1 ? '' : 's'} need${conflictCount === 1 ? 's' : ''} your decision`,
      subtext: 'Edited on two devices. Nothing is overwritten until you choose.',
      buttonText: 'Review conflict',
      buttonStyle: { backgroundColor: '#FF7A59', color: '#ffffff', border: '1px solid #FF7A59' },
      buttonDisabled: false
    },
    error: {
      pillText: 'Server Unavailable',
      pillIcon: <AlertCircle size={13} />,
      pillStyle: { backgroundColor: 'rgba(255, 122, 89, 0.2)', color: '#FF7A59', border: '1px solid rgba(255, 122, 89, 0.4)' },
      headline: "Couldn't reach the server",
      subtext: "We'll retry automatically. Your changes are safe.",
      buttonText: 'Retry now',
      buttonStyle: { backgroundColor: '#FF7A59', color: '#ffffff', border: '1px solid #FF7A59' },
      buttonDisabled: false
    }
  };

  const currentCfg = stateConfigs[effectiveState];

  const handlePrimaryButtonClick = () => {
    if (effectiveState === 'conflict' && onResolveConflict) {
      onResolveConflict();
    } else if (onSyncNow) {
      onSyncNow();
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#1C1C1E',
        color: '#ffffff',
        borderRadius: '28px',
        padding: '28px',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {/* 2-Column Responsive Layout Wrapper */}
      <div className="sync-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Left Column: Top status pill, Headline, Subtext, Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Top Row: Sync status label & Status pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.02em' }}>
                Sync status
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  ...currentCfg.pillStyle
                }}
              >
                {currentCfg.pillIcon}
                <span>{currentCfg.pillText}</span>
              </span>
            </div>

            {/* Headline with aria-live & Subtext */}
            <div aria-live="polite" style={{ marginBottom: '20px' }}>
              <h2
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: '1.25',
                  marginBottom: '8px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {currentCfg.headline}
              </h2>
              <p style={{ fontSize: '14px', color: '#d4d4d8', lineHeight: '1.5', opacity: 0.9 }}>
                {currentCfg.subtext}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePrimaryButtonClick}
                disabled={currentCfg.buttonDisabled}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: 800,
                  minHeight: '44px',
                  cursor: currentCfg.buttonDisabled ? 'not-allowed' : 'pointer',
                  opacity: currentCfg.buttonDisabled ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                  ...currentCfg.buttonStyle
                }}
              >
                {effectiveState === 'syncing' ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : effectiveState === 'conflict' ? (
                  <AlertTriangle size={16} />
                ) : effectiveState === 'error' ? (
                  <RotateCcw size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
                <span>{currentCfg.buttonText}</span>
              </button>

              <button
                type="button"
                onClick={onOpenOutboxInspector}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--accent-lime)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '8px 4px',
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px'
                }}
              >
                View pending changes ({pendingCount})
              </button>
            </div>

            {effectiveState === 'offline' && (
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                Available when you're online
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Visual Journey Pipeline & Stat Chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Visual 3-Node Journey Pipeline */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              {/* Node 1: This Device */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, textOverflow: 'ellipsis' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(212, 232, 106, 0.2)',
                    color: 'var(--accent-lime)',
                    border: '1px solid var(--accent-lime)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px'
                  }}
                >
                  <HardDrive size={18} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>This device</span>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>
                  {totalNotesCount} notes
                </span>
              </div>

              {/* Connecting Line 1 (Node 1 -> Node 2) */}
              <div style={{ flex: 1, height: '2px', margin: '0 8px', position: 'relative', top: '-14px' }}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: effectiveState === 'offline' ? '#52525b' : 'var(--accent-lime)',
                    borderStyle: effectiveState === 'offline' ? 'dashed' : 'solid'
                  }}
                />
              </div>

              {/* Node 2: Waiting to sync */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: pendingCount > 0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    color: pendingCount > 0 ? '#fbbf24' : '#a1a1aa',
                    border: `1px solid ${pendingCount > 0 ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    position: 'relative'
                  }}
                >
                  {effectiveState === 'syncing' ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Clock size={18} />
                  )}
                  {pendingCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        backgroundColor: '#f59e0b',
                        color: '#1c1c1e',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '10px',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>Waiting</span>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>
                  {pendingCount} change{pendingCount === 1 ? '' : 's'}
                </span>
              </div>

              {/* Connecting Line 2 (Node 2 -> Node 3) */}
              <div style={{ flex: 1, height: '2px', margin: '0 8px', position: 'relative', top: '-14px' }}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor:
                      effectiveState === 'synced'
                        ? 'var(--accent-lime)'
                        : effectiveState === 'conflict' || effectiveState === 'error'
                        ? '#FF7A59'
                        : '#52525b',
                    borderStyle: effectiveState === 'synced' ? 'solid' : 'dashed'
                  }}
                />
              </div>

              {/* Node 3: Cloud */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor:
                      effectiveState === 'synced'
                        ? 'rgba(74, 222, 128, 0.2)'
                        : effectiveState === 'conflict' || effectiveState === 'error'
                        ? 'rgba(255, 122, 89, 0.2)'
                        : 'rgba(255, 255, 255, 0.08)',
                    color:
                      effectiveState === 'synced'
                        ? '#4ade80'
                        : effectiveState === 'conflict' || effectiveState === 'error'
                        ? '#FF7A59'
                        : '#a1a1aa',
                    border: `1px solid ${
                      effectiveState === 'synced'
                        ? '#4ade80'
                        : effectiveState === 'conflict' || effectiveState === 'error'
                        ? '#FF7A59'
                        : 'rgba(255, 255, 255, 0.2)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    position: 'relative'
                  }}
                >
                  {effectiveOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
                  {effectiveState === 'conflict' && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        backgroundColor: '#FF7A59',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '10px'
                      }}
                    >
                      !
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>Cloud</span>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                  {effectiveOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Three Stat Chips Row */}
          <div className="sync-stat-chips" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {/* Stat Chip 1 */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}>Saved on device</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
                {totalNotesCount} notes
              </div>
            </div>

            {/* Stat Chip 2 */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}>Waiting to sync</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
                {pendingCount} changes
              </div>
            </div>

            {/* Stat Chip 3 */}
            <div
              title={timeInfo.exact}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}>Last synced</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
                {timeInfo.relative}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
