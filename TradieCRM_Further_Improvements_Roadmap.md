# TradieCRM – Further Improvements & Feature Roadmap (Cursor Build Plan)

This roadmap is designed to be **easy for Cursor to ingest** and execute step-by-step with minimal thrash.

---

## Guiding principles (DO NOT break these)
- **Offline-first** (must work with no signal on site)
- **2 taps to capture** (minimum friction > maximum features)
- **Sole trader first** (no team complexity yet)
- **Attachments are references** (don’t store large blobs in IndexedDB long term)
- **Small commits** (one feature per commit, ship-ready each time)

---

## Phase 1 (High impact, low complexity) ✅

### 1) Customer Entity (real customer database)
**Why:** Tradies deal with repeat customers, addresses, and follow-ups. A job should be linked to a customer.

**Build:**
- New store/table: `customers`
  - `name` (required)
  - `phone` (optional)
  - `email` (optional)
  - `address` (optional)
  - `notes` (optional)
  - `tags` (optional)
  - `created_at`, `updated_at`
- Add `customer_id` to jobs (appointments) store
- Add index on `customer_id`

**UI:**
- Add “Customers” view/tab (list + search)
- Job modal: select existing customer OR create customer inline

**Definition of Done:**
- Users can create/edit customers
- Jobs can be assigned to customers
- Customer profile shows list of their jobs
- Search by customer name works

**Files likely impacted:**
- `js/db.js`
- `js/app.js`
- `index.html`
- `styles.css`

---

### 2) Fast Add Job (“Capture Mode”)
**Why:** Tradies don’t want forms. They want to dump info fast and keep moving.

**Build:**
A “Quick Add Job” overlay:
- customer (typeahead + create new)
- job title (free text)
- suburb/address (optional)
- status (default `Lead`)
- reminder preset buttons (Tomorrow / 3d / 7d / Custom)

**Definition of Done:**
- New job can be added in <15 seconds
- Defaults applied correctly
- Opens into full job details after save

---

### 3) Follow-ups / Reminders system (core tradie value)
**Why:** Most lost money is “forgotten follow-up”.

**Build:**
Add `reminders` store:
- `id`
- `job_id`
- `due_at` (timestamp)
- `message` (optional)
- `status` (`pending` / `done` / `snoozed`)
- `created_at`, `updated_at`

Add a “Follow-ups” page:
- Today
- Next 7 days
- Overdue

Actions:
- Done
- Snooze (1h / tomorrow / 3 days)
- Reschedule

**Notifications (MVP):**
- Use browser notifications if allowed (permission-gated)

**Definition of Done:**
- Reminder can be set from Job modal
- Follow-ups page lists correctly
- Done/snooze/reschedule updates DB immediately
- Overdue reminders are visually obvious

---

### 4) Add “Job Value” + “Payment Status”
**Why:** Tradies care about money tracking: quoted amount, invoiced, paid.

**Add fields to Job:**
- `quoted_amount` (number, optional)
- `invoice_amount` (number, optional)
- `paid_amount` (number, optional)
- `payment_status` (derived or explicit):
  - Not Quoted / Quoted / Invoiced / Part Paid / Paid

**Definition of Done:**
- Job cards show money summary
- Pipeline view can filter “Unpaid / Needs Invoice”

---

### 5) Global Search + Filters that tradies actually use
**Search includes:**
- customer name
- phone
- address/suburb
- job title
- notes text

**Filters:**
- Status
- Overdue follow-ups
- Unpaid / invoiced
- Has photos
- Updated recently (last 7 days)

**Definition of Done:**
- Search returns results quickly for 500+ jobs
- Filters combine correctly

---

## Phase 2 (Attachments + “site evidence”) 📷

### 6) Photo attachments per job (site photos)
**Why:** Before/after photos, compliance photos, quote evidence.

**Build:**
Add `attachments` store:
- `id`
- `job_id`
- `type` (`photo`)
- `local_ref` (string)
- `created_at`

**Important constraint:**  
Do NOT store large base64 blobs inside IndexedDB long term. Prefer:
- store photos via Cache Storage / FileSystem API where possible, or
- store blobs with compression + hard cap + user warning

