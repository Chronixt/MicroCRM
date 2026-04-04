-- Fast wipe helper for non-production / migration rehearsal resets.
-- Truncates all hairdresser tables and resets identities.

CREATE OR REPLACE FUNCTION hairdresser.truncate_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hairdresser, public
AS $$
BEGIN
  TRUNCATE TABLE
    hairdresser.note_versions,
    hairdresser.notes,
    hairdresser.images,
    hairdresser.appointments,
    hairdresser.customers
  RESTART IDENTITY CASCADE;
END;
$$;

GRANT EXECUTE ON FUNCTION hairdresser.truncate_all_data() TO anon, authenticated;
