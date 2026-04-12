# Main to hairdresser-crm Cutover Checklist

> Legacy checklist: this file reflects the earlier IndexedDB migration wave (`USE_SUPABASE=false`).
> For current production cutovers, use `Plans/hairdresser-production-cutover-signoff.md`.

Date:
Operator:
Freeze Window Start:
Freeze Window End:

## Pre-Cutover
- [ ] Confirm `hairdresser-crm` is deployed and reachable.
- [ ] Confirm `USE_SUPABASE=false` for this migration wave.
- [ ] Confirm rehearsal completed with strict compare `PASS`.
- [ ] Confirm only one canonical source instance is in use.
- [ ] Confirm stakeholders notified of freeze window.

## Freeze + Backup
- [ ] Freeze writes in source `main` instance.
- [ ] Export final full backup (with images) from source.
- [ ] Save backup copy to second location.
- [ ] Record source backup filename:

## Import + Validation
- [ ] Import into production `hairdresser-crm` using `Replace`.
- [ ] Export immediate post-import backup from target.
- [ ] Run strict compare:
  - `node scripts/compare-backups.js <source.json> <target.json> --strict`
- [ ] Compare output is `PASS`.
- [ ] Manual checks complete for at least 20 records.
- [ ] Confirm image-heavy records render correctly.

## Go / No-Go
- [ ] GO: all automated and manual checks passed.
- [ ] NO-GO: rollback triggered.
- [ ] Decision owner sign-off:
- [ ] Decision timestamp:

## Post-Go Tasks
- [ ] Announce migration completion.
- [ ] Capture day-0 backup from target.
- [ ] Archive source backup, target backup, and compare output.
- [ ] Monitor first live session for errors.
