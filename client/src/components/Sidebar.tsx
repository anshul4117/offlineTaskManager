import React from 'react';
import { Home, FileText, Clock, AlertTriangle, Trash2, Settings, HardDrive, X } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
  activeCount: number;
  pendingCount: number;
  conflictCount: number;
  trashCount: number;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeCount,
  pendingCount,
  conflictCount,
  trashCount,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const handleTabClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Semi-Transparent Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 199
          }}
        />
      )}

      <aside
        className={`sidebar-aside ${isMobileOpen ? 'is-mobile-open' : ''}`}
        style={{
          width: '240px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 16px',
          minHeight: '100vh',
          flexShrink: 0
        }}
      >
        {/* Top Branding & Navigation */}
        <div>
          {/* App Branding & Mobile Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', paddingLeft: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--text-primary)',
                color: 'var(--accent-lime)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '16px'
              }}>
                ≡
              </div>
              <div>
                <h1 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.2' }}>
                  SyncNote
                </h1>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  v2.4.0-offline
                </span>
              </div>
            </div>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="mobile-close-btn"
                title="Close Navigation"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>

        {/* Nav Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: 'all', label: 'Home', icon: Home, highlight: true },
            { id: 'all-notes', label: 'All Notes', icon: FileText, count: activeCount },
            { id: 'pending', label: 'Pending', icon: Clock, count: pendingCount, purple: pendingCount > 0 },
            { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle, count: conflictCount, red: conflictCount > 0 },
            { id: 'trash', label: 'Trash (Tombstones)', icon: Trash2, count: trashCount }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'all-notes' && activeTab === 'all');
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id === 'all-notes' ? 'all' : item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive
                    ? 'var(--accent-lime)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--accent-lime-text)'
                    : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '13px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>

                {item.count !== undefined && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    backgroundColor: item.red
                      ? 'var(--accent-red-bg)'
                      : item.purple
                      ? 'var(--accent-purple-bg)'
                      : isActive
                      ? 'rgba(0, 0, 0, 0.1)'
                      : 'rgba(0, 0, 0, 0.05)',
                    color: item.red
                      ? 'var(--accent-red-text)'
                      : item.purple
                      ? 'var(--accent-purple-text)'
                      : isActive
                      ? 'var(--accent-lime-text)'
                      : 'var(--text-muted)'
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Storage & Offline Simulation Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
        {/* Offline Simulation Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          borderRadius: 'var(--radius-md)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Simulate Offline
          </span>
          <button
            onClick={onToggleSimulatedOffline}
            style={{
              width: '38px',
              height: '20px',
              borderRadius: '10px',
              backgroundColor: isSimulatedOffline ? 'var(--accent-lime-text)' : '#cbd0c0',
              position: 'relative',
              padding: '2px',
              transition: 'background-color 0.2s'
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: isSimulatedOffline ? 'var(--accent-lime)' : '#ffffff',
              transform: isSimulatedOffline ? 'translateX(18px)' : 'translateX(0)',
              transition: 'transform 0.2s'
            }} />
          </button>
        </div>

        {/* IndexedDB Storage Meter */}
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>IndexedDB Storage</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>14.2 MB</span>
          </div>
          <div style={{
            height: '4px',
            borderRadius: '2px',
            backgroundColor: '#d8dbc8',
            overflow: 'hidden',
            marginBottom: '6px'
          }}>
            <div style={{ width: '28%', height: '100%', backgroundColor: 'var(--accent-lime-text)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Local Buffer</span>
            <span>50 MB Max</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
