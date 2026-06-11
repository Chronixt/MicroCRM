-- Owner-based RLS baseline for hairdresser sandbox schema.
-- This mirrors core owner policies so sandbox behavior matches live behavior.

-- 1) Ownership columns and defaults
ALTER TABLE hairdresser_sandbox_admin.customers
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser_sandbox_admin.appointments
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser_sandbox_admin.images
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser_sandbox_admin.notes
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser_sandbox_admin.note_versions
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

ALTER TABLE hairdresser_sandbox_admin.customers ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE hairdresser_sandbox_admin.appointments ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE hairdresser_sandbox_admin.images ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE hairdresser_sandbox_admin.notes ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE hairdresser_sandbox_admin.note_versions ALTER COLUMN owner_user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_hairdresser_sandbox_customers_owner_user_id
  ON hairdresser_sandbox_admin.customers(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_hairdresser_sandbox_appointments_owner_user_id
  ON hairdresser_sandbox_admin.appointments(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_hairdresser_sandbox_images_owner_user_id
  ON hairdresser_sandbox_admin.images(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_hairdresser_sandbox_notes_owner_user_id
  ON hairdresser_sandbox_admin.notes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_hairdresser_sandbox_note_versions_owner_user_id
  ON hairdresser_sandbox_admin.note_versions(owner_user_id);

-- 2) Backfill ownership from customer linkage when missing
UPDATE hairdresser_sandbox_admin.appointments a
SET owner_user_id = c.owner_user_id
FROM hairdresser_sandbox_admin.customers c
WHERE a.customer_id = c.id
  AND a.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE hairdresser_sandbox_admin.images i
SET owner_user_id = c.owner_user_id
FROM hairdresser_sandbox_admin.customers c
WHERE i.customer_id = c.id
  AND i.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE hairdresser_sandbox_admin.notes n
SET owner_user_id = c.owner_user_id
FROM hairdresser_sandbox_admin.customers c
WHERE n.customer_id = c.id
  AND n.owner_user_id IS NULL
  AND c.owner_user_id IS NOT NULL;

UPDATE hairdresser_sandbox_admin.note_versions nv
SET owner_user_id = n.owner_user_id
FROM hairdresser_sandbox_admin.notes n
WHERE nv.note_id = n.id
  AND nv.owner_user_id IS NULL
  AND n.owner_user_id IS NOT NULL;

-- 3) Ensure RLS is enabled
ALTER TABLE hairdresser_sandbox_admin.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdresser_sandbox_admin.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdresser_sandbox_admin.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdresser_sandbox_admin.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdresser_sandbox_admin.note_versions ENABLE ROW LEVEL SECURITY;

-- 4) Replace permissive policies with strict owner policies
DROP POLICY IF EXISTS "Allow all on customers" ON hairdresser_sandbox_admin.customers;
DROP POLICY IF EXISTS "Allow all on appointments" ON hairdresser_sandbox_admin.appointments;
DROP POLICY IF EXISTS "Allow all on notes" ON hairdresser_sandbox_admin.notes;
DROP POLICY IF EXISTS "Allow all on note_versions" ON hairdresser_sandbox_admin.note_versions;
DROP POLICY IF EXISTS "Allow all on images" ON hairdresser_sandbox_admin.images;

DROP POLICY IF EXISTS "Customers owner select" ON hairdresser_sandbox_admin.customers;
DROP POLICY IF EXISTS "Customers owner insert" ON hairdresser_sandbox_admin.customers;
DROP POLICY IF EXISTS "Customers owner update" ON hairdresser_sandbox_admin.customers;
DROP POLICY IF EXISTS "Customers owner delete" ON hairdresser_sandbox_admin.customers;

DROP POLICY IF EXISTS "Appointments owner select" ON hairdresser_sandbox_admin.appointments;
DROP POLICY IF EXISTS "Appointments owner insert" ON hairdresser_sandbox_admin.appointments;
DROP POLICY IF EXISTS "Appointments owner update" ON hairdresser_sandbox_admin.appointments;
DROP POLICY IF EXISTS "Appointments owner delete" ON hairdresser_sandbox_admin.appointments;

DROP POLICY IF EXISTS "Images owner select" ON hairdresser_sandbox_admin.images;
DROP POLICY IF EXISTS "Images owner insert" ON hairdresser_sandbox_admin.images;
DROP POLICY IF EXISTS "Images owner update" ON hairdresser_sandbox_admin.images;
DROP POLICY IF EXISTS "Images owner delete" ON hairdresser_sandbox_admin.images;

DROP POLICY IF EXISTS "Notes owner select" ON hairdresser_sandbox_admin.notes;
DROP POLICY IF EXISTS "Notes owner insert" ON hairdresser_sandbox_admin.notes;
DROP POLICY IF EXISTS "Notes owner update" ON hairdresser_sandbox_admin.notes;
DROP POLICY IF EXISTS "Notes owner delete" ON hairdresser_sandbox_admin.notes;

DROP POLICY IF EXISTS "NoteVersions owner select" ON hairdresser_sandbox_admin.note_versions;
DROP POLICY IF EXISTS "NoteVersions owner insert" ON hairdresser_sandbox_admin.note_versions;
DROP POLICY IF EXISTS "NoteVersions owner update" ON hairdresser_sandbox_admin.note_versions;
DROP POLICY IF EXISTS "NoteVersions owner delete" ON hairdresser_sandbox_admin.note_versions;

CREATE POLICY "Customers owner select" ON hairdresser_sandbox_admin.customers
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Customers owner insert" ON hairdresser_sandbox_admin.customers
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Customers owner update" ON hairdresser_sandbox_admin.customers
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Customers owner delete" ON hairdresser_sandbox_admin.customers
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Appointments owner select" ON hairdresser_sandbox_admin.appointments
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Appointments owner insert" ON hairdresser_sandbox_admin.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser_sandbox_admin.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Appointments owner update" ON hairdresser_sandbox_admin.appointments
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser_sandbox_admin.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Appointments owner delete" ON hairdresser_sandbox_admin.appointments
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Images owner select" ON hairdresser_sandbox_admin.images
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Images owner insert" ON hairdresser_sandbox_admin.images
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser_sandbox_admin.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Images owner update" ON hairdresser_sandbox_admin.images
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser_sandbox_admin.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Images owner delete" ON hairdresser_sandbox_admin.images
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Notes owner select" ON hairdresser_sandbox_admin.notes
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Notes owner insert" ON hairdresser_sandbox_admin.notes
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser_sandbox_admin.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Notes owner update" ON hairdresser_sandbox_admin.notes
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser_sandbox_admin.customers c
      WHERE c.id = customer_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Notes owner delete" ON hairdresser_sandbox_admin.notes
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "NoteVersions owner select" ON hairdresser_sandbox_admin.note_versions
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "NoteVersions owner insert" ON hairdresser_sandbox_admin.note_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser_sandbox_admin.notes n
      WHERE n.id = note_id
        AND n.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "NoteVersions owner update" ON hairdresser_sandbox_admin.note_versions
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM hairdresser_sandbox_admin.notes n
      WHERE n.id = note_id
        AND n.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "NoteVersions owner delete" ON hairdresser_sandbox_admin.note_versions
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());
