# Notes Schema Normalization Runbook (011 Phase 1)

## Goal
Produce a deterministic drift report for `notes` and `note_versions` between `hairdresser` and `tradie` before any normalization migration is written.

## Inputs
- Base schema: `hairdresser`
- Compare schema: `tradie`
- Script: `supabase/validation/011_notes_schema_diff_report.sql`

## Execution
1. In Supabase SQL editor set schemas:
```sql
SET app.notes_normalization_base_schema = 'hairdresser';
SET app.notes_normalization_compare_schema = 'tradie';
```
2. Run:
- `supabase/validation/011_notes_schema_diff_report.sql`
3. Export/save result rows as evidence for ticket.

## What To Review
- `diff.columns`: missing columns, type/default/nullability drift, identity differences.
- `diff.indexes`: index presence/definition drift.
- `diff.triggers`: trigger presence/definition drift.
- `diff.summary`: total drift count.

## Gate Before Phase 2
Do not implement `011` normalization migration until:
1. Drift rows are triaged into `align now` vs `defer`.
2. Backward compatibility impact is documented for app/runtime.
3. Rollback-safe approach is defined for each `align now` item.

## Next Step (Phase 2)
Author `supabase/migrations/011_*` using non-destructive default changes first, then run typed-note validation (`010` pre/post checks) after rehearsal.
