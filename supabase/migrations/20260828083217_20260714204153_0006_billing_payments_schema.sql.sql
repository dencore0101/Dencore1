/*
# Phase 5: Billing & Payments schema
Creates invoices, invoice_items, payments, payment_allocations tables.
All number generators use atomic sequence tables for concurrency safety.
Financial tables use ON DELETE SET NULL (not CASCADE) to patient to preserve
historical financial records when a patient is deleted.
Invoice item totals have a CHECK constraint preventing negative line totals.
*/

-- invoice_number_sequences
CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  next_val bigint NOT NULL DEFAULT 1
);
ALTER TABLE invoice_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ins_select_members" ON invoice_number_sequences;
CREATE POLICY "ins_select_members" ON invoice_number_sequences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_number_sequences.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ins_insert_members" ON invoice_number_sequences;
CREATE POLICY "ins_insert_members" ON invoice_number_sequences FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_number_sequences.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ins_update_members" ON invoice_number_sequences;
CREATE POLICY "ins_update_members" ON invoice_number_sequences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_number_sequences.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_number_sequences.clinic_id AND m.user_id = auth.uid()));

-- payment_number_sequences
CREATE TABLE IF NOT EXISTS payment_number_sequences (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  next_val bigint NOT NULL DEFAULT 1
);
ALTER TABLE payment_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pns2_select_members" ON payment_number_sequences;
CREATE POLICY "pns2_select_members" ON payment_number_sequences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_number_sequences.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pns2_insert_members" ON payment_number_sequences;
CREATE POLICY "pns2_insert_members" ON payment_number_sequences FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_number_sequences.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pns2_update_members" ON payment_number_sequences;
CREATE POLICY "pns2_update_members" ON payment_number_sequences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_number_sequences.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_number_sequences.clinic_id AND m.user_id = auth.uid()));

-- invoices (ON DELETE SET NULL to preserve financial history)
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  treatment_id uuid REFERENCES treatments(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','partially_paid','overdue','cancelled')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  due_date date,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS invoices_clinic_id_idx ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS invoices_patient_id_idx ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(clinic_id, status);

DROP TRIGGER IF EXISTS invoices_set_updated_at ON invoices;
CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_select_members" ON invoices;
CREATE POLICY "inv_select_members" ON invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoices.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_insert_members" ON invoices;
CREATE POLICY "inv_insert_members" ON invoices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoices.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_update_members" ON invoices;
CREATE POLICY "inv_update_members" ON invoices FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoices.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoices.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "inv_delete_owner_admin" ON invoices;
CREATE POLICY "inv_delete_owner_admin" ON invoices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoices.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- invoice_items (CHECK: total >= 0 prevents negative line totals)
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  treatment_item_id uuid REFERENCES treatment_items(id) ON DELETE SET NULL,
  procedure_id uuid REFERENCES procedures(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_items_patient_id_idx ON invoice_items(patient_id);

DROP TRIGGER IF EXISTS invoice_items_set_updated_at ON invoice_items;
CREATE TRIGGER invoice_items_set_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ii_select_members" ON invoice_items;
CREATE POLICY "ii_select_members" ON invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ii_insert_members" ON invoice_items;
CREATE POLICY "ii_insert_members" ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ii_update_members" ON invoice_items;
CREATE POLICY "ii_update_members" ON invoice_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_items.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_items.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "ii_delete_owner_admin" ON invoice_items;
CREATE POLICY "ii_delete_owner_admin" ON invoice_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = invoice_items.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- payments (ON DELETE SET NULL to preserve financial history)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  payment_number text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','card','upi','bank_transfer','cheque','other')),
  reference text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','failed','refunded')),
  notes text,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, payment_number)
);

CREATE INDEX IF NOT EXISTS payments_clinic_id_idx ON payments(clinic_id);
CREATE INDEX IF NOT EXISTS payments_patient_id_idx ON payments(patient_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(clinic_id, status);

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pay_select_members" ON payments;
CREATE POLICY "pay_select_members" ON payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pay_insert_members" ON payments;
CREATE POLICY "pay_insert_members" ON payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pay_update_members" ON payments;
CREATE POLICY "pay_update_members" ON payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payments.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pay_delete_owner_admin" ON payments;
CREATE POLICY "pay_delete_owner_admin" ON payments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payments.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- payment_allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pa_payment_id_idx ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS pa_invoice_id_idx ON payment_allocations(invoice_id);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pa_select_members" ON payment_allocations;
CREATE POLICY "pa_select_members" ON payment_allocations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_allocations.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pa_insert_members" ON payment_allocations;
CREATE POLICY "pa_insert_members" ON payment_allocations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_allocations.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pa_update_members" ON payment_allocations;
CREATE POLICY "pa_update_members" ON payment_allocations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_allocations.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_allocations.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "pa_delete_owner_admin" ON payment_allocations;
CREATE POLICY "pa_delete_owner_admin" ON payment_allocations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = payment_allocations.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- Atomic invoice number generator
CREATE OR REPLACE FUNCTION next_invoice_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO invoice_number_sequences(clinic_id, next_val)
  VALUES (p_clinic_id, 1)
  ON CONFLICT (clinic_id) DO UPDATE
    SET next_val = invoice_number_sequences.next_val + 1
  RETURNING next_val INTO v_next;
  RETURN 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(v_next::text, 4, '0');
END;
$$;

-- Atomic payment number generator
CREATE OR REPLACE FUNCTION next_payment_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO payment_number_sequences(clinic_id, next_val)
  VALUES (p_clinic_id, 1)
  ON CONFLICT (clinic_id) DO UPDATE
    SET next_val = payment_number_sequences.next_val + 1
  RETURNING next_val INTO v_next;
  RETURN 'PAY-' || to_char(now(), 'YYYY') || '-' || lpad(v_next::text, 4, '0');
END;
$$;