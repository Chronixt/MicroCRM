-- Report-only schema diff for notes/note_versions between two schemas.
-- Default comparison: hairdresser (base) vs tradie (compare).
--
-- Optional overrides:
--   SET app.notes_normalization_base_schema = 'hairdresser';
--   SET app.notes_normalization_compare_schema = 'tradie';
--
-- Output shape:
--   check_name, schema_name, row_count, status, details, object_type, object_name, base_value, compare_value

CREATE TEMP TABLE IF NOT EXISTS _notes_schema_diff_results (
  check_name text,
  schema_name text,
  row_count bigint,
  status text,
  details text,
  object_type text,
  object_name text,
  base_value text,
  compare_value text
) ON COMMIT DROP;

TRUNCATE _notes_schema_diff_results;

WITH cfg AS (
  SELECT
    COALESCE(NULLIF(current_setting('app.notes_normalization_base_schema', true), ''), 'hairdresser') AS base_schema,
    COALESCE(NULLIF(current_setting('app.notes_normalization_compare_schema', true), ''), 'tradie') AS compare_schema
)
INSERT INTO _notes_schema_diff_results
SELECT
  'diff.schema_exists' AS check_name,
  cfg.base_schema || '->' || cfg.compare_schema AS schema_name,
  (CASE WHEN b.exists_flag THEN 1 ELSE 0 END + CASE WHEN c.exists_flag THEN 1 ELSE 0 END)::bigint AS row_count,
  CASE WHEN b.exists_flag AND c.exists_flag THEN 'ok' ELSE 'fail' END AS status,
  'Base/compare schema existence' AS details,
  'schema' AS object_type,
  cfg.base_schema || '|' || cfg.compare_schema AS object_name,
  CASE WHEN b.exists_flag THEN 'present' ELSE 'missing' END AS base_value,
  CASE WHEN c.exists_flag THEN 'present' ELSE 'missing' END AS compare_value
FROM cfg
CROSS JOIN LATERAL (
  SELECT EXISTS (SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = cfg.base_schema) AS exists_flag
) b
CROSS JOIN LATERAL (
  SELECT EXISTS (SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = cfg.compare_schema) AS exists_flag
) c;

WITH cfg AS (
  SELECT
    COALESCE(NULLIF(current_setting('app.notes_normalization_base_schema', true), ''), 'hairdresser') AS base_schema,
    COALESCE(NULLIF(current_setting('app.notes_normalization_compare_schema', true), ''), 'tradie') AS compare_schema
),
base_cols AS (
  SELECT table_name, column_name,
         data_type,
         udt_name,
         is_nullable,
         column_default,
         identity_generation
  FROM information_schema.columns, cfg
  WHERE table_schema = cfg.base_schema
    AND table_name IN ('notes', 'note_versions')
),
compare_cols AS (
  SELECT table_name, column_name,
         data_type,
         udt_name,
         is_nullable,
         column_default,
         identity_generation
  FROM information_schema.columns, cfg
  WHERE table_schema = cfg.compare_schema
    AND table_name IN ('notes', 'note_versions')
),
joined AS (
  SELECT
    COALESCE(b.table_name, c.table_name) AS table_name,
    COALESCE(b.column_name, c.column_name) AS column_name,
    b.data_type AS b_data_type,
    c.data_type AS c_data_type,
    b.udt_name AS b_udt_name,
    c.udt_name AS c_udt_name,
    b.is_nullable AS b_nullable,
    c.is_nullable AS c_nullable,
    b.column_default AS b_default,
    c.column_default AS c_default,
    b.identity_generation AS b_identity,
    c.identity_generation AS c_identity
  FROM base_cols b
  FULL OUTER JOIN compare_cols c
    ON b.table_name = c.table_name
   AND b.column_name = c.column_name
)
INSERT INTO _notes_schema_diff_results
SELECT
  'diff.columns' AS check_name,
  cfg.base_schema || '->' || cfg.compare_schema AS schema_name,
  1::bigint AS row_count,
  'warn' AS status,
  'Column-level drift detected' AS details,
  'column' AS object_type,
  joined.table_name || '.' || joined.column_name AS object_name,
  CONCAT_WS(' | ', joined.b_data_type, joined.b_udt_name, joined.b_nullable, COALESCE(joined.b_identity, 'identity:none'), COALESCE(joined.b_default, 'default:none')) AS base_value,
  CONCAT_WS(' | ', joined.c_data_type, joined.c_udt_name, joined.c_nullable, COALESCE(joined.c_identity, 'identity:none'), COALESCE(joined.c_default, 'default:none')) AS compare_value
FROM joined
CROSS JOIN cfg
WHERE joined.b_data_type IS NULL
   OR joined.c_data_type IS NULL
   OR joined.b_data_type IS DISTINCT FROM joined.c_data_type
   OR joined.b_udt_name IS DISTINCT FROM joined.c_udt_name
   OR joined.b_nullable IS DISTINCT FROM joined.c_nullable
   OR joined.b_default IS DISTINCT FROM joined.c_default
   OR joined.b_identity IS DISTINCT FROM joined.c_identity;

