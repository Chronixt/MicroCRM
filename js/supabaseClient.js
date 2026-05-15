/**
 * Supabase client bootstrap (schema-aware singleton).
 * Uses runtime credentials from config.local.js / runtime config.
 */
(function () {
  'use strict';

  var SUPABASE_URL = window.SUPABASE_URL || '';
  var SUPABASE_PUBLISHABLE_KEY = window.SUPABASE_PUBLISHABLE_KEY || '';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
  var SUPABASE_CLIENT_KEY = SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY;
  var productConfig = window.ProductConfig || {};
  var activeProduct = String(window.ACTIVE_PRODUCT || window.PRODUCT_PROFILE || productConfig.activeProduct || '').toLowerCase();
  var schema =
    window.SUPABASE_SCHEMA ||
    (activeProduct === 'hairdresser' ? 'hairdresser' : '') ||
    (activeProduct === 'tradie' ? 'tradie' : '') ||
    productConfig.supabaseSchema ||
    'public';

  if (typeof supabase === 'undefined') {
    console.warn('Supabase JS not loaded. Add the Supabase script before supabaseClient.js.');
    window.SupabaseClient = null;
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_CLIENT_KEY) {
    console.warn('Supabase credentials missing. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY).');
    window.SupabaseClient = null;
    return;
  }

  if (window.SupabaseClient &&
      window.__SUPABASE_CLIENT_URL === SUPABASE_URL &&
      window.__SUPABASE_CLIENT_SCHEMA === schema) {
    return;
  }

  function getProjectRef(url) {
    try {
      var host = String(new URL(url).hostname || '');
      return host.split('.')[0] || '';
    } catch (e) {
      return '';
    }
  }

  function getAuthStorageKey(url) {
    var ref = getProjectRef(url);
    return ref ? ('sb-' + ref + '-auth-token') : '';
  }

  function clearPersistedAuthState(url) {
    var key = getAuthStorageKey(url);
    if (!key) return;
    try {
      localStorage.removeItem(key);
      localStorage.removeItem('lock:' + key);
    } catch (e) {}
    try {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem('lock:' + key);
    } catch (e) {}
  }

  window.clearSupabaseAuthState = function () {
    clearPersistedAuthState(SUPABASE_URL);
  };

  function isInvalidRefreshTokenError(err) {
    var msg = String(err && (err.message || err.error_description || err.error || err) || '').toLowerCase();
    return msg.indexOf('invalid refresh token') !== -1 || msg.indexOf('refresh token not found') !== -1;
  }

  function isRetryableAuthFetchError(err) {
    var name = String(err && err.name || '').toLowerCase();
    var msg = String(err && (err.message || err.error_description || err.error || err) || '').toLowerCase();
    return name.indexOf('authretryablefetcherror') !== -1 ||
      msg.indexOf('failed to fetch') !== -1 ||
      msg.indexOf('network') !== -1 ||
      msg.indexOf('timeout') !== -1 ||
      msg.indexOf('timed out') !== -1;
  }

  try {
    window.SupabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_CLIENT_KEY, {
      db: { schema: schema }
    });
    window.__SUPABASE_CLIENT_URL = SUPABASE_URL;
    window.__SUPABASE_CLIENT_SCHEMA = schema;
    console.log('Supabase client initialized (schema: ' + schema + ')');

    // Recovery path for migrated keys / stale local sessions:
    // if persisted refresh token is invalid or unreachable, clear local auth state.
    window.SupabaseClient.auth.getSession().catch(function (err) {
      if (!isInvalidRefreshTokenError(err) && !isRetryableAuthFetchError(err)) return;
      console.warn('Supabase session reset: auth refresh failed. Clearing local auth cache.');
      try { window.SupabaseClient.auth.signOut({ scope: 'local' }); } catch (e) {}
      clearPersistedAuthState(SUPABASE_URL);
    });
  } catch (e) {
    console.error('Failed to create Supabase client:', e);
    window.SupabaseClient = null;
  }
})();
