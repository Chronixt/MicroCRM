# Hairdresser Production Cutover Sign-Off

Date:
Release / PR:
Operator:
Reviewer:
Decision Owner:

Start Time (AEST):
End Time (AEST):

## Scope

- Target product: `hairdresser`
- Target branch: `hairdresser-crm`
- Target schema: `hairdresser`
- Runtime backend: `Supabase`

## A) Pre-Deploy Configuration Sign-Off

- [ ] Netlify `ACTIVE_PRODUCT=hairdresser`
- [ ] Netlify `SUPABASE_SCHEMA=hairdresser`
- [ ] Netlify `SUPABASE_URL` set
- [ ] Netlify `SUPABASE_ANON_KEY` set
- [ ] Netlify `SHOW_ENV_BANNER=false` (prod)
- [ ] Netlify `ALLOW_DESTRUCTIVE_WIPE=false` (prod)
- [ ] Netlify `ENABLE_AUTO_CLAIM_UNOWNED_DATA=false` (prod)
- [ ] Confirm `js/config.local.js` is not part of production bundle
- [ ] Confirm branch diff reviewed and approved

Initials:
Timestamp:

## B) Supabase Migration Sign-Off

- [ ] `001_hairdresser_schema.sql` applied
- [ ] `002_customers_address.sql` applied
- [ ] `004_hairdresser_owner_rls.sql` applied
- [ ] `007_self_service_delete_my_data.sql` applied
- [ ] `005_tradie_schema_from_public.sql` applied (shared project isolation)
- [ ] `006_tradie_owner_rls.sql` applied (shared project isolation)

- [ ] RLS policies verified in `hairdresser` schema
- [ ] `hairdresser.delete_my_data()` exists and executable by `authenticated`

Initials:
Timestamp:

## C) Post-Deploy Smoke Test (Must Pass)

- [ ] Live URL loads Hairdresser branding (not Tradie)
- [ ] Console shows active product `hairdresser`
- [ ] Console shows schema `hairdresser`
- [ ] Login succeeds with non-admin test account
- [ ] Create customer succeeds
- [ ] Full backup export succeeds
- [ ] `Delete My Data` visible (not `Wipe All Data`)
- [ ] `Sign Out` button visible and functioning
- [ ] Dev banner hidden in production

Initials:
Timestamp:

## D) Isolation / Data Ownership Checks

- [ ] Test user A cannot see test user B data
- [ ] Test user B cannot see test user A data
- [ ] Same login cannot see Tradie product records from Hairdresser
- [ ] Same login cannot see Hairdresser records from Tradie
- [ ] Delete My Data only deletes current logged-in user's records

Initials:
Timestamp:

## E) Backup + Recovery Readiness

- [ ] Fresh production backup taken after deploy
- [ ] Backup file location recorded:
- [ ] Restore smoke test performed in non-production context
- [ ] Recovery owner assigned:

Initials:
Timestamp:

## Go / No-Go

- [ ] GO approved
- [ ] NO-GO / rollback initiated

Decision Owner Signature:
Decision Time (AEST):

## Rollback Trigger Checklist

Trigger rollback immediately if any are true:

- [ ] Wrong product loads on live domain
- [ ] Wrong schema targeted (`public` or `tradie` for hairdresser release)
- [ ] Users cannot see their own expected data
- [ ] Cross-user visibility breach occurs
- [ ] Any destructive global wipe path appears in production UI

Rollback executed by:
Rollback time (AEST):
Incident notes:

