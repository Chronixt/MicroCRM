/**
 * Supabase client for TradieCRM
 * Uses Project URL + anon key (safe for browser; protect data with RLS in Supabase).
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://vmztgfahkqbbdoajeaxu.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtenRnZmFoa3FiYmRvYWplYXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzE0MDAsImV4cCI6MjA4NTU0NzQwMH0.qEWGQnJRtdYut33FzUrFvpgTk1s9KF2qZqIuqCt9u0U';

  if (typeof supabase === 'undefined') {
    console.warn('Supabase JS not loaded. Add the Supabase script before supabaseClient.js.');
    window.SupabaseClient = null;
    return;
  }

  try {
    window.SupabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
  } catch (e) {
    console.error('Failed to create Supabase client:', e);
    window.SupabaseClient = null;
  }
})();
