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
