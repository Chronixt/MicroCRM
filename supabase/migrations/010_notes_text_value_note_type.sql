-- Add explicit typed note payload fields for notes and note_versions.
-- Safe to run multiple times. Applies to both hairdresser and tradie schemas.
--
-- PHASES
--  1) Schema additions
--  2) Deterministic backfill / recovery
--  3) Invariant gate (fail-fast before strict constraints)
--  4) Constraint enforcement + NOT NULL strictness

BEGIN;

DO $$
DECLARE
  target_schemas_raw text := COALESCE(NULLIF(current_setting('app.notes_migration_schemas', true), ''), 'hairdresser,tradie');
  target_schema text;
  notes_has_content boolean;
  versions_has_content boolean;
  notes_invalid_type_count bigint;
  notes_payload_xor_fail_count bigint;
  versions_invalid_type_count bigint;
  versions_payload_xor_fail_count bigint;
BEGIN
  FOR target_schema IN
    SELECT s.schema_name
    FROM information_schema.schemata s
    JOIN (
      SELECT DISTINCT BTRIM(value) AS schema_name
      FROM regexp_split_to_table(target_schemas_raw, ',') AS value
      WHERE BTRIM(value) <> ''
    ) cfg ON cfg.schema_name = s.schema_name
  LOOP
    -- =============================
    -- Phase 1: schema add
    -- =============================
    EXECUTE format('ALTER TABLE %I.notes ADD COLUMN IF NOT EXISTS text_value text', target_schema);
    EXECUTE format('ALTER TABLE %I.notes ADD COLUMN IF NOT EXISTS note_type text', target_schema);
    EXECUTE format('ALTER TABLE %I.note_versions ADD COLUMN IF NOT EXISTS text_value text', target_schema);
    EXECUTE format('ALTER TABLE %I.note_versions ADD COLUMN IF NOT EXISTS note_type text', target_schema);

    -- =============================
    -- Phase 2: deterministic backfill / recovery
    -- =============================
    notes_has_content := EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'notes'
        AND column_name = 'content'
    );

    IF notes_has_content THEN
      EXECUTE format($sql$
        UPDATE %I.notes
        SET text_value = NULLIF(BTRIM(content), '')
        WHERE (text_value IS NULL OR BTRIM(text_value) = '')
          AND content IS NOT NULL
          AND BTRIM(content) <> ''
      $sql$, target_schema);
    END IF;

    versions_has_content := EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'note_versions'
        AND column_name = 'content'
    );

    IF versions_has_content THEN
      EXECUTE format($sql$
        UPDATE %I.note_versions
        SET text_value = NULLIF(BTRIM(content), '')
        WHERE (text_value IS NULL OR BTRIM(text_value) = '')
          AND content IS NOT NULL
          AND BTRIM(content) <> ''
      $sql$, target_schema);
    END IF;

    EXECUTE format($sql$
      UPDATE %I.notes
      SET note_type = CASE
        WHEN note_type IN ('text', 'svg') THEN note_type
        WHEN text_value IS NOT NULL AND BTRIM(text_value) <> '' THEN 'text'
        WHEN svg IS NOT NULL AND svg LIKE '%%data-note-type="text"%%' THEN 'text'
        ELSE 'svg'
      END
      WHERE note_type IS NULL OR note_type NOT IN ('text', 'svg')
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.note_versions
      SET note_type = CASE
        WHEN note_type IN ('text', 'svg') THEN note_type
        WHEN text_value IS NOT NULL AND BTRIM(text_value) <> '' THEN 'text'
        WHEN svg IS NOT NULL AND svg LIKE '%%data-note-type="text"%%' THEN 'text'
        ELSE 'svg'
      END
      WHERE note_type IS NULL OR note_type NOT IN ('text', 'svg')
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.notes
      SET text_value = NULLIF(BTRIM(
        REPLACE(
          REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(svg, '(?is).*<text[^>]*>(.*?)</text>.*', '\1'),
                '(?is)</tspan>\s*<tspan[^>]*>', E'\n',
                'g'
              ),
              '(?is)<[^>]+>',
              '',
              'g'
            ),
            '&#160;',
            ' '
          ),
          '&nbsp;',
          ' '
        )
      ), '')
      WHERE note_type = 'text'
        AND (text_value IS NULL OR BTRIM(text_value) = '')
        AND svg IS NOT NULL
        AND svg LIKE '%%<text%%'
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.note_versions
      SET text_value = NULLIF(BTRIM(
        REPLACE(
          REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(svg, '(?is).*<text[^>]*>(.*?)</text>.*', '\1'),
                '(?is)</tspan>\s*<tspan[^>]*>', E'\n',
                'g'
              ),
              '(?is)<[^>]+>',
              '',
              'g'
            ),
            '&#160;',
            ' '
          ),
          '&nbsp;',
          ' '
        )
      ), '')
      WHERE note_type = 'text'
        AND (text_value IS NULL OR BTRIM(text_value) = '')
        AND svg IS NOT NULL
        AND svg LIKE '%%<text%%'
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.notes
      SET text_value = '[Recovered empty note]'
      WHERE note_type = 'text'
        AND (text_value IS NULL OR BTRIM(text_value) = '')
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.note_versions
      SET text_value = '[Recovered empty note version]'
      WHERE note_type = 'text'
        AND (text_value IS NULL OR BTRIM(text_value) = '')
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.notes
      SET note_type = 'text', text_value = '[Recovered note with missing SVG]', svg = NULL
      WHERE note_type = 'svg'
        AND (svg IS NULL OR BTRIM(svg) = '')
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.note_versions
      SET note_type = 'text', text_value = '[Recovered note version with missing SVG]', svg = NULL
      WHERE note_type = 'svg'
        AND (svg IS NULL OR BTRIM(svg) = '')
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.notes
      SET svg = NULL
      WHERE note_type = 'text'
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.notes
      SET text_value = NULL
      WHERE note_type = 'svg'
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.note_versions
      SET svg = NULL
      WHERE note_type = 'text'
    $sql$, target_schema);

    EXECUTE format($sql$
      UPDATE %I.note_versions
      SET text_value = NULL
      WHERE note_type = 'svg'
    $sql$, target_schema);

    -- =============================
    -- Phase 3: invariant gate before strictness
    -- =============================
    EXECUTE format('SET LOCAL search_path TO %I, public', target_schema);

    notes_invalid_type_count := (
      SELECT COUNT(*)
      FROM notes
      WHERE note_type NOT IN ('text', 'svg')
         OR note_type IS NULL
    );

    notes_payload_xor_fail_count := (
      SELECT COUNT(*)
      FROM notes
      WHERE NOT (
        (note_type = 'svg' AND svg IS NOT NULL AND BTRIM(svg) <> '' AND (text_value IS NULL OR BTRIM(text_value) = ''))
        OR
        (note_type = 'text' AND text_value IS NOT NULL AND BTRIM(text_value) <> '' AND (svg IS NULL OR BTRIM(svg) = ''))
      )
    );

    versions_invalid_type_count := (
      SELECT COUNT(*)
      FROM note_versions
      WHERE note_type NOT IN ('text', 'svg')
         OR note_type IS NULL
    );

    versions_payload_xor_fail_count := (
      SELECT COUNT(*)
      FROM note_versions
      WHERE NOT (
        (note_type = 'svg' AND svg IS NOT NULL AND BTRIM(svg) <> '' AND (text_value IS NULL OR BTRIM(text_value) = ''))
        OR
        (note_type = 'text' AND text_value IS NOT NULL AND BTRIM(text_value) <> '' AND (svg IS NULL OR BTRIM(svg) = ''))
      )
    );

    IF notes_invalid_type_count > 0
      OR notes_payload_xor_fail_count > 0
      OR versions_invalid_type_count > 0
      OR versions_payload_xor_fail_count > 0 THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Typed note invariant gate failed for schema=%s (notes_invalid=%s, notes_xor_fail=%s, versions_invalid=%s, versions_xor_fail=%s). Stop before strict constraints and run validation scripts.',
          target_schema,
          notes_invalid_type_count,
          notes_payload_xor_fail_count,
          versions_invalid_type_count,
          versions_payload_xor_fail_count
        );
    END IF;

    -- =============================
    -- Phase 4: constraint enforcement + strictness
    -- =============================
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = target_schema
        AND t.relname = 'notes'
        AND c.conname = 'notes_note_type_valid_chk'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.notes ADD CONSTRAINT notes_note_type_valid_chk CHECK (note_type IN (''text'',''svg''))',
        target_schema
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = target_schema
        AND t.relname = 'notes'
        AND c.conname = 'notes_note_payload_xor_chk'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.notes ADD CONSTRAINT notes_note_payload_xor_chk CHECK ((note_type = ''svg'' AND svg IS NOT NULL AND BTRIM(svg) <> '''' AND (text_value IS NULL OR BTRIM(text_value) = '''')) OR (note_type = ''text'' AND text_value IS NOT NULL AND BTRIM(text_value) <> '''' AND (svg IS NULL OR BTRIM(svg) = '''')))',
        target_schema
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = target_schema
        AND t.relname = 'note_versions'
        AND c.conname = 'note_versions_note_type_valid_chk'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.note_versions ADD CONSTRAINT note_versions_note_type_valid_chk CHECK (note_type IN (''text'',''svg''))',
        target_schema
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = target_schema
        AND t.relname = 'note_versions'
        AND c.conname = 'note_versions_note_payload_xor_chk'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.note_versions ADD CONSTRAINT note_versions_note_payload_xor_chk CHECK ((note_type = ''svg'' AND svg IS NOT NULL AND BTRIM(svg) <> '''' AND (text_value IS NULL OR BTRIM(text_value) = '''')) OR (note_type = ''text'' AND text_value IS NOT NULL AND BTRIM(text_value) <> '''' AND (svg IS NULL OR BTRIM(svg) = '''')))',
        target_schema
      );
    END IF;

    EXECUTE format('ALTER TABLE %I.notes ALTER COLUMN note_type SET NOT NULL', target_schema);
    EXECUTE format('ALTER TABLE %I.note_versions ALTER COLUMN note_type SET NOT NULL', target_schema);
  END LOOP;
END $$;

COMMIT;
