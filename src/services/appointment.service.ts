import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';
import { logError } from '@/lib/errorLogger';
import type { Appointment, AppointmentOverlap, AppointmentStatus, AppointmentType } from '@/types/appointment';

export async function fetchAppointments(opts: {
  startDate?: string; endDate?: string; patientId?: string;
  dentistId?: string; status?: string; type?: string;
}): Promise<Appointment[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('appointments')
    .select('*, patient:patients(id, full_name, patient_number, phone)')
    .eq('clinic_id', clinicId)
    .order('start_time', { ascending: true });

  if (opts.startDate) query = query.gte('start_time', opts.startDate);
  if (opts.endDate) query = query.lt('end_time', opts.endDate);
  if (opts.patientId) query = query.eq('patient_id', opts.patientId);
  if (opts.dentistId) query = query.eq('dentist_id', opts.dentistId);
  if (opts.status) query = query.eq('status', opts.status);
  if (opts.type) query = query.eq('type', opts.type);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Appointment[];
}

export async function fetchAppointmentById(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient:patients(id, full_name, patient_number, phone)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Appointment | null;
}

export async function fetchAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient:patients(id, full_name, patient_number, phone)')
    .eq('patient_id', patientId)
    .order('start_time', { ascending: false });
  if (error) throw error;
  return data as unknown as Appointment[];
}

export interface AppointmentInput {
  patient_id: string;
  treatment_id?: string | null;
  dentist_id?: string | null;
  chair?: string | null;
  start_time: string;
  duration_min?: number;
  type?: AppointmentType;
  status?: AppointmentStatus;
  notes?: string | null;
}

export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: numData, error: numError } = await supabase.rpc('next_appointment_number', { p_clinic_id: clinicId });
  if (numError) {
    logError({ module: 'Appointment', operation: 'createAppointment_number', message: numError.message, severity: 'critical' });
    throw numError;
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      treatment_id: input.treatment_id ?? null,
      appointment_number: numData as string,
      dentist_id: input.dentist_id ?? null,
      chair: input.chair ?? null,
      start_time: input.start_time,
      duration_min: input.duration_min ?? 30,
      type: input.type ?? 'consultation',
      status: input.status ?? 'scheduled',
      notes: input.notes ?? null,
      created_by: user?.id ?? null,
    })
    .select('*, patient:patients(id, full_name, patient_number, phone)')
    .single();
  if (error) {
    logError({ module: 'Appointment', operation: 'createAppointment', message: error.message, severity: 'critical' });
    throw error;
  }
  return data as unknown as Appointment;
}

export async function updateAppointment(id: string, input: Partial<{
  dentist_id: string | null; chair: string | null;
  start_time: string; duration_min: number;
  type: AppointmentType; status: AppointmentStatus;
  notes: string | null; treatment_id: string | null;
}>): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update(input)
    .eq('id', id)
    .select('*, patient:patients(id, full_name, patient_number, phone)')
    .single();
  if (error) {
    logError({ module: 'Appointment', operation: 'updateAppointment', message: error.message });
    throw error;
  }
  return data as unknown as Appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
}

export async function checkOverlap(opts: {
  dentistId?: string | null;
  chair?: string | null;
  startTime: string;
  durationMin: number;
  excludeId?: string;
}): Promise<AppointmentOverlap[]> {
  const clinicId = getClinicId();
  const endTime = new Date(new Date(opts.startTime).getTime() + opts.durationMin * 60000).toISOString();

  let query = supabase
    .from('appointments')
    .select('id, appointment_number, start_time, duration_min, patient:patients(full_name)')
    .eq('clinic_id', clinicId)
    .neq('status', 'cancelled')
    .neq('status', 'no_show')
    .lt('start_time', endTime);

  // end_time > start_time means: start_time + duration > existing.start_time
  // We need: existing.start_time < endTime AND existing.start_time + existing.duration > startTime
  // Supabase doesn't support computed columns in filters, so we fetch candidates and filter in JS
  const startTimeMs = new Date(opts.startTime).getTime();

  if (opts.dentistId) {
    query = query.eq('dentist_id', opts.dentistId);
  } else if (opts.chair) {
    query = query.eq('chair', opts.chair);
  } else {
    return [];
  }

  if (opts.excludeId) query = query.neq('id', opts.excludeId);

  const { data, error } = await query;
  if (error) throw error;

  const overlaps = (data ?? []).filter((apt: Record<string, unknown>) => {
    const aptStart = new Date(apt.start_time as string).getTime();
    const aptEnd = aptStart + (apt.duration_min as number) * 60000;
    return aptStart < new Date(endTime).getTime() && aptEnd > startTimeMs;
  });

  return overlaps.map((apt: Record<string, unknown>) => ({
    id: apt.id as string,
    appointment_number: apt.appointment_number as string,
    patient_name: (apt.patient as Record<string, string>)?.full_name ?? 'Unknown',
    start_time: apt.start_time as string,
    duration_min: apt.duration_min as number,
  }));
}
