import type { AppointmentStatus, AppointmentType } from '@/types/appointment';

export const APPOINTMENT_STATUS_OPTIONS: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: 'primary' },
  { value: 'confirmed', label: 'Confirmed', color: 'primary' },
  { value: 'arrived', label: 'Arrived', color: 'warning' },
  { value: 'waiting', label: 'Waiting', color: 'warning' },
  { value: 'in_chair', label: 'In Chair', color: 'accent' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
  { value: 'no_show', label: 'No Show', color: 'error' },
];

export const APPOINTMENT_TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'recall', label: 'Recall' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'custom', label: 'Custom' },
];

export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  consultation: 'bg-primary-100 text-primary-700',
  treatment: 'bg-accent-100 text-accent-700',
  follow_up: 'bg-secondary-100 text-secondary-700',
  emergency: 'bg-error-100 text-error-700',
  recall: 'bg-success-100 text-success-700',
  walk_in: 'bg-warning-100 text-warning-700',
  custom: 'bg-neutral-100 text-neutral-600',
};

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const STATUS_COLOR_MAP: Record<string, string> = {
  scheduled: 'primary',
  confirmed: 'primary',
  arrived: 'warning',
  waiting: 'warning',
  in_chair: 'accent',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
};
