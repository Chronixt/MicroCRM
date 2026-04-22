# 011 Safe Normalization Evidence Record

Date: 2026-04-20
Migration: `supabase/migrations/011_notes_schema_normalization_safe.sql`

## Execution Scope
- Sandbox rehearsal schema: `hairdresser_sandbox_admin`
- Production target schema: `tradie`

## Rehearsal Evidence (Sandbox)
- Precheck file: `Supabase Snippet Notes Schema Drift Report precheck actually sandbox.csv`
- Postcheck file: `Supabase Snippet Notes Schema Drift Report postcheck actually sandbox.csv`

Result summary:
- `pre.schema_exists`: `ok`
- `pre.table_exists.notes`: `ok`
- `pre.table_exists.note_versions`: `ok`
- `post.typed_payload_xor_failures.notes`: `0 (ok)`
- `post.typed_payload_xor_failures.note_versions`: `0 (ok)`
- `post.note_type_invalid_or_null.notes`: `0 (ok)`
- `post.note_type_invalid_or_null.note_versions`: `0 (ok)`

## Production Evidence (Tradie)
- Precheck file: `Supabase Snippet Notes Schema Drift Report precheck tradie.csv`
- Postcheck file: `Supabase Snippet Notes Schema Drift Report postcheck tradie.csv`

Result summary:
- `pre.schema_exists`: `ok`
- `pre.table_exists.notes`: `ok`
- `pre.table_exists.note_versions`: `ok`
- `post.typed_payload_xor_failures.notes`: `0 (ok)`
- `post.typed_payload_xor_failures.note_versions`: `0 (ok)`
- `post.note_type_invalid_or_null.notes`: `0 (ok)`
- `post.note_type_invalid_or_null.note_versions`: `0 (ok)`

## Drift Report Context
- Drift report file: `Supabase Snippet Notes Schema Drift Report 011 tradie.csv`
- `diff.summary`: `17 (warn)`

Note: drift warnings are expected because deferred normalization items (legacy columns, trigger strategy, identity/sequence style, index naming conventions) were intentionally not changed in safe phase 2.

## Rollout Decision
- Status: GO (safe phase complete)
- Basis: typed-note integrity checks are clean in rehearsal and production target.
