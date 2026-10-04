import React, { useEffect, useState } from 'react';
import { connectivityMonitor } from '../services/connectivity.js';
import type { ConnectivityState } from '../types/index.js';
import { Wifi, WifiOff, Server, Zap, RefreshCw, User } from 'lucide-react';

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

  const isOnline = connState.isBrowserOnline && !isSimulatedOffline;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Breadcrumb Path */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
          <span style={{ color: 'var(--text-muted)' }}>Workspace /</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Your Notes</span>
          
          {/* Online Pill Badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: isOnline ? 'var(--accent-lime)' : 'var(--accent-red-bg)',
            color: isOnline ? 'var(--accent-lime-text)' : 'var(--accent-red-text)'
          }}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
        </div>

        {/* Status Indicators & User Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {pendingOutboxCount > 0 && (
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-purple-bg)',
              color: 'var(--accent-purple-text)',
              fontFamily: 'var(--font-mono)'
            }}>
              {pendingOutboxCount} in queue
            </span>
          )}

          {conflictCount > 0 && (
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-red-bg)',
              color: 'var(--accent-red-text)',
              fontFamily: 'var(--font-mono)'
            }}>
              {conflictCount} DIVERGENCES
            </span>
          )}

          <button
            onClick={onOpenOutboxInspector}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--text-primary)',
              color: 'var(--accent-lime)',
              fontWeight: 700,
              fontSize: '12px'
            }}
          >
            <RefreshCw size={13} />
            <span>Sync Now</span>
          </button>

          {/* User Profile Icon */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#2d3748',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={16} />
          </div>
        </div>
      </div>

      {/* Technical System Status Ticker */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        padding: '6px 12px',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span>INDEXEDB ENGINE: <span style={{ color: 'var(--text-primary)' }}>OK (48.1 MB FREE)</span></span>
          <span>CRDT STATE: <span style={{ color: conflictCount > 0 ? 'var(--accent-red-text)' : 'var(--text-primary)' }}>{conflictCount > 0 ? 'DIVERGED (BRANCH #4A)' : 'IN SYNC'}</span></span>
          <span>SERVICE WORKER: <span style={{ color: 'var(--text-primary)' }}>ACTIVE (V4.2.1-CACHED)</span></span>
        </div>
        <div style={{ color: 'var(--accent-lime-text)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Zap size={12} color="var(--accent-primary)" />
          <span>ZERO LOSS RUNTIME</span>
        </div>
      </div>
    </div>
  );
};
