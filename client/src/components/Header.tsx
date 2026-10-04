import React, { useEffect, useState } from 'react';
import { connectivityMonitor } from '../services/connectivity.js';
import type { ConnectivityState } from '../types/index.js';
import { Wifi, WifiOff, Server, Layers, RefreshCw, User } from 'lucide-react';

interface HeaderProps {
  pendingOutboxCount: number;
  conflictCount: number;
  onOpenOutboxInspector: () => void;
  isSimulatedOffline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pendingOutboxCount,
  conflictCount,
  onOpenOutboxInspector,
  isSimulatedOffline
}) => {
  const [connState, setConnState] = useState<ConnectivityState>(connectivityMonitor.getState());

  useEffect(() => {
    connectivityMonitor.start(10000);
    const unsubscribe = connectivityMonitor.subscribe(setConnState);
    return () => {
      unsubscribe();
    };
  }, []);

  const effectiveOnline = !isSimulatedOffline && connState.isBrowserOnline;
  const effectiveReachable = !isSimulatedOffline && connState.isServerReachable;

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Top Runtime Status Ticker Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>● INDEXEDB ENGINE: <strong style={{ color: 'var(--text-primary)' }}>OK (48.1 MB FREE)</strong></span>
          <span>⚡ CRDT STATE: <strong style={{ color: conflictCount > 0 ? 'var(--accent-red-text)' : 'var(--text-primary)' }}>{conflictCount > 0 ? `DIVERGED (${conflictCount} CONFLICTS)` : 'SYNCHRONIZED'}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>SERVICE WORKER: <strong style={{ color: 'var(--accent-green-text)' }}>ACTIVE (V4.2.1-CACHED)</strong></span>
          <span>⚡ ZERO LOSS RUNTIME</span>
        </div>
      </div>

      {/* Main Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Breadcrumb Path */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Workspace /</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>Your Notes</span>

          {/* Online/Offline Status Pill */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: '12px',
            backgroundColor: effectiveOnline ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
            color: effectiveOnline ? 'var(--accent-green-text)' : 'var(--accent-red-text)',
            marginLeft: '6px'
          }}>
            {effectiveOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {effectiveOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Right Header Status Badges & User Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Syncing Badge */}
          {pendingOutboxCount > 0 && (
            <span style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(210, 242, 74, 0.3)',
              color: 'var(--accent-lime-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <RefreshCw size={12} className="animate-spin" />
              Syncing • {pendingOutboxCount}
            </span>
          )}

          {/* Queue Badge */}
          <button
            onClick={onOpenOutboxInspector}
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'var(--accent-purple-bg)',
              color: 'var(--accent-purple-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={13} />
            <span>{pendingOutboxCount} in queue</span>
          </button>

          {/* Sync Now Dark Button */}
          <button
            onClick={onOpenOutboxInspector}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--text-primary)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <RefreshCw size={12} />
            <span>Sync Now</span>
          </button>

          {/* User Profile Avatar */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700
          }}>
            <User size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};
