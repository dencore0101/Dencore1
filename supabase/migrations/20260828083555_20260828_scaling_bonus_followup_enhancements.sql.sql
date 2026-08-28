/*
# Phase 12: Scaling Bonus system + Enhanced Follow-up/Recall
Creates scaling_bonus_config, scaling_bonus_eligibility, scaling_bonus_audit tables.
Adds reminder columns to follow_ups.
*/

-- scaling_bonus_config (per-clinic settings)
CREATE TABLE IF NOT EXISTS scaling_bonus_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  qualifying_amount numeric(12,2) NOT NULL DEFAULT 5000,
  free_scaling_years int NOT NULL DEFAULT 1,
  patient_message text NOT NULL DEFAULT 'Congratulations! You qualify for free scaling for {years} year(s). Valid until {expiry_date}.',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scaling_bonus_config ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS scaling_bonus_config_set_updated_at ON scaling_bonus_config;
CREATE TRIGGER scaling_bonus_config_set_updated_at BEFORE UPDATE ON scaling_bonus_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP POLICY IF EXISTS "sbc_select_members" ON scaling_bonus_config;
CREATE POLICY "sbc_select_members" ON scaling_bonus_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_config.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "sbc_insert_members" ON scaling_bonus_config;
CREATE POLICY "sbc_insert_members" ON scaling_bonus_config FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_config.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "sbc_update_members" ON scaling_bonus_config;
CREATE POLICY "sbc_update_members" ON scaling_bonus_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_config.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_config.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "sbc_delete_owner_admin" ON scaling_bonus_config;
CREATE POLICY "sbc_delete_owner_admin" ON scaling_bonus_config FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_config.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- scaling_bonus_eligibility
CREATE TABLE IF NOT EXISTS scaling_bonus_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  qualifying_treatment_id uuid REFERENCES treatments(id) ON DELETE SET NULL,
  qualifying_amount numeric(12,2) NOT NULL DEFAULT 0,
  eligible_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked','manually_added')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, patient_id)
);

CREATE INDEX IF NOT EXISTS sbe_clinic_id_idx ON scaling_bonus_eligibility(clinic_id);
CREATE INDEX IF NOT EXISTS sbe_patient_id_idx ON scaling_bonus_eligibility(patient_id);
CREATE INDEX IF NOT EXISTS sbe_status_idx ON scaling_bonus_eligibility(clinic_id, status);
CREATE INDEX IF NOT EXISTS sbe_expiry_date_idx ON scaling_bonus_eligibility(expiry_date);

ALTER TABLE scaling_bonus_eligibility ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS sbe_set_updated_at ON scaling_bonus_eligibility;
CREATE TRIGGER sbe_set_updated_at BEFORE UPDATE ON scaling_bonus_eligibility FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP POLICY IF EXISTS "sbe_select_members" ON scaling_bonus_eligibility;
CREATE POLICY "sbe_select_members" ON scaling_bonus_eligibility FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_eligibility.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "sbe_insert_members" ON scaling_bonus_eligibility;
CREATE POLICY "sbe_insert_members" ON scaling_bonus_eligibility FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_eligibility.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "sbe_update_members" ON scaling_bonus_eligibility;
CREATE POLICY "sbe_update_members" ON scaling_bonus_eligibility FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_eligibility.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_eligibility.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "sbe_delete_owner_admin" ON scaling_bonus_eligibility;
CREATE POLICY "sbe_delete_owner_admin" ON scaling_bonus_eligibility FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_eligibility.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- scaling_bonus_audit
CREATE TABLE IF NOT EXISTS scaling_bonus_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('granted','revoked','extended','manually_added','manually_removed','expired','config_changed')),
  old_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sba_clinic_id_idx ON scaling_bonus_audit(clinic_id);
CREATE INDEX IF NOT EXISTS sba_patient_id_idx ON scaling_bonus_audit(patient_id);
CREATE INDEX IF NOT EXISTS sba_created_at_idx ON scaling_bonus_audit(clinic_id, created_at DESC);

ALTER TABLE scaling_bonus_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sba_select_members" ON scaling_bonus_audit;
CREATE POLICY "sba_select_members" ON scaling_bonus_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_audit.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "sba_insert_members" ON scaling_bonus_audit;
CREATE POLICY "sba_insert_members" ON scaling_bonus_audit FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = scaling_bonus_audit.clinic_id AND m.user_id = auth.uid()));

-- Add reminder columns to follow_ups (use DO block to avoid IF EXISTS on ADD COLUMN)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'reminder_time') THEN
    ALTER TABLE follow_ups ADD COLUMN reminder_time time;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'reminder_message') THEN
    ALTER TABLE follow_ups ADD COLUMN reminder_message text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'reminder_1week') THEN
    ALTER TABLE follow_ups ADD COLUMN reminder_1week boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'reminder_1day') THEN
    ALTER TABLE follow_ups ADD COLUMN reminder_1day boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'reminder_sameday') THEN
    ALTER TABLE follow_ups ADD COLUMN reminder_sameday boolean NOT NULL DEFAULT false;
  END IF;
END $$;