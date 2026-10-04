import React, { useState } from 'react';
import type { LocalRecord } from '../types/index.js';
import { AlertTriangle, Check, Shield, GitMerge, X, Info } from 'lucide-react';

interface ConflictResolverModalProps {
  item: LocalRecord | null;
  onClose: () => void;
  onResolveKeepLocal?: (id: string) => Promise<void>;
  onResolveKeepServer?: (id: string) => Promise<void>;
  onResolveMerge?: (id: string, title: string, content: string) => Promise<void>;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  item,
  onClose,
  onResolveKeepLocal,
  onResolveKeepServer,
  onResolveMerge
}) => {
  if (!item || !item.conflict || !item.serverRecord) return null;

  const serverSnap = item.serverRecord;
  const [isMerging, setIsMerging] = useState(false);
  const [mergedTitle, setMergedTitle] = useState(item.title);
  const [mergedContent, setMergedContent] = useState(`${item.content}\n\n--- Remote Server Version ---\n${serverSnap.content}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleKeepLocal = async () => {
    try {
      setIsSubmitting(true);
      if (onResolveKeepLocal) await onResolveKeepLocal(item.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepServer = async () => {
    try {
      setIsSubmitting(true);
      if (onResolveKeepServer) await onResolveKeepServer(item.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMergeSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (onResolveMerge) await onResolveMerge(item.id, mergedTitle, mergedContent);
      onClose();
    } catch (err) {
      console.error(err);
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
      backgroundColor: 'rgba(24, 28, 34, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--accent-red-text)',
        width: '100%',
        maxWidth: '820px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          backgroundColor: 'var(--accent-red-bg)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle color="var(--accent-red-text)" size={24} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-red-text)' }}>
                State Divergence Detected
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                This record was modified remotely on MacBook Pro while this device recorded uncommitted offline changes.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Diff Content */}
        <div style={{ padding: '24px' }}>
          {!isMerging ? (
            <>
              {/* Action Buttons Top Bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
                <button
                  onClick={handleKeepLocal}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-light)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontWeight: 700,
                    fontSize: '12px'
                  }}
                >
                  Keep Mine (Local)
                </button>

                <button
                  onClick={handleKeepServer}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-light)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontWeight: 700,
                    fontSize: '12px'
                  }}
                >
                  Keep Theirs (Cloud)
                </button>

                <button
                  onClick={() => setIsMerging(true)}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-dark-banner)',
                    color: 'var(--accent-lime)',
                    fontWeight: 800,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <GitMerge size={14} />
                  <span>Auto Merge</span>
                </button>
              </div>

              {/* Side-by-Side Version Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {/* Local Version */}
                <div style={{
                  backgroundColor: 'var(--bg-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-lime-text)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Your Version (Local)</span>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>(Offline)</span>
                  </div>

                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h4>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-card)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-primary)',
                    marginBottom: '10px',
                    minHeight: '100px'
                  }}>
                    {item.content}
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Digest: sha256-e91b • Unsynced Local Write
                  </span>
                </div>

                {/* Server Version */}
                <div style={{
                  backgroundColor: 'var(--bg-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-purple-text)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>MacBook Pro (Remote)</span>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>(Cloud)</span>
                  </div>

                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{serverSnap.title}</h4>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-card)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-primary)',
                    marginBottom: '10px',
                    minHeight: '100px'
                  }}>
                    {serverSnap.content}
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Digest: sha256-44c1 • Remote Origin Head
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Merge View */
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Merge Content Manually</h3>
              <input
                type="text"
                value={mergedTitle}
                onChange={(e) => setMergedTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '12px' }}
              />
              <textarea
                value={mergedContent}
                onChange={(e) => setMergedContent(e.target.value)}
                rows={6}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setIsMerging(false)} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-light)' }}>
                  Cancel
                </button>
                <button onClick={handleMergeSubmit} disabled={isSubmitting} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--accent-lime)', color: 'var(--accent-lime-text)', fontWeight: 800 }}>
                  Save Merged
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
