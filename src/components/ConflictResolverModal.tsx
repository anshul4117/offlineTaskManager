import React, { useState } from 'react';
import type { LocalRecord } from '../types/index.js';
import { resolveConflict } from '../services/localDb.js';
import { syncEngine } from '../services/syncEngine.js';
import { AlertTriangle, Check, Shield, GitMerge, X } from 'lucide-react';

interface ConflictResolverModalProps {
  item: LocalRecord | null;
  onClose: () => void;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  item,
  onClose
}) => {
  if (!item || !item.conflict || !item.serverRecord) return null;

  const serverSnap = item.serverRecord;
  const [isMerging, setIsMerging] = useState(false);
  const [mergedTitle, setMergedTitle] = useState(item.title);
  const [mergedContent, setMergedContent] = useState(`${item.content}\n\n--- Server Version ---\n${serverSnap.content}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleKeepLocal = async () => {
    try {
      setIsSubmitting(true);
      await resolveConflict(item.id, 'keep_local');
      onClose();
      await syncEngine.sync();
    } catch (err) {
      console.error('Failed to resolve conflict with keep_local:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepServer = async () => {
    try {
      setIsSubmitting(true);
      await resolveConflict(item.id, 'keep_server');
      onClose();
      await syncEngine.sync();
    } catch (err) {
      console.error('Failed to resolve conflict with keep_server:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMergeSubmit = async () => {
    try {
      setIsSubmitting(true);
      await resolveConflict(item.id, 'merge', {
        title: mergedTitle,
        content: mergedContent
      });
      onClose();
      await syncEngine.sync();
    } catch (err) {
      console.error('Failed to resolve conflict with merge:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--accent-danger)',
        width: '100%',
        maxWidth: '750px',
        boxShadow: 'var(--shadow-main)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle color="var(--accent-danger)" size={22} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Sync Version Conflict Detected
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                This record was modified on another device before your offline edits were pushed.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Diff View */}
        <div style={{ padding: '24px' }}>
          {!isMerging ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {/* Local Version Column */}
                <div style={{
                  backgroundColor: 'var(--bg-dark)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-warning)' }}>
                      Your Local Version (v{item.version})
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                    {item.content}
                  </p>
                </div>

                {/* Server Version Column */}
                <div style={{
                  backgroundColor: 'var(--bg-dark)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      Server Version (v{serverSnap.version})
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(serverSnap.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {serverSnap.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                    {serverSnap.content}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleKeepLocal}
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--accent-warning)',
                    border: '1px solid var(--accent-warning)',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  <Check size={16} />
                  Keep My Version
                </button>

                <button
                  onClick={handleKeepServer}
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-primary)',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  <Shield size={16} />
                  Accept Server Version
                </button>

                <button
                  onClick={() => setIsMerging(true)}
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-purple)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  <GitMerge size={16} />
                  Merge Both
                </button>
              </div>
            </>
          ) : (
            /* Merge Form View */
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                Merge Changes Manually
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Merged Title
                </label>
                <input
                  type="text"
                  value={mergedTitle}
                  onChange={(e) => setMergedTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-dark)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Merged Content
                </label>
                <textarea
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-dark)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setIsMerging(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px'
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleMergeSubmit}
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-purple)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <GitMerge size={16} />
                  Save Merged Record
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
