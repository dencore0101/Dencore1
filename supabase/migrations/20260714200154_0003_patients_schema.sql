/*
# Phase 2: Patients schema

## Summary
Creates all patient-related tables for ToothRevenue. Includes human-readable
patient numbering, full demographic fields, referral sources, tags, and a
complete medical history table with per-condition status tracking.

## New Tables

### `referral_sources`
Master list of referral sources for the clinic (e.g. "Google", "Walk-in").
- `id`, `clinic_id`, `name`, `active`, `created_at`

### `patient_number_sequences`
Concurrency-safe counter per clinic for generating PAT-XXXXXX numbers.
- `clinic_id` (unique), `next_val`

### `patients`
Core patient record. All demographics, contact, clinical intake fields.
- `id`, `clinic_id`, `patient_number` (human-readable, e.g. PAT-000001)
- `full_name`, `phone`, `whatsapp`, `email`
- `date_of_birth`, `gender` ('male'|'female'|'other'|'unknown')
- `blood_group`, `address`, `occupation`
- `emergency_contact_name`, `emergency_contact_phone`
- `anniversary_date`
- `referral_source_id` → referral_sources
- `referred_by_patient_id` → patients (self-ref)
- `referred_by_name`
- `assigned_dentist_id` → auth.users (nullable; dentist user)
- `chief_complaint`, `on_examination`, `provisional_diagnosis`
- `photo_url`
- `notes`
- `tags` text[] — lightweight tag array
- `is_active` boolean DEFAULT true
- `deleted_at` — soft delete
- `created_at`, `updated_at`

### `patient_medical_history`
One row per patient per condition type. Upsertable.
- `id`, `clinic_id`, `patient_id`
- `condition` text — condition key (e.g. 'diabetes', 'hypertension', ...)
- `status` ('present'|'absent'|'unknown')
- `notes`, `medication`
- `updated_at`, `created_at`
- UNIQUE(patient_id, condition)

### `patient_alerts`
High-priority alert badges shown in patient header.
- `id`, `clinic_id`, `patient_id`, `alert_text`, `severity` ('low'|'medium'|'high')
- `created_at`

## Indexes
- patients: clinic_id, phone, patient_number, full_name (trgm), deleted_at
- patient_medical_history: patient_id
- patient_alerts: patient_id

## Security (RLS)
All tables scoped to clinic membership. SELECT/INSERT/UPDATE for members,
soft-delete (UPDATE) for members, hard DELETE blocked at app layer.

## Important Notes
1. patient_number_sequences uses a PL/pgSQL function `next_patient_number(p_clinic_id)`
   that locks the row and returns the formatted next number atomically.
2. pg_trgm extension is enabled for fuzzy name search.
3. All clinic-owned rows have `clinic_id` with FK → clinics.
*/

-- Enable pg_trgm for fuzzy/ILIKE search on names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── referral_sources ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, name)
);

CREATE INDEX IF NOT EXISTS referral_sources_clinic_id_idx ON referral_sources(clinic_id);

ALTER TABLE referral_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rs_select_members" ON referral_sources;
CREATE POLICY "rs_select_members" ON referral_sources FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = referral_sources.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "rs_insert_members" ON referral_sources;
CREATE POLICY "rs_insert_members" ON referral_sources FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = referral_sources.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "rs_update_members" ON referral_sources;
CREATE POLICY "rs_update_members" ON referral_sources FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = referral_sources.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = referral_sources.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "rs_delete_owner_admin" ON referral_sources;
CREATE POLICY "rs_delete_owner_admin" ON referral_sources FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = referral_sources.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- ── patient_number_sequences ──────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_number_sequences (
  clinic_id uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  next_val bigint NOT NULL DEFAULT 1
);

ALTER TABLE patient_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pns_select_members" ON patient_number_sequences;
CREATE POLICY "pns_select_members" ON patient_number_sequences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_number_sequences.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "pns_insert_members" ON patient_number_sequences;
CREATE POLICY "pns_insert_members" ON patient_number_sequences FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_number_sequences.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "pns_update_members" ON patient_number_sequences;
CREATE POLICY "pns_update_members" ON patient_number_sequences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_number_sequences.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_number_sequences.clinic_id AND m.user_id = auth.uid()));

