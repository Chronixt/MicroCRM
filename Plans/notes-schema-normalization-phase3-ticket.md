# Notes Schema Normalization Phase 3 (Deferred Items)

## Summary
Phase 2 delivered safe, non-destructive hardening only. This Phase 3 ticket tracks deferred normalization work that requires explicit compatibility decisions.

## Deferred Items
1. Legacy columns
- `tradie.notes.content`
- `tradie.notes.updated_at`
- `tradie.note_versions.content`

2. Trigger strategy
- `tradie.notes` uses `notes_updated_at` trigger.
- Need explicit policy for `updated_at` lifecycle across products.

3. PK generation style alignment
- `hairdresser`: identity
- `tradie`: sequence default

4. Index naming and parity clean-up
- `idx_notes_owner_user_id` vs `idx_tradie_notes_owner_user_id`
- `idx_note_versions_owner_user_id` vs `idx_tradie_note_versions_owner_user_id`
- decide if we keep aliases, rename, or normalize canonical names.

## Required Decisions Before SQL
1. Runtime dependency audit
- Verify app code and any external scripts do not depend on deferred legacy columns.

2. Backward compatibility strategy
- Keep-and-deprecate period vs direct cutover for legacy columns.

3. Rollback plan
- Explicit rollback for each destructive or semantic change.

## Suggested Implementation Sequence
1. Add read-path compatibility layer (if needed) before destructive changes.
2. Migrate/write-path to canonical fields only.
3. Backfill legacy-to-canonical and verify parity checks.
4. Remove/deprecate legacy columns in a later migration window.
5. Normalize trigger/index naming once behavior is stable.

## Acceptance Criteria
- Zero typed-note invariant failures after each step.
- No regression in notes CRUD/import/restore.
- Explicit operator/reviewer signoff with evidence attached.
- Branch sync complete (`main` -> `hairdresser-crm` and `main` -> `tradie-crm`) after merge.

## Tracking
- Parent context: `011_notes_schema_normalization_safe.sql` completed.
- This ticket is Phase 3 only and should run as separate release work.
