export type ClinicRole = 'owner' | 'admin' | 'member';

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicMembership {
  id: string;
  clinic_id: string;
  user_id: string;
  role: ClinicRole;
  created_at: string;
}

export interface ClinicSettings {
  id: string;
  clinic_id: string;
  settings: Record<string, unknown>;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  clinic_id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Profile {
  clinic: Clinic;
  membership: ClinicMembership;
  role: ClinicRole;
}

export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type MedicalStatus = 'present' | 'absent' | 'unknown';
export type AlertSeverity = 'low' | 'medium' | 'high';

export interface ReferralSource {
  id: string;
  clinic_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  patient_number: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: Gender;
  blood_group: string | null;
  address: string | null;
  occupation: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  anniversary_date: string | null;
  referral_source_id: string | null;
  referred_by_patient_id: string | null;
  referred_by_name: string | null;
  assigned_dentist_id: string | null;
  chief_complaint: string | null;
  on_examination: string | null;
  provisional_diagnosis: string | null;
  photo_url: string | null;
  notes: string | null;
  tags: string[];
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  referral_source?: ReferralSource | null;
}

export interface PatientMedicalHistoryEntry {
  id: string;
  clinic_id: string;
  patient_id: string;
  condition: string;
  status: MedicalStatus;
  notes: string | null;
  medication: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientAlert {
  id: string;
  clinic_id: string;
  patient_id: string;
  alert_text: string;
  severity: AlertSeverity;
  created_at: string;
}
