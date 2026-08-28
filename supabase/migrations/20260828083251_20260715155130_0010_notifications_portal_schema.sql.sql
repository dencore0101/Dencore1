/*
# Phase 9: Notifications & Patient Portal schema
Creates notifications and patient_portal_access tables.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('sms','email','whatsapp','in_app')),
  template_key text NOT NULL,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','delivered')),
  sent_at timestamptz,
  related_type text,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_clinic_id_idx ON notifications(clinic_id);
CREATE INDEX IF NOT EXISTS notif_patient_id_idx ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS notif_status_idx ON notifications(clinic_id, status);
CREATE INDEX IF NOT EXISTS notif_created_at_idx ON notifications(clinic_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_members" ON notifications;
CREATE POLICY "notif_select_members" ON notifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = notifications.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "notif_insert_members" ON notifications;
CREATE POLICY "notif_insert_members" ON notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = notifications.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "notif_update_members" ON notifications;
CREATE POLICY "notif_update_members" ON notifications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = notifications.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = notifications.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "notif_delete_owner_admin" ON notifications;
CREATE POLICY "notif_delete_owner_admin" ON notifications FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = notifications.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

CREATE TABLE IF NOT EXISTS patient_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  access_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, patient_id)
);

CREATE INDEX IF NOT EXISTS portal_access_patient_id_idx ON patient_portal_access(patient_id);
CREATE INDEX IF NOT EXISTS portal_access_token_idx ON patient_portal_access(access_token);

DROP TRIGGER IF EXISTS portal_access_set_updated_at ON patient_portal_access;
CREATE TRIGGER portal_access_set_updated_at BEFORE UPDATE ON patient_portal_access FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE patient_portal_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_select_members" ON patient_portal_access;
CREATE POLICY "portal_select_members" ON patient_portal_access FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_portal_access.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "portal_insert_members" ON patient_portal_access;
CREATE POLICY "portal_insert_members" ON patient_portal_access FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_portal_access.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "portal_update_members" ON patient_portal_access;
CREATE POLICY "portal_update_members" ON patient_portal_access FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_portal_access.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_portal_access.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "portal_delete_owner_admin" ON patient_portal_access;
CREATE POLICY "portal_delete_owner_admin" ON patient_portal_access FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_portal_access.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));