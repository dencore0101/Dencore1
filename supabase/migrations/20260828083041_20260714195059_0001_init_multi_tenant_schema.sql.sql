/*
# Initialize multi-tenant schema for ToothRevenue

## Summary
Creates the foundational multi-tenant data model for a dental revenue cycle
management app. Each clinic is a tenant; users belong to clinics via
memberships with roles (owner/admin/member). Clinic-level settings are stored
as JSONB. An audit log captures key actions per clinic.

## New Tables
1. `clinics` — tenant root entity.
2. `clinic_memberships` — joins auth.users to clinics with a role.
3. `clinic_settings` — per-clinic configuration JSONB.
4. `audit_log` — append-only action log per clinic.

## Security (RLS)
All tables have RLS enabled with membership-scoped policies.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper: slugify
CREATE OR REPLACE FUNCTION slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        trim(input),
        '[^a-zA-Z0-9]+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    )
  );
$$;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- clinics
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS clinics_set_updated_at ON clinics;
CREATE TRIGGER clinics_set_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- clinic_memberships
CREATE TABLE IF NOT EXISTS clinic_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

CREATE INDEX IF NOT EXISTS clinic_memberships_user_id_idx ON clinic_memberships(user_id);
CREATE INDEX IF NOT EXISTS clinic_memberships_clinic_id_idx ON clinic_memberships(clinic_id);

ALTER TABLE clinic_memberships ENABLE ROW LEVEL SECURITY;

-- clinic_settings
CREATE TABLE IF NOT EXISTS clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS clinic_settings_set_updated_at ON clinic_settings;
CREATE TRIGGER clinic_settings_set_updated_at
  BEFORE UPDATE ON clinic_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_clinic_id_idx ON audit_log(clinic_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- clinics
DROP POLICY IF EXISTS "clinics_select_members" ON clinics;
CREATE POLICY "clinics_select_members" ON clinics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinics.id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "clinics_insert_authenticated" ON clinics;
CREATE POLICY "clinics_insert_authenticated" ON clinics FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "clinics_update_owner_admin" ON clinics;
CREATE POLICY "clinics_update_owner_admin" ON clinics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinics.id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinics.id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "clinics_delete_owner" ON clinics;
CREATE POLICY "clinics_delete_owner" ON clinics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinics.id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- clinic_memberships
DROP POLICY IF EXISTS "memberships_select_members" ON clinic_memberships;
CREATE POLICY "memberships_select_members" ON clinic_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinic_memberships.clinic_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "memberships_insert_owner_admin" ON clinic_memberships;
CREATE POLICY "memberships_insert_owner_admin" ON clinic_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinic_memberships.clinic_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "memberships_update_owner_admin" ON clinic_memberships;
CREATE POLICY "memberships_update_owner_admin" ON clinic_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinic_memberships.clinic_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinic_memberships.clinic_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "memberships_delete_owner" ON clinic_memberships;
CREATE POLICY "memberships_delete_owner" ON clinic_memberships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinic_memberships.clinic_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- clinic_settings
DROP POLICY IF EXISTS "settings_select_members" ON clinic_settings;
CREATE POLICY "settings_select_members" ON clinic_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinic_settings.clinic_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "settings_update_owner_admin" ON clinic_settings;
CREATE POLICY "settings_update_owner_admin" ON clinic_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinic_settings.clinic_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = clinic_settings.clinic_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin')
    )
  );

-- audit_log
DROP POLICY IF EXISTS "audit_select_members" ON audit_log;
CREATE POLICY "audit_select_members" ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = audit_log.clinic_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "audit_insert_members" ON audit_log;
CREATE POLICY "audit_insert_members" ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_memberships m
      WHERE m.clinic_id = audit_log.clinic_id
        AND m.user_id = auth.uid()
    )
  );