# Hackathon Judge Demonstration Script — SyncNote (ALG-WEB-02)

> **Duration:** 2 to 3 Minutes  
> **Target Audience:** Hackathon Judges & Architecture Reviewers  
> **Key Objective:** Demonstrate seamless offline usability, outbox queueing, reload persistence, background push/pull sync, and user-controlled conflict resolution.

---

## 🎬 Step-by-Step Demonstration Flow

### 1. Introduction & Initial State (0:00 – 0:30)
- **Action:** Open application in browser (`http://localhost:3001` or production deployment URL).
- **Narration:**
  > *"Welcome to SyncNote, an offline-first Notes and Tasks Manager built for ALG-WEB-02. SyncNote uses a local-first architecture where the React UI reads data exclusively from IndexedDB via Dexie.js live queries. Let's look at our workspace showing initial demo notes."*
- **Visual Check:** Point out the left sidebar navigation, top header status ticker (`INDEXEDB ENGINE: OK`, `SERVICE WORKER: ACTIVE`), and dark status summary banner (`Synced • All changes persistent`).

---

### 2. Going Offline & Local CRUD (0:30 – 1:00)
- **Action:** Click **Simulate Offline** toggle in the sidebar (or disable network in Chrome DevTools).
- **Narration:**
  > *"Now let's simulate going offline. Notice the status indicator instantly turns red: 'Offline Mode (Local Storage Active)'. Let's click 'New Note' and create a note titled 'Offline Architecture Idea' with markdown content."*
- **Action:** Type title and content -> Click `Save Note`.
- **Narration:**
  > *"The note appears immediately in our view without any server request! It is saved to IndexedDB with a client-generated UUID. Notice the purple pill badge: 'Pending • 1 in queue'."*
- **Action:** Click `1 in queue` to open the **Outbox Inspector Modal**.
- **Narration:**
  > *"Here in the Outbox Inspector, we can see the exact queued operation payload, timestamp, client opId, and baseVersion 0 waiting for reconnection."*

---

### 3. Reload Persistence While Offline (1:00 – 1:30)
- **Action:** Press `Cmd+R` / `Ctrl+R` to refresh the browser tab while offline.
- **Narration:**
  > *"Let's reload the page while completely offline. Thanks to our Service Worker cache and Dexie IndexedDB storage, the application loads instantly and our pending offline note and queued outbox operation remain 100% intact!"*

---

### 4. Reconnection & Automatic Background Synchronization (1:30 – 2:00)
- **Action:** Click **Simulate Offline** toggle OFF to restore connection.
- **Narration:**
  > *"Let's reconnect to the network. Our hybrid connectivity monitor detects server reachability and automatically triggers the client Sync Engine."*
- **Visual Check:** Point out the rotating refresh spinner on `Syncing...`, followed by status updating to `Synced • All changes persistent`. The pending badge clears as version 1 is assigned by the server.

---

### 5. Version Conflict Detection & Side-by-Side Resolution (2:00 – 2:45)
- **Action:** Demonstrate a version conflict by creating a stale mutation or opening a note modified remotely.
- **Narration:**
  > *"Now let's demonstrate version-based conflict detection. Suppose another device modified this record on the server (version 2) while this device recorded offline edits (baseVersion 1). When we attempt to push, our server compares baseVersion against the current server version."*
- **Visual Check:** Point out the server returning **HTTP 409 Conflict**, card displaying a red `Branch Conflict (v1 vs v2)` badge, and status pill showing `Conflict Detected`.
- **Action:** Click `Resolve Conflict` on the card to open `ConflictResolverModal`.
- **Narration:**
  > *"Our Stitch-styled side-by-side conflict modal presents both versions cleanly: 'Your Version (Local)' on the left and 'Cloud Version (Server)' on the right. We provide three explicit reconciliation options: Keep Mine, Keep Theirs, or Merge Manually."*
- **Action:** Select **⚡ Merge Manually** -> Edit merged text -> Click `Save Merged Record`.
- **Narration:**
  > *"By selecting Merge Manually, SyncNote constructs a new operation using the server's version as baseVersion and pushes the combined record to the server seamlessly!"*

---

### 6. Conclusion (2:45 – 3:00)
- **Narration:**
  > *"In summary, SyncNote guarantees zero data loss, safe outbox queueing, version conflict protection, and 100% offline usability. All 25 unit and integration test suites pass cleanly. Thank you!"*
