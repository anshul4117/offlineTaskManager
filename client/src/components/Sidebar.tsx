import React from 'react';
import { Home, FileText, Clock, AlertTriangle, Trash2, HardDrive, ToggleLeft, ToggleRight, Layers } from 'lucide-react';

interface SidebarProps {
  activeTab: 'all' | 'notes' | 'tasks' | 'pending' | 'conflicts' | 'trash';
  onSelectTab: (tab: 'all' | 'notes' | 'tasks' | 'pending' | 'conflicts' | 'trash') => void;
  activeCount: number;
  pendingCount: number;
  conflictCount: number;
  trashCount: number;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeCount,
  pendingCount,
  conflictCount,
  trashCount,
  isSimulatedOffline,
  onToggleSimulatedOffline
}) => {
  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px 16px',
      minHeight: '100vh',
      flexShrink: 0
    }}>
      {/* Top Header & Brand */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-lime)',
            fontWeight: 800,
            fontSize: '18px'
          }}>
            <Layers size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.2' }}>
              SyncNote
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              v2.4.0-offline
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Home / All Notes */}
          <button
            onClick={() => onSelectTab('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeTab === 'all' ? 'var(--accent-lime)' : 'transparent',
              color: activeTab === 'all' ? 'var(--accent-lime-text)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'all' ? 700 : 600,
              fontSize: '13px',
              transition: 'background-color 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Home size={16} />
              <span>Home</span>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'all' ? 'rgba(0,0,0,0.1)' : 'var(--bg-light)',
              color: activeTab === 'all' ? 'var(--accent-lime-text)' : 'var(--text-muted)'
            }}>
              {activeCount}
            </span>
          </button>

          {/* All Notes Filter */}
          <button
            onClick={() => onSelectTab('notes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeTab === 'notes' ? 'var(--accent-lime)' : 'transparent',
              color: activeTab === 'notes' ? 'var(--accent-lime-text)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'notes' ? 700 : 600,
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={16} />
              <span>All Notes</span>
            </div>
          </button>

          {/* Pending Outbox Queue */}
          <button
            onClick={() => onSelectTab('pending')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeTab === 'pending' ? 'var(--accent-purple-bg)' : 'transparent',
              color: activeTab === 'pending' ? 'var(--accent-purple-text)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'pending' ? 700 : 600,
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={16} />
              <span>Pending</span>
            </div>
            {pendingCount > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: 'var(--accent-purple-bg)',
                color: 'var(--accent-purple-text)'
              }}>
                {pendingCount}
              </span>
            )}
          </button>

          {/* Conflicts */}
          <button
            onClick={() => onSelectTab('conflicts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeTab === 'conflicts' ? 'var(--accent-red-bg)' : 'transparent',
              color: activeTab === 'conflicts' ? 'var(--accent-red-text)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'conflicts' ? 700 : 600,
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={16} />
              <span>Conflicts</span>
            </div>
            {conflictCount > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: 'var(--accent-red-bg)',
                color: 'var(--accent-red-text)'
              }}>
                {conflictCount}
              </span>
            )}
          </button>

          {/* Trash */}
          <button
            onClick={() => onSelectTab('trash')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeTab === 'trash' ? 'var(--bg-light)' : 'transparent',
              color: activeTab === 'trash' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'trash' ? 700 : 600,
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trash2 size={16} />
              <span>Trash</span>
            </div>
            {trashCount > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-light)',
                color: 'var(--text-muted)'
              }}>
                {trashCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Footer Storage Meter & Offline Toggle */}
      <div style={{
        paddingTop: '16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Simulate Offline Toggle */}
        <div
          onClick={onToggleSimulatedOffline}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-light)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700
          }}
        >
          <span>Simulate Offline</span>
          {isSimulatedOffline ? (
            <ToggleRight color="var(--accent-red-text)" size={24} />
          ) : (
            <ToggleLeft color="var(--text-muted)" size={24} />
          )}
        </div>

        {/* Storage Widget */}
        <div style={{
          backgroundColor: 'var(--bg-light)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <HardDrive size={13} />
            <span>IndexedDB Storage</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
            14.2 MB
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>Local Buffer</span>
            <span>50 MB</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
