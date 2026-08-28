/*
# Phase 3: Clinical workflow schema
Creates procedure_categories, procedures, treatments, treatment_items,
treatment_sittings, clinical_notes, dental_chart_conditions, follow_ups.
Treatment number generator uses atomic sequence table for concurrency safety.
*/

-- procedure_categories
CREATE TABLE IF NOT EXISTS procedure_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, name)
);

CREATE INDEX IF NOT EXISTS proc_cat_clinic_id_idx ON procedure_categories(clinic_id);
ALTER TABLE procedure_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_select_members" ON procedure_categories;
CREATE POLICY "pc_select_members" ON procedure_categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedure_categories.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pc_insert_members" ON procedure_categories;
CREATE POLICY "pc_insert_members" ON procedure_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedure_categories.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pc_update_members" ON procedure_categories;
CREATE POLICY "pc_update_members" ON procedure_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedure_categories.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedure_categories.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pc_delete_owner_admin" ON procedure_categories;
CREATE POLICY "pc_delete_owner_admin" ON procedure_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedure_categories.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- procedures
CREATE TABLE IF NOT EXISTS procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  category_id uuid REFERENCES procedure_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  default_fee numeric(12,2) NOT NULL DEFAULT 0,
  expected_sittings int NOT NULL DEFAULT 1,
  expected_duration_min int,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS procedures_clinic_id_idx ON procedures(clinic_id);
CREATE INDEX IF NOT EXISTS procedures_category_id_idx ON procedures(category_id);

DROP TRIGGER IF EXISTS procedures_set_updated_at ON procedures;
CREATE TRIGGER procedures_set_updated_at BEFORE UPDATE ON procedures FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proc_select_members" ON procedures;
CREATE POLICY "proc_select_members" ON procedures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedures.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "proc_insert_members" ON procedures;
CREATE POLICY "proc_insert_members" ON procedures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedures.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "proc_update_members" ON procedures;
CREATE POLICY "proc_update_members" ON procedures FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedures.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedures.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "proc_delete_owner_admin" ON procedures;
CREATE POLICY "proc_delete_owner_admin" ON procedures FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = procedures.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- treatment_number_sequences (concurrency-safe)
CREATE TABLE IF NOT EXISTS treatment_number_sequences (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  next_val bigint NOT NULL DEFAULT 1
);

ALTER TABLE treatment_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tns_select_members" ON treatment_number_sequences;
CREATE POLICY "tns_select_members" ON treatment_number_sequences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_number_sequences.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "tns_insert_members" ON treatment_number_sequences;
CREATE POLICY "tns_insert_members" ON treatment_number_sequences FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_number_sequences.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "tns_update_members" ON treatment_number_sequences;
CREATE POLICY "tns_update_members" ON treatment_number_sequences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_number_sequences.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_number_sequences.clinic_id AND m.user_id = auth.uid()));

-- treatments
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_number text NOT NULL,
  case_name text NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','ongoing','paused','completed','cancelled')),
  dentist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  planned_value numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, treatment_number)
);

CREATE INDEX IF NOT EXISTS treatments_clinic_id_idx ON treatments(clinic_id);
CREATE INDEX IF NOT EXISTS treatments_patient_id_idx ON treatments(patient_id);
CREATE INDEX IF NOT EXISTS treatments_status_idx ON treatments(clinic_id, status);

DROP TRIGGER IF EXISTS treatments_set_updated_at ON treatments;
CREATE TRIGGER treatments_set_updated_at BEFORE UPDATE ON treatments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treat_select_members" ON treatments;
CREATE POLICY "treat_select_members" ON treatments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "treat_insert_members" ON treatments;
CREATE POLICY "treat_insert_members" ON treatments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "treat_update_members" ON treatments;
CREATE POLICY "treat_update_members" ON treatments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatments.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "treat_delete_owner_admin" ON treatments;
CREATE POLICY "treat_delete_owner_admin" ON treatments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatments.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- Atomic treatment number generator
CREATE OR REPLACE FUNCTION next_treatment_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO treatment_number_sequences(clinic_id, next_val)
  VALUES (p_clinic_id, 1)
  ON CONFLICT (clinic_id) DO UPDATE
    SET next_val = treatment_number_sequences.next_val + 1
  RETURNING next_val INTO v_next;
  RETURN 'TRT-' || to_char(now(), 'YYYY') || '-' || lpad(v_next::text, 4, '0');
END;
$$;

-- treatment_items
CREATE TABLE IF NOT EXISTS treatment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  treatment_id uuid NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES procedures(id) ON DELETE SET NULL,
  tooth_numbers text[] NOT NULL DEFAULT '{}',
  tooth_region text,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  fee numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  final_amount numeric(12,2) NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','accepted','in_progress','completed','cancelled')),
  dentist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_sittings int NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treatment_items_treatment_id_idx ON treatment_items(treatment_id);
CREATE INDEX IF NOT EXISTS treatment_items_patient_id_idx ON treatment_items(patient_id);

DROP TRIGGER IF EXISTS treatment_items_set_updated_at ON treatment_items;
CREATE TRIGGER treatment_items_set_updated_at BEFORE UPDATE ON treatment_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE treatment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ti_select_members" ON treatment_items;
CREATE POLICY "ti_select_members" ON treatment_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ti_insert_members" ON treatment_items;
CREATE POLICY "ti_insert_members" ON treatment_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ti_update_members" ON treatment_items;
CREATE POLICY "ti_update_members" ON treatment_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_items.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ti_delete_owner_admin" ON treatment_items;
CREATE POLICY "ti_delete_owner_admin" ON treatment_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_items.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- treatment_sittings
CREATE TABLE IF NOT EXISTS treatment_sittings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  treatment_id uuid NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sitting_number int NOT NULL DEFAULT 1,
  date timestamptz NOT NULL DEFAULT now(),
  dentist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  chair text,
  visit_type text NOT NULL DEFAULT 'planned' CHECK (visit_type IN ('planned','general','emergency')),
  procedures_performed text,
  tooth_numbers text[] NOT NULL DEFAULT '{}',
  clinical_note text,
  materials_used text,
  direct_expenses numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  next_appointment_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sittings_treatment_id_idx ON treatment_sittings(treatment_id);
