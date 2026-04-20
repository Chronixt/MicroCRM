# Notes Typed-Payload Rehearsal Runbook

Last updated: 2026-04-20

## Purpose

Run a mandatory non-production rehearsal for typed-note migration and parity gates before production cutover.

## Fixed Rollout Order

1. Dev sandbox rehearsal (`hairdresser_sandbox_admin` schema)
2. Hairdresser rehearsal (`hairdresser` schema)
3. Tradie rehearsal (`tradie` schema)
4. Production cutover window with operator + reviewer sign-off

## Schema Targeting (no file edits required)

The migration and validation SQL support runtime schema targeting via session settings:

- `app.notes_validation_schemas`
- `app.notes_migration_schemas`

Defaults (if unset): `hairdresser,tradie`

## Rehearsal Steps (per stage)

1. Set validation target schema(s):

```sql
set app.notes_validation_schemas = '<schema_list_comma_separated>';
```

2. Run pre-check SQL:
   - `supabase/validation/010_notes_typed_payload_precheck.sql`

3. Set migration target schema(s):

```sql
set app.notes_migration_schemas = '<schema_list_comma_separated>';
```

4. Apply migration:
   - `supabase/migrations/010_notes_text_value_note_type.sql`

5. Set validation target schema(s) again (same as step 1):

```sql
set app.notes_validation_schemas = '<schema_list_comma_separated>';
```

6. Run post-check SQL:
   - `supabase/validation/010_notes_typed_payload_postcheck.sql`

7. Run adapter parity gate:
   - `npm run test:notes-parity`

8. Run smoke/regression notes scenarios:
   - create text note
   - create svg note
   - edit text->text
   - edit svg->svg
   - edit text<->svg switch
   - restore previous version
   - backup/import roundtrip note integrity

## Required Stage Targets

### Stage 1: Dev Sandbox (mandatory)

```sql
set app.notes_validation_schemas = 'hairdresser_sandbox_admin';
set app.notes_migration_schemas = 'hairdresser_sandbox_admin';
```

### Stage 2: Hairdresser rehearsal

```sql
set app.notes_validation_schemas = 'hairdresser';
set app.notes_migration_schemas = 'hairdresser';
```

### Stage 3: Tradie rehearsal

```sql
set app.notes_validation_schemas = 'tradie';
set app.notes_migration_schemas = 'tradie';
```

## Go / No-Go Gates (must all pass)

- Migration validation report clean
- Adapter parity checks clean
- Smoke + regression notes scenarios clean

## Rollback-Safe Procedure (if migration gate fails)

1. Stop immediately before any additional strictness changes.
2. Capture post-check evidence and failing row samples.
3. Revert only newly-added constraints for the affected schema if required:

```sql
alter table <schema>.notes drop constraint if exists notes_note_payload_xor_chk;
alter table <schema>.notes drop constraint if exists notes_note_type_valid_chk;
alter table <schema>.note_versions drop constraint if exists note_versions_note_payload_xor_chk;
alter table <schema>.note_versions drop constraint if exists note_versions_note_type_valid_chk;
```

4. Do not run destructive data rollback.
5. Fix anomalies in rehearsal, rerun full sequence, then re-approve.
