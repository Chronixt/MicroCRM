-- Pre-cutover validation for typed-note migration (run before 010 and at rehearsal start).
-- Machine-readable output shape:
--   check_name, schema_name, row_count, status, details

CREATE TEMP TABLE IF NOT EXISTS _notes_precheck_results (
  check_name text,
  schema_name text,
  row_count bigint,
  status text,
  details text
) ON COMMIT DROP;

TRUNCATE _notes_precheck_results;

DO $$
DECLARE
  target_schemas_raw text := COALESCE(NULLIF(current_setting('app.notes_validation_schemas', true), ''), 'hairdresser,tradie');
  s text;
  has_notes boolean;
  has_versions boolean;
  notes_has_note_type boolean;
  versions_has_note_type boolean;
BEGIN
  FOR s IN
    SELECT DISTINCT BTRIM(value)
    FROM regexp_split_to_table(target_schemas_raw, ',') AS value
    WHERE BTRIM(value) <> ''
  LOOP
    SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s)
    INTO has_notes;

    INSERT INTO _notes_precheck_results(check_name, schema_name, row_count, status, details)
    VALUES (
      'pre.schema_exists',
      s,
      CASE WHEN has_notes THEN 1 ELSE 0 END,
      CASE WHEN has_notes THEN 'ok' ELSE 'warn' END,
      CASE WHEN has_notes THEN 'schema present' ELSE 'schema missing in this environment' END
    );

    IF NOT has_notes THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = s AND table_name = 'notes'
    ) INTO has_notes;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = s AND table_name = 'note_versions'
    ) INTO has_versions;

    INSERT INTO _notes_precheck_results(check_name, schema_name, row_count, status, details)
    VALUES
      (
        'pre.table_exists.notes',
        s,
        CASE WHEN has_notes THEN 1 ELSE 0 END,
        CASE WHEN has_notes THEN 'ok' ELSE 'warn' END,
        CASE WHEN has_notes THEN 'notes present' ELSE 'notes missing' END
      ),
      (
        'pre.table_exists.note_versions',
        s,
        CASE WHEN has_versions THEN 1 ELSE 0 END,
        CASE WHEN has_versions THEN 'ok' ELSE 'warn' END,
        CASE WHEN has_versions THEN 'note_versions present' ELSE 'note_versions missing' END
      );

    IF has_notes THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = s AND table_name = 'notes' AND column_name = 'note_type'
      ) INTO notes_has_note_type;

      EXECUTE format($sql$
        INSERT INTO _notes_precheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'pre.rows_inferred_as_text_from_svg_candidates.notes',
          %L,
          COUNT(*),
          'info',
          'Rows carrying serialized text-note svg markers'
        FROM %I.notes
        WHERE svg IS NOT NULL
          AND svg LIKE '%%data-note-type="text"%%'
      $sql$, s, s);

      IF notes_has_note_type THEN
        EXECUTE format($sql$
          INSERT INTO _notes_precheck_results(check_name, schema_name, row_count, status, details)
          SELECT
            'pre.rows_coerced_invalid_svg_to_text_candidates.notes',
            %L,
            COUNT(*),
            'info',
            'Rows with svg type but empty svg payload (coercion candidates)'
          FROM %I.notes
          WHERE note_type = 'svg'
            AND (svg IS NULL OR BTRIM(svg) = '')
        $sql$, s, s);
      ELSE
        INSERT INTO _notes_precheck_results(check_name, schema_name, row_count, status, details)
        VALUES (
          'pre.rows_coerced_invalid_svg_to_text_candidates.notes',
          s,
          0,
          'info',
          'note_type column not present yet'
        );
      END IF;
    END IF;

    IF has_versions THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = s AND table_name = 'note_versions' AND column_name = 'note_type'
      ) INTO versions_has_note_type;

      EXECUTE format($sql$
        INSERT INTO _notes_precheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'pre.rows_inferred_as_text_from_svg_candidates.note_versions',
          %L,
          COUNT(*),
          'info',
          'Version rows carrying serialized text-note svg markers'
        FROM %I.note_versions
        WHERE svg IS NOT NULL
          AND svg LIKE '%%data-note-type="text"%%'
      $sql$, s, s);

      IF versions_has_note_type THEN
        EXECUTE format($sql$
          INSERT INTO _notes_precheck_results(check_name, schema_name, row_count, status, details)
          SELECT
            'pre.rows_coerced_invalid_svg_to_text_candidates.note_versions',
            %L,
            COUNT(*),
            'info',
            'Version rows with svg type but empty svg payload (coercion candidates)'
          FROM %I.note_versions
          WHERE note_type = 'svg'
            AND (svg IS NULL OR BTRIM(svg) = '')
        $sql$, s, s);
      ELSE
        INSERT INTO _notes_precheck_results(check_name, schema_name, row_count, status, details)
        VALUES (
          'pre.rows_coerced_invalid_svg_to_text_candidates.note_versions',
          s,
          0,
          'info',
          'note_type column not present yet'
        );
      END IF;
    END IF;
  END LOOP;
END $$;

SELECT check_name, schema_name, row_count, status, details
FROM _notes_precheck_results
ORDER BY schema_name, check_name;
