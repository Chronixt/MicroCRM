# Tradie Production Cutover Sign-Off

Date: 2026-04-13
Release / PR: 
Operator: DV
Reviewer: DV
Decision Owner: DV

Start Time (AEST): 10:03am
End Time (AEST): 1:20pm

## Scope

- Target product: `tradie`
- Target branch: `tradie-crm`
- Target schema: `tradie`
- Runtime backend: `Supabase`

## A) Pre-Deploy Configuration Sign-Off

- [x] Netlify `ACTIVE_PRODUCT=tradie`
- [x] Netlify `SUPABASE_SCHEMA=tradie`
- [x] Netlify `SUPABASE_URL` set
- [x] Netlify `SUPABASE_ANON_KEY` set
- [x] Netlify `SHOW_ENV_BANNER=false` (prod)
- [x] Netlify `ALLOW_DESTRUCTIVE_WIPE=false` (prod)
- [x] Netlify `ENABLE_AUTO_CLAIM_UNOWNED_DATA=false` (prod)
- [x] Confirm `js/config.local.js` is not part of production bundle
- [ ] Confirm branch diff reviewed and approved

Initials: DV
Timestamp: 12:39pm

## B) Supabase Migration Sign-Off

- [x] `005_tradie_schema_from_public.sql` applied
- [x] `006_tradie_owner_rls.sql` applied
- [x] `007_self_service_delete_my_data.sql` applied
- [x] `010_notes_text_value_note_type.sql` applied (when in release scope)
- [x] `010_notes_typed_payload_precheck.sql` evidence attached
- [x] `010_notes_typed_payload_postcheck.sql` evidence attached
- [x] Typed payload strict checks pass (`notes` + `note_versions` xor and note_type validity = 0 failures)

- [x] RLS policies verified in `tradie` schema
- [x] `tradie.delete_my_data()` exists and executable by `authenticated` 

Initials: DV
Timestamp: 12:39pm

## C) Post-Deploy Smoke Test (Must Pass)

- [x] Live URL loads Tradie branding (not Hairdresser)
- [x] Console shows active product `tradie`
- [x] Console shows schema `tradie`
- [x] Login succeeds with non-admin test account
- [x] Create customer succeeds
- [x] Create job/event/reminder succeeds
- [x] Full backup export succeeds
- [x] `Delete My Data` visible (not `Wipe All Data`)
- [x] `Sign Out` button visible and functioning
- [x] Dev banner hidden in production
- [x] `npm run test:notes-parity` passes
- [x] Text note persists as `note_type='text'` with only `text_value` payload
- [x] SVG note persists as `note_type='svg'` with only `svg` payload
- [x] Note restore path preserves typed payload contract

Initials: DV
Timestamp: 1:20pm

## D) Isolation / Data Ownership Checks

- [x] Test user A cannot see test user B data
- [x] Test user B cannot see test user A data
- [x] Same login cannot see Hairdresser product records from Tradie
- [x] Same login cannot see Tradie records from Hairdresser
- [x] Delete My Data only deletes current logged-in user's records

Initials: DV
Timestamp: 12:39pm

## E) Backup + Recovery Readiness

- [x] Fresh production backup taken after deploy
- [x] Backup file location recorded:
- [x] Restore smoke test performed in non-production context
- [x] Recovery owner assigned: admin@crmicro.com, danevanderbaan@gmail.com

Initials: DV
Timestamp: 1:20pm

## Go / No-Go

- [x] GO approved
- [ ] NO-GO / rollback initiated

Decision Owner Signature: DV
Decision Time (AEST): 12:39pm

## Rollback Trigger Checklist

Trigger rollback immediately if any are true:

- [ ] Wrong product loads on live domain
- [ ] Wrong schema targeted (`public` or `hairdresser` for tradie release)
- [ ] Users cannot see their own expected data
- [ ] Cross-user visibility breach occurs
- [ ] Any destructive global wipe path appears in production UI
- [ ] Typed payload post-check reports fail status in any row

Rollback executed by:
Rollback time (AEST):
Incident notes:

