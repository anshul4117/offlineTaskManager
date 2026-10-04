import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/index.js';
import type { LocalRecord, ItemType } from './types/index.js';
import { createRecord, updateRecord, deleteRecord } from './services/localDb.js';
import { Header } from './components/Header.js';
import { ItemCard } from './components/ItemCard.js';
import { ItemEditorModal } from './components/ItemEditorModal.js';
import { ConflictResolverModal } from './components/ConflictResolverModal.js';
import { SyncStatusPanel } from './components/SyncStatusPanel.js';
import { Plus, Search, FileText, CheckSquare, Layers, AlertTriangle, Trash2, Folder } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'tasks' | 'unsynced' | 'conflicts' | 'trash'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<ItemType>('note');
  const [editingItem, setEditingItem] = useState<LocalRecord | null>(null);
  const [conflictItem, setConflictItem] = useState<LocalRecord | null>(null);
  const [isOutboxOpen, setIsOutboxOpen] = useState(false);

  // Live Query from IndexedDB (local-first state)
  const allRecords = useLiveQuery(() => db.records.toArray(), []) || [];

  // Filter records based on tab and search
  const filteredRecords = allRecords.filter((rec) => {
    // Search match
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || rec.title.toLowerCase().includes(q) || rec.content.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === 'trash') {
      return rec.deleted;
    }
    if (rec.deleted) {
      return false; // Hide soft-deleted records from standard views
    }

    if (activeTab === 'notes') return rec.type === 'note';
    if (activeTab === 'tasks') return rec.type === 'task';
    if (activeTab === 'unsynced') return rec.pending;
    if (activeTab === 'conflicts') return rec.conflict;

    return true;
  });

  // Calculate counts for badges
  const activeRecords = allRecords.filter((r) => !r.deleted);
  const notesCount = activeRecords.filter((r) => r.type === 'note').length;
  const tasksCount = activeRecords.filter((r) => r.type === 'task').length;
  const unsyncedCount = activeRecords.filter((r) => r.pending).length;
  const conflictCount = activeRecords.filter((r) => r.conflict).length;
  const trashCount = allRecords.filter((r) => r.deleted).length;

  const handleCreateNew = (type: ItemType) => {
    setEditingItem(null);
    setEditorType(type);
    setIsEditorOpen(true);
  };

  const handleEdit = (item: LocalRecord) => {
    setEditingItem(item);
    setEditorType(item.type);
    setIsEditorOpen(true);
  };

  const handleSaveItem = async (title: string, content: string, type: ItemType, id?: string) => {
    if (id) {
      await updateRecord(id, title, content, type);
    } else {
      await createRecord(title, content, type);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await deleteRecord(id);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
      {/* App Header */}
      <Header onToggleOutboxModal={() => setIsOutboxOpen(true)} />

      {/* Main App Container */}
      <div style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Top Control Bar: Search & New Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Search Box */}
          <div style={{
            position: 'relative',
            flex: '1 1 300px',
            maxWidth: '480px'
          }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search notes and tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* New Item Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => handleCreateNew('note')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              <Plus size={16} />
              <span>New Note</span>
            </button>

            <button
              onClick={() => handleCreateNew('task')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-purple)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              <Plus size={16} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'all', label: 'All Items', count: activeRecords.length, icon: Folder },
            { id: 'notes', label: 'Notes', count: notesCount, icon: FileText },
            { id: 'tasks', label: 'Tasks', count: tasksCount, icon: CheckSquare },
            { id: 'unsynced', label: 'Unsynced', count: unsyncedCount, icon: Layers, highlight: unsyncedCount > 0 },
            { id: 'conflicts', label: 'Conflicts', count: conflictCount, icon: AlertTriangle, danger: conflictCount > 0 },
            { id: 'trash', label: 'Trash', count: trashCount, icon: Trash2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--bg-card-hover)' : 'transparent',
                  color: tab.danger
                    ? 'var(--accent-danger)'
                    : tab.highlight
                    ? 'var(--accent-warning)'
                    : isActive
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: tab.danger
                    ? 'var(--accent-danger)'
                    : tab.highlight
                    ? 'var(--accent-warning)'
                    : 'var(--bg-dark)',
                  color: tab.danger || tab.highlight ? '#000000' : 'var(--text-muted)',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Items Grid */}
        {filteredRecords.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-muted)'
          }}>
            <Folder size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No records found
            </h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              {searchQuery ? 'Try clearing your search query.' : 'Create a new note or task to get started.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {filteredRecords.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDeleteItem}
                onResolveConflict={(rec) => setConflictItem(rec)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <ItemEditorModal
        isOpen={isEditorOpen}
        initialType={editorType}
        editingItem={editingItem}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveItem}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolverModal
        item={conflictItem}
        onClose={() => setConflictItem(null)}
      />

      {/* Outbox Inspector Modal */}
      <SyncStatusPanel
        isOpen={isOutboxOpen}
        onClose={() => setIsOutboxOpen(false)}
      />
    </div>
  );
};
