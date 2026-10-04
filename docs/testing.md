# Testing Evidence & Verification Strategy — ALG-WEB-02 Offline-First Application

This document summarizes the testing methodology, automated Vitest coverage, API test suites, integration tests, and manual verification matrix for the **SyncNote Offline-First Application**.

---

## 1. Automated Test Suite Summary

The project features **25 automated Vitest test cases** across **6 dedicated test files**, covering local IndexedDB storage, outbox coalescing, network connectivity, synchronization endpoints, idempotency, version conflict detection, and user-controlled resolution strategies.

### Test Execution Command
```bash
npm test
```

### Actual Command Output
```text
 RUN  v3.2.7 /Users/anshul/Projects/Full Stack Projects/Offline App

 ✓ client/src/__tests__/localDb.test.ts (5 tests)
 ✓ client/src/__tests__/syncEngine.test.ts (4 tests)
 ✓ client/src/__tests__/outbox.test.ts (6 tests)
 ✓ client/src/__tests__/conflict.test.ts (5 tests)
 ✓ server/__tests__/api.test.ts (1 test)
 ✓ server/__tests__/sync.test.ts (4 tests)

 Test Files  6 passed (6)
      Tests  25 passed (25)
   Start at  15:15:48
   Duration  506ms
```

---

## 2. Test File Breakdown

| Test File | Target Subsystem | Key Verification Scenarios | Status |
|---|---|---|---|
| `client/src/__tests__/localDb.test.ts` | Dexie IndexedDB CRUD | Client UUID generation, soft-delete tombstones, content size safeguards, title/body validation. | ✅ 5/5 Passed |
| `client/src/__tests__/outbox.test.ts` | Outbox Queue Engine | Operation coalescing rules 1–4 (`create` -> `update`, `update` -> `update` preserving `baseVersion`, `update` -> `delete`, offline `create` -> `delete` cancellation). | ✅ 6/6 Passed |
| `client/src/__tests__/syncEngine.test.ts` | Client Sync Engine | Outbox push processing, Dexie state updating, HTTP 409 conflict handling, pull cursor updates, protecting local pending edits during pull. | ✅ 4/4 Passed |
| `client/src/__tests__/conflict.test.ts` | Conflict Resolution | `keep_local` baseVersion update and re-sync, `keep_server` remote overwrite, `merge` payload creation, remote-delete tombstone resolution, IndexedDB conflict state reload persistence. | ✅ 5/5 Passed |
| `server/__tests__/api.test.ts` | Server Health Check | `GET /api/health` status 200, SQLite database alive status, ISO timestamp verification. | ✅ 1/1 Passed |
| `server/__tests__/sync.test.ts` | REST Sync Endpoints | `POST /api/sync/push` `create` operation, `opId` idempotency, stale `baseVersion` 409 Conflict return, `GET /api/sync/pull` timestamp cursor query. | ✅ 4/4 Passed |

---

## 3. Manual Verification Matrix

| Test ID | Scenario | Procedure | Expected Result | Status |
|---|---|---|---|---|
| **MAN-01** | Offline First Load | Disconnect internet & load application in browser. | App loads instantly from Service Worker cache; IndexedDB renders local records. | ✅ Verified |
| **MAN-02** | Offline Create & Edit | Toggle `Simulate Offline` -> Create Note -> Edit Note. | Note saves instantly to IndexedDB with `pending: true`; `Pending (1)` outbox badge displays. | ✅ Verified |
| **MAN-03** | Page Reload While Offline | Refresh browser tab while offline with pending items. | Pending records and outbox queue persist intact in IndexedDB without data loss. | ✅ Verified |
| **MAN-04** | Reconnection & Auto-Sync | Toggle `Simulate Offline` OFF. | `syncEngine` automatically fires; pushes outbox batch to server; clears pending flags. | ✅ Verified |
| **MAN-05** | Stale Version Conflict | Submit stale `baseVersion = 1` when server record is at version 2. | Server responds HTTP 409 Conflict; card displays red `Branch Conflict` badge; conflict modal triggers. | ✅ Verified |
| **MAN-06** | Conflict Resolution — Keep Mine | Click `Keep Mine` in `ConflictResolverModal`. | Re-queues mutation with `baseVersion = 2`; pushes to server; updates server to version 3. | ✅ Verified |
| **MAN-07** | Conflict Resolution — Keep Theirs | Click `Keep Theirs` in `ConflictResolverModal`. | Replaces local record with server snapshot; clears outbox ops; sets `conflict = false`. | ✅ Verified |
| **MAN-08** | Conflict Resolution — Merge | Edit merged title & content -> Click `Save Merged Record`. | Saves merged content with updated `baseVersion`; pushes to server successfully. | ✅ Verified |
| **MAN-09** | Remote Delete Conflict | Remote record deleted on server while local edit pending. | Conflict modal displays `❌ Remote record was deleted on server`; resolution handles tombstone. | ✅ Verified |

---

## 4. Production Build Verification

### Build Command
```bash
npm run build
```

### Actual Output
```text
> offline-first-notes-tasks@1.0.0 build
> npm run build:client && npm run build:server

vite v6.4.3 building for production...
✓ 1607 modules transformed.
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.39 kB
dist/index.html                   0.75 kB │ gzip:   0.42 kB
dist/assets/index-DIBoFeHo.css    2.17 kB │ gzip:   1.02 kB
dist/assets/index-Bg4hikSO.js   388.35 kB │ gzip: 117.05 kB
✓ built in 1.73s

PWA v0.21.2
mode      generateSW
precache  5 entries (382.23 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

> tsc --project server/tsconfig.json
```
