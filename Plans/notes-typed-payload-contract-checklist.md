# Typed Note Contract Checklist

Purpose: release-blocking contract for note payload integrity across both Supabase adapters.

## Contract (must always hold)

- `note_type` must be one of `text` or `svg`.
- For `note_type='text'`:
  - `text_value` is non-empty text.
  - `svg` is null/blank.
- For `note_type='svg'`:
  - `svg` is non-empty markup.
  - `text_value` is null/blank.
- `note_versions` follows the same typed payload rules as `notes`.

## Operation Gates

For both adapters (`js/db-supabase.js`, `js/dbSupabase.js`), all operations below must satisfy the contract:

- `createNote`
- `updateNote`
- `getNotesByCustomerId`
- `getAllNotes`
- `getNotePreviousVersion`
- `restoreNoteToPreviousVersion`
- `importAllData`
- `restoreNotesFromBackup`
- `recoverCorruptedNotes`

## Validation Evidence Required Per Rehearsal/Cutover

Attach outputs from:

- `supabase/validation/010_notes_typed_payload_precheck.sql`
- `supabase/migrations/010_notes_text_value_note_type.sql`
- `supabase/validation/010_notes_typed_payload_postcheck.sql`

Required rehearsal stages:

1. `hairdresser_sandbox_admin` (mandatory first stage)
2. `hairdresser`
3. `tradie`

Required post-check result conditions per stage schema:

- `post.typed_payload_xor_failures.notes` row_count = 0
- `post.typed_payload_xor_failures.note_versions` row_count = 0
- `post.note_type_invalid_or_null.notes` row_count = 0
- `post.note_type_invalid_or_null.note_versions` row_count = 0

## Rollback-Safe Handling

If invariant gate fails during migration:

- stop before strict constraint step,
- capture post-check evidence,
- revert only newly-added constraints if needed,
- do not perform destructive data rollback.
