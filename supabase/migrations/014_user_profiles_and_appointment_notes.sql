-- Modern UI support: authenticated user profile settings and optional
-- appointment notes used by selected-booking details.

DO $$
DECLARE
  target_schema text;
  target_schemas text[] := ARRAY['hairdresser', 'tradie'];
BEGIN
  FOREACH target_schema IN ARRAY target_schemas LOOP
    EXECUTE format('CREATE OR REPLACE FUNCTION %I.set_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $fn$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $fn$', target_schema);

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.user_profiles (
      owner_user_id uuid PRIMARY KEY DEFAULT auth.uid(),
      first_name text NOT NULL,
      last_name text,
      plan_label text DEFAULT ''Standard Plan'',
      preferred_language text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )', target_schema);

    EXECUTE format('ALTER TABLE %I.user_profiles ENABLE ROW LEVEL SECURITY', target_schema);

    EXECUTE format('DROP POLICY IF EXISTS "User profiles owner select" ON %I.user_profiles', target_schema);
    EXECUTE format('DROP POLICY IF EXISTS "User profiles owner insert" ON %I.user_profiles', target_schema);
    EXECUTE format('DROP POLICY IF EXISTS "User profiles owner update" ON %I.user_profiles', target_schema);

    EXECUTE format('CREATE POLICY "User profiles owner select" ON %I.user_profiles
      FOR SELECT TO authenticated
      USING (owner_user_id = auth.uid())', target_schema);

    EXECUTE format('CREATE POLICY "User profiles owner insert" ON %I.user_profiles
      FOR INSERT TO authenticated
      WITH CHECK (owner_user_id = auth.uid())', target_schema);

    EXECUTE format('CREATE POLICY "User profiles owner update" ON %I.user_profiles
      FOR UPDATE TO authenticated
      USING (owner_user_id = auth.uid())
      WITH CHECK (owner_user_id = auth.uid())', target_schema);

    EXECUTE format('DROP TRIGGER IF EXISTS user_profiles_updated_at ON %I.user_profiles', target_schema);
    EXECUTE format('CREATE TRIGGER user_profiles_updated_at
      BEFORE UPDATE ON %I.user_profiles
      FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', target_schema, target_schema);

    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS notes text', target_schema);

    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS status text DEFAULT ''scheduled''', target_schema);
    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS quoted_amount numeric(12,2)', target_schema);
    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS invoice_amount numeric(12,2)', target_schema);
    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2)', target_schema);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION hairdresser.delete_my_data()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = hairdresser, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_note_versions int := 0;
  v_notes int := 0;
  v_images int := 0;
  v_appointments int := 0;
  v_customers int := 0;
  v_profiles int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM hairdresser.note_versions WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_note_versions = ROW_COUNT;

  DELETE FROM hairdresser.notes WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_notes = ROW_COUNT;

  DELETE FROM hairdresser.images WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_images = ROW_COUNT;

  DELETE FROM hairdresser.appointments WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_appointments = ROW_COUNT;

  DELETE FROM hairdresser.customers WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_customers = ROW_COUNT;

  DELETE FROM hairdresser.user_profiles WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_profiles = ROW_COUNT;

  RETURN json_build_object(
    'schema', 'hairdresser',
    'user', v_user,
    'customers', v_customers,
    'appointments', v_appointments,
    'images', v_images,
    'notes', v_notes,
    'noteVersions', v_note_versions,
    'userProfiles', v_profiles
  );
END;
$$;

GRANT EXECUTE ON FUNCTION hairdresser.delete_my_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION hairdresser.delete_my_data() FROM anon;
REVOKE EXECUTE ON FUNCTION hairdresser.delete_my_data() FROM public;

CREATE OR REPLACE FUNCTION tradie.delete_my_data()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = tradie, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_note_versions int := 0;
  v_notes int := 0;
  v_images int := 0;
  v_reminders int := 0;
  v_job_events int := 0;
  v_appointments int := 0;
  v_customers int := 0;
  v_profiles int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM tradie.note_versions WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_note_versions = ROW_COUNT;

  DELETE FROM tradie.notes WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_notes = ROW_COUNT;

  DELETE FROM tradie.images WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_images = ROW_COUNT;

  DELETE FROM tradie.reminders WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_reminders = ROW_COUNT;

  DELETE FROM tradie.job_events WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_job_events = ROW_COUNT;

  DELETE FROM tradie.appointments WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_appointments = ROW_COUNT;

  DELETE FROM tradie.customers WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_customers = ROW_COUNT;

  DELETE FROM tradie.user_profiles WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_profiles = ROW_COUNT;

  RETURN json_build_object(
    'schema', 'tradie',
    'user', v_user,
    'customers', v_customers,
    'appointments', v_appointments,
    'images', v_images,
    'notes', v_notes,
    'noteVersions', v_note_versions,
    'reminders', v_reminders,
    'jobEvents', v_job_events,
    'userProfiles', v_profiles
  );
END;
$$;

GRANT EXECUTE ON FUNCTION tradie.delete_my_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION tradie.delete_my_data() FROM anon;
REVOKE EXECUTE ON FUNCTION tradie.delete_my_data() FROM public;
