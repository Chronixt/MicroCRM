-- Preserve note edit time-of-day by upgrading edited_date from date -> timestamptz.
-- Safe to run multiple times; only alters columns that are still type date.

BEGIN;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema IN ('hairdresser', 'tradie')
      AND table_name IN ('notes', 'note_versions')
      AND column_name = 'edited_date'
      AND data_type = 'date'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN edited_date TYPE timestamptz USING (CASE WHEN edited_date IS NULL THEN NULL ELSE edited_date::timestamptz END)',
      rec.table_schema,
      rec.table_name
    );
  END LOOP;
END $$;

COMMIT;

