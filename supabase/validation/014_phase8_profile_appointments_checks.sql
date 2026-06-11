-- Phase 8 validation: profile + appointments compatibility and safety checks.
--
-- Usage in Supabase SQL editor:
--   set app.phase8_schemas = 'hairdresser_sandbox_admin,hairdresser,tradie';
--   \i supabase/validation/014_phase8_profile_appointments_checks.sql
--
-- Output columns:
--   check_name, schema_name, row_count, status, details

CREATE TEMP TABLE IF NOT EXISTS _phase8_checks (
  check_name text,
  schema_name text,
  row_count bigint,
  status text,
  details text
);

TRUNCATE _phase8_checks;

DO $$
DECLARE
  target_schemas_raw text := COALESCE(NULLIF(current_setting('app.phase8_schemas', true), ''), 'hairdresser_sandbox_admin,hairdresser,tradie');
  s text;
  has_schema boolean;
  has_user_profiles boolean;
  has_appointments boolean;
  has_col boolean;
  pol_count int;
  fn_count int;
  fn_has_user_profiles boolean;
BEGIN
  FOR s IN
    SELECT trim(value)
    FROM regexp_split_to_table(target_schemas_raw, ',') AS value
    WHERE trim(value) <> ''
  LOOP
    has_schema := EXISTS (
      SELECT 1
      FROM information_schema.schemata
      WHERE schema_name = s
    );

    INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
    VALUES (
      'phase8.schema_exists',
      s,
      CASE WHEN has_schema THEN 1 ELSE 0 END,
      CASE WHEN has_schema THEN 'ok' ELSE 'warn' END,
      CASE WHEN has_schema THEN 'schema present' ELSE 'schema missing in this environment' END
    );

    IF NOT has_schema THEN
      CONTINUE;
    END IF;

    has_user_profiles := EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = s AND table_name = 'user_profiles'
    );
    has_appointments := EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = s AND table_name = 'appointments'
    );

    INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
    VALUES (
      'phase8.table_exists.user_profiles',
      s,
      CASE WHEN has_user_profiles THEN 1 ELSE 0 END,
      CASE WHEN has_user_profiles THEN 'ok' ELSE 'warn' END,
      CASE WHEN has_user_profiles THEN 'user_profiles exists' ELSE 'user_profiles missing' END
    );

    INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
    VALUES (
      'phase8.table_exists.appointments',
      s,
      CASE WHEN has_appointments THEN 1 ELSE 0 END,
      CASE WHEN has_appointments THEN 'ok' ELSE 'warn' END,
      CASE WHEN has_appointments THEN 'appointments exists' ELSE 'appointments missing' END
    );

    IF has_user_profiles THEN
      -- Required profile columns.
      FOR has_col IN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = s AND table_name = 'user_profiles' AND column_name = 'owner_user_id'
        )
      LOOP
        INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
        VALUES (
          'phase8.user_profiles.column.owner_user_id',
          s,
          CASE WHEN has_col THEN 1 ELSE 0 END,
          CASE WHEN has_col THEN 'ok' ELSE 'fail' END,
          CASE WHEN has_col THEN 'column present' ELSE 'column missing' END
        );
      END LOOP;

      FOR has_col IN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = s AND table_name = 'user_profiles' AND column_name = 'first_name'
        )
      LOOP
        INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
        VALUES (
          'phase8.user_profiles.column.first_name',
          s,
          CASE WHEN has_col THEN 1 ELSE 0 END,
          CASE WHEN has_col THEN 'ok' ELSE 'fail' END,
          CASE WHEN has_col THEN 'column present' ELSE 'column missing' END
        );
      END LOOP;

      FOR has_col IN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = s AND table_name = 'user_profiles' AND column_name = 'plan_label'
        )
      LOOP
        INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
        VALUES (
          'phase8.user_profiles.column.plan_label',
          s,
          CASE WHEN has_col THEN 1 ELSE 0 END,
          CASE WHEN has_col THEN 'ok' ELSE 'warn' END,
          CASE WHEN has_col THEN 'column present' ELSE 'column missing (optional fallback applies)' END
        );
      END LOOP;

      -- Expect owner RLS policies to exist.
      SELECT COUNT(*)::int
      INTO pol_count
      FROM pg_policies
      WHERE schemaname = s
        AND tablename = 'user_profiles'
        AND policyname IN ('User profiles owner select', 'User profiles owner insert', 'User profiles owner update');

      INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
      VALUES (
        'phase8.user_profiles.owner_policies',
        s,
        pol_count,
        CASE WHEN pol_count >= 3 THEN 'ok' ELSE 'warn' END,
        CASE WHEN pol_count >= 3 THEN 'owner select/insert/update policies found' ELSE 'missing one or more expected owner policies' END
      );
    END IF;

    IF has_appointments THEN
      FOR has_col IN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = s AND table_name = 'appointments' AND column_name = 'notes'
        )
      LOOP
        INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
        VALUES (
          'phase8.appointments.column.notes',
          s,
          CASE WHEN has_col THEN 1 ELSE 0 END,
          CASE WHEN has_col THEN 'ok' ELSE 'warn' END,
          CASE WHEN has_col THEN 'column present' ELSE 'column missing' END
        );
      END LOOP;

      -- Shared summary compatibility fields (warn-level where optional by product flag).
      FOR has_col IN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = s AND table_name = 'appointments' AND column_name = 'status'
        )
      LOOP
        INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
        VALUES (
          'phase8.appointments.column.status',
          s,
          CASE WHEN has_col THEN 1 ELSE 0 END,
          CASE WHEN has_col THEN 'ok' ELSE 'warn' END,
          CASE WHEN has_col THEN 'column present' ELSE 'column missing (feature-flag fallback expected)' END
        );
      END LOOP;
    END IF;

    -- delete_my_data function exists and references user_profiles cleanup.
    SELECT COUNT(*)::int
    INTO fn_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = s
      AND p.proname = 'delete_my_data';

    INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
    VALUES (
      'phase8.function.delete_my_data.exists',
      s,
      fn_count,
      CASE WHEN fn_count > 0 THEN 'ok' ELSE 'warn' END,
      CASE WHEN fn_count > 0 THEN 'function exists' ELSE 'function missing in this schema' END
    );

    IF fn_count > 0 THEN
      SELECT COALESCE(position('user_profiles' IN pg_get_functiondef(p.oid)) > 0, false)
      INTO fn_has_user_profiles
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = s
        AND p.proname = 'delete_my_data'
      LIMIT 1;

      INSERT INTO _phase8_checks(check_name, schema_name, row_count, status, details)
      VALUES (
        'phase8.function.delete_my_data.user_profiles_cleanup',
        s,
        CASE WHEN fn_has_user_profiles THEN 1 ELSE 0 END,
        CASE WHEN fn_has_user_profiles THEN 'ok' ELSE 'warn' END,
        CASE WHEN fn_has_user_profiles THEN 'function definition references user_profiles' ELSE 'function does not appear to reference user_profiles' END
      );
    END IF;
  END LOOP;
END $$;

SELECT check_name, schema_name, row_count, status, details
FROM _phase8_checks
ORDER BY schema_name, check_name;
