import React, { useEffect, useState } from 'react';
import { Server, Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface HealthState {
  status: 'ok' | 'error' | 'loading';
  timestamp: string | null;
  database: string | null;
  errorDetails?: string;
}

export const App: React.FC = () => {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [healthState, setHealthState] = useState<HealthState>({
    status: 'loading',
    timestamp: null,
    database: null
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setHealthState({
          status: 'ok',
          timestamp: data.timestamp,
          database: data.database
        });
      } else {
        setHealthState({
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          errorDetails: `Server returned HTTP ${response.status}`
        });
      }
    } catch (err: any) {
      setHealthState({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'unreachable',
        errorDetails: err?.message || 'Network request failed'
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkHealth();

    const interval = setInterval(checkHealth, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '32px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Header Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '22px'
          }}>
            O
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Offline-First Notes & Tasks Manager
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Phase 2 — Foundation Shell & Health Monitor
            </p>
          </div>
        </div>

        {/* Status Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--bg-dark)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--border-color)',
          marginBottom: '24px'
        }}>
          {/* Browser Network Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isBrowserOnline ? <Wifi color="var(--accent-success)" size={18} /> : <WifiOff color="var(--accent-danger)" size={18} />}
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Browser Network</span>
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: isBrowserOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isBrowserOnline ? 'var(--accent-success)' : 'var(--accent-danger)'
            }}>
              {isBrowserOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          {/* Backend Server Health */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server color={healthState.status === 'ok' ? 'var(--accent-primary)' : 'var(--accent-warning)'} size={18} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Backend Server</span>
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: healthState.status === 'ok'
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
              color: healthState.status === 'ok'
                ? 'var(--accent-primary)'
                : 'var(--accent-warning)'
            }}>
              {healthState.status === 'ok' ? 'Connected' : 'Unreachable'}
            </span>
          </div>

          {/* Detailed Health Info */}
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '4px'
          }}>
            <div>Database Status: <strong style={{ color: 'var(--text-primary)' }}>{healthState.database || 'checking...'}</strong></div>
            <div>Last Health Check: <strong style={{ color: 'var(--text-primary)' }}>{healthState.timestamp ? new Date(healthState.timestamp).toLocaleTimeString() : 'N/A'}</strong></div>
            {healthState.errorDetails && (
              <div style={{ color: 'var(--accent-danger)', marginTop: '4px' }}>
                Error: {healthState.errorDetails}
              </div>
            )}
          </div>
        </div>

        {/* Refresh Action */}
        <button
          onClick={checkHealth}
          disabled={isChecking}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            opacity: isChecking ? 0.7 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
          <span>{isChecking ? 'Checking Health...' : 'Check Backend Health'}</span>
        </button>
      </div>
    </div>
  );
};
