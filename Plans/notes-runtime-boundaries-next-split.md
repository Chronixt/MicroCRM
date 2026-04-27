# Notes Runtime Boundaries and Next Split Plan

Last updated: 2026-04-20

## First-Pass Touch Boundaries (enforced now)

- `js/app.js` may call note APIs, but must not introduce new persistence-rule branching for typed payloads.
- Note type inference used by UI/recovery paths must flow through existing normalization utilities.
- UI recovery/debug tools must not bypass typed-note persistence APIs (`createNote`, `updateNote`, restore/import APIs).

## Integration Safety Harness (this pass)

- `scripts/note-contract-parity-check.js` acts as a release gate:
  - validates presence of typed-note handling in both adapters,
  - validates required note API surface parity,
  - validates guardrail markers in `js/app.js`.
- `window.noteContractSmoke.run()` (in `js/app.js`) exercises a live UI-session flow:
  - create text note,
  - update text->svg,
  - verify note version snapshot,
  - restore previous version,
  - validate restored payload,
  - cleanup.

## Next-Pass Extraction Seams (no behavior change)

1. Extract note normalization and payload conversion helpers from `js/app.js` into a dedicated note runtime module.
2. Extract note recovery/debug UI handlers into a separate debug/recovery module.
3. Keep `js/app.js` as orchestration/wiring only.

## Progress Update (2026-04-27)

- Added `js/notesRuntime.js` and moved typed-note helper cluster there:
  - `isSerializedTextNoteSvg`
  - `extractTextFromSerializedTextNoteSvg`
  - `getNoteTextValue`
  - `getNoteTypeValue`
  - `isNoteQueuedForSync`
  - `serializeTextNoteToSvg`
- `index.html` now loads `js/notesRuntime.js` before `js/app.js`.
- `js/app.js` keeps existing function names as delegating wrappers for zero behavior-change migration.
- Moved note sync helper cluster into `js/notesRuntime.js`:
  - `parseNoteDateValue`, `noteSortTimestamp`, `noteSortId`, `compareNotesByCreatedDesc`
  - `getNotePayloadForSync`, `buildNoteSyncSignature`, `buildDbNoteInputFromAnyNote`
  - `isDbBackedNoteSource`
- Delegating wrappers in `js/app.js` now pass `formatDateYYYYMMDD` and `normalizeDateTimeToISO` into runtime helpers.

## Success Criteria for Next Pass

- No note persistence rule logic remains in `js/app.js`.
- Note-specific module can be tested independently from global app bootstrap.
- Behavior parity remains unchanged versus this first-pass baseline.
