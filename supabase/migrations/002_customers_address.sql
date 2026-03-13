-- Add address columns to hairdresser.customers
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query) or via Supabase CLI

ALTER TABLE hairdresser.customers
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS suburb text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS country text;
