# Main to hairdresser-crm Migration Runbook

## Objective
- Migrate one production `main` instance to `hairdresser-crm` with zero customer/image/note loss.
- Use `IndexedDB` backend only for this phase (`USE_SUPABASE=false`).

## Prerequisites
- Source environment is stable and writable only by one operator during cutover.
- `hairdresser-crm` deployed and reachable.
- `scripts/compare-backups.js` available.
- Freeze window approved.

## Rehearsal (Required)
1. Export a full backup from `main` including images.
2. In a non-production browser profile, open `hairdresser-crm`.
3. Import backup with `Replace (wipe then import)`.
4. Export immediately from `hairdresser-crm`.
5. Run:
   - `node scripts/compare-backups.js <source.json> <target.json> --strict`
6. Record:
   - import duration,
   - export duration,
   - compare result.
7. Rehearsal pass criteria:
   - compare result is `PASS`,
   - no missing/invalid `dataUrl` on target images.

## Production Cutover
1. Announce start of freeze window.
2. Stop all writes on source `main` instance.
3. Take final source full backup with images.
4. Save an immutable copy of that backup to a second location.
5. Open production `hairdresser-crm`.
6. Import with `Replace (wipe then import)`.
7. Export immediately from `hairdresser-crm`.
8. Run strict compare:
   - `node scripts/compare-backups.js <final-source.json> <post-import-target.json> --strict`
9. Perform manual spot checks on at least 20 records, including image-heavy customers.
10. If all checks pass, end freeze and resume normal operation.

## Rollback Gate
- Roll back immediately if any of these occur:
  - compare returns `FAIL`,
  - missing customer records,
  - missing or corrupted customer images,
  - critical UI errors preventing record access.
- Rollback action:
  - keep source backup as canonical,
  - switch users back to `main`,
  - diagnose and rerun rehearsal before next cutover.

## Post-Cutover (Same Day)
1. Force refresh app on operator devices.
2. Capture day-0 backup from `hairdresser-crm`.
3. Archive:
   - final source backup,
   - first successful target backup,
   - compare output logs.
