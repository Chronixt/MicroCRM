# New Product Bootstrap Guide

Use this when creating a new CRM product variant from `main` without forking large app logic.

## 1) Create Product Profile

1. Copy one profile file under `js/products/` (for example `js/products/tradie/profile.js`).
2. Set core config:
   - `appName`, `appSlug`
   - `dbName`, `storagePrefix`
   - `themeColor`, `logoLight`, `logoAlt`
   - `useSupabase`, `supabaseSchema`
3. Set entities:
   - `entities.appointment.singular/plural` (for example `Job/Jobs`).
4. Set enabled features:
   - `features.jobPipeline` true/false
   - other toggles (`images`, `calendar`, `handwritingNotes`, etc.).
5. Set `customerFields` enabled flags for all fields used by that product.

## 2) Wire Runtime Config

1. In local test config (`js/config.local.js`):
   - `window.ACTIVE_PRODUCT = '<new-product>'`
   - `window.SUPABASE_SCHEMA = '<schema>'`
2. In Netlify env for deployed site:
   - `ACTIVE_PRODUCT`
   - `SUPABASE_SCHEMA`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - safety flags:
     - `SHOW_ENV_BANNER=false`
     - `ALLOW_DESTRUCTIVE_WIPE=false`
     - `ENABLE_AUTO_CLAIM_UNOWNED_DATA=false`

## 3) Database + RLS

1. Create/prepare schema for the product.
2. Ensure owner-based RLS policies exist for all tables.
3. Ensure `delete_my_data()` exists in schema and execute is restricted:
   - `authenticated` allowed
   - `anon` and `public` revoked

## 4) Required Smoke Test

1. App loads correct branding and product name.
2. Console shows correct `active product` and `schema`.
3. Login works.
4. Create/edit customer works.
5. Backup export works.
6. `Delete My Data` works only for current user.
7. `Sign Out` visible and works.
8. No cross-user visibility.

## 5) Release Gate

Before merge/deploy, complete:

- `Plans/safety-parity-release-checklist.md`
- product-specific sign-off:
  - `Plans/hairdresser-production-cutover-signoff.md` or
  - `Plans/tradie-production-cutover-signoff.md`

