-- Post-cutover validation for typed-note migration (run after 010 on rehearsal + production).
-- Machine-readable output shape:
--   check_name, schema_name, row_count, status, details

CREATE TEMP TABLE IF NOT EXISTS _notes_postcheck_results (
  check_name text,
  schema_name text,
  row_count bigint,
  status text,
  details text
) ON COMMIT DROP;

TRUNCATE _notes_postcheck_results;

DO $$
DECLARE
  target_schemas_raw text := COALESCE(NULLIF(current_setting('app.notes_validation_schemas', true), ''), 'hairdresser,tradie');
  s text;
  has_schema boolean;
  has_notes boolean;
  has_versions boolean;
BEGIN
  FOR s IN
    SELECT DISTINCT BTRIM(value)
    FROM regexp_split_to_table(target_schemas_raw, ',') AS value
    WHERE BTRIM(value) <> ''
  LOOP
    SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s)
    INTO has_schema;

    INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
    VALUES (
      'post.schema_exists',
      s,
      CASE WHEN has_schema THEN 1 ELSE 0 END,
      CASE WHEN has_schema THEN 'ok' ELSE 'warn' END,
      CASE WHEN has_schema THEN 'schema present' ELSE 'schema missing in this environment' END
    );

    IF NOT has_schema THEN
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

    INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
    VALUES
      (
        'post.table_exists.notes',
        s,
        CASE WHEN has_notes THEN 1 ELSE 0 END,
        CASE WHEN has_notes THEN 'ok' ELSE 'fail' END,
        CASE WHEN has_notes THEN 'notes present' ELSE 'notes missing' END
      ),
      (
        'post.table_exists.note_versions',
        s,
        CASE WHEN has_versions THEN 1 ELSE 0 END,
        CASE WHEN has_versions THEN 'ok' ELSE 'fail' END,
        CASE WHEN has_versions THEN 'note_versions present' ELSE 'note_versions missing' END
      );

    IF has_notes THEN
      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.rows_recovered_with_fallback_placeholder.notes',
          %L,
          COUNT(*),
          'info',
          'Rows carrying fallback recovery placeholder text'
        FROM %I.notes
        WHERE text_value IN ('[Recovered empty note]', '[Recovered note with missing SVG]')
      $sql$, s, s);

      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.rows_inferred_as_text_from_svg.notes',
          %L,
          COUNT(*),
          'info',
          'Rows with text note_type where svg marker still indicates serialized text note'
        FROM %I.notes
        WHERE note_type = 'text'
          AND svg IS NOT NULL
          AND svg LIKE '%%data-note-type="text"%%'
      $sql$, s, s);

      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.rows_coerced_invalid_svg_to_text.notes',
          %L,
          COUNT(*),
          'info',
          'Rows coerced from invalid svg payload to text fallback'
        FROM %I.notes
        WHERE note_type = 'text'
          AND text_value = '[Recovered note with missing SVG]'
      $sql$, s, s);

      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.typed_payload_xor_failures.notes',
          %L,
          COUNT(*),
          CASE WHEN COUNT(*) = 0 THEN 'ok' ELSE 'fail' END,
          'Typed payload xor failures in notes'
        FROM %I.notes
        WHERE NOT (
          (note_type = 'svg' AND svg IS NOT NULL AND BTRIM(svg) <> '' AND (text_value IS NULL OR BTRIM(text_value) = ''))
          OR
          (note_type = 'text' AND text_value IS NOT NULL AND BTRIM(text_value) <> '' AND (svg IS NULL OR BTRIM(svg) = ''))
        )
      $sql$, s, s);

      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.note_type_invalid_or_null.notes',
          %L,
          COUNT(*),
          CASE WHEN COUNT(*) = 0 THEN 'ok' ELSE 'fail' END,
          'Rows with invalid or null note_type in notes'
        FROM %I.notes
        WHERE note_type IS NULL OR note_type NOT IN ('text','svg')
      $sql$, s, s);
    END IF;

    IF has_versions THEN
      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.rows_recovered_with_fallback_placeholder.note_versions',
          %L,
          COUNT(*),
          'info',
          'Version rows carrying fallback recovery placeholder text'
        FROM %I.note_versions
        WHERE text_value IN ('[Recovered empty note version]', '[Recovered note version with missing SVG]')
      $sql$, s, s);

      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.rows_inferred_as_text_from_svg.note_versions',
          %L,
          COUNT(*),
          'info',
          'Version rows with text note_type where svg marker still indicates serialized text note'
        FROM %I.note_versions
        WHERE note_type = 'text'
          AND svg IS NOT NULL
          AND svg LIKE '%%data-note-type="text"%%'
      $sql$, s, s);

      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.rows_coerced_invalid_svg_to_text.note_versions',
          %L,
          COUNT(*),
          'info',
          'Version rows coerced from invalid svg payload to text fallback'
        FROM %I.note_versions
        WHERE note_type = 'text'
          AND text_value = '[Recovered note version with missing SVG]'
      $sql$, s, s);

      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.typed_payload_xor_failures.note_versions',
          %L,
          COUNT(*),
          CASE WHEN COUNT(*) = 0 THEN 'ok' ELSE 'fail' END,
          'Typed payload xor failures in note_versions'
        FROM %I.note_versions
        WHERE NOT (
          (note_type = 'svg' AND svg IS NOT NULL AND BTRIM(svg) <> '' AND (text_value IS NULL OR BTRIM(text_value) = ''))
          OR
          (note_type = 'text' AND text_value IS NOT NULL AND BTRIM(text_value) <> '' AND (svg IS NULL OR BTRIM(svg) = ''))
        )
      $sql$, s, s);

      EXECUTE format($sql$
        INSERT INTO _notes_postcheck_results(check_name, schema_name, row_count, status, details)
        SELECT
          'post.note_type_invalid_or_null.note_versions',
          %L,
          COUNT(*),
          CASE WHEN COUNT(*) = 0 THEN 'ok' ELSE 'fail' END,
          'Rows with invalid or null note_type in note_versions'
        FROM %I.note_versions
        WHERE note_type IS NULL OR note_type NOT IN ('text','svg')
      $sql$, s, s);
    END IF;
  END LOOP;
END $$;

SELECT check_name, schema_name, row_count, status, details
FROM _notes_postcheck_results
ORDER BY schema_name, check_name;