-- Atomic patient number generator
CREATE OR REPLACE FUNCTION next_patient_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO patient_number_sequences(clinic_id, next_val)
  VALUES (p_clinic_id, 1)
  ON CONFLICT (clinic_id) DO UPDATE
    SET next_val = patient_number_sequences.next_val + 1
  RETURNING next_val INTO v_next;
  RETURN 'PAT-' || lpad(v_next::text, 6, '0');
END;
$$;

-- ── patients ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_number text NOT NULL,
  full_name text NOT NULL,
  phone text,
  whatsapp text,
  email text,
  date_of_birth date,
  gender text CHECK (gender IN ('male','female','other','unknown')) DEFAULT 'unknown',
  blood_group text,
  address text,
  occupation text,
  emergency_contact_name text,
  emergency_contact_phone text,
  anniversary_date date,
  referral_source_id uuid REFERENCES referral_sources(id) ON DELETE SET NULL,
  referred_by_patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  referred_by_name text,
  assigned_dentist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  chief_complaint text,
  on_examination text,
  provisional_diagnosis text,
  photo_url text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, patient_number)
);

CREATE INDEX IF NOT EXISTS patients_clinic_id_idx ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS patients_phone_idx ON patients(clinic_id, phone);
CREATE INDEX IF NOT EXISTS patients_patient_number_idx ON patients(clinic_id, patient_number);
CREATE INDEX IF NOT EXISTS patients_full_name_trgm_idx ON patients USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS patients_deleted_at_idx ON patients(deleted_at) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS patients_set_updated_at ON patients;
CREATE TRIGGER patients_set_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_select_members" ON patients;
CREATE POLICY "patients_select_members" ON patients FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patients.clinic_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "patients_insert_members" ON patients;
CREATE POLICY "patients_insert_members" ON patients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patients.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "patients_update_members" ON patients;
CREATE POLICY "patients_update_members" ON patients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patients.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patients.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "patients_delete_owner_admin" ON patients;
CREATE POLICY "patients_delete_owner_admin" ON patients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patients.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- ── patient_medical_history ───────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_medical_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  condition text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('present','absent','unknown')),
  notes text,
  medication text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, condition)
);

CREATE INDEX IF NOT EXISTS pmh_patient_id_idx ON patient_medical_history(patient_id);

DROP TRIGGER IF EXISTS pmh_set_updated_at ON patient_medical_history;
CREATE TRIGGER pmh_set_updated_at
  BEFORE UPDATE ON patient_medical_history
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE patient_medical_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pmh_select_members" ON patient_medical_history;
CREATE POLICY "pmh_select_members" ON patient_medical_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_medical_history.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "pmh_insert_members" ON patient_medical_history;
CREATE POLICY "pmh_insert_members" ON patient_medical_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_medical_history.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "pmh_update_members" ON patient_medical_history;
CREATE POLICY "pmh_update_members" ON patient_medical_history FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_medical_history.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_medical_history.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "pmh_delete_members" ON patient_medical_history;
CREATE POLICY "pmh_delete_members" ON patient_medical_history FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_medical_history.clinic_id AND m.user_id = auth.uid()));

-- ── patient_alerts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  alert_text text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_alerts_patient_id_idx ON patient_alerts(patient_id);

ALTER TABLE patient_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pa_select_members" ON patient_alerts;
CREATE POLICY "pa_select_members" ON patient_alerts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_alerts.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "pa_insert_members" ON patient_alerts;
CREATE POLICY "pa_insert_members" ON patient_alerts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_alerts.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "pa_update_members" ON patient_alerts;
CREATE POLICY "pa_update_members" ON patient_alerts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_alerts.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_alerts.clinic_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "pa_delete_members" ON patient_alerts;
CREATE POLICY "pa_delete_members" ON patient_alerts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = patient_alerts.clinic_id AND m.user_id = auth.uid()));

-- ── seed default referral sources ────────────────────────────
-- These are seeded per-clinic at bootstrap time by the edge function.
-- This migration only creates structure; no seed data here.
