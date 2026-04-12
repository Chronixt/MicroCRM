/**
 * App configuration. Supabase credentials are loaded from js/config.local.js (gitignored).
 * Copy js/config.local.example.js to js/config.local.js and add your URL and anon key.
 * If config.local.js is missing or empty, the app uses IndexedDB.
 */
(function () {
  var host = String(window.location.hostname || '').toLowerCase();
  if (!window.ACTIVE_PRODUCT && !window.PRODUCT_PROFILE) {
    if (host.indexOf('beautician') !== -1 || host.indexOf('hairdresser') !== -1 || host.indexOf('chikas') !== -1) {
      window.ACTIVE_PRODUCT = 'hairdresser';
    } else if (host.indexOf('tradie') !== -1) {
      window.ACTIVE_PRODUCT = 'tradie';
    }
  }

  window.SUPABASE_URL = window.SUPABASE_URL || '';
  window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
  var hasCredentials = !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
  window.USE_SUPABASE = window.USE_SUPABASE !== undefined ? window.USE_SUPABASE : hasCredentials;
  window.REQUIRE_LOGIN = window.REQUIRE_LOGIN !== undefined ? window.REQUIRE_LOGIN : window.USE_SUPABASE;
  window.ADDRESS_LOOKUP_ENABLED = window.ADDRESS_LOOKUP_ENABLED !== undefined ? window.ADDRESS_LOOKUP_ENABLED : false;
  window.ADDRESS_LOOKUP_PROVIDER = window.ADDRESS_LOOKUP_PROVIDER || 'nominatim';
  window.ADDRESS_LOOKUP_MIN_CHARS = window.ADDRESS_LOOKUP_MIN_CHARS || 3;
  window.ADDRESS_LOOKUP_DEBOUNCE_MS = window.ADDRESS_LOOKUP_DEBOUNCE_MS || 450;
  window.ADDRESS_LOOKUP_COUNTRY_CODES = window.ADDRESS_LOOKUP_COUNTRY_CODES || '';
  window.GOOGLE_PLACES_API_KEY = window.GOOGLE_PLACES_API_KEY || '';
})();
