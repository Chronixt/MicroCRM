-- Add explicit typed note payload fields for notes and note_versions.
-- Safe to run multiple times. Applies to both hairdresser and tradie schemas.

BEGIN;

DO $$
DECLARE
  target_schema text;
  notes_has_content boolean;
  versions_has_content boolean;
BEGIN
  FOR target_schema IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name IN ('hairdresser', 'tradie')
  LOOP
    EXECUTE format('ALTER TABLE %I.notes ADD COLUMN IF NOT EXISTS text_value text', target_schema);
    EXECUTE format('ALTER TABLE %I.notes ADD COLUMN IF NOT EXISTS note_type text', target_schema);
    EXECUTE format('ALTER TABLE %I.note_versions ADD COLUMN IF NOT EXISTS text_value text', target_schema);
    EXECUTE format('ALTER TABLE %I.note_versions ADD COLUMN IF NOT EXISTS note_type text', target_schema);

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'notes'
        AND column_name = 'content'
    ) INTO notes_has_content;

    IF notes_has_content THEN
      EXECUTE format($sql$
        UPDATE %I.notes
        SET text_value = NULLIF(BTRIM(content), '')
        WHERE (text_value IS NULL OR BTRIM(text_value) = '')
          AND content IS NOT NULL
          AND BTRIM(content) <> ''
      $sql$, target_schema);
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'note_versions'
        AND column_name = 'content'
    ) INTO versions_has_content;

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
