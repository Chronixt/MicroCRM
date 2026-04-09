# Supabase Single-Project Admin/Test Workflow

Last updated: 2026-04-06

## Goal

Use one Supabase project safely for both live and branch testing by relying on:

- Product schemas (`hairdresser`, `tradie`)
- Strict owner-based RLS
- Separate users for admin and testing

## Preconditions

- `hairdresser` owner RLS applied (`004_hairdresser_owner_rls.sql`)
- `tradie` owner RLS applied (`006_tradie_owner_rls.sql`)
- App uses `REQUIRE_LOGIN = true` for Supabase mode

## 1) Create users (Auth)

In Supabase Dashboard -> Authentication -> Users:

1. Create `admin@yourdomain` with strong password.
2. Create `test@yourdomain` with strong password.
3. (Optional) create `test2@yourdomain` for cross-user isolation checks.

Recommended:

- Disable public signup.
- Enable email/password only (unless you need social login).

## 2) App config for safe testing

In local `js/config.local.js` use only test profile credentials:

```js
window.REQUIRE_LOGIN = true;
window.ACTIVE_PRODUCT = 'tradie'; // or 'hairdresser'
window.USE_SUPABASE = true;
window.SUPABASE_SCHEMA = 'tradie'; // or 'hairdresser'
window.APP_ENV_LABEL = 'DEV TEST';
window.SHOW_ENV_BANNER = true;
```

The runtime banner in-app should show environment + user email + schema.

## 3) First-login ownership claim

On first login for a user in each schema:

- The app calls `claim_unowned_data()` automatically (where available).
- This claims legacy unowned rows for that user.

If you need to run manually in SQL Editor:

```sql
select tradie.claim_unowned_data();
select hairdresser.claim_unowned_data();
```

(Requires authenticated context via app; direct SQL Editor runs as elevated role and are usually not needed.)

## 4) Isolation verification checklist

Run these tests:

1. Login as `test@...`.
2. Create customer/job in `tradie`.
3. Logout/login as `test2@...`.
4. Confirm `test2` cannot see `test` data.
5. Repeat in `hairdresser`.

Optional policy verification query:

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname in ('tradie','hairdresser')
order by schemaname, tablename, policyname;
```

## 5) Admin operating rules

Use `admin@...` only for:

- migration checks
- schema maintenance
- emergency data recovery

Avoid using `admin@...` for normal app testing.

## 6) Rotation and secret hygiene

- Rotate any keys exposed in logs/chat.
- Keep `js/config.local.js` gitignored.
- Never use service role key in browser code.

## 7) Branch testing routine

For each branch session:

1. Set product/schema in config.
2. Login as `test@...`.
3. Confirm runtime banner shows expected env/user/schema.
4. Run feature tests.
5. Export backup before destructive tests.

This keeps testing separated while staying in one Supabase project.
