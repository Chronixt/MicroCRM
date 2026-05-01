/**
 * App configuration. Supabase credentials are loaded from js/config.local.js (gitignored).
 * Copy js/config.local.example.js to js/config.local.js and add your URL and publishable key.
 * If config.local.js is missing or empty, the app uses IndexedDB.
 */
(function () {
  var host = String(window.location.hostname || '').toLowerCase();
  var isLocal = host === 'localhost' || host === '127.0.0.1';
  var isProdLike = !isLocal;
  var branchName = String(
    window.GIT_BRANCH ||
    window.NETLIFY_BRANCH ||
    window.BRANCH ||
    ''
  ).toLowerCase().trim();
  var forceLiveSchema = (
    window.FORCE_LIVE_SCHEMA === true ||
    String(window.FORCE_LIVE_SCHEMA || '').toLowerCase() === 'true'
  );
  var devSchema = String(window.SUPABASE_DEV_SCHEMA || '').trim();

  function isUpdateOrMainBranch(name) {
    if (!name) return false;
    return name === 'main' || name.indexOf('update') !== -1;
  }

  if (!window.ACTIVE_PRODUCT && !window.PRODUCT_PROFILE) {
    if (host.indexOf('beautician') !== -1 || host.indexOf('hairdresser') !== -1 || host.indexOf('chikas') !== -1) {
      window.ACTIVE_PRODUCT = 'hairdresser';
    } else if (host.indexOf('tradie') !== -1) {
      window.ACTIVE_PRODUCT = 'tradie';
    }
  }

  if (!window.SUPABASE_SCHEMA) {
    var activeProduct = String(window.ACTIVE_PRODUCT || window.PRODUCT_PROFILE || '').toLowerCase();
    if (activeProduct === 'hairdresser') {
      window.SUPABASE_SCHEMA = 'hairdresser';
    } else if (activeProduct === 'tradie') {
      window.SUPABASE_SCHEMA = 'tradie';
    }
  }

  // Branch-safe schema routing:
  // If SUPABASE_DEV_SCHEMA is set, use it automatically on `main` and update branches.
  // Set FORCE_LIVE_SCHEMA=true to bypass this protection for intentional prod operations.
  if (!forceLiveSchema && devSchema && isUpdateOrMainBranch(branchName)) {
    window.SUPABASE_SCHEMA = devSchema;
  }

  window.SUPABASE_URL = window.SUPABASE_URL || '';
  window.SUPABASE_PUBLISHABLE_KEY = window.SUPABASE_PUBLISHABLE_KEY || '';
  window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
  var clientKey = window.SUPABASE_PUBLISHABLE_KEY || window.SUPABASE_ANON_KEY;
  var hasCredentials = !!(window.SUPABASE_URL && clientKey);
  window.USE_SUPABASE = window.USE_SUPABASE !== undefined ? window.USE_SUPABASE : hasCredentials;
  window.REQUIRE_LOGIN = window.REQUIRE_LOGIN !== undefined ? window.REQUIRE_LOGIN : window.USE_SUPABASE;
  window.ADDRESS_LOOKUP_ENABLED = window.ADDRESS_LOOKUP_ENABLED !== undefined ? window.ADDRESS_LOOKUP_ENABLED : false;
  window.ADDRESS_LOOKUP_PROVIDER = window.ADDRESS_LOOKUP_PROVIDER || 'nominatim';
  window.ADDRESS_LOOKUP_MIN_CHARS = window.ADDRESS_LOOKUP_MIN_CHARS || 3;
  window.ADDRESS_LOOKUP_DEBOUNCE_MS = window.ADDRESS_LOOKUP_DEBOUNCE_MS || 450;
  window.ADDRESS_LOOKUP_COUNTRY_CODES = window.ADDRESS_LOOKUP_COUNTRY_CODES || '';
  window.GOOGLE_PLACES_API_KEY = window.GOOGLE_PLACES_API_KEY || '';

  // Safety defaults: production should be conservative unless explicitly enabled.
  if (window.SHOW_ENV_BANNER === undefined) {
    window.SHOW_ENV_BANNER = isLocal;
  }
  if (!window.APP_ENV_LABEL) {
    window.APP_ENV_LABEL = isLocal ? 'LOCAL DEV' : 'PRODUCTION';
  }
  if (window.ENABLE_AUTO_CLAIM_UNOWNED_DATA === undefined) {
    window.ENABLE_AUTO_CLAIM_UNOWNED_DATA = false;
  }
  if (window.ALLOW_UNOWNED_CLAIM_RPC === undefined) {
    window.ALLOW_UNOWNED_CLAIM_RPC = false;
  }
  if (window.ALLOW_DESTRUCTIVE_WIPE === undefined) {
    window.ALLOW_DESTRUCTIVE_WIPE = false;
  }
})();
