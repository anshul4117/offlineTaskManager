# AGENTS.md

## Project

**Project:** ALG-WEB-02 — Offline-First Application
**App:** Offline-first Notes/Tasks Manager
**Hackathon constraint:** One-day implementation; prioritize working, testable functionality over unnecessary abstraction.

### Final Stack

* Frontend: React + Vite + TypeScript
* PWA: `vite-plugin-pwa` / Workbox
* Local database: IndexedDB via Dexie.js
* Backend: Node.js + Express
* Server database: SQLite via `better-sqlite3`
* API: REST
* Testing: Vitest + Supertest
* Deployment: Single Express deployment serving the React production build
* Target deployment: Render or Railway

---

# 1. Non-Negotiable Architecture Rules

These rules MUST NOT be violated without explicit approval.

### Local-first UI

The UI reads application data **only from IndexedDB**.

Do NOT make React components fetch records directly from the API.

Network synchronization updates IndexedDB; the UI reacts to IndexedDB changes.

### Client-generated IDs

Every record uses a client-generated UUID.

Offline-created records MUST NOT depend on a server-generated ID.

### Outbox

Every local create/update/delete mutation must be represented in the IndexedDB outbox.

Outbox operations contain:

* `opId`
* `recordId`
* `type`
* `payload`
* `baseVersion`
* `timestamp`
* `status`
* retry information where required

### Soft deletes

Records are deleted using tombstones.

Do NOT permanently remove a synchronized record before its deletion has been safely synchronized.

### Idempotency

Every synchronization operation has a unique `opId`.

The server stores processed operation IDs and safely ignores duplicate operations.

Retries MUST be safe.

### Version-based conflict detection

Every server record has a server-owned integer `version`.

Updates send `baseVersion`.

If:

```text
baseVersion !== current server version
```

the server MUST NOT silently overwrite the server record.

The synchronization result must indicate a conflict.

The conflict must be surfaced to the user.

HTTP/API behavior must preserve the agreed `409 Conflict` semantics for stale mutations.

### Connectivity

Do NOT rely only on:

```ts
navigator.onLine
```

Use:

1. browser online/offline events
2. a real `GET /api/health` connectivity check

Browser connectivity state and server reachability are separate concerns.

### Pull synchronization

Remote changes are pulled using:

```text
GET /api/sync/pull?since=<ISO_TIMESTAMP>
```

The client tracks `lastSyncedAt`.

Server time is preferred for advancing the synchronization cursor.

### Sync safety

Only one sync process may actively run at a time.

Duplicate sync requests must not create concurrent synchronization loops.

Sync must safely continue after partial failures.

Retries use bounded exponential backoff.

---

# 2. Coding Rules

* TypeScript strict mode is required.
* Prefer small, focused files.
* Avoid unnecessary abstraction.
* Keep the implementation understandable enough to explain to hackathon judges.
* No placeholder implementations.
* No fake implementations presented as complete.
* Never leave code such as `...`, `TODO: implement`, empty handlers, or dummy success responses in production paths.
* Do not introduce a new dependency without telling the user first.
* Never hardcode secrets, API keys, passwords, or deployment credentials.
* Keep `.env.example` updated whenever environment variables are introduced.
* Validate API input.
* Handle expected network/server failures explicitly.
* Keep error messages useful and actionable.
* Prefer deterministic behavior over clever abstractions.
* Do not change architecture merely for stylistic preference.

---

# 3. Data Model Rules

Local IndexedDB tables:

```text
records
outbox
meta
```

Local records contain:

```text
id
title
content
updatedAt
version
deleted
pending
conflict
```

Outbox operations contain:

```text
opId
recordId
type
payload
baseVersion
timestamp
status
retryCount
lastError
```

Server SQLite tables:

```text
records
operations
```

Server records contain:

```text
id
title
content
version
updated_at
deleted
```

The server `operations.op_id` is unique.

---

# 4. API Contract

The agreed endpoints are:

```text
GET  /api/health

POST /api/sync/push

GET  /api/sync/pull?since=<ISO_TIMESTAMP>
```

Do not rename, remove, or add core synchronization endpoints without asking first.

---

# 5. Workflow Rules

Work ONLY on the current phase requested by the user.

Before changing code:

1. Read `AGENTS.md`.
2. Read `PLAN.md`.
3. Inspect the relevant existing files.
4. State a short implementation plan when the work is risky or multi-step.
5. Make the smallest coherent change.
6. Run the appropriate build/tests/lint.
7. Inspect the resulting diff.
8. Report actual command output/results.
9. Commit after each verified working slice when git is available.

Never claim something works unless it was actually verified.

Do not refactor unrelated files.

Do not redesign completed functionality unless there is a concrete bug or requirement conflict.

Update documentation when an implementation decision materially changes the documented architecture.

---

# 6. Ask Me Before

STOP and ask the user before:

* changing the local or server data model
* changing API endpoint names or contracts
* changing the folder structure
* introducing a new database
* replacing Dexie/IndexedDB
* replacing SQLite
* replacing the synchronization strategy
* changing the conflict strategy
* adding a significant dependency
* changing deployment architecture
* removing a required hackathon feature

Small implementation details inside the agreed architecture do not require approval.

---

# 7. Quality Priorities

When trade-offs are necessary, prioritize in this order:

1. Correct offline behavior
2. Correct synchronization
3. Correct conflict detection/resolution
4. Data safety and idempotency
5. Testability
6. Clear UX
7. Code simplicity
8. Visual polish

A visually impressive UI that loses offline changes is a failure.

---

# 8. Required Edge Cases

The implementation must eventually handle:

* editing the same record on two offline devices
* local edit followed by remote delete
* create then delete before first synchronization
* multiple offline edits to the same record
* connection loss during synchronization
* duplicate Sync button clicks
* server unavailable while browser reports online
* invalid/empty input
* large content
* first load while completely offline
* page reload while offline

---

# 9. AI-Assisted Development

AI/agent-assisted implementation is expected.

Every significant AI-assisted implementation or architectural contribution must eventually be recorded in:

```text
docs/AI_LOG.md
```

Do not claim human-written work for code generated or substantially modified by an AI agent.
