import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/index.js';
import type { LocalRecord, ItemType } from './types/index.js';
import { createRecord, updateRecord, deleteRecord, restoreRecord, resolveConflict, seedDemoData, permanentlyDeleteRecords, clearAllTrash } from './services/localDb.js';
import { syncEngine } from './services/syncEngine.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { SyncSummaryWidget } from './components/SyncSummaryWidget.js';
import { ItemCard } from './components/ItemCard.js';
import { ItemEditorModal } from './components/ItemEditorModal.js';
import { ItemDetailModal } from './components/ItemDetailModal.js';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal.js';
import { BulkDeleteConfirmationModal } from './components/BulkDeleteConfirmationModal.js';
import { OutboxInspectorModal } from './components/OutboxInspectorModal.js';
import { ConflictResolverModal } from './components/ConflictResolverModal.js';
import { EmptyState } from './components/EmptyState.js';
import { Plus, Search, SlidersHorizontal, AlertTriangle, Clock, CheckCircle2, Trash2, CheckSquare, Square } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'tasks' | 'pending' | 'conflicts' | 'trash'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<LocalRecord | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<ItemType>('note');
  const [editingItem, setEditingItem] = useState<LocalRecord | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<LocalRecord | null>(null);
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'selected' | 'clear_all' | null>(null);
  const [conflictItem, setConflictItem] = useState<LocalRecord | null>(null);
  const [isOutboxModalOpen, setIsOutboxModalOpen] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to syncEngine state changes
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  // Seed initial demo dataset on startup if DB is empty
  useEffect(() => {
    seedDemoData().catch((err) => console.error('[seedDemoData] Error:', err));
  }, []);

  // Parse URL search parameters on initial load for tab/note selection persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    if (urlTab && ['all', 'notes', 'tasks', 'pending', 'conflicts', 'trash'].includes(urlTab)) {
      setActiveTab(urlTab as any);
    }
    const urlNoteId = params.get('note');
    if (urlNoteId) {
      db.records.get(urlNoteId).then((rec) => {
        if (rec && !rec.deleted) {
          setViewingItem(rec);
          setIsDetailOpen(true);
        } else {
          // Clean up invalid or tombstoned note parameter from URL
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('note');
          const newSearch = newParams.toString() ? '?' + newParams.toString() : window.location.pathname;
          window.history.replaceState(null, '', newSearch);
        }
      });
    }
  }, []);

  // Handle browser Back / Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab && ['all', 'notes', 'tasks', 'pending', 'conflicts', 'trash'].includes(urlTab)) {
        setActiveTab(urlTab as any);
      }
      const urlNoteId = params.get('note');
      if (urlNoteId) {
        db.records.get(urlNoteId).then((rec) => {
          if (rec && !rec.deleted) {
            setViewingItem(rec);
            setIsDetailOpen(true);
            setIsEditorOpen(false);
          } else {
            setIsDetailOpen(false);
            setIsEditorOpen(false);
            setViewingItem(null);
          }
        });
      } else {
        setIsDetailOpen(false);
        setIsEditorOpen(false);
        setViewingItem(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Cmd+K / Ctrl+K keyboard shortcut listener for search bar focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Read application state EXCLUSIVELY from Dexie IndexedDB
  const allRecords = useLiveQuery(() => db.records.toArray(), []) || [];
  const pendingOutboxCount = useLiveQuery(() => db.outbox.count(), []) || 0;
  const lastSyncedMeta = useLiveQuery(() => db.meta.get('lastSyncedAt'), []);
  const lastSyncedAt = lastSyncedMeta ? lastSyncedMeta.value : null;

  // Derived reactive items for modals
  const currentViewingItem = viewingItem
    ? allRecords.find((r) => r.id === viewingItem.id) || viewingItem
    : null;

  const currentEditingItem = editingItem
    ? allRecords.find((r) => r.id === editingItem.id) || editingItem
    : null;

  const currentDeletingItem = deletingItem
    ? allRecords.find((r) => r.id === deletingItem.id) || deletingItem
    : null;

  const handleSelectTab = (tab: any) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setSelectedTrashIds([]);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    params.delete('note');
    const newSearch = '?' + params.toString();
    window.history.pushState(null, '', newSearch);
  };

  const handleToggleSelectTrash = (id: string) => {
    setSelectedTrashIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllTrash = (trashedRecords: LocalRecord[]) => {
    setSelectedTrashIds(trashedRecords.map((r) => r.id));
  };

  const handleDeselectAllTrash = () => {
    setSelectedTrashIds([]);
  };

  const handleConfirmBulkDelete = async () => {
    if (bulkDeleteMode === 'selected') {
      await permanentlyDeleteRecords(selectedTrashIds);
      setSelectedTrashIds([]);
    } else if (bulkDeleteMode === 'clear_all') {
      await clearAllTrash();
      setSelectedTrashIds([]);
    }
    setBulkDeleteMode(null);
  };

  const handleCreateNew = (type: ItemType) => {
    setIsDetailOpen(false);
    setViewingItem(null);
    setEditingItem(null);
    setEditorType(type);
    setIsEditorOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleViewItem = (item: LocalRecord) => {
    setViewingItem(item);
    setIsDetailOpen(true);
    setIsMobileMenuOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.set('note', item.id);
    window.history.pushState(null, '', '?' + params.toString());
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setViewingItem(null);
    const params = new URLSearchParams(window.location.search);
    if (params.has('note')) {
      params.delete('note');
      const newSearch = params.toString() ? '?' + params.toString() : window.location.pathname;
      window.history.pushState(null, '', newSearch);
    }
  };

  const handleEditItem = (item: LocalRecord) => {
    setIsDetailOpen(false);
    setEditingItem(item);
    setEditorType(item.type);
    setIsEditorOpen(true);
    setIsMobileMenuOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.set('note', item.id);
    window.history.pushState(null, '', '?' + params.toString());
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingItem(null);
    if (viewingItem) {
      setIsDetailOpen(true);
    } else {
      const params = new URLSearchParams(window.location.search);
      if (params.has('note')) {
        params.delete('note');
        const newSearch = params.toString() ? '?' + params.toString() : window.location.pathname;
        window.history.pushState(null, '', newSearch);
      }
    }
  };

  const handleRequestDelete = (item: LocalRecord) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (id: string) => {
    await deleteRecord(id);
    setIsDeleteModalOpen(false);
    setDeletingItem(null);
    if (viewingItem?.id === id) {
      handleCloseDetail();
    }
  };

  const handleSaveItem = async (title: string, content: string, type: ItemType, id?: string) => {
    if (id) {
      await updateRecord(id, title, content, type);
      const updated = await db.records.get(id);
      if (updated) {
        setViewingItem(updated);
        setIsDetailOpen(true);
      }
    } else {
      await createRecord(title, content, type);
    }
    setIsEditorOpen(false);
    setEditingItem(null);
  };

  const handleRestoreItem = async (id: string) => {
    await restoreRecord(id);
  };

  // Filter records based on active tab and search query
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
    if (activeTab === 'pending') return rec.pending;
    if (activeTab === 'conflicts') return rec.conflict;

    return true;
  });

  // Category counters
  const activeRecords = allRecords.filter((r) => !r.deleted);
  const notesCount = activeRecords.filter((r) => r.type === 'note').length;
  const tasksCount = activeRecords.filter((r) => r.type === 'task').length;
  const pendingCount = activeRecords.filter((r) => r.pending).length;
  const conflictCount = activeRecords.filter((r) => r.conflict).length;
  const syncedCount = activeRecords.filter((r) => !r.pending && !r.conflict).length;
  const trashCount = allRecords.filter((r) => r.deleted).length;

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-light)' }}>
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        activeCount={activeRecords.length}
        pendingCount={pendingCount}
        conflictCount={conflictCount}
        trashCount={trashCount}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={() => setIsSimulatedOffline(!isSimulatedOffline)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Center Notes Explorer */}
      <main className="app-main" style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxWidth: '1200px' }}>
        {/* Stitch Header Bar */}
        <Header
          pendingOutboxCount={pendingOutboxCount}
          conflictCount={conflictCount}
          onOpenOutboxInspector={() => setIsOutboxModalOpen(true)}
          isSimulatedOffline={isSimulatedOffline}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Heading & New Note Action Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.2' }}>
              Your Notes
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Everything stays available, even offline.
            </p>
          </div>

          <button
            onClick={() => handleCreateNew('note')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-lime)',
              color: 'var(--accent-lime-text)',
              fontWeight: 800,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(210, 242, 74, 0.4)'
            }}
          >
            <Plus size={18} />
            <span>New Note</span>
          </button>
        </div>

        {/* Dark Sync Hero Card Widget */}
        <div style={{ marginBottom: '24px' }}>
          <SyncSummaryWidget
            totalNotesCount={activeRecords.length}
            pendingCount={pendingCount}
            conflictCount={conflictCount}
            isOnline={!isSimulatedOffline}
            isSimulatedOffline={isSimulatedOffline}
            isSyncing={syncState === 'syncing'}
            isError={syncState === 'error'}
            lastSyncedAt={lastSyncedAt}
            onToggleSimulatedOffline={() => setIsSimulatedOffline(!isSimulatedOffline)}
            onOpenOutboxInspector={() => setIsOutboxModalOpen(true)}
            onSyncNow={() => syncEngine.triggerSync()}
            onResolveConflict={() => setActiveTab('conflicts')}
          />
        </div>

        {/* Filter Tabs & Search Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {/* Pill Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: activeTab === 'all' ? 'var(--text-primary)' : 'var(--bg-card)',
                color: activeTab === 'all' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>All</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>{activeRecords.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: activeTab === 'pending' ? 'var(--accent-purple-bg)' : 'var(--bg-card)',
                color: activeTab === 'pending' ? 'var(--accent-purple-text)' : 'var(--accent-purple-text)',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Clock size={13} />
              <span>Pending</span>
              <span style={{ fontSize: '11px', fontWeight: 800 }}>{pendingCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: activeTab === 'notes' ? 'var(--accent-green-bg)' : 'var(--bg-card)',
                color: activeTab === 'notes' ? 'var(--accent-green-text)' : 'var(--accent-green-text)',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={13} />
              <span>Synced</span>
              <span style={{ fontSize: '11px', fontWeight: 800 }}>{syncedCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('conflicts')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: activeTab === 'conflicts' ? 'var(--accent-red-bg)' : 'var(--bg-card)',
                color: activeTab === 'conflicts' ? 'var(--accent-red-text)' : 'var(--accent-red-text)',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AlertTriangle size={13} />
              <span>Conflicts</span>
              <span style={{ fontSize: '11px', fontWeight: 800 }}>{conflictCount}</span>
            </button>
          </div>

          {/* Search Box & Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search markdown, tags, payload..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none'
                }}
              />
              <span style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-light)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                ⌘K
              </span>
            </div>

            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <SlidersHorizontal size={14} />
              <span>Last Modified</span>
            </button>
          </div>
        </div>

        {/* Trash Management Action Toolbar (Visible when Trash tab active) */}
        {activeTab === 'trash' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-subtle)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedTrashIds.length > 0 ? `${selectedTrashIds.length} item${selectedTrashIds.length === 1 ? '' : 's'} selected` : 'Trash Management'}
              </span>

              {filteredRecords.length > 0 && (
                <button
                  onClick={selectedTrashIds.length === filteredRecords.length ? handleDeselectAllTrash : () => handleSelectAllTrash(filteredRecords)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-light)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {selectedTrashIds.length === filteredRecords.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span>{selectedTrashIds.length === filteredRecords.length ? 'Deselect All' : 'Select All'}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {selectedTrashIds.length > 0 && (
                <button
                  onClick={() => setBulkDeleteMode('selected')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-red-bg)',
                    color: 'var(--accent-red-text)',
                    border: '1px solid var(--accent-red-border)',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedTrashIds.length})</span>
                </button>
              )}

              {trashCount > 0 && (
                <button
                  onClick={() => setBulkDeleteMode('clear_all')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#ffffff',
                    color: 'var(--accent-red-text)',
                    border: '1px solid var(--accent-red-border)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Clear All Trash</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Items Grid */}
        {filteredRecords.length === 0 ? (
          <EmptyState
            type={activeTab === 'pending' ? 'pending' : activeTab === 'conflicts' ? 'conflicts' : activeTab === 'trash' ? 'trash' : 'notes'}
            title={
              activeTab === 'trash'
                ? 'Trash is empty'
                : activeTab === 'pending'
                ? 'No pending changes queued'
                : activeTab === 'conflicts'
                ? 'No version conflicts detected'
                : searchQuery
                ? 'No matching notes found'
                : 'No notes in IndexedDB'
            }
            description={
              activeTab === 'pending'
                ? 'All local edits have successfully synchronized with the backend.'
                : activeTab === 'conflicts'
                ? 'Your local IndexedDB and cloud database versions are in 100% sync.'
                : searchQuery
                ? 'Try broadening your search query or clear the filter.'
                : 'Click "New Note" to create your first offline-first note.'
            }
            onCreateNew={activeTab !== 'trash' && activeTab !== 'conflicts' && activeTab !== 'pending' ? () => handleCreateNew('note') : undefined}
          />
        ) : (
          <div className="items-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px'
          }}>
            {filteredRecords.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onView={handleViewItem}
                onEdit={handleEditItem}
                onDelete={handleRequestDelete}
                onRestore={handleRestoreItem}
                onResolveConflict={(rec) => setConflictItem(rec)}
                isSelected={selectedTrashIds.includes(item.id)}
                onToggleSelect={activeTab === 'trash' ? handleToggleSelectTrash : undefined}
              />
            ))}
          </div>
        )}
      </main>

      {/* Read-Only Item Detail Modal */}
      <ItemDetailModal
        isOpen={isDetailOpen}
        item={currentViewingItem}
        onClose={handleCloseDetail}
        onEdit={handleEditItem}
        onDelete={handleRequestDelete}
        onResolveConflict={(rec) => setConflictItem(rec)}
      />

      {/* Editor Modal */}
      <ItemEditorModal
        isOpen={isEditorOpen}
        initialType={editorType}
        editingItem={currentEditingItem}
        onClose={handleCloseEditor}
        onSave={handleSaveItem}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        item={currentDeletingItem}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingItem(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Bulk Delete / Clear All Trash Confirmation Modal */}
      <BulkDeleteConfirmationModal
        isOpen={bulkDeleteMode !== null}
        mode={bulkDeleteMode || 'selected'}
        count={bulkDeleteMode === 'clear_all' ? trashCount : selectedTrashIds.length}
        onClose={() => setBulkDeleteMode(null)}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* Outbox Inspector Modal */}
      <OutboxInspectorModal
        isOpen={isOutboxModalOpen}
        onClose={() => setIsOutboxModalOpen(false)}
      />

      {/* Conflict Resolver Modal */}
      <ConflictResolverModal
        item={conflictItem}
        onClose={() => setConflictItem(null)}
        onResolveKeepLocal={async (id) => { await resolveConflict(id, 'keep_local'); }}
        onResolveKeepServer={async (id) => { await resolveConflict(id, 'keep_server'); }}
        onResolveMerge={async (id, title, content) => { await resolveConflict(id, 'merge', { title, content }); }}
      />

      {/* Persistent Floating Action Button (FAB) */}
      <button
        onClick={() => {
          const typeToCreate = activeTab === 'tasks' ? 'task' : 'note';
          handleCreateNew(typeToCreate);
        }}
        title={activeTab === 'tasks' ? 'Create New Task' : 'Create New Note'}
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '14px 22px',
          borderRadius: '30px',
          backgroundColor: 'var(--accent-lime)',
          color: 'var(--accent-lime-text)',
          border: 'none',
          fontWeight: 800,
          fontSize: '14px',
          boxShadow: '0 8px 20px rgba(210, 242, 74, 0.45), 0 4px 10px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        <Plus size={22} />
        <span>{activeTab === 'tasks' ? 'New Task' : 'New Note'}</span>
      </button>
    </div>
  );
};
