-- Option 1 security baseline:
-- - Email/password login (Supabase Auth)
-- - Row ownership via owner_user_id
-- - Strict per-user RLS policies

-- 1) Ownership columns
ALTER TABLE hairdresser.customers
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser.appointments
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser.images
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser.notes
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser.note_versions
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser.customers ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE hairdresser.appointments ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE hairdresser.images ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE hairdresser.notes ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE hairdresser.note_versions ALTER COLUMN owner_user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_customers_owner_user_id ON hairdresser.customers(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_owner_user_id ON hairdresser.appointments(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_images_owner_user_id ON hairdresser.images(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_notes_owner_user_id ON hairdresser.notes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_note_versions_owner_user_id ON hairdresser.note_versions(owner_user_id);

-- 2) Backfill ownership where relationship already allows it
UPDATE hairdresser.appointments a
SET owner_user_id = c.owner_user_id
FROM hairdresser.customers c
WHERE a.customer_id = c.id
  AND a.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE hairdresser.images i
SET owner_user_id = c.owner_user_id
FROM hairdresser.customers c
WHERE i.customer_id = c.id
  AND i.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE hairdresser.notes n
SET owner_user_id = c.owner_user_id
FROM hairdresser.customers c
WHERE n.customer_id = c.id
  AND n.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE hairdresser.note_versions nv
SET owner_user_id = n.owner_user_id
FROM hairdresser.notes n
WHERE nv.note_id = n.id
  AND nv.owner_user_id IS NULL
  AND n.owner_user_id IS NOT NULL;

-- 3) First-login helper to claim legacy unowned rows
CREATE OR REPLACE FUNCTION hairdresser.claim_unowned_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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

  UPDATE hairdresser.customers
  SET owner_user_id = v_user
  WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_customers = ROW_COUNT;

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

-- 4) Lock down truncate helper (do not allow client-side global truncation once multi-user)
REVOKE EXECUTE ON FUNCTION hairdresser.truncate_all_data() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION hairdresser.truncate_all_data() TO service_role;

-- 5) Replace permissive policies with strict owner policies
DROP POLICY IF EXISTS "Allow all on customers" ON hairdresser.customers;
DROP POLICY IF EXISTS "Allow all on appointments" ON hairdresser.appointments;
DROP POLICY IF EXISTS "Allow all on notes" ON hairdresser.notes;
DROP POLICY IF EXISTS "Allow all on note_versions" ON hairdresser.note_versions;
DROP POLICY IF EXISTS "Allow all on images" ON hairdresser.images;

CREATE POLICY "Customers owner select" ON hairdresser.customers
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Customers owner insert" ON hairdresser.customers
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Customers owner update" ON hairdresser.customers
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Customers owner delete" ON hairdresser.customers
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Appointments owner select" ON hairdresser.appointments
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Appointments owner insert" ON hairdresser.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Appointments owner update" ON hairdresser.appointments
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Appointments owner delete" ON hairdresser.appointments
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Images owner select" ON hairdresser.images
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Images owner insert" ON hairdresser.images
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Images owner update" ON hairdresser.images
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Images owner delete" ON hairdresser.images
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Notes owner select" ON hairdresser.notes
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Notes owner insert" ON hairdresser.notes
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Notes owner update" ON hairdresser.notes
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Notes owner delete" ON hairdresser.notes
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "NoteVersions owner select" ON hairdresser.note_versions
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "NoteVersions owner insert" ON hairdresser.note_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser.notes n
      WHERE n.id = note_id
        AND n.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "NoteVersions owner update" ON hairdresser.note_versions
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser.notes n
      WHERE n.id = note_id
        AND n.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "NoteVersions owner delete" ON hairdresser.note_versions
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());
