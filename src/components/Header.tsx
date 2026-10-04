import React, { useEffect, useState } from 'react';
import { connectivityMonitor, type ConnectivityState } from '../services/connectivity.js';
import { syncEngine, type SyncEngineStatus } from '../services/syncEngine.js';
import { Wifi, WifiOff, RefreshCw, Server, AlertTriangle, Layers } from 'lucide-react';

interface HeaderProps {
  onToggleOutboxModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleOutboxModal }) => {
  const [connState, setConnState] = useState<ConnectivityState>(connectivityMonitor.getState());
  const [syncState, setSyncState] = useState<SyncEngineStatus>({
    status: 'idle',
    lastSyncedAt: null,
    lastError: null,
    pendingCount: 0
  });

  useEffect(() => {
    connectivityMonitor.start(8000);
    const unsubConn = connectivityMonitor.subscribe(setConnState);
    const unsubSync = syncEngine.subscribe(setSyncState);

    // Initial background sync check
    syncEngine.sync();

    return () => {
      unsubConn();
      unsubSync();
    };
  }, []);

  const handleManualSync = () => {
    syncEngine.sync();
  };

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '18px'
        }}>
          O
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Offline-First Manager
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            IndexedDB Local Engine + Server Sync
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Connectivity Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Browser Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: connState.isBrowserOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: connState.isBrowserOnline ? 'var(--accent-success)' : 'var(--accent-danger)',
            border: `1px solid ${connState.isBrowserOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {connState.isBrowserOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connState.isBrowserOnline ? 'Browser Online' : 'Browser Offline'}</span>
          </div>

          {/* Server Reachability */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: connState.isServerReachable ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: connState.isServerReachable ? 'var(--accent-primary)' : 'var(--accent-warning)',
            border: `1px solid ${connState.isServerReachable ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
          }}>
            <Server size={14} />
            <span>{connState.isServerReachable ? 'Server Online' : 'Server Unreachable'}</span>
          </div>
        </div>

        {/* Outbox Inspector Toggle */}
        <button
          onClick={onToggleOutboxModal}
          title="Inspect Outbox Operations Queue"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-card-hover)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <Layers size={15} />
          <span>Outbox</span>
          {syncState.pendingCount > 0 && (
            <span style={{
              backgroundColor: 'var(--accent-warning)',
              color: '#000',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '10px'
            }}>
              {syncState.pendingCount}
            </span>
          )}
        </button>

        {/* Manual Sync Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleManualSync}
            disabled={syncState.status === 'syncing'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              opacity: syncState.status === 'syncing' ? 0.7 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            <RefreshCw size={15} className={syncState.status === 'syncing' ? 'animate-spin' : ''} />
            <span>{syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Last sync: {formatLastSync(syncState.lastSyncedAt)}
          </div>
        </div>
      </div>
    </header>
  );
};
