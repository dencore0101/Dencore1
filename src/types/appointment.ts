export type AppointmentStatus =
  | 'scheduled' | 'confirmed' | 'arrived' | 'waiting'
  | 'in_chair' | 'completed' | 'cancelled' | 'no_show';

export type AppointmentType =
  | 'consultation' | 'treatment' | 'follow_up' | 'emergency'
  | 'recall' | 'walk_in' | 'custom';

export type ReminderStatus = 'none' | 'pending' | 'sent' | 'failed';

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_id: string | null;
  appointment_number: string;
  dentist_id: string | null;
  chair: string | null;
  start_time: string;
  duration_min: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  reminder_status: ReminderStatus;
  reminder_sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string; patient_number: string; phone: string | null } | null;
}

export interface AppointmentOverlap {
  id: string;
  appointment_number: string;
  patient_name: string;
  start_time: string;
  duration_min: number;
}
