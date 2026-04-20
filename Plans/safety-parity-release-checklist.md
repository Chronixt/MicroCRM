# Safety Parity Release Checklist

Last updated: 2026-04-12

## Purpose

Prevent cross-product routing mistakes, schema mis-targeting, and accidental destructive actions in production.

## Non-Negotiable Safety Rules

1. Production must never depend on `js/config.local.js`.
2. `ALLOW_DESTRUCTIVE_WIPE` must be `false` in production.
3. `ENABLE_AUTO_CLAIM_UNOWNED_DATA` must be `false` in production.
4. Supabase schema must match product:
   - Hairdresser -> `hairdresser`
   - Tradie -> `tradie`
5. "Delete My Data" must delete only the logged-in user's rows.
6. Sign out must always be available in UI when using Supabase.

## Pre-Deploy Gate (Must Pass Before Merge)

1. Confirm branch target:
   - Base = live product branch (for hairdresser releases: `hairdresser-crm`)
   - Compare = release/candidate branch
2. Confirm runtime config path in `index.html`:
   - Loads `/.netlify/functions/runtime-config`
   - `config.local.js` is loaded only for `localhost`/`127.0.0.1`
3. Confirm defaults in `js/config.js`:
   - `SHOW_ENV_BANNER` defaults to local-only
   - `ALLOW_DESTRUCTIVE_WIPE` defaults `false`
   - `ENABLE_AUTO_CLAIM_UNOWNED_DATA` defaults `false`
4. Confirm `js/config.local.js` is not tracked in git.
5. Confirm Supabase migrations are applied:
   - `004_hairdresser_owner_rls.sql`
   - `006_tradie_owner_rls.sql`
   - `007_self_service_delete_my_data.sql`
6. Confirm Netlify production env values exist and are correct:
   - `ACTIVE_PRODUCT`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SCHEMA`
   - Optional but recommended explicit flags:
     - `SHOW_ENV_BANNER=false`
     - `ALLOW_DESTRUCTIVE_WIPE=false`
     - `ENABLE_AUTO_CLAIM_UNOWNED_DATA=false`
7. Notes typed-payload migration gates (required when `010_notes_text_value_note_type.sql` is in scope):
   - Run `supabase/validation/010_notes_typed_payload_precheck.sql`
   - Run `supabase/migrations/010_notes_text_value_note_type.sql` in rehearsal first
   - Run `supabase/validation/010_notes_typed_payload_postcheck.sql`
   - Attach machine-readable evidence table (`check_name`, `schema_name`, `row_count`, `status`, `details`)
8. Run adapter parity gate:
   - `npm run test:notes-parity`
   - Release is blocked if any gate fails.

## Production Smoke Test (Immediately After Deploy)

1. Open production URL and verify branding/product title is correct.
2. Confirm console does not show fallback to wrong product/schema.
3. Login as test user (not admin).
4. Create customer.
5. Confirm customer appears only for that same user.
6. Run full backup export.
7. Confirm "Delete My Data" exists (not "Wipe All Data").
8. Confirm "Sign Out" button exists and works.
9. Confirm no dev banner unless intentionally enabled.
10. Note typed-payload smoke checks:
   - Create text note and verify only `text_value` is populated.
   - Create svg note and verify only `svg` is populated.
   - Restore previous version and verify typed payload remains valid.

## Data Isolation Verification (Weekly / Before Major Merge)

1. Login as `test1@...`, create customer.
2. Login as `test2@...`, confirm `test1` customer is not visible.
3. Repeat for both products (`hairdresser`, `tradie`).
4. Confirm cross-product isolation:
   - Same login in Hairdresser cannot see Tradie records.
   - Same login in Tradie cannot see Hairdresser records.

## Mandatory Rehearsal and Rollout Order (Typed Notes)

When typed-note migration is in scope, rollout order is fixed:

1. Dev sandbox rehearsal (`hairdresser_sandbox_admin`)
2. Hairdresser rehearsal
3. Tradie rehearsal
4. Production cutover window with operator + reviewer sign-off

Use:

- `Plans/notes-typed-payload-rehearsal-runbook.md`
- `Plans/notes-typed-payload-contract-checklist.md`

## SQL Spot Checks

```sql
-- Verify RLS policies exist for both schemas
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('hairdresser', 'tradie')
order by schemaname, tablename, policyname;

-- Verify delete-my-data functions exist
select n.nspname as schema, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('hairdresser','tradie')
  and p.proname = 'delete_my_data'
order by n.nspname;
```

## Hard Stop / Rollback Triggers

Rollback immediately if any of these occur after deploy:

1. Wrong product loads on live domain.
2. Supabase requests hit wrong schema (`public` instead of product schema).
3. Users cannot see their own existing data.
4. Users can see other users' data.
5. Destructive wipe option appears in production.
6. Typed payload check fails (`note_type` invalid/null or xor failures in `notes`/`note_versions`).

## Emergency Response (If Data Risk Is Suspected)

1. Freeze further deploys.
2. Capture evidence:
   - Browser console logs
   - Supabase API error payloads
   - Netlify env snapshot
3. Validate row presence directly in Supabase tables before any delete action.
4. Verify currently authenticated user email in UI before executing data actions.
5. Restore from backup only after root cause is identified.
6. Document incident + prevention change before next release.

