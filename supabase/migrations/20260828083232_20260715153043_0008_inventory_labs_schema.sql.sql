/*
# Phase 7: Inventory & Lab Work schema
Creates inventory_items, inventory_transactions, lab_cases tables.
Lab case numbers use atomic sequence table for concurrency safety.
*/

-- inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'consumable' CHECK (category IN ('consumable','medication','instrument','implant','other')),
  unit text NOT NULL DEFAULT 'piece',
  current_stock numeric(12,2) NOT NULL DEFAULT 0,
  reorder_level numeric(12,2) NOT NULL DEFAULT 0,
  cost_per_unit numeric(12,2) NOT NULL DEFAULT 0,
  supplier text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_items_clinic_id_idx ON inventory_items(clinic_id);
CREATE INDEX IF NOT EXISTS inventory_items_category_idx ON inventory_items(clinic_id, category);

DROP TRIGGER IF EXISTS inventory_items_set_updated_at ON inventory_items;
CREATE TRIGGER inventory_items_set_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_item_select_members" ON inventory_items;
CREATE POLICY "inv_item_select_members" ON inventory_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_item_insert_members" ON inventory_items;
CREATE POLICY "inv_item_insert_members" ON inventory_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_item_update_members" ON inventory_items;
CREATE POLICY "inv_item_update_members" ON inventory_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_items.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_item_delete_owner_admin" ON inventory_items;
CREATE POLICY "inv_item_delete_owner_admin" ON inventory_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_items.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- inventory_transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'usage' CHECK (type IN ('purchase','usage','adjustment','return')),
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inv_txn_item_id_idx ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS inv_txn_clinic_id_idx ON inventory_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS inv_txn_created_at_idx ON inventory_transactions(clinic_id, created_at DESC);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_txn_select_members" ON inventory_transactions;
CREATE POLICY "inv_txn_select_members" ON inventory_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_transactions.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_txn_insert_members" ON inventory_transactions;
CREATE POLICY "inv_txn_insert_members" ON inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_transactions.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_txn_update_members" ON inventory_transactions;
CREATE POLICY "inv_txn_update_members" ON inventory_transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_transactions.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_transactions.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_txn_delete_owner_admin" ON inventory_transactions;
CREATE POLICY "inv_txn_delete_owner_admin" ON inventory_transactions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = inventory_transactions.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- lab_case_number_sequences (concurrency-safe)
CREATE TABLE IF NOT EXISTS lab_case_number_sequences (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  next_val bigint NOT NULL DEFAULT 1
);
ALTER TABLE lab_case_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lcns_select_members" ON lab_case_number_sequences;
CREATE POLICY "lcns_select_members" ON lab_case_number_sequences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_case_number_sequences.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "lcns_insert_members" ON lab_case_number_sequences;
CREATE POLICY "lcns_insert_members" ON lab_case_number_sequences FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_case_number_sequences.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "lcns_update_members" ON lab_case_number_sequences;
CREATE POLICY "lcns_update_members" ON lab_case_number_sequences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_case_number_sequences.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_case_number_sequences.clinic_id AND m.user_id = auth.uid()));

-- lab_cases
CREATE TABLE IF NOT EXISTS lab_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES treatments(id) ON DELETE SET NULL,
  case_number text NOT NULL,
  lab_name text NOT NULL,
  work_type text NOT NULL DEFAULT 'other' CHECK (work_type IN ('crown','bridge','denture','implant','orthodontic','veneer','other')),
  stage text NOT NULL DEFAULT 'sent' CHECK (stage IN ('sent','in_progress','received','delivered','cancelled')),
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  received_date date,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, case_number)
);

CREATE INDEX IF NOT EXISTS lab_cases_clinic_id_idx ON lab_cases(clinic_id);
CREATE INDEX IF NOT EXISTS lab_cases_patient_id_idx ON lab_cases(patient_id);
CREATE INDEX IF NOT EXISTS lab_cases_stage_idx ON lab_cases(clinic_id, stage);

DROP TRIGGER IF EXISTS lab_cases_set_updated_at ON lab_cases;
CREATE TRIGGER lab_cases_set_updated_at BEFORE UPDATE ON lab_cases FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE lab_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_select_members" ON lab_cases;
CREATE POLICY "lab_select_members" ON lab_cases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_cases.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "lab_insert_members" ON lab_cases;
CREATE POLICY "lab_insert_members" ON lab_cases FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_cases.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "lab_update_members" ON lab_cases;
CREATE POLICY "lab_update_members" ON lab_cases FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_cases.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_cases.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "lab_delete_owner_admin" ON lab_cases;
CREATE POLICY "lab_delete_owner_admin" ON lab_cases FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = lab_cases.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- Atomic lab case number generator
CREATE OR REPLACE FUNCTION next_lab_case_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO lab_case_number_sequences(clinic_id, next_val)
  VALUES (p_clinic_id, 1)
  ON CONFLICT (clinic_id) DO UPDATE
    SET next_val = lab_case_number_sequences.next_val + 1
  RETURNING next_val INTO v_next;
  RETURN 'LAB-' || to_char(now(), 'YYYY') || '-' || lpad(v_next::text, 4, '0');
END;
$$;