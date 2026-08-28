// ── Clinical Types (Phase 4) ──────────────────────────────────
export type TreatmentStatus = 'proposed' | 'accepted' | 'ongoing' | 'paused' | 'completed' | 'cancelled';
export type TreatmentItemStatus = 'planned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type TreatmentItemPriority = 'low' | 'normal' | 'high';
export type SittingStatus = 'scheduled' | 'completed' | 'cancelled';
export type VisitType = 'planned' | 'general' | 'emergency';
export type FollowUpStatus = 'pending' | 'contacted' | 'scheduled' | 'completed' | 'unable_to_reach' | 'cancelled';
export type FollowUpPriority = 'low' | 'normal' | 'high';
export type ChartStatus = 'present' | 'planned' | 'completed';

export interface Procedure {
  id: string;
  clinic_id: string;
  category_id: string | null;
  name: string;
  code: string | null;
  default_fee: number;
  expected_sittings: number;
  expected_duration_min: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcedureCategory {
  id: string;
  clinic_id: string;
  name: string;
  display_order: number;
  active: boolean;
  created_at: string;
}

export interface Treatment {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_number: string;
  case_name: string;
  status: TreatmentStatus;
  dentist_id: string | null;
  planned_value: number;
  discount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: TreatmentItem[];
}

export interface TreatmentItem {
  id: string;
  clinic_id: string;
  treatment_id: string;
  patient_id: string;
  procedure_id: string | null;
  tooth_numbers: string[];
  tooth_region: string | null;
  quantity: number;
  fee: number;
  discount: number;
  final_amount: number;
  priority: string;
  status: TreatmentItemStatus;
  dentist_id: string | null;
  expected_sittings: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  procedure?: { id: string; name: string } | null;
}

export interface ClinicalNote {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_id: string | null;
  sitting_id: string | null;
  note_type: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  chief_complaint: string | null;
  examination: string | null;
  diagnosis: string | null;
  radiographic_findings: string | null;
  treatment_advised: string | null;
  procedure_performed: string | null;
  postop_instructions: string | null;
  notes: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DentalChartCondition {
  id: string;
  clinic_id: string;
  patient_id: string;
  tooth_number: number;
  condition: string;
  surface: string | null;
  status: string;
  notes: string | null;
  treatment_id: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_id: string | null;
  reason: string;
  due_date: string;
  priority: string;
  assigned_to: string | null;
  status: FollowUpStatus;
  notes: string | null;
  last_contacted_at: string | null;
  outcome: string | null;
  reminder_time: string | null;
  reminder_message: string | null;
  reminder_1week: boolean;
  reminder_1day: boolean;
  reminder_sameday: boolean;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string; patient_number: string; phone: string | null } | null;
}

// ── Notification & Portal Types (Phase 9) ────────────────────
export type NotificationChannel = 'sms' | 'email' | 'whatsapp' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

export interface Notification {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  channel: NotificationChannel;
  template_key: string;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  sent_at: string | null;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  patient?: { id: string; full_name: string; patient_number: string } | null;
}

export interface PortalAccess {
  id: string;
  clinic_id: string;
  patient_id: string;
  is_enabled: boolean;
  access_token: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string; patient_number: string; phone: string | null; email: string | null } | null;
}
