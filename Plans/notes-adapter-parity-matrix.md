# Notes Adapter Parity Matrix

Last updated: 2026-04-20
Scope: first-pass stability hardening

| Operation | `js/db-supabase.js` | `js/dbSupabase.js` | Notes |
|---|---|---|---|
| `createNote` typed write (`note_type` + xor payload) | Pass | Pass | Both infer and persist typed payload when typed columns exist. |
| `updateNote` typed write + version snapshot typed payload | Pass | Pass | `dbSupabase` now snapshots previous payload with typed fields when available. |
| `getNotesByCustomerId` text projection (`textValue -> text`) | Pass | Pass | Both normalize read shape for UI consumers. |
| `getAllNotes` text projection (`textValue -> text`) | Pass | Pass | Consistent text projection retained. |
| `getNotePreviousVersion` typed projection | Pass | Pass | Both return text/textValue + noteType from versions. |
| `restoreNoteToPreviousVersion` typed write | Pass | Pass | Restores `note_type` + xor payload where typed columns exist. |
| `importAllData` typed-safe note import path | Pass | Pass | Both rely on typed-safe create/update note flows. |
| `restoreNotesFromBackup` typed validation + write path | Pass | Pass | Rejects invalid payload combinations and restores via typed-safe writes. |
| `scanForCorruptedNotes`/`recoverCorruptedNotes` typed validity checks | Pass | Pass | `dbSupabase` no longer uses no-op stubs. |

## Temporary Guardrail

- No new note-related behavior changes in `js/app.js` until parity checks and SQL validation gates pass for both schemas.
- If parity regresses, block release and treat as NO-GO.