CREATE INDEX IF NOT EXISTS sittings_patient_id_idx ON treatment_sittings(patient_id);
CREATE INDEX IF NOT EXISTS sittings_date_idx ON treatment_sittings(date);

DROP TRIGGER IF EXISTS sittings_set_updated_at ON treatment_sittings;
CREATE TRIGGER sittings_set_updated_at BEFORE UPDATE ON treatment_sittings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE treatment_sittings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ts_select_members" ON treatment_sittings;
CREATE POLICY "ts_select_members" ON treatment_sittings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_sittings.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ts_insert_members" ON treatment_sittings;
CREATE POLICY "ts_insert_members" ON treatment_sittings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_sittings.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ts_update_members" ON treatment_sittings;
CREATE POLICY "ts_update_members" ON treatment_sittings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_sittings.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_sittings.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ts_delete_owner_admin" ON treatment_sittings;
CREATE POLICY "ts_delete_owner_admin" ON treatment_sittings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = treatment_sittings.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- clinical_notes
CREATE TABLE IF NOT EXISTS clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES treatments(id) ON DELETE SET NULL,
  sitting_id uuid REFERENCES treatment_sittings(id) ON DELETE SET NULL,
  note_type text NOT NULL DEFAULT 'freeform' CHECK (note_type IN ('freeform','soap')),
  subjective text, objective text, assessment text, plan text,
  chief_complaint text, examination text, diagnosis text,
  radiographic_findings text, treatment_advised text,
  procedure_performed text, postop_instructions text,
  notes text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinical_notes_patient_id_idx ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS clinical_notes_treatment_id_idx ON clinical_notes(treatment_id);

DROP TRIGGER IF EXISTS clinical_notes_set_updated_at ON clinical_notes;
CREATE TRIGGER clinical_notes_set_updated_at BEFORE UPDATE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cn_select_members" ON clinical_notes;
CREATE POLICY "cn_select_members" ON clinical_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = clinical_notes.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "cn_insert_members" ON clinical_notes;
CREATE POLICY "cn_insert_members" ON clinical_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = clinical_notes.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "cn_update_members" ON clinical_notes;
CREATE POLICY "cn_update_members" ON clinical_notes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = clinical_notes.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = clinical_notes.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "cn_delete_owner_admin" ON clinical_notes;
CREATE POLICY "cn_delete_owner_admin" ON clinical_notes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = clinical_notes.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- dental_chart_conditions
CREATE TABLE IF NOT EXISTS dental_chart_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth_number int NOT NULL CHECK (tooth_number >= 11 AND tooth_number <= 85),
  condition text NOT NULL,
  surface text CHECK (surface IS NULL OR surface IN ('M','O','I','D','B','F','L','P')),
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','planned','completed')),
  notes text,
  treatment_id uuid REFERENCES treatments(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dcc_patient_id_idx ON dental_chart_conditions(patient_id);
CREATE INDEX IF NOT EXISTS dcc_tooth_number_idx ON dental_chart_conditions(patient_id, tooth_number);

DROP TRIGGER IF EXISTS dcc_set_updated_at ON dental_chart_conditions;
CREATE TRIGGER dcc_set_updated_at BEFORE UPDATE ON dental_chart_conditions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE dental_chart_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dcc_select_members" ON dental_chart_conditions;
CREATE POLICY "dcc_select_members" ON dental_chart_conditions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = dental_chart_conditions.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "dcc_insert_members" ON dental_chart_conditions;
CREATE POLICY "dcc_insert_members" ON dental_chart_conditions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = dental_chart_conditions.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "dcc_update_members" ON dental_chart_conditions;
CREATE POLICY "dcc_update_members" ON dental_chart_conditions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = dental_chart_conditions.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = dental_chart_conditions.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "dcc_delete_owner_admin" ON dental_chart_conditions;
CREATE POLICY "dcc_delete_owner_admin" ON dental_chart_conditions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = dental_chart_conditions.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- follow_ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES treatments(id) ON DELETE SET NULL,
  reason text NOT NULL,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','scheduled','completed','unable_to_reach','cancelled')),
  notes text,
  last_contacted_at timestamptz,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS follow_ups_clinic_id_idx ON follow_ups(clinic_id);
CREATE INDEX IF NOT EXISTS follow_ups_patient_id_idx ON follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS follow_ups_status_idx ON follow_ups(clinic_id, status);
CREATE INDEX IF NOT EXISTS follow_ups_due_date_idx ON follow_ups(due_date);

DROP TRIGGER IF EXISTS follow_ups_set_updated_at ON follow_ups;
CREATE TRIGGER follow_ups_set_updated_at BEFORE UPDATE ON follow_ups FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fu_select_members" ON follow_ups;
CREATE POLICY "fu_select_members" ON follow_ups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = follow_ups.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "fu_insert_members" ON follow_ups;
CREATE POLICY "fu_insert_members" ON follow_ups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = follow_ups.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "fu_update_members" ON follow_ups;
CREATE POLICY "fu_update_members" ON follow_ups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = follow_ups.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = follow_ups.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "fu_delete_owner_admin" ON follow_ups;
CREATE POLICY "fu_delete_owner_admin" ON follow_ups FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = follow_ups.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));