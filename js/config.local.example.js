/**
 * Local development credentials (not committed).
 * 1. Copy this file to config.local.js:  cp config.local.example.js config.local.js
 * 2. Replace the placeholders with your Supabase project URL and anon key.
 *    Get them from: Supabase Dashboard → Project Settings → API
 * 3. config.local.js is in .gitignore and will not be committed.
 *
 * Production/Netlify:
 * - Set SUPABASE_URL, SUPABASE_ANON_KEY, USE_SUPABASE, REQUIRE_LOGIN
 *   in Netlify Environment Variables.
 * - The app reads these via /.netlify/functions/runtime-config.
 */
(function () {
  window.SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
  window.SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
  window.REQUIRE_LOGIN = true;
  window.ACTIVE_PRODUCT = 'tradie'; // 'tradie' or 'hairdresser'

  // Optional: branch-safe schema routing.
  // On `main` and branch names containing `update`, js/config.js will use this schema automatically.
  // Example for your safe copy: 'hairdresser_sandbox_admin'
  window.SUPABASE_DEV_SCHEMA = '';

  // Optional: set current branch manually in local dev if not injected by your environment.
  // window.GIT_BRANCH = 'feature/ui-core-update-2026-04-17';

  // Optional: bypass dev-schema routing for intentional live operations.
  // window.FORCE_LIVE_SCHEMA = true;

  // Optional address lookup configuration
  // Set to true to enable address lookup in customer forms.
  window.ADDRESS_LOOKUP_ENABLED = false;

  // Provider: 'nominatim' (free, no key) or 'google' (Places API key required).
  window.ADDRESS_LOOKUP_PROVIDER = 'nominatim';

  // Optional: limit lookup to one or more countries (ISO 3166-1 alpha-2), comma-separated.
  // Example: 'au' or 'au,nz'
  window.ADDRESS_LOOKUP_COUNTRY_CODES = '';

  // Required only when ADDRESS_LOOKUP_PROVIDER = 'google'
  window.GOOGLE_PLACES_API_KEY = '';
})();
