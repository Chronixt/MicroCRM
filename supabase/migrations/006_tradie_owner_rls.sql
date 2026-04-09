-- Tradie owner-based RLS baseline
-- - Email/password login (Supabase Auth)
-- - Row ownership via owner_user_id
-- - Strict per-user RLS policies

-- 1) Ownership columns
ALTER TABLE tradie.customers
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE tradie.appointments
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE tradie.images
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE tradie.notes
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE tradie.note_versions
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE tradie.reminders
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE tradie.job_events
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE tradie.customers ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE tradie.appointments ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE tradie.images ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE tradie.notes ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE tradie.note_versions ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE tradie.reminders ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE tradie.job_events ALTER COLUMN owner_user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_tradie_customers_owner_user_id ON tradie.customers(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tradie_appointments_owner_user_id ON tradie.appointments(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tradie_images_owner_user_id ON tradie.images(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tradie_notes_owner_user_id ON tradie.notes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tradie_note_versions_owner_user_id ON tradie.note_versions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tradie_reminders_owner_user_id ON tradie.reminders(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tradie_job_events_owner_user_id ON tradie.job_events(owner_user_id);

-- 2) Backfill ownership where relationships allow it
UPDATE tradie.appointments a
SET owner_user_id = c.owner_user_id
FROM tradie.customers c
WHERE a.customer_id = c.id
  AND a.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE tradie.images i
SET owner_user_id = c.owner_user_id
FROM tradie.customers c
WHERE i.customer_id = c.id
  AND i.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE tradie.notes n
SET owner_user_id = c.owner_user_id
FROM tradie.customers c
WHERE n.customer_id = c.id
  AND n.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE tradie.note_versions nv
SET owner_user_id = n.owner_user_id
FROM tradie.notes n
WHERE nv.note_id = n.id
  AND nv.owner_user_id IS NULL
  AND n.owner_user_id IS NOT NULL;

UPDATE tradie.reminders r
SET owner_user_id = c.owner_user_id
FROM tradie.customers c
WHERE r.customer_id = c.id
  AND r.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE tradie.job_events e
SET owner_user_id = c.owner_user_id
FROM tradie.customers c
WHERE e.customer_id = c.id
  AND e.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

-- 3) First-login helper to claim legacy unowned rows
CREATE OR REPLACE FUNCTION tradie.claim_unowned_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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

  UPDATE tradie.customers
  SET owner_user_id = v_user
  WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_customers = ROW_COUNT;

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

-- 4) Replace permissive policies with strict owner policies
DROP POLICY IF EXISTS "Allow all for anon" ON tradie.customers;
DROP POLICY IF EXISTS "Allow all for anon+authenticated" ON tradie.customers;
DROP POLICY IF EXISTS "Allow all for anon" ON tradie.appointments;
DROP POLICY IF EXISTS "Allow all for anon+authenticated" ON tradie.appointments;
DROP POLICY IF EXISTS "Allow all for anon" ON tradie.images;
DROP POLICY IF EXISTS "Allow all for anon+authenticated" ON tradie.images;
DROP POLICY IF EXISTS "Allow all for anon" ON tradie.notes;
DROP POLICY IF EXISTS "Allow all for anon+authenticated" ON tradie.notes;
DROP POLICY IF EXISTS "Allow all for anon" ON tradie.note_versions;
DROP POLICY IF EXISTS "Allow all for anon+authenticated" ON tradie.note_versions;
DROP POLICY IF EXISTS "Allow all for anon" ON tradie.reminders;
DROP POLICY IF EXISTS "Allow all for anon+authenticated" ON tradie.reminders;
DROP POLICY IF EXISTS "Allow all for anon" ON tradie.job_events;
DROP POLICY IF EXISTS "Allow all for anon+authenticated" ON tradie.job_events;

CREATE POLICY "Customers owner select" ON tradie.customers
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Customers owner insert" ON tradie.customers
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Customers owner update" ON tradie.customers
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Customers owner delete" ON tradie.customers
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Appointments owner select" ON tradie.appointments
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Appointments owner insert" ON tradie.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Appointments owner update" ON tradie.appointments
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Appointments owner delete" ON tradie.appointments
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Images owner select" ON tradie.images
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Images owner insert" ON tradie.images
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Images owner update" ON tradie.images
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Images owner delete" ON tradie.images
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Notes owner select" ON tradie.notes
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Notes owner insert" ON tradie.notes
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Notes owner update" ON tradie.notes
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Notes owner delete" ON tradie.notes
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "NoteVersions owner select" ON tradie.note_versions
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "NoteVersions owner insert" ON tradie.note_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.notes n
      WHERE n.id = note_id
        AND n.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "NoteVersions owner update" ON tradie.note_versions
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.notes n
      WHERE n.id = note_id
        AND n.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "NoteVersions owner delete" ON tradie.note_versions
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Reminders owner select" ON tradie.reminders
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Reminders owner insert" ON tradie.reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (
      customer_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM tradie.customers c
        WHERE c.id = customer_id
          AND c.owner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Reminders owner update" ON tradie.reminders
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (
      customer_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM tradie.customers c
        WHERE c.id = customer_id
          AND c.owner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Reminders owner delete" ON tradie.reminders
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "JobEvents owner select" ON tradie.job_events
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "JobEvents owner insert" ON tradie.job_events
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "JobEvents owner update" ON tradie.job_events
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM tradie.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "JobEvents owner delete" ON tradie.job_events
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());
