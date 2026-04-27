/*
 * Deprecated compatibility shim.
 * Canonical Supabase adapter lives in js/db-supabase.js.
 *
 * This file intentionally contains no business logic to avoid adapter drift.
 */
(function () {
  'use strict';

  if (window.CrmDB && typeof window.CrmDB === 'object') {
    console.warn('[dbSupabase] Deprecated shim loaded. Use js/db-supabase.js as the canonical adapter.');
    return;
  }

  throw new Error('[dbSupabase] Deprecated adapter path loaded without canonical adapter. Load js/db-supabase.js instead.');
})();
