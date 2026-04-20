# Notes Schema Normalization Follow-up (Post-Cutover)

## Purpose
Normalize `hairdresser.notes` and `tradie.notes` schema drift after typed-note cutover closure, without changing note behavior.

## Why This Is Separate
The typed-note cutover is complete and stable. This ticket isolates legacy schema drift cleanup to reduce regression risk and keep rollback/simple verification paths clear.

## Current Drift Snapshot
- `tradie.notes` includes legacy columns/shape differences not present in `hairdresser.notes` (for example: `content`, `updated_at`, trigger/index naming/order differences).
- Primary key generation style differs (`bigserial` vs `generated always as identity`).
- Typed-note invariants are already aligned and must remain unchanged.

## Scope
1. Inventory and classify every `notes`/`note_versions` schema difference between `hairdresser` and `tradie`.
2. Define canonical target shape and compatibility strategy per difference:
   - keep as-is
   - align now (safe)
   - defer with explicit rationale
3. Deliver non-destructive migration(s) that normalize safe differences first.
4. Add validation checks confirming typed-note contract still holds after normalization.

## Non-Goals
- No product feature changes.
- No runtime note behavior changes.
- No destructive data drops in first normalization pass unless explicitly approved.

## Delivery Plan
1. **Diff report**
   - Produce schema diff table for `notes` and `note_versions` across both schemas.
2. **Compatibility design**
   - Decide how legacy `content` and `updated_at` are handled.
   - Define canonical index/trigger naming and required presence.
3. **Migration implementation**
   - Create `011_*` normalization migration (idempotent, schema-scoped).
   - Keep rollback-safe by preferring additive/rename paths before drops.
4. **Validation + rehearsal**
   - Re-run typed-note pre/post validation scripts.
   - Add normalization postcheck summary output.
5. **Cutover**
   - Apply to sandbox/rehearsal first, then production with signoff.

## Risk Areas
- Hidden app/runtime dependency on `tradie.notes.content`.
- Trigger or timestamp behavior differences that affect sync/conflict logic.
- Index changes affecting query performance under real load.

## Guardrails
- Keep typed-note invariants release-blocking:
  - `note_type IN ('text','svg')`
  - XOR payload rule (`text_value` vs `svg`)
  - same rules for `note_versions`
- Add preflight check to detect usage of legacy columns before any destructive action.
- Require operator + reviewer signoff with validation evidence.

## Acceptance Criteria
- Canonical schema contract documented and approved.
- Normalization migration runs successfully on rehearsal schema(s).
- Post-migration typed-note validation has zero invariant failures.
- No note CRUD/version restore regressions in smoke tests.
- Production rollout completed with evidence attached.

## Copy/Paste Issue Body
```md
## Summary
Normalize residual schema drift between `hairdresser` and `tradie` for `notes` and `note_versions` after typed-note cutover.

## Problem
Typed-note cutover is complete, but branch/history differences left structural schema drift (legacy columns/trigger/index differences). We need a controlled normalization pass that does not alter runtime behavior.

## Scope
- Produce schema diff report (`hairdresser` vs `tradie`) for `notes` + `note_versions`
- Define canonical target shape + compatibility strategy
- Implement idempotent normalization migration (`011_*`)
- Rehearse and validate with typed-note checks

## Safety Constraints
- No user-facing behavior changes
- No destructive drops without explicit approval
- Typed-note invariants must stay clean

## Acceptance Criteria
- [ ] Canonical schema contract approved
- [ ] Rehearsal migration passed
- [ ] Typed-note postcheck clean (0 invariant failures)
- [ ] Smoke tests clean (create/edit/restore for text+svg)
- [ ] Production signoff attached
```

## Suggested Labels
- `tech-debt`
- `database`
- `migration`
- `risk-managed`

## Suggested Owner
- DB migration owner + one reviewer from app/runtime side