**UI:**
Job details includes:
- Add Photo button
- Thumbnail gallery
- Full screen viewer

**Definition of Done:**
- Add/view/delete photos per job
- Works offline
- Does not crash after many photos

---

### 7) Export Job Summary
**Why:** Tradies often need to send proof/details.

**Export content:**
- Customer name + contact
- Job title + status + timestamps
- Notes
- Selected photos (optional)

**Formats:**
- JSON export (MVP)
- HTML-to-PDF later

**Definition of Done:**
- “Export job” button produces a downloadable file
- Export includes all key job fields + notes + photo references

---

## Phase 3 (Tradie workflow polish)

### 8) Interaction log (“Called / Texted / Site Visit”)
**Why:** Users forget when they last contacted someone.

**Build:**
Add `job_events` store:
- `id`
- `job_id`
- `type` (call/sms/quote_sent/completed/invoice_sent/payment_received/other)
- `note` (optional)
- `created_at`

**UI:**
Quick buttons on Job:
- 📞 Call
- 💬 SMS
- 🧾 Quote sent
- ✅ Job completed
- 💰 Invoice sent
- 💵 Payment received

**Definition of Done:**
- Job timeline view shows events
- “Last contacted” computed for customer

---

### 9) Job templates (common jobs)
**Why:** Tradies repeat the same job patterns.

**Build:**
- Add tradie templates in `productConfig.js`
- Add “Add job from template” flow

**Definition of Done:**
- User can create job from template in 2 taps

---

### 10) Tagging system (simple, powerful)
**Why:** Tags are fast segmentation without complexity.

Examples:
- urgent
- warranty
- strata
- commercial
- weekend
- cash

**Definition of Done:**
- Tag jobs/customers
- Filter by tag
- Auto-suggest existing tags

---

## Phase 4 (Turning it into a “real app” + real storage)

### 11) Move from IndexedDB → SQLite (Capacitor plan)
**Why:** iOS web storage quota is the biggest blocker.

**Approach:**
- Introduce `StorageDriver` abstraction layer
- Keep `IndexedDBDriver` for web
- Add `SQLiteDriver` for native builds
- Use filesystem for attachments
- Add schema versioning + migrations

**Definition of Done:**
- Native iOS + Android build uses SQLite
- Attachment storage no longer breaks due to quota
- Data persists across restarts/upgrades

---

## Phase 5 (Monetizable “Pro” features)

### 12) Backup / Sync (Pro)
**Options:**
- manual export/import first
- later: encrypted cloud sync

**Definition of Done:**
- Backup export works reliably
- Restore works without duplication

---

### 13) App Lock (PIN / FaceID) (Pro)
**Why:** customer phone numbers + addresses are sensitive.

**Definition of Done:**
- Lock required on open (optional)
- Uses OS biometrics where available

---

## Cursor Execution Instructions

### How Cursor should work on this repo
**Rules:**
1. Implement ONE feature group per commit
2. Keep app runnable after each commit
3. If DB schema changes, add upgrade path (don’t wipe DB)
4. No giant refactors unless required for storage drivers

### Suggested implementation order
1) Customers store + linking  
2) Follow-ups/reminders  
3) Quick Add Job  
4) Job value/payment fields  
5) Search + filters  
6) Photos  
7) Job export  
8) Job event timeline  
9) Templates + tags  
10) Storage driver abstraction + Capacitor migration

---

## Cursor Prompt (copy/paste)

> We are building TradieCRM features on top of the existing CRMicro tradie branch.  
> Constraints: offline-first, minimal friction, no heavy refactors, one feature per commit.  
> Start by implementing **Customers** as a first-class entity linked to Jobs (appointments).  
>
> Requirements:  
> - Add `customers` store and `customer_id` on jobs  
> - Add Customers view (list + search)  
> - Job modal lets user select/create customer  
> - Customer profile shows all jobs for that customer  
> - Must not wipe existing DB; use IndexedDB upgrade path safely  
>
> After implementing, output:  
> - Summary of changes  
> - Test plan steps  
> - Any schema migration notes
