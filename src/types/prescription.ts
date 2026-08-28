export type PrescriptionStatus = 'active' | 'completed' | 'cancelled';
export type ConsentType = 'extraction' | 'rct' | 'surgery' | 'implant' | 'anesthesia' | 'general' | 'custom';
export type ConsentStatus = 'pending' | 'signed' | 'declined';

export interface PrescriptionItem {
  id: string;
  clinic_id: string;
  prescription_id: string;
  patient_id: string;
  drug_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_id: string | null;
  sitting_id: string | null;
  prescription_number: string;
  notes: string | null;
  status: PrescriptionStatus;
  prescribed_by: string | null;
  created_at: string;
  updated_at: string;
  items?: PrescriptionItem[];
  patient?: { id: string; full_name: string; patient_number: string } | null;
}

export interface ConsentForm {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_id: string | null;
  consent_type: ConsentType;
  title: string;
  content: string;
  status: ConsentStatus;
  signed_by: string | null;
  signed_at: string | null;
  witness_name: string | null;
  witness_relation: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string; patient_number: string } | null;
}
