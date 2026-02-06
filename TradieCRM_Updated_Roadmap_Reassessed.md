# TradieCRM – Updated Roadmap (Reassessed Against Current Implementation)

This roadmap **assumes your current `tradie-crm` branch already has**:
- `customers`, `appointments` (jobs), `images`, `notes`, `noteVersions` stores
- Job **status pipeline + Kanban/Pipeline view**
- **Text-based notes** (with legacy SVG notes still supported)
- **Photo gallery** (images stored as blobs in IndexedDB)
- **Backup/restore JSON** export/import
- PWA offline caching + installable
- ProductConfig-driven terminology + i18n overrides

The goal now is to **push TradieCRM from “working micro CRM” → “tradie/sole trader daily driver”** without bloating it into Tradify/ServiceM8.

---

## Non‑negotiables (keep these constraints)
- **Offline-first** (works with no signal on site)
- **Fast capture** (2 taps to log a job update)
- **Sole trader first** (no team/multi-user complexity yet)
- **Storage resilience** (avoid iOS quota crashes; stop stuffing huge blobs into IndexedDB)
- **Small commits** (1 feature group per commit; always runnable)

---

## Phase 1 — Close the biggest “tradie gaps” (highest ROI)

### 1) Follow-ups / Reminders (core tradie value)
**Why:** The money leak is forgotten follow-ups, quotes, invoices, and “I’ll call them back”.

**Build**
Add new store: `reminders`
- `id` (auto)
- `customerId` (nullable)
- `appointmentId` (nullable)
- `dueAt` (timestamp, indexed)
- `message` (optional)
- `status` (`pending` | `done` | `snoozed`)
- `createdAt`, `updatedAt`

**UI**
- Add bottom-nav item: **Follow-ups**
- Sections: **Overdue**, **Today**, **Next 7 days**, **Later**
- Actions: **Done**, **Snooze** (1h / tomorrow / 3d), **Reschedule**

**Notifications**
- PWA: use Notification API if granted (best-effort)
- If denied: still show in-app reminders reliably

**Definition of Done**
- Reminder can be created from Job modal and Customer view
- Follow-ups view lists and updates correctly
- Overdue highlighting is obvious
- No reminder data loss offline

**Files likely**
- `js/db.js`, `js/app.js`, `index.html`, `styles.css`

---

### 2) Job Value / Payment Tracking (simple, not accounting)
**Why:** Tradies need to know “what’s owed” and “what needs invoicing”.

**Add fields to `appointments` (jobs)**
- `quotedAmount` (number, optional)
- `invoiceAmount` (number, optional)
- `paidAmount` (number, optional)
- `paymentStatus` (enum/string) OR derived from amounts:
  - `not_quoted`, `quoted`, `invoiced`, `part_paid`, `paid`

**UI**
- Job modal: compact “$” section (Quoted / Invoiced / Paid)
- Pipeline cards show small money badge (optional toggle)
- Filters: **Needs invoice**, **Unpaid**, **Part paid**

**Definition of Done**
- Amount fields persist + migrate safely
- Filters work with pipeline and calendar views
- No complex invoicing system introduced

---

### 3) Interaction Log / Timeline (2-tap job actions)
**Why:** “Did I call them? When did I send the quote?” becomes real history.

**Build**
Add store: `jobEvents`
- `id` (auto)
- `appointmentId` (indexed)
- `customerId` (indexed)
- `type` (enum): `call`, `sms`, `email`, `site_visit`, `quote_sent`, `invoice_sent`, `payment_received`, `note`, `other`
- `note` (optional)
- `createdAt` (indexed)

**UI**
- Job detail: quick action row:
  - 📞 Call, 💬 SMS, ✉️ Email, 🧾 Quote sent, 💰 Invoice sent, 💵 Payment received
- Timeline list under job details
- Customer detail: “Recent activity”

**Definition of Done**
- One-tap logs an event + optionally opens deep link (tel:, sms:, mailto:)
- Timeline is searchable and sorted
- Customer “last contacted” computed from latest event

---

### 4) True “Quick Add Job” (tradie capture mode)
**Why:** FullCalendar is great, but tradies often want: “new lead” + reminder now.

**Build**
- Add a **Quick Add** overlay accessible from any screen
- Minimal fields:
  - customer (search/select/create)
  - job title
  - optional suburb/address
  - default status = `Lead`
  - reminder presets (tomorrow / 3d / 7d / custom)

**Definition of Done**
- New job can be created in <15 seconds
- Works without touching calendar at all
- Creates job + optional reminder in one flow

---

## Phase 2 — Search, filters, and tradie-friendly info architecture

### 5) Global Search (customers + jobs + notes + events)
**Why:** In the field, you need “find that guy in Parramatta with the leaking tap”.

**Search should include**
- customers: name, phone, address, lead source
- jobs: title, status, date range, amounts
- notes: text (including legacy note summaries if possible)
- jobEvents: event type + notes

