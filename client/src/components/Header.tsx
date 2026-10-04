import React, { useEffect, useState } from 'react';
import { connectivityMonitor } from '../services/connectivity.js';
import type { ConnectivityState } from '../types/index.js';
import { Wifi, WifiOff, Server, RefreshCw, Layers } from 'lucide-react';

interface HeaderProps {
  pendingOutboxCount: number;
  onOpenOutboxInspector: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pendingOutboxCount,
  onOpenOutboxInspector
}) => {
  const [connState, setConnState] = useState<ConnectivityState>(connectivityMonitor.getState());

  useEffect(() => {
    connectivityMonitor.start(10000);
    const unsubscribe = connectivityMonitor.subscribe(setConnState);
    return () => {
      unsubscribe();
    };
  }, []);

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
      {/* Title / Branding */}
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
          fontWeight: 800,
          fontSize: '18px'
        }}>
          O
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Offline-First Notes & Tasks
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            IndexedDB Outbox Queue + Reachability Monitor
          </p>
        </div>
      </div>

      {/* Connectivity & Outbox Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Browser Network Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
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

        {/* Backend Server Reachability */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: connState.isServerReachable ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: connState.isServerReachable ? 'var(--accent-primary)' : 'var(--accent-warning)',
          border: `1px solid ${connState.isServerReachable ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
        }}>
          <Server size={14} />
          <span>{connState.isServerReachable ? 'Server Connected' : 'Server Unreachable'}</span>
        </div>

        {/* Outbox Inspector Toggle Button */}
        <button
          onClick={onOpenOutboxInspector}
          title="Inspect IndexedDB Outbox Queue"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-card-hover)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Layers size={15} />
          <span>Outbox</span>
          <span style={{
            backgroundColor: pendingOutboxCount > 0 ? 'var(--accent-warning)' : 'var(--bg-dark)',
            color: pendingOutboxCount > 0 ? '#000000' : 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '10px'
          }}>
            {pendingOutboxCount}
          </span>
        </button>

        {/* Sync Now Placeholder Button (Phase 5 Boundary) */}
        <button
          disabled={true}
          title="Sync Engine will be enabled in Phase 5"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: 'rgba(241, 245, 249, 0.6)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'not-allowed'
          }}
        >
          <RefreshCw size={14} />
          <span>Sync Now (Phase 5)</span>
        </button>
      </div>
    </header>
  );
};
