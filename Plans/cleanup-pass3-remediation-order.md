# Cleanup Pass 3 Remediation Order (Safe-First)

## Phase A: Immediate Safety Controls (No behavior change)
1. Remove credential material from tracked local config and rotate impacted keys.
2. Add CI secret scanning gate (block commits containing key signatures in `js/config.local.js` or equivalent).
3. Harden runtime-config allowlist and add CI check for forbidden env names (`*SECRET*`, `SERVICE_ROLE`, `PRIVATE_KEY`).
4. Add documentation note: `supabase/schema.sql` is non-production bootstrap only.

## Phase B: Runtime Guardrails (Low-risk behavior changes)
1. Add Supabase adapter preflight to validate profile-specific required columns before data operations.
2. Add user-facing fail-fast banner when schema/profile mismatch is detected.
3. Add CI smoke assertions for both products: appointment pipeline fields and notes typed-payload compatibility.

## Phase C: Code Hygiene / Drift Reduction
1. Gate debug globals (`window.debugNoteSave` etc.) behind explicit dev flag.
2. Consolidate upload/parsing guardrails (size limits + parser safety) in shared runtime helpers.
3. Keep canonical adapter ownership in `js/db-supabase.js`; ensure shim path cannot be reintroduced.

## Phase D: Dead Code Cleanup
1. Remove `js/dbSupabase.js` (confirmed dead) after one final branch-wide grep in `main`.
2. Remove `js/.env` (confirmed dead) and add contributor note for local env workflow.
3. Re-run e2e smoke and adapter gates after removals.

## Verification Gates
- Gate 1: Secret scanner + workflow checks pass.
- Gate 2: `test:adapter-entrypoints`, `test:notes-parity`, `test:supabase-adapter-smoke`, `test:e2e` pass.
- Gate 3: Manual live sanity (hairdresser + tradie): login, notes CRUD, appointments CRUD, image upload.
- Gate 4: Base/compare sync hygiene maintained (`temp -> main -> hairdresser-crm/tradie-crm`).
