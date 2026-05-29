-- Add persisted per-image rotation metadata to configured product/dev schemas.
-- Optional override:
--   SET app.image_rotation_schemas = 'hairdresser_sandbox_admin';

BEGIN;

DO $$
DECLARE
  target_schemas_raw text := COALESCE(NULLIF(current_setting('app.image_rotation_schemas', true), ''), 'public,hairdresser,tradie,hairdresser_sandbox_admin');
  target_schema text;
BEGIN
  FOR target_schema IN
    SELECT DISTINCT BTRIM(value)
    FROM regexp_split_to_table(target_schemas_raw, ',') AS value
    WHERE BTRIM(value) <> ''
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.schemata
      WHERE schema_name = target_schema
    ) THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = target_schema
        AND table_name = 'images'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.images ADD COLUMN IF NOT EXISTS rotation_degrees INTEGER NOT NULL DEFAULT 0',
      target_schema
    );
  END LOOP;
END $$;

COMMIT;
