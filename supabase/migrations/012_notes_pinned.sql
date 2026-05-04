-- Add pinned-note metadata to every configured product/dev schema.
-- Optional override:
--   SET app.notes_pinned_schemas = 'hairdresser_sandbox_admin';

BEGIN;

DO $$
DECLARE
  target_schemas_raw text := COALESCE(NULLIF(current_setting('app.notes_pinned_schemas', true), ''), 'public,hairdresser,tradie,hairdresser_sandbox_admin');
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
        AND table_name = 'notes'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false',
      target_schema
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_notes_customer_pinned ON %I.notes (customer_id, is_pinned)',
      target_schema
    );
  END LOOP;
END $$;

COMMIT;
