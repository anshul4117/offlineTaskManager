import React, { useState } from 'react';
import type { LocalRecord } from '../types/index.js';
import { AlertTriangle, Shield, Check, GitMerge, X } from 'lucide-react';

interface ConflictResolverModalProps {
  item: LocalRecord | null;
  onClose: () => void;
  onResolveKeepLocal: (id: string) => Promise<void>;
  onResolveKeepServer: (id: string) => Promise<void>;
  onResolveMerge: (id: string, title: string, content: string) => Promise<void>;
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
      await onResolveKeepLocal(item.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepServer = async () => {
    try {
      setIsSubmitting(true);
      await onResolveKeepServer(item.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMergeSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onResolveMerge(item.id, mergedTitle, mergedContent);
      onClose();
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
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--accent-red-border)',
        width: '100%',
        maxWidth: '820px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header Banner (Stitch Spec) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--accent-red-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-red-text)' }}>
                State Divergence Detected ({`Local v${item.version} vs Server v${serverSnap.version}`})
              </h2>
              <p style={{ fontSize: '12px', color: '#7f1d1d' }}>
                {serverSnap.deleted
                  ? `This record was deleted on the server (v${serverSnap.version}) while local changes exist.`
                  : `This record was modified on the server (v${serverSnap.version}) while this device recorded offline changes.`}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--accent-red-text)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Action Strategy Bar */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#fdf2f2',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Choose a reconciliation strategy:
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleKeepLocal}
              disabled={isSubmitting}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#ffffff',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              Keep Mine (Local)
            </button>
            <button
              onClick={handleKeepServer}
              disabled={isSubmitting}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#ffffff',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              Keep Theirs (Cloud)
            </button>
            <button
              onClick={() => setIsMerging(true)}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--text-primary)',
                color: 'var(--accent-lime)',
                fontSize: '12px',
                fontWeight: 800
              }}
            >
              ⚡ Auto Merge
            </button>
          </div>
        </div>

        {/* Diff Content View */}
        <div style={{ padding: '24px' }}>
          {!isMerging ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Local Version Column */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-lime-text)' }}>● Your Version (Local)</span>
                  <span style={{ color: 'var(--text-muted)' }}>(Offline)</span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {item.title}
                </h4>
                <div style={{
                  backgroundColor: '#ecfdf5',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: '#065f46',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}>
                  + {item.content}
                </div>
              </div>

              {/* Remote Server Version Column */}
              <div style={{
                backgroundColor: serverSnap.deleted ? '#fef2f2' : '#f8fafc',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: serverSnap.deleted ? '1px solid #fca5a5' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ fontWeight: 700, color: serverSnap.deleted ? '#dc2626' : '#3b82f6' }}>
                    ● Server State (v{serverSnap.version})
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{serverSnap.deleted ? '(DELETED)' : '(Cloud)'}</span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {serverSnap.title || '(Deleted Record)'}
                </h4>
                <div style={{
                  backgroundColor: serverSnap.deleted ? '#fee2e2' : '#f0f9ff',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: serverSnap.deleted ? '#991b1b' : '#1e40af',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}>
                  {serverSnap.deleted ? '❌ Record was deleted on server' : `~ ${serverSnap.content}`}
                </div>
              </div>
            </div>
          ) : (
            /* Merge Form */
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
                    backgroundColor: '#ffffff',
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
                    backgroundColor: '#ffffff',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setIsMerging(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#ffffff',
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
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--accent-lime)',
                    fontSize: '13px',
                    fontWeight: 800
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
