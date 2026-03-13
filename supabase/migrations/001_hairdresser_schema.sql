-- Hairdresser CRM schema for Supabase
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Schema: hairdresser

-- Create schema
CREATE SCHEMA IF NOT EXISTS hairdresser;

-- ---------------------------------------------------------------------------
-- Table: hairdresser.customers
-- ---------------------------------------------------------------------------
CREATE TABLE hairdresser.customers (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name         text,
  last_name         text,
  contact_number    text,
  social_media_name  text,
  referral_notes    text,
  referral_type     text,
  updated_at        timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_customers_last_name ON hairdresser.customers (last_name);
CREATE INDEX idx_customers_first_name ON hairdresser.customers (first_name);
CREATE INDEX idx_customers_contact_number ON hairdresser.customers (contact_number);
CREATE INDEX idx_customers_updated_at ON hairdresser.customers (updated_at DESC);

-- ---------------------------------------------------------------------------
-- Table: hairdresser.appointments
-- ---------------------------------------------------------------------------
CREATE TABLE hairdresser.appointments (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES hairdresser.customers(id) ON DELETE CASCADE,
  start       timestamptz NOT NULL,
  "end"       timestamptz,
  title       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_appointments_customer_id ON hairdresser.appointments (customer_id);
CREATE INDEX idx_appointments_start ON hairdresser.appointments (start);
CREATE INDEX idx_appointments_customer_start ON hairdresser.appointments (customer_id, start);

-- ---------------------------------------------------------------------------
-- Table: hairdresser.notes
-- ---------------------------------------------------------------------------
CREATE TABLE hairdresser.notes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES hairdresser.customers(id) ON DELETE CASCADE,
  date        date,
  created_at  timestamptz DEFAULT now(),
  edited_date date,
  svg         text,
  note_number int
);

CREATE INDEX idx_notes_customer_id ON hairdresser.notes (customer_id);
CREATE INDEX idx_notes_created_at ON hairdresser.notes (created_at DESC);

-- ---------------------------------------------------------------------------
-- Table: hairdresser.note_versions
-- ---------------------------------------------------------------------------
CREATE TABLE hairdresser.note_versions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  note_id     bigint NOT NULL REFERENCES hairdresser.notes(id) ON DELETE CASCADE,
  svg         text,
  edited_date date,
  saved_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_note_versions_note_id ON hairdresser.note_versions (note_id);
CREATE INDEX idx_note_versions_saved_at ON hairdresser.note_versions (saved_at DESC);

-- ---------------------------------------------------------------------------
-- Table: hairdresser.images
-- Uses data_url (text) to match current app; optional: use Storage + storage_path later
-- ---------------------------------------------------------------------------
CREATE TABLE hairdresser.images (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES hairdresser.customers(id) ON DELETE CASCADE,
  name        text,
  type        text,
  data_url    text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_images_customer_id ON hairdresser.images (customer_id);

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- Enable RLS; policies below allow all for anon/authenticated (single-tenant).
-- Tighten policies later if you add auth per user.
-- ---------------------------------------------------------------------------
ALTER TABLE hairdresser.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdresser.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdresser.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdresser.note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hairdresser.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on customers" ON hairdresser.customers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on appointments" ON hairdresser.appointments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on notes" ON hairdresser.notes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on note_versions" ON hairdresser.note_versions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on images" ON hairdresser.images
  FOR ALL USING (true) WITH CHECK (true);
