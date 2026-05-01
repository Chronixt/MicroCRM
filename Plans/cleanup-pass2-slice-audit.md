# Cleanup Pass 2 Slice Audit (Runtime-First)

## Reachability Map (Runtime Entry)
- App shell: `index.html` loads `js/config.js`, `js/productConfig.js`, `js/supabaseClient.js`, dynamic DB adapter (`js/db-supabase.js` or `js/db.js`), `js/storageDriver.js`, notes runtime modules, `js/app.js`.
- Product profile runtime: `js/products/core/base.js`, `js/products/hairdresser/profile.js`, `js/products/tradie/profile.js` loaded directly by `index.html`.
- Runtime config API handler: `netlify/functions/runtime-config.js` injects environment into browser globals.
- DB + query runtime: `js/db-supabase.js` is canonical adapter; `js/db.js` is local IndexedDB adapter.
- Workflow/runtime gates: `.github/workflows/e2e-smoke.yml`, `.github/workflows/block-tools-on-product-pr.yml`.
- SQL policy/migration runtime context: `supabase/migrations/004_*`, `006_*`, `007_*`, `009_*`, `010_*`, `011_*`.

## Slice Findings

### 1) Auth / Permissions
- Attack/failure surface:
  - Client-side Supabase auth session bootstrap and prompts in `js/app.js`.
  - Owner-based RLS policy enforcement in `supabase/migrations/004_hairdresser_owner_rls.sql` and `006_tradie_owner_rls.sql`.
  - RPC controls for `claim_unowned_data`, `delete_my_data`, and destructive wipe path.
- Top risks / gaps:
  - Residual broad-grant baseline in legacy schema docs/migrations can be misapplied in new environments (`supabase/schema.sql` allow-all anon policies).
  - Runtime env toggles (`ALLOW_DESTRUCTIVE_WIPE`, claim flags) rely on operational hygiene.
- Quick wins:
  - Add CI check that forbids applying `supabase/schema.sql` in production-like flows.
  - Add startup banner warning when destructive or claim flags are true.

### 2) API Handlers
- Attack/failure surface:
  - Only runtime API handler is `netlify/functions/runtime-config.js`, which publishes selected env vars into frontend globals.
- Top risks / gaps:
  - Sensitive-by-misconfiguration risk if non-public secrets are added to this allowlist.
- Quick wins:
  - Introduce an explicit allowlist comment + automated lint/check that blocks `*_SECRET`, `SERVICE_ROLE`, `PRIVATE_KEY` patterns.

### 3) DB Access / Query Building
- Attack/failure surface:
  - Direct CRUD and RPC calls via `js/db-supabase.js`.
  - Feature-flagged appointment columns differ by product profile (`status` and pipeline fields conditional).
- Top risks / gaps:
  - Schema/profile drift can still break runtime when pipeline fields are expected by UI but absent in schema cache.
  - Large import/export paths handle high-volume row operations with fallback chunking; high operational risk if error handling regresses.
- Quick wins:
  - Add adapter smoke assertion for appointment schema compatibility per profile in CI.
  - Add a lightweight runtime preflight check with actionable error banner for missing expected columns.

### 4) File Upload / Parsing
- Attack/failure surface:
  - Browser-side image conversion/compression (`FileReader`, `Blob`, `data_url`) in `js/db-supabase.js` and `js/db.js`.
  - SVG parsing for notes render/recovery in `js/notesRuntime.js` and `js/app.js`.
- Top risks / gaps:
  - Large `data_url` persistence remains memory/storage intensive.
  - Parsing functions are defensive but spread across multiple modules; drift risk.
- Quick wins:
  - Centralize payload size guardrails and hard limits in one helper used by both adapters.

### 5) Secrets / Env Handling
- Attack/failure surface:
  - Local config files inject keys into globals.
  - Runtime config function serializes env vars to browser JS.
- Top risks / gaps:
  - Repo currently contains local key material in `js/config.local.js` (tracked), including API keys and anon key.
  - `ENABLE_AUTO_CLAIM_UNOWNED_DATA=false;` is missing `window.` prefix, creating implicit global behavior inconsistency.
- Quick wins:
  - Remove tracked secrets and rotate exposed keys.
  - Add pre-commit/CI secret scanning and reject tracked `config.local.js` key patterns.

### 6) Old Utils / Legacy Folders
- Checked/not found in runtime path:
  - Root ad-hoc artifacts and legacy docs (`AiChan's Notes`, backup JSONs, ad-hoc html/ps1/py scripts) are not loaded by runtime entrypoints.
- Top risks / gaps:
  - Operational confusion and accidental inclusion risk persists if governance drifts.
- Quick wins:
  - Move historical artifacts under `tools/archive/` and maintain blocklist CI coverage.

### 7) Unreferenced Components / Services
- Candidate objects:
  - `js/dbSupabase.js` (deprecated shim) appears unreferenced by entrypoints/tests/workflows.
  - `js/.env` appears unreferenced by runtime and workflow scripts.
- Quick wins:
  - Remove or quarantine confirmed-unreferenced files after one final grep + CI pass.

## Prioritized Remediation Backlog
1. P0: Remove tracked credential material from `js/config.local.js`, rotate impacted keys, and enforce secret scanning gate.
2. P0: Add runtime-config allowlist hardening and CI guard for accidental secret exposure.
3. P1: Add adapter preflight + CI schema compatibility assertions for profile-specific appointment columns.
4. P1: Consolidate payload size limits and parsing guards for image/note pipelines.
5. P2: Remove/quarantine confirmed dead legacy files (`dbSupabase.js`, `js/.env`) after one validation cycle.
