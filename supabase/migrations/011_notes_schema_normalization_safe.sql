-- Phase 2 (safe) notes schema normalization.
-- Non-destructive scope only:
--  1) Backfill tradie.note_versions.saved_at nulls and enforce NOT NULL
--  2) Add DESC indexes for notes timeline/version history reads
--
-- Optional override:
--   SET app.notes_normalization_schemas = 'tradie';

BEGIN;

DO $$
DECLARE
  target_schemas_raw text := COALESCE(NULLIF(current_setting('app.notes_normalization_schemas', true), ''), 'tradie');
  target_schema text;
BEGIN
  FOR target_schema IN
    SELECT DISTINCT BTRIM(value)
    FROM regexp_split_to_table(target_schemas_raw, ',') AS value
    WHERE BTRIM(value) <> ''
  LOOP
    -- Skip missing schemas in mixed environments.
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.schemata
      WHERE schema_name = target_schema
    ) THEN
      CONTINUE;
    END IF;

    -- note_versions.saved_at hardening
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'note_versions'
        AND column_name = 'saved_at'
    ) THEN
      EXECUTE format(
        'UPDATE %I.note_versions SET saved_at = now() WHERE saved_at IS NULL',
        target_schema
      );

      EXECUTE format(
        'ALTER TABLE %I.note_versions ALTER COLUMN saved_at SET NOT NULL',
        target_schema
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_note_versions_saved_at_desc_norm ON %I.note_versions (saved_at DESC)',
        target_schema
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'notes'
        AND column_name = 'created_at'
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_notes_created_at_desc_norm ON %I.notes (created_at DESC)',
        target_schema
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
