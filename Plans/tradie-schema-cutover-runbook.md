# Tradie Schema Cutover Runbook (public -> tradie)

Last updated: 2026-04-06

## Goal

Move TradieCRM tables out of `public` and into dedicated schema `tradie` so hairdresser and tradie data are isolated.

This runbook assumes:

- There is no real tradie production data yet.
- Existing tradie table structures currently live in `public`.
- Hairdresser tables already live in `hairdresser` schema.

## What changed in app code

- `tradie` profile now sets `supabaseSchema: 'tradie'`.
- `dbSupabase.js` now creates a schema-aware Supabase client.
- `ProductConfig` supports optional override: `window.SUPABASE_SCHEMA`.

## Migration file

Use:

- `supabase/migrations/005_tradie_schema_from_public.sql`

It will:

1. Create schema `tradie` if missing.
2. Move these tables from `public` to `tradie` if present:
   - `customers`
   - `appointments`
   - `images`
   - `notes`
   - `note_versions`
   - `reminders`
   - `job_events`
3. Apply schema/table/sequence grants for API roles.

## Pre-checks (run in Supabase SQL Editor)

```sql
select table_schema, table_name
from information_schema.tables
where table_name in (
  'customers','appointments','images','notes','note_versions','reminders','job_events'
)
order by table_schema, table_name;
```

Expected before cutover: tables mostly in `public`.

## Execute cutover

1. Open Supabase Dashboard -> SQL Editor.
2. Paste contents of `005_tradie_schema_from_public.sql`.
3. Run once.

## Post-checks

1. Verify table locations:

```sql
select table_schema, table_name
from information_schema.tables
where table_name in (
  'customers','appointments','images','notes','note_versions','reminders','job_events'
)
order by table_schema, table_name;
```

Expected: all tradie tables in `tradie`.

2. Verify RLS remains enabled:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'tradie'
order by tablename;
```

3. Verify policy presence:

```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'tradie'
order by tablename, policyname;
```

## App verification

In `js/config.local.js`:

```js
window.ACTIVE_PRODUCT = 'tradie';
window.USE_SUPABASE = true;
window.SUPABASE_SCHEMA = 'tradie'; // optional explicit override
```

Then hard refresh and test:

- Create customer
- Create job
- Edit/save/reload persistence
- Export/import smoke

## Rollback (if needed)

Because there is no real data, rollback is straightforward by moving tables back:

```sql
begin;

alter table if exists tradie.job_events set schema public;
alter table if exists tradie.reminders set schema public;
alter table if exists tradie.note_versions set schema public;
alter table if exists tradie.notes set schema public;
alter table if exists tradie.images set schema public;
alter table if exists tradie.appointments set schema public;
alter table if exists tradie.customers set schema public;

commit;
```

## Notes

- Do not use git branch names as schema names; keep stable product names (`tradie`, `hairdresser`).
- Long-term best isolation is separate Supabase projects per product and per environment.
