-- =============================================================================
-- TradieCRM Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor to create all tables.
-- Column names use snake_case (Postgres convention). Map to camelCase in the app.
-- =============================================================================

-- Enable UUID extension (optional; we use integer IDs to match IndexedDB)
-- extensions are usually already enabled in Supabase

-- -----------------------------------------------------------------------------
-- 1. CUSTOMERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id                BIGSERIAL PRIMARY KEY,
  first_name        TEXT,
  last_name         TEXT,
  contact_number    TEXT,
  social_media_name TEXT,
  referral_notes    TEXT,
  -- Tradie address fields
  address_line1     TEXT,
  suburb            TEXT,
  state             TEXT,
  postcode          TEXT,
  preferred_contact_method TEXT,
  -- Legacy (handwriting image data URL)
  notes_image_data  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_last_name ON customers (last_name);
CREATE INDEX IF NOT EXISTS idx_customers_first_name ON customers (first_name);
CREATE INDEX IF NOT EXISTS idx_customers_contact_number ON customers (contact_number);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers (updated_at);

-- -----------------------------------------------------------------------------
-- 2. APPOINTMENTS (Jobs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id              BIGSERIAL PRIMARY KEY,
  customer_id     BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title           TEXT,
  start           TIMESTAMPTZ NOT NULL,
  "end"           TIMESTAMPTZ NOT NULL,
  status          TEXT DEFAULT 'scheduled',
  address         TEXT,
  -- Payment tracking
  quoted_amount   NUMERIC(12,2),
  invoice_amount  NUMERIC(12,2),
  paid_amount     NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments (customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments (start);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_start ON appointments (customer_id, start);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);

-- -----------------------------------------------------------------------------
-- 3. IMAGES (Photos – customer and job level)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS images (
  id             BIGSERIAL PRIMARY KEY,
  customer_id    BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id  BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  name           TEXT,
  type           TEXT,
  data_url       TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_customer_id ON images (customer_id);
CREATE INDEX IF NOT EXISTS idx_images_appointment_id ON images (appointment_id);

-- -----------------------------------------------------------------------------
-- 4. NOTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id          BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  svg         TEXT,
  text_value  TEXT,
  note_type   TEXT NOT NULL CHECK (note_type IN ('text', 'svg')),
  date        DATE,
  note_number INT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  edited_date DATE,
  CONSTRAINT notes_note_payload_xor_chk CHECK (
    (note_type = 'svg' AND svg IS NOT NULL AND BTRIM(svg) <> '' AND (text_value IS NULL OR BTRIM(text_value) = ''))
    OR
    (note_type = 'text' AND text_value IS NOT NULL AND BTRIM(text_value) <> '' AND (svg IS NULL OR BTRIM(svg) = ''))
  )
);

CREATE INDEX IF NOT EXISTS idx_notes_customer_id ON notes (customer_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at);

-- -----------------------------------------------------------------------------
-- 5. NOTE VERSIONS (version history for notes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS note_versions (
  id         BIGSERIAL PRIMARY KEY,
  note_id    BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  svg        TEXT,
  text_value TEXT,
  note_type  TEXT NOT NULL CHECK (note_type IN ('text', 'svg')),
  edited_date TIMESTAMPTZ,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT note_versions_note_payload_xor_chk CHECK (
    (note_type = 'svg' AND svg IS NOT NULL AND BTRIM(svg) <> '' AND (text_value IS NULL OR BTRIM(text_value) = ''))
    OR
    (note_type = 'text' AND text_value IS NOT NULL AND BTRIM(text_value) <> '' AND (svg IS NULL OR BTRIM(svg) = ''))
  )
);

CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions (note_id);
CREATE INDEX IF NOT EXISTS idx_note_versions_saved_at ON note_versions (saved_at);

ALTER TABLE notes ADD COLUMN IF NOT EXISTS text_value TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS note_type TEXT;
ALTER TABLE note_versions ADD COLUMN IF NOT EXISTS text_value TEXT;
ALTER TABLE note_versions ADD COLUMN IF NOT EXISTS note_type TEXT;

-- -----------------------------------------------------------------------------
-- 6. REMINDERS (Follow-ups)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
  id             BIGSERIAL PRIMARY KEY,
  customer_id    BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE CASCADE,
  due_at         TIMESTAMPTZ NOT NULL,
  message        TEXT,
  status         TEXT DEFAULT 'pending',
  snoozed_until  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_customer_id ON reminders (customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_appointment_id ON reminders (appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_at ON reminders (due_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders (status);

-- -----------------------------------------------------------------------------
-- 7. JOB EVENTS (Timeline / activity log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_events (
  id             BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id    BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_events_appointment_id ON job_events (appointment_id);
CREATE INDEX IF NOT EXISTS idx_job_events_customer_id ON job_events (customer_id);
CREATE INDEX IF NOT EXISTS idx_job_events_created_at ON job_events (created_at);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS; policies allow anon for now (single-user / same key).
-- Tighten with auth.uid() when you add Supabase Auth.
-- -----------------------------------------------------------------------------
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE images             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events         ENABLE ROW LEVEL SECURITY;

-- Allow all for anon (single-tenant; restrict later with auth)
CREATE POLICY "Allow all for anon" ON customers          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON appointments      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON images            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON notes             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON note_versions     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON reminders        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON job_events       FOR ALL TO anon USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- OPTIONAL: Trigger to keep updated_at in sync (customers)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS reminders_updated_at ON reminders;
CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
