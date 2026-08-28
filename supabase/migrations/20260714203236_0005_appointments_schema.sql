/*
# Phase 4: Appointments schema

## Summary
Creates the appointments table for scheduling with patient/dentist/chair
assignment, statuses, types, reminders, and overlap detection support.

## New Tables

### `appointments`
- id, clinic_id, patient_id → patients, treatment_id → treatments (nullable)
- appointment_number (human-readable, e.g. APT-2026-0001)
- dentist_id → auth.users (nullable)
- chair (text, nullable)
- start_time (timestamptz), duration_min (int default 30)
- type ('consultation'|'treatment'|'follow_up'|'emergency'|'recall'|'walk_in'|'custom')
- status ('scheduled'|'confirmed'|'arrived'|'waiting'|'in_chair'|'completed'|'cancelled'|'no_show')
- notes (text, nullable)
- reminder_status ('none'|'pending'|'sent'|'failed', default 'none')
- reminder_sent_at (timestamptz, nullable)
- created_by → auth.users
- created_at, updated_at

## Indexes
- clinic_id, patient_id, dentist_id, start_time, status

## Security (RLS)
Membership-scoped policies. Owner/admin/dentist/receptionist can manage.
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES treatments(id) ON DELETE SET NULL,
  appointment_number text NOT NULL,
  dentist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  chair text,
  start_time timestamptz NOT NULL,
  duration_min int NOT NULL DEFAULT 30 CHECK (duration_min > 0),
  type text NOT NULL DEFAULT 'consultation' CHECK (type IN ('consultation','treatment','follow_up','emergency','recall','walk_in','custom')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','arrived','waiting','in_chair','completed','cancelled','no_show')),
  notes text,
  reminder_status text NOT NULL DEFAULT 'none' CHECK (reminder_status IN ('none','pending','sent','failed')),
  reminder_sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, appointment_number)
);

CREATE INDEX IF NOT EXISTS appointments_clinic_id_idx ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS appointments_dentist_id_idx ON appointments(dentist_id);
CREATE INDEX IF NOT EXISTS appointments_start_time_idx ON appointments(start_time);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(clinic_id, status);

DROP TRIGGER IF EXISTS appointments_set_updated_at ON appointments;
CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "apt_select_members" ON appointments;
CREATE POLICY "apt_select_members" ON appointments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = appointments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "apt_insert_members" ON appointments;
CREATE POLICY "apt_insert_members" ON appointments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = appointments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "apt_update_members" ON appointments;
CREATE POLICY "apt_update_members" ON appointments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = appointments.clinic_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = appointments.clinic_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "apt_delete_owner_admin" ON appointments;
CREATE POLICY "apt_delete_owner_admin" ON appointments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinic_id = appointments.clinic_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- Appointment number generator
CREATE OR REPLACE FUNCTION next_appointment_number(p_clinic_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT count(*) + 1 INTO v_count FROM appointments WHERE clinic_id = p_clinic_id;
  RETURN 'APT-' || to_char(now(), 'YYYY') || '-' || lpad(v_count::text, 4, '0');
END;
$$;
