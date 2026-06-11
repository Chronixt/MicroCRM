# Phase 8 Supabase Compatibility Runbook

This runbook validates the Phase 8 backend scope for modern UI rollout:

- `user_profiles` table and owner-RLS behavior
- `appointments.notes` compatibility
- `delete_my_data()` profile cleanup extension
- Cross-schema rehearsal order

## Rehearsal Order (mandatory)

1. `hairdresser_sandbox_admin`
2. `hairdresser`
3. `tradie`
4. production (after prior stages pass)

## SQL Validation Script

Use:

- `supabase/validation/014_phase8_profile_appointments_checks.sql`

It emits:

- `check_name`
- `schema_name`
- `row_count`
- `status` (`ok` / `warn` / `fail`)
- `details`

## How To Run

In Supabase SQL editor, set target schemas and run the script:

```sql
set app.phase8_schemas = 'hairdresser_sandbox_admin';
-- then run file: supabase/validation/014_phase8_profile_appointments_checks.sql
```

Repeat with:

```sql
set app.phase8_schemas = 'hairdresser';
```

```sql
set app.phase8_schemas = 'tradie';
```

Or run multiple at once:

```sql
set app.phase8_schemas = 'hairdresser_sandbox_admin,hairdresser,tradie';
```

## Pass Criteria

- No `fail` rows.
- `warn` rows must be understood and accepted (for example optional feature-gated columns).
- `phase8.user_profiles.owner_policies` should show at least 3 expected policies.
- `phase8.function.delete_my_data.user_profiles_cleanup` should be `ok` for target product schemas.

## App-Level Validation After SQL Pass

1. Sign in and verify profile save on `/profile-settings`.
2. Verify topbar name and plan label reflect saved profile values after refresh.
3. Create/update appointment notes and confirm selected-booking/details rendering.
4. Export backup and confirm payload includes:
   - `userProfile`
   - appointment `notes`
5. Import an older backup without these fields and confirm import still succeeds.
6. Run app tests:
   - `npm run test:adapter-entrypoints`
   - `npm run test:notes-parity`
   - `npm run test:supabase-adapter-smoke`
   - `npm run test:e2e`

## Evidence To Capture Per Stage

- Screenshot/export of validation SQL result table.
- Test command outputs.
- Manual notes for profile save + import/export round trip.
