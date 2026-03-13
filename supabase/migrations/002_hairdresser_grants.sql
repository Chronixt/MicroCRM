-- Grant anon and authenticated roles access to the hairdresser schema.
-- Run this in Supabase SQL Editor if you get "permission denied for schema hairdresser".
-- Also add "hairdresser" to Exposed schemas: Dashboard -> Settings -> API -> Exposed schemas.

GRANT USAGE ON SCHEMA hairdresser TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hairdresser TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hairdresser TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA hairdresser
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA hairdresser
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
