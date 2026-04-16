-- Harden claim_unowned_data to avoid broad ownership reassignment.
-- This migration prevents claiming unowned customers globally and only allows
-- filling missing owner_user_id on child rows that already belong to a customer
-- owned by the current authenticated user.

-- =========================
-- Hairdresser schema
-- =========================
CREATE OR REPLACE FUNCTION hairdresser.claim_unowned_data()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = hairdresser, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_customers int := 0;
  v_appointments int := 0;
  v_images int := 0;
  v_notes int := 0;
  v_note_versions int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Safety: never auto-claim customer ownership globally.
  v_customers := 0;

  UPDATE hairdresser.appointments a
  SET owner_user_id = v_user
  FROM hairdresser.customers c
  WHERE a.customer_id = c.id
    AND c.owner_user_id = v_user
    AND a.owner_user_id IS NULL;
  GET DIAGNOSTICS v_appointments = ROW_COUNT;

  UPDATE hairdresser.images i
  SET owner_user_id = v_user
  FROM hairdresser.customers c
  WHERE i.customer_id = c.id
    AND c.owner_user_id = v_user
    AND i.owner_user_id IS NULL;
  GET DIAGNOSTICS v_images = ROW_COUNT;

  UPDATE hairdresser.notes n
  SET owner_user_id = v_user
  FROM hairdresser.customers c
  WHERE n.customer_id = c.id
    AND c.owner_user_id = v_user
    AND n.owner_user_id IS NULL;
  GET DIAGNOSTICS v_notes = ROW_COUNT;

  UPDATE hairdresser.note_versions nv
  SET owner_user_id = v_user
  FROM hairdresser.notes n
  WHERE nv.note_id = n.id
    AND n.owner_user_id = v_user
    AND nv.owner_user_id IS NULL;
  GET DIAGNOSTICS v_note_versions = ROW_COUNT;

  RETURN json_build_object(
    'customers', v_customers,
    'appointments', v_appointments,
    'images', v_images,
    'notes', v_notes,
    'noteVersions', v_note_versions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION hairdresser.claim_unowned_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION hairdresser.claim_unowned_data() FROM anon;
REVOKE EXECUTE ON FUNCTION hairdresser.claim_unowned_data() FROM public;

-- =========================
-- Tradie schema
-- =========================
CREATE OR REPLACE FUNCTION tradie.claim_unowned_data()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = tradie, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_customers int := 0;
  v_appointments int := 0;
  v_images int := 0;
  v_notes int := 0;
  v_note_versions int := 0;
  v_reminders int := 0;
  v_job_events int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Safety: never auto-claim customer ownership globally.
  v_customers := 0;

  UPDATE tradie.appointments a
  SET owner_user_id = v_user
  FROM tradie.customers c
  WHERE a.customer_id = c.id
    AND c.owner_user_id = v_user
    AND a.owner_user_id IS NULL;
  GET DIAGNOSTICS v_appointments = ROW_COUNT;

  UPDATE tradie.images i
  SET owner_user_id = v_user
  FROM tradie.customers c
  WHERE i.customer_id = c.id
    AND c.owner_user_id = v_user
    AND i.owner_user_id IS NULL;
  GET DIAGNOSTICS v_images = ROW_COUNT;

  UPDATE tradie.notes n
  SET owner_user_id = v_user
  FROM tradie.customers c
  WHERE n.customer_id = c.id
    AND c.owner_user_id = v_user
    AND n.owner_user_id IS NULL;
  GET DIAGNOSTICS v_notes = ROW_COUNT;

  UPDATE tradie.note_versions nv
  SET owner_user_id = v_user
  FROM tradie.notes n
  WHERE nv.note_id = n.id
    AND n.owner_user_id = v_user
    AND nv.owner_user_id IS NULL;
  GET DIAGNOSTICS v_note_versions = ROW_COUNT;

  UPDATE tradie.reminders r
  SET owner_user_id = v_user
  FROM tradie.customers c
  WHERE r.customer_id = c.id
    AND c.owner_user_id = v_user
    AND r.owner_user_id IS NULL;
  GET DIAGNOSTICS v_reminders = ROW_COUNT;

  UPDATE tradie.job_events e
  SET owner_user_id = v_user
  FROM tradie.customers c
  WHERE e.customer_id = c.id
    AND c.owner_user_id = v_user
    AND e.owner_user_id IS NULL;
  GET DIAGNOSTICS v_job_events = ROW_COUNT;

  RETURN json_build_object(
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

GRANT EXECUTE ON FUNCTION tradie.claim_unowned_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION tradie.claim_unowned_data() FROM anon;
REVOKE EXECUTE ON FUNCTION tradie.claim_unowned_data() FROM public;
