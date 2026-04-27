# Notes Adapter Parity Matrix

Last updated: 2026-04-20
Scope: first-pass stability hardening

| Operation | `js/db-supabase.js` | `js/dbSupabase.js` | Notes |
|---|---|---|---|
| `createNote` typed write (`note_type` + xor payload) | Pass | Shim | Legacy file is a compatibility shim only; runtime must use canonical adapter. |
| `updateNote` typed write + version snapshot typed payload | Pass | Shim | No duplicated persistence logic remains in `dbSupabase.js`. |
| `getNotesByCustomerId` text projection (`textValue -> text`) | Pass | Shim | Read behavior comes from canonical adapter only. |
| `getAllNotes` text projection (`textValue -> text`) | Pass | Shim | Read behavior comes from canonical adapter only. |
| `getNotePreviousVersion` typed projection | Pass | Shim | Version behavior comes from canonical adapter only. |
| `restoreNoteToPreviousVersion` typed write | Pass | Shim | Restore behavior comes from canonical adapter only. |
| `importAllData` typed-safe note import path | Pass | Shim | Import behavior comes from canonical adapter only. |
| `restoreNotesFromBackup` typed validation + write path | Pass | Shim | Recovery behavior comes from canonical adapter only. |
| `scanForCorruptedNotes`/`recoverCorruptedNotes` typed validity checks | Pass | Shim | Corruption handling comes from canonical adapter only. |

## Temporary Guardrail

- No new note-related behavior changes in `js/app.js` until parity checks and SQL validation gates pass for both schemas.
- If parity regresses, block release and treat as NO-GO.
- Runtime entrypoints must not reference `dbSupabase.js`; guard via `npm run test:adapter-entrypoints`.
