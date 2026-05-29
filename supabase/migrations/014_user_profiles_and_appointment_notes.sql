-- Modern UI support: authenticated user profile settings and optional
-- appointment notes used by selected-booking details.

DO $$
DECLARE
  target_schema text;
  target_schemas text[] := ARRAY['hairdresser_sandbox_admin', 'hairdresser', 'tradie'];
BEGIN
  FOREACH target_schema IN ARRAY target_schemas LOOP
    EXECUTE format('CREATE OR REPLACE FUNCTION %I.set_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $fn$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $fn$', target_schema);

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.user_profiles (
      owner_user_id uuid PRIMARY KEY DEFAULT auth.uid(),
      first_name text NOT NULL,
      last_name text,
      plan_label text DEFAULT ''Standard Plan'',
      preferred_language text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )', target_schema);

    EXECUTE format('ALTER TABLE %I.user_profiles ENABLE ROW LEVEL SECURITY', target_schema);

    EXECUTE format('DROP POLICY IF EXISTS "User profiles owner select" ON %I.user_profiles', target_schema);
    EXECUTE format('DROP POLICY IF EXISTS "User profiles owner insert" ON %I.user_profiles', target_schema);
    EXECUTE format('DROP POLICY IF EXISTS "User profiles owner update" ON %I.user_profiles', target_schema);

    EXECUTE format('CREATE POLICY "User profiles owner select" ON %I.user_profiles
      FOR SELECT TO authenticated
      USING (owner_user_id = auth.uid())', target_schema);

    EXECUTE format('CREATE POLICY "User profiles owner insert" ON %I.user_profiles
      FOR INSERT TO authenticated
      WITH CHECK (owner_user_id = auth.uid())', target_schema);

    EXECUTE format('CREATE POLICY "User profiles owner update" ON %I.user_profiles
      FOR UPDATE TO authenticated
      USING (owner_user_id = auth.uid())
      WITH CHECK (owner_user_id = auth.uid())', target_schema);

    EXECUTE format('DROP TRIGGER IF EXISTS user_profiles_updated_at ON %I.user_profiles', target_schema);
    EXECUTE format('CREATE TRIGGER user_profiles_updated_at
      BEFORE UPDATE ON %I.user_profiles
      FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', target_schema, target_schema);

    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS notes text', target_schema);

    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS status text DEFAULT ''scheduled''', target_schema);
    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS quoted_amount numeric(12,2)', target_schema);
    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS invoice_amount numeric(12,2)', target_schema);
    EXECUTE format('ALTER TABLE %I.appointments ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2)', target_schema);
  END LOOP;
END $$;
