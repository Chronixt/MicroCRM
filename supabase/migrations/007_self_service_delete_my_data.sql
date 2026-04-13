-- Self-service data deletion: authenticated users can delete ONLY their own data.
-- This preserves customer data ownership while preventing cross-tenant/global wipes.

-- =========================
-- Hairdresser schema
-- =========================
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

  RETURN json_build_object(
    'schema', 'hairdresser',
    'user', v_user,
    'customers', v_customers,
    'appointments', v_appointments,
    'images', v_images,
    'notes', v_notes,
    'noteVersions', v_note_versions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION hairdresser.delete_my_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION hairdresser.delete_my_data() FROM anon;
REVOKE EXECUTE ON FUNCTION hairdresser.delete_my_data() FROM public;

-- =========================
-- Tradie schema
-- =========================
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

  RETURN json_build_object(
    'schema', 'tradie',
    'user', v_user,
    'customers', v_customers,
    'appointments', v_appointments,
    'images', v_images,
    'notes', v_notes,
    'noteVersions', v_note_versions,
    'reminders', v_reminders,
    'jobEvents', v_job_events
  );
END;
$$;

GRANT EXECUTE ON FUNCTION tradie.delete_my_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION tradie.delete_my_data() FROM anon;
REVOKE EXECUTE ON FUNCTION tradie.delete_my_data() FROM public;
