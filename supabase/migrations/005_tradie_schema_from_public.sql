-- Tradie schema cutover from public schema
-- Safe for early-stage environments with no real production data.
-- This migration MOVES existing tradie tables from public -> tradie.

BEGIN;

CREATE SCHEMA IF NOT EXISTS tradie;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'customers',
    'appointments',
    'images',
    'notes',
    'note_versions',
    'reminders',
    'job_events'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL AND to_regclass('tradie.' || tbl) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA tradie', tbl);
    END IF;
  END LOOP;
END $$;

-- Ensure API roles can access the tradie schema objects (RLS still applies)
GRANT USAGE ON SCHEMA tradie TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tradie TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tradie TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA tradie
GRANT ALL PRIVILEGES ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA tradie
GRANT ALL PRIVILEGES ON SEQUENCES TO anon, authenticated, service_role;

COMMIT;
