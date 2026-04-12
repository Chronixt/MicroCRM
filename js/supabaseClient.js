/**
 * Supabase client bootstrap (schema-aware singleton).
 * Uses runtime credentials from config.local.js / runtime config.
 */
(function () {
  'use strict';

  var SUPABASE_URL = window.SUPABASE_URL || '';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
    window.SupabaseClient = null;
    return;
  }

  if (window.SupabaseClient &&
      window.__SUPABASE_CLIENT_URL === SUPABASE_URL &&
      window.__SUPABASE_CLIENT_SCHEMA === schema) {
    return;
  }

  try {
    window.SupabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: { schema: schema }
    });
    window.__SUPABASE_CLIENT_URL = SUPABASE_URL;
    window.__SUPABASE_CLIENT_SCHEMA = schema;
    console.log('Supabase client initialized (schema: ' + schema + ')');
  } catch (e) {
    console.error('Failed to create Supabase client:', e);
    window.SupabaseClient = null;
  }
})();
