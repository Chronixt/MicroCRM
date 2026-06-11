-- Add delete_my_data() RPC for hairdresser_sandbox_admin so sandbox matches
-- app expectations and avoids REST RPC 404 noise in Options > Delete My Data.

CREATE OR REPLACE FUNCTION hairdresser_sandbox_admin.delete_my_data()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = hairdresser_sandbox_admin, public
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

  DELETE FROM hairdresser_sandbox_admin.note_versions WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_note_versions = ROW_COUNT;

  DELETE FROM hairdresser_sandbox_admin.notes WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_notes = ROW_COUNT;

  DELETE FROM hairdresser_sandbox_admin.images WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_images = ROW_COUNT;

  DELETE FROM hairdresser_sandbox_admin.appointments WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_appointments = ROW_COUNT;

  DELETE FROM hairdresser_sandbox_admin.customers WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_customers = ROW_COUNT;

  DELETE FROM hairdresser_sandbox_admin.user_profiles WHERE owner_user_id = v_user;
  GET DIAGNOSTICS v_profiles = ROW_COUNT;

  RETURN json_build_object(
    'schema', 'hairdresser_sandbox_admin',
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

GRANT EXECUTE ON FUNCTION hairdresser_sandbox_admin.delete_my_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION hairdresser_sandbox_admin.delete_my_data() FROM anon;
REVOKE EXECUTE ON FUNCTION hairdresser_sandbox_admin.delete_my_data() FROM public;
