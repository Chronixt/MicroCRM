# Notes Schema Normalization Triage (Phase 1 Output)

Date: 2026-04-20
Source: `supabase/validation/011_notes_schema_diff_report.sql`
Compare: `hairdresser` (base) vs `tradie` (compare)
Total drift rows: 17 (`diff.summary`)

## Decision Table

### Align Now (Safe, Non-destructive)
1. `note_versions.saved_at` nullability drift
- Drift: `hairdresser.note_versions.saved_at` is `NOT NULL`; `tradie.note_versions.saved_at` is nullable.
- Action: backfill nulls to `now()`, then `ALTER COLUMN saved_at SET NOT NULL` on `tradie.note_versions`.
- Risk: low.

2. Sort-direction index drift used by timeline queries
- Drift: `idx_notes_created_at` is `DESC` in hairdresser, ascending in tradie.
- Drift: `idx_note_versions_saved_at` is `DESC` in hairdresser, ascending in tradie.
- Action: add explicit DESC indexes in `tradie` using new normalized names (do not drop existing indexes in first pass).
- Risk: low/medium (extra index storage, minimal behavior risk).

### Defer (Needs Compatibility Decision)
1. Legacy column drift
- `tradie.notes.content` exists; missing in hairdresser.
- `tradie.notes.updated_at` exists; missing in hairdresser.
- `tradie.note_versions.content` exists; missing in hairdresser.
- Decision: defer destructive removals/rename until runtime dependency audit is complete.

2. Primary key generation style drift
- `hairdresser`: identity (`GENERATED ALWAYS AS IDENTITY`).
- `tradie`: sequence default (`nextval(...)`).
- Decision: defer; operationally equivalent for current app behavior, higher migration risk.

3. Trigger drift
- `tradie.notes` has trigger `notes_updated_at`.
- `hairdresser.notes` has no `updated_at`, so no equivalent trigger.
- Decision: defer until `updated_at` strategy is finalized.

4. Owner index naming drift
- `idx_notes_owner_user_id` vs `idx_tradie_notes_owner_user_id`.
- `idx_note_versions_owner_user_id` vs `idx_tradie_note_versions_owner_user_id`.
- Decision: defer cosmetic rename/drop; both provide equivalent access path.

5. Schema-qualified index text differences
- Several index rows differ only by schema qualification in `indexdef` (`hairdresser.*` vs `tradie.*`).
- Decision: informational only; no action required.

## 011 Migration Scope (Phase 2)
First implementation pass should include only:
1. `tradie.note_versions.saved_at` backfill + `SET NOT NULL`.
2. Add DESC indexes in `tradie`:
- `notes(created_at DESC)`
- `note_versions(saved_at DESC)`
3. Keep existing indexes/triggers/legacy columns untouched in this pass.

## Validation Gates After 011
1. Re-run `010_notes_typed_payload_precheck.sql` and `010_notes_typed_payload_postcheck.sql`.
2. Confirm zero typed-note invariant failures.
3. Confirm query plans for key note list/version history paths use expected indexes.
4. Attach results to cutover evidence.
