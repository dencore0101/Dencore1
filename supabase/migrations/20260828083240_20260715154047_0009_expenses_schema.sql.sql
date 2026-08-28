/*
# Phase 8: Expenses schema
Creates expenses table for tracking clinic operating expenses.
*/

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('rent','utilities','supplies','salary','equipment','maintenance','marketing','lab','other')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor text,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','bank','card','upi','cheque','other')),
  is_recurring boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_clinic_id_idx ON expenses(clinic_id);
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON expenses(clinic_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(clinic_id, category);

DROP TRIGGER IF EXISTS expenses_set_updated_at ON expenses;
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exp_select_members" ON expenses;
CREATE POLICY "exp_select_members" ON expenses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = expenses.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "exp_insert_members" ON expenses;
CREATE POLICY "exp_insert_members" ON expenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = expenses.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "exp_update_members" ON expenses;
CREATE POLICY "exp_update_members" ON expenses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = expenses.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = expenses.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "exp_delete_owner_admin" ON expenses;
CREATE POLICY "exp_delete_owner_admin" ON expenses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = expenses.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));