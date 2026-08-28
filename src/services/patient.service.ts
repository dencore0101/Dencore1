import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';
import { logError } from '@/lib/errorLogger';
import type { Patient, ReferralSource, PatientMedicalHistoryEntry, PatientAlert } from '@/types/db';

export async function fetchPatients(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: Patient[]; total: number }> {
  const clinicId = getClinicId();
  const { search = '', page = 1, pageSize = 20 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('patients')
    .select('*, referral_source:referral_sources(id, name)', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,patient_number.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    logError({ module: 'Patient', operation: 'fetchPatients', message: error.message, details: { search, page } });
    throw error;
  }
  return { data: (data as Patient[]) ?? [], total: count ?? 0 };
}

export async function fetchPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*, referral_source:referral_sources(id, name)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as Patient | null;
}

export interface PatientInput {
  full_name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: string;
  blood_group?: string | null;
  address?: string | null;
  occupation?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  anniversary_date?: string | null;
  referral_source_id?: string | null;
  referred_by_name?: string | null;
  assigned_dentist_id?: string | null;
  chief_complaint?: string | null;
  on_examination?: string | null;
  provisional_diagnosis?: string | null;
  notes?: string | null;
  tags?: string[];
}

export async function createPatient(input: PatientInput): Promise<Patient> {
  const clinicId = getClinicId();

  const { data: numData, error: numError } = await supabase.rpc('next_patient_number', {
    p_clinic_id: clinicId,
  });
  if (numError) {
    logError({ module: 'Patient', operation: 'createPatient_number', message: numError.message, severity: 'critical' });
    throw numError;
  }
  const patientNumber = numData as string;

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...input,
      clinic_id: clinicId,
      patient_number: patientNumber,
      tags: input.tags ?? [],
      gender: (input.gender as Patient['gender']) ?? 'unknown',
    })
    .select('*, referral_source:referral_sources(id, name)')
    .single();
  if (error) {
    logError({ module: 'Patient', operation: 'createPatient', message: error.message, severity: 'critical' });
    throw error;
  }
  return data as Patient;
}

export async function updatePatient(id: string, input: Partial<PatientInput>): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update(input)
    .eq('id', id)
    .select('*, referral_source:referral_sources(id, name)')
    .single();
  if (error) {
    logError({ module: 'Patient', operation: 'updatePatient', message: error.message });
    throw error;
  }
  return data as Patient;
}

export async function softDeletePatient(id: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchReferralSources(): Promise<ReferralSource[]> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('referral_sources')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data as ReferralSource[];
}

export async function fetchMedicalHistory(patientId: string): Promise<PatientMedicalHistoryEntry[]> {
  const { data, error } = await supabase
    .from('patient_medical_history')
    .select('*')
    .eq('patient_id', patientId)
    .order('condition');
  if (error) throw error;
  return data as PatientMedicalHistoryEntry[];
}

export async function upsertMedicalHistory(
  patientId: string,
  entries: { condition: string; status: string; notes?: string | null; medication?: string | null }[],
): Promise<void> {
  const clinicId = getClinicId();
  const rows = entries.map((e) => ({
    clinic_id: clinicId,
    patient_id: patientId,
    condition: e.condition,
    status: e.status,
    notes: e.notes ?? null,
    medication: e.medication ?? null,
  }));

  const { error } = await supabase
    .from('patient_medical_history')
    .upsert(rows, { onConflict: 'patient_id,condition' });
  if (error) throw error;
}

export async function fetchPatientAlerts(patientId: string): Promise<PatientAlert[]> {
  const { data, error } = await supabase
    .from('patient_alerts')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PatientAlert[];
}

export async function checkDuplicatePhone(phone: string, excludePatientId?: string): Promise<number> {
  const clinicId = getClinicId();
  let query = supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .is('deleted_at', null);
  if (excludePatientId) query = query.neq('id', excludePatientId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
