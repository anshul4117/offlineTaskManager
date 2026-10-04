# AI Development Log (docs/AI_LOG.md)

**Project:** ALG-WEB-02 — Offline-First Notes & Tasks Application  
**Agent:** Antigravity AI Assistant (Google DeepMind)  
**Date:** October 4, 2026  

---

## Overview & Architecture Contributions

The application was designed and implemented end-to-end as an offline-first system conforming strictly to the `AGENTS.md` hackathon specification.

### 1. Data Layer & Local-First Engine
- **IndexedDB via Dexie.js (`src/db/index.ts`, `src/services/localDb.ts`)**:
  - Implemented local tables: `records`, `outbox`, `meta`.
  - Enforced local-first UI reactivity using `useLiveQuery` from `dexie-react-hooks`.
  - Integrated client-generated UUIDs (`crypto.randomUUID()`) for all records and outbox operations.
  - Handled offline soft-deletes (tombstones) and edge case ("create then delete before first sync").

### 2. Synchronization Engine & Idempotency
- **Sync Engine (`src/services/syncEngine.ts`)**:
  - Designed single-execution lock (`isSyncingLock`) preventing duplicate sync loops.
  - Implemented bounded exponential backoff retries (1s to 30s max).
  - Outbox push phase with version verification and idempotency operation tracking.
  - Pull phase using `since` timestamp cursor and `serverTime` updating IndexedDB `meta`.

### 3. Server & SQLite Database
- **Express & `better-sqlite3` (`server/db.ts`, `server/app.ts`, `server/index.ts`)**:
  - Schema initialization with WAL journal mode for SQLite performance.
  - `GET /api/health`: Live database connectivity verification.
  - `POST /api/sync/push`: Transactional outbox processing with version-based conflict detection returning `409 Conflict` and current server record snapshots on stale base versions.
  - `GET /api/sync/pull`: Incremental pull cursor endpoint.

### 4. Frontend UI & Conflict Resolution
- **React Components (`src/components/`, `src/App.tsx`)**:
  - Modern dark slate aesthetic with responsive layout, type filters, and search.
  - Connectivity monitor (`src/services/connectivity.ts`) combining browser events (`window.onLine`) and real health pings.
  - Interactive conflict resolution dialog (`ConflictResolverModal.tsx`) providing comparative diff between Local and Server versions, supporting "Keep Local", "Accept Server", or "Merge Both".
  - Outbox inspector modal (`SyncStatusPanel.tsx`) for real-time visualization of the pending IndexedDB operation queue.

### 5. Automated Testing & Production Build
- **Vitest & Supertest (`server/__tests__/api.test.ts`)**:
  - 7 comprehensive unit & integration tests covering health checks, push sync, idempotency, version conflicts, soft deletes, and incremental pull filtering.
  - Production PWA build setup with `vite-plugin-pwa`.
