import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Server, HardDrive } from 'lucide-react';

interface HeaderProps {
  totalRecordsCount: number;
}

export const Header: React.FC<HeaderProps> = ({ totalRecordsCount }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isServerReachable, setIsServerReachable] = useState<boolean>(false);

  const checkHealth = async () => {
    if (!navigator.onLine) {
      setIsServerReachable(false);
      return;
    }
    try {
      const res = await fetch('/api/health');
      setIsServerReachable(res.ok);
    } catch {
      setIsServerReachable(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkHealth();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
    };

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
            Dexie IndexedDB Engine (Local Source of Truth)
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* IndexedDB Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          color: 'var(--accent-primary)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <HardDrive size={14} />
          <span>IndexedDB ({totalRecordsCount} records)</span>
        </div>

        {/* Network Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isOnline ? 'var(--accent-success)' : 'var(--accent-danger)',
          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
        </div>

        {/* Server Reachability */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: isServerReachable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: isServerReachable ? 'var(--accent-success)' : 'var(--accent-warning)',
          border: `1px solid ${isServerReachable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
        }}>
          <Server size={14} />
          <span>{isServerReachable ? 'Server Live' : 'Server Unreachable'}</span>
        </div>
      </div>
    </header>
  );
};