**UI**
- One global search bar (top of Customers + Jobs views)
- Advanced filters drawer:
  - Status
  - Overdue follow-ups
  - Needs invoice / unpaid
  - Has photos
  - Updated recently

**Definition of Done**
- Search stays fast at 1,000+ jobs
- Filter combinations work consistently across Calendar + Pipeline

---

### 6) Customer fields cleanup for tradies (stop repurposing hair fields)
**Why:** `socialMediaName` repurposed to Address works, but it’s technical debt.

**Build**
- Add proper fields to customer schema:
  - `addressLine1`, `suburb`, `state`, `postcode`
  - `preferredContactMethod` (call/sms/email)
- Add migration:
  - move old `socialMediaName` → `addressLine1` (or concatenated address)
- Add “copy address” + “open in maps” button

**Definition of Done**
- Customer form uses tradie-appropriate fields
- Migration doesn’t lose existing data
- Maps deep-link works

---

## Phase 3 — Attachments & storage stability (fix your biggest technical risk)

### 7) Stop storing large image blobs in IndexedDB (quota killer)
**Why:** iOS web storage limits are small and unpredictable; blobs in IndexedDB will eventually break.

**Options (ranked)**
1) **Capacitor + Filesystem + SQLite** (best long-term; see Phase 4)
2) PWA intermediate: store images in **Cache Storage** (still limited but better-managed)
3) Aggressive compression + hard cap + “storage health” warnings

**Immediate improvements (PWA-safe)**
- Add image compression on ingest (resize + quality setting)
- Add storage meter + warnings (count photos + approximate MB)
- Add “export images separately” option during backup

**Definition of Done**
- Adding many photos doesn’t brick the DB
- App warns before hitting danger thresholds
- Backup/restore remains reliable

---

### 8) Job-level photos (not just customer-level)
**Why:** Tradies think in jobs: before/after belongs to a job.

**Build**
- Extend `images` store:
  - add `appointmentId` index (nullable)
- UI: in job detail, show **Job Photos** (filter images by appointmentId)
- Keep customer gallery as “All photos for customer”

**Definition of Done**
- Photos can be attached at job level
- Existing customer photos remain visible

---

## Phase 4 — “Real app” conversion & real storage (when you’re ready)

### 9) Convert PWA → iOS/Android app via Capacitor (branch milestone)
**Why:** This solves iOS quota + enables native notifications, camera, filesystem.

**Build plan**
- Introduce `StorageDriver` abstraction:
  - `IndexedDbDriver` (web/PWA)
  - `SQLiteDriver` (native app)
- Use filesystem for attachments (store file paths, not blobs)
- Add schema versioning + migrations

**Definition of Done**
- Native builds run on iOS + Android
- SQLite is default in native
- Photos stored in app sandbox filesystem
- No data loss during migration

---

## Phase 5 — Monetizable “Pro” features (keep it lightweight)

### 10) Pro: Backup automation + (optional) encrypted sync
**MVP Pro**
- Scheduled local backup export reminders
- One-tap export bundle (data + attachments)

**Later**
- Encrypted cloud sync (opt-in)

**Definition of Done**
- Backup is idiot-proof
- Restore doesn’t duplicate or corrupt data

---

### 11) Pro: App lock (PIN / biometrics)
**Why:** Customer phone/address is sensitive.

**Definition of Done**
- Optional lock on open
- Uses biometrics when available

---

## Cursor Execution Instructions (how to build this without thrash)

### Rules
1. Implement ONE feature group per commit
2. Keep app runnable after every commit
3. Any DB schema change must include a safe upgrade path (no wipes)
4. No refactors unless required for the specific feature

### Recommended implementation order
1) Reminders (store + Follow-ups view)  
2) Payment fields + filters  
3) Job events timeline + deep links  
4) Quick Add Job overlay  
5) Global search + filter drawer  
6) Customer schema cleanup + migration  
7) Image compression + storage health warnings  
8) Job-level photos (appointmentId)  
9) StorageDriver abstraction (prep for Capacitor)  
10) Capacitor + SQLite + filesystem attachments

---

## Cursor Prompt (copy/paste)

> We are continuing work on the `tradie-crm` branch of CRMicro.  
> Current implementation already includes customers, jobs (appointments), images, notes, backups, and the job status pipeline/kanban view.  
> We now need to build **tradie-specific features** with minimal friction and minimal refactors.  
>
> Start with **Follow-ups / Reminders**:
> - Add a new IndexedDB store `reminders` linked to either `customerId` or `appointmentId`  
> - Add a new Follow-ups view in the bottom navigation  
> - Show Overdue / Today / Next 7 days sections  
> - Add Done/Snooze/Reschedule actions  
> - Must work offline; use notifications only if permission granted  
> - Do NOT wipe or reset the DB; add a safe upgrade path  
>
> After implementation, output:
> - Summary of changes
> - Test plan steps
> - Any schema migration notes