WITH cfg AS (
  SELECT
    COALESCE(NULLIF(current_setting('app.notes_normalization_base_schema', true), ''), 'hairdresser') AS base_schema,
    COALESCE(NULLIF(current_setting('app.notes_normalization_compare_schema', true), ''), 'tradie') AS compare_schema
),
base_indexes AS (
  SELECT tablename AS table_name, indexname AS index_name, indexdef
  FROM pg_indexes, cfg
  WHERE schemaname = cfg.base_schema
    AND tablename IN ('notes', 'note_versions')
),
compare_indexes AS (
  SELECT tablename AS table_name, indexname AS index_name, indexdef
  FROM pg_indexes, cfg
  WHERE schemaname = cfg.compare_schema
    AND tablename IN ('notes', 'note_versions')
),
joined AS (
  SELECT
    COALESCE(b.table_name, c.table_name) AS table_name,
    COALESCE(b.index_name, c.index_name) AS index_name,
    b.indexdef AS b_def,
    c.indexdef AS c_def
  FROM base_indexes b
  FULL OUTER JOIN compare_indexes c
    ON b.table_name = c.table_name
   AND b.index_name = c.index_name
)
INSERT INTO _notes_schema_diff_results
SELECT
  'diff.indexes' AS check_name,
  cfg.base_schema || '->' || cfg.compare_schema AS schema_name,
  1::bigint AS row_count,
  'warn' AS status,
  'Index-level drift detected' AS details,
  'index' AS object_type,
  joined.table_name || '.' || joined.index_name AS object_name,
  COALESCE(joined.b_def, 'missing') AS base_value,
  COALESCE(joined.c_def, 'missing') AS compare_value
FROM joined
CROSS JOIN cfg
WHERE joined.b_def IS NULL
   OR joined.c_def IS NULL
   OR joined.b_def IS DISTINCT FROM joined.c_def;

WITH cfg AS (
  SELECT
    COALESCE(NULLIF(current_setting('app.notes_normalization_base_schema', true), ''), 'hairdresser') AS base_schema,
    COALESCE(NULLIF(current_setting('app.notes_normalization_compare_schema', true), ''), 'tradie') AS compare_schema
),
base_triggers AS (
  SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation, action_statement
  FROM information_schema.triggers, cfg
  WHERE trigger_schema = cfg.base_schema
    AND event_object_table IN ('notes', 'note_versions')
),
compare_triggers AS (
  SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation, action_statement
  FROM information_schema.triggers, cfg
  WHERE trigger_schema = cfg.compare_schema
    AND event_object_table IN ('notes', 'note_versions')
),
joined AS (
  SELECT
    COALESCE(b.table_name, c.table_name) AS table_name,
    COALESCE(b.trigger_name, c.trigger_name) AS trigger_name,
    b.action_timing AS b_timing,
    c.action_timing AS c_timing,
    b.event_manipulation AS b_event,
    c.event_manipulation AS c_event,
    b.action_statement AS b_stmt,
    c.action_statement AS c_stmt
  FROM base_triggers b
  FULL OUTER JOIN compare_triggers c
    ON b.table_name = c.table_name
   AND b.trigger_name = c.trigger_name
)
INSERT INTO _notes_schema_diff_results
SELECT
  'diff.triggers' AS check_name,
  cfg.base_schema || '->' || cfg.compare_schema AS schema_name,
  1::bigint AS row_count,
  'warn' AS status,
  'Trigger-level drift detected' AS details,
  'trigger' AS object_type,
  joined.table_name || '.' || joined.trigger_name AS object_name,
  CONCAT_WS(' | ', joined.b_timing, joined.b_event, joined.b_stmt) AS base_value,
  CONCAT_WS(' | ', joined.c_timing, joined.c_event, joined.c_stmt) AS compare_value
FROM joined
CROSS JOIN cfg
WHERE joined.b_timing IS NULL
   OR joined.c_timing IS NULL
   OR joined.b_timing IS DISTINCT FROM joined.c_timing
   OR joined.b_event IS DISTINCT FROM joined.c_event
   OR joined.b_stmt IS DISTINCT FROM joined.c_stmt;

WITH cfg AS (
  SELECT
    COALESCE(NULLIF(current_setting('app.notes_normalization_base_schema', true), ''), 'hairdresser') AS base_schema,
    COALESCE(NULLIF(current_setting('app.notes_normalization_compare_schema', true), ''), 'tradie') AS compare_schema
)
INSERT INTO _notes_schema_diff_results
SELECT
  'diff.summary' AS check_name,
  cfg.base_schema || '->' || cfg.compare_schema AS schema_name,
  COUNT(*)::bigint AS row_count,
  CASE WHEN COUNT(*) = 0 THEN 'ok' ELSE 'warn' END AS status,
  'Total schema drift items across columns/indexes/triggers' AS details,
  'summary' AS object_type,
  'notes+note_versions' AS object_name,
  cfg.base_schema AS base_value,
  cfg.compare_schema AS compare_value
FROM _notes_schema_diff_results r
CROSS JOIN cfg
WHERE r.check_name IN ('diff.columns', 'diff.indexes', 'diff.triggers');

SELECT
  check_name,
  schema_name,
  row_count,
  status,
  details,
  object_type,
  object_name,
  base_value,
  compare_value
FROM _notes_schema_diff_results
ORDER BY
  CASE WHEN check_name = 'diff.summary' THEN 1 ELSE 0 END,
  check_name,
  object_type,
  object_name;
