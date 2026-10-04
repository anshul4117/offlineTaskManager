import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/index.js';
import type { LocalRecord, ItemType } from './types/index.js';
import { createRecord, updateRecord, deleteRecord, restoreRecord } from './services/localDb.js';
import { Header } from './components/Header.js';
import { ItemCard } from './components/ItemCard.js';
import { ItemEditorModal } from './components/ItemEditorModal.js';
import { EmptyState } from './components/EmptyState.js';
import { Plus, Search, FileText, CheckSquare, Trash2, Folder } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'tasks' | 'trash'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<ItemType>('note');
  const [editingItem, setEditingItem] = useState<LocalRecord | null>(null);

  // Read application state EXCLUSIVELY from IndexedDB via Dexie live query
  const allRecords = useLiveQuery(() => db.records.toArray(), []) || [];

  // Filter records based on tab and search
  const filteredRecords = allRecords.filter((rec) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || rec.title.toLowerCase().includes(q) || rec.content.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (activeTab === 'trash') {
      return rec.deleted; // Display tombstones only in Trash tab
    }
    if (rec.deleted) {
      return false; // Hide tombstones from standard views
    }

    if (activeTab === 'notes') return rec.type === 'note';
    if (activeTab === 'tasks') return rec.type === 'task';

    return true;
  });

  // Category counters
  const activeRecords = allRecords.filter((r) => !r.deleted);
  const notesCount = activeRecords.filter((r) => r.type === 'note').length;
  const tasksCount = activeRecords.filter((r) => r.type === 'task').length;
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

  const handleRestoreItem = async (id: string) => {
    await restoreRecord(id);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
      {/* App Header */}
      <Header totalRecordsCount={allRecords.length} />

      {/* Main Container */}
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
        {/* Top Controls: Search & New Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Search Bar */}
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
              placeholder="Search notes and tasks in IndexedDB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => handleCreateNew('note')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
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
                borderRadius: '10px',
                backgroundColor: '#8b5cf6',
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

        {/* Tab Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'all', label: 'All Active', count: activeRecords.length, icon: Folder },
            { id: 'notes', label: 'Notes', count: notesCount, icon: FileText },
            { id: 'tasks', label: 'Tasks', count: tasksCount, icon: CheckSquare },
            { id: 'trash', label: 'Trash (Tombstones)', count: trashCount, icon: Trash2 }
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
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'var(--bg-card-hover)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
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
                  backgroundColor: 'var(--bg-dark)',
                  color: 'var(--text-muted)',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Items Grid or Empty State */}
        {filteredRecords.length === 0 ? (
          <EmptyState
            title={activeTab === 'trash' ? 'Trash is empty' : 'No records in IndexedDB'}
            description={searchQuery ? 'No records match your search query.' : 'Click "New Note" or "New Task" to save records directly to IndexedDB.'}
            onCreateNew={activeTab !== 'trash' ? () => handleCreateNew('note') : undefined}
          />
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
                onRestore={handleRestoreItem}
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
    </div>
  );
};
