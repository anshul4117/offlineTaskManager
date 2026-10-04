# Implementation Plan - Offline-First Application (ALG-WEB-02)

## Overview
Building a robust, offline-first Notes and Tasks Manager application with React, Vite, TypeScript, Dexie.js (IndexedDB), Express, and SQLite (`better-sqlite3`).

---

## Phase 1: Project Setup & Structure
- [ ] Initialize project package.json with dependencies (`express`, `better-sqlite3`, `dexie`, `react`, `react-dom`, `vite`, `vite-plugin-pwa`, `vitest`, `supertest`, `dotenv`, etc.)
- [ ] Configure TypeScript (`tsconfig.json`, `tsconfig.node.json`)
- [ ] Create `.env.example` and base directory structure (`src/`, `server/`, `docs/`)
- [ ] Verify build tools and script entries in `package.json`

## Phase 2: Data Models & Types
- [ ] Define shared TypeScript types (`src/types/index.ts`):
  - `LocalRecord` (id, title, content, type, updatedAt, version, deleted, pending, conflict)
  - `OutboxOperation` (opId, recordId, type, payload, baseVersion, timestamp, status, retryCount, lastError)
  - `ServerRecord` (id, title, content, type, version, updated_at, deleted)
  - Sync request/response contracts
- [ ] Define IndexedDB schema using Dexie.js (`src/db/index.ts`)
- [ ] Define SQLite database schema & init script (`server/db.ts`)

## Phase 3: Server API Implementation
- [ ] Express server boilerplate (`server/index.ts`)
- [ ] `GET /api/health` - Server health check endpoint
- [ ] `POST /api/sync/push` - Idempotent operation processing with version conflict detection and soft-deletes
- [ ] `GET /api/sync/pull` - Sync pull endpoint with timestamp cursor
- [ ] Vitest + Supertest endpoint tests (`server/__tests__/api.test.ts`)

## Phase 4: Local-First Client Engine
- [ ] Client storage utilities (`src/services/localDb.ts`)
- [ ] Outbox mutation manager (`src/services/outbox.ts`) - Enqueue operations with UUIDs and tombstones for soft deletes

## Phase 5: Synchronization & Connectivity Engine
- [ ] Connectivity monitor (`src/services/connectivity.ts`) - Hybrid browser events + `/api/health` polling
- [ ] Sync Engine (`src/services/syncEngine.ts`) - Push outbox, handle 409 conflict responses, pull remote changes, apply updates to IndexedDB
- [ ] Single sync lock execution & bounded exponential backoff retries

## Phase 6: Frontend UI & PWA Integration
- [ ] Modern UI layout (`src/App.tsx`, `src/components/*`):
  - Local-first reactive rendering via `useLiveQuery`
  - Notes & Tasks CRUD operations
  - Online/Offline & Server Reachability status badge
  - Manual Sync button with status indicator
  - Conflict resolution dialog (surfacing version conflicts to user with option to keep local or server version)
- [ ] PWA service worker setup using `vite-plugin-pwa`

## Phase 7: Edge Case Verification, AI Logging & Delivery
- [ ] Verify edge cases (offline edits, conflict scenarios, connection drops, duplicate sync requests)
- [ ] Record AI contributions in `docs/AI_LOG.md`
- [ ] Full end-to-end build & test verification
