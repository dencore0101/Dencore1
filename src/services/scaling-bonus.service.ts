import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';

export interface ScalingBonusConfig {
  id: string;
  clinic_id: string;
  qualifying_amount: number;
  free_scaling_years: number;
  patient_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScalingBonusEligibility {
  id: string;
  clinic_id: string;
  patient_id: string;
  qualifying_treatment_id: string | null;
  qualifying_amount: number;
  eligible_date: string;
  expiry_date: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScalingBonusAudit {
  id: string;
  clinic_id: string;
  patient_id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
}

export async function fetchBonusConfig(): Promise<ScalingBonusConfig | null> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('scaling_bonus_config')
    .select('*')
    .eq('clinic_id', clinicId)
    .maybeSingle();
  if (error) throw error;
  return data as ScalingBonusConfig | null;
}

export async function upsertBonusConfig(input: {
  qualifying_amount: number;
  free_scaling_years: number;
  patient_message: string;
  is_active: boolean;
}): Promise<ScalingBonusConfig> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('scaling_bonus_config')
    .upsert({
      clinic_id: clinicId,
      qualifying_amount: input.qualifying_amount,
      free_scaling_years: input.free_scaling_years,
      patient_message: input.patient_message,
      is_active: input.is_active,
    }, { onConflict: 'clinic_id' })
    .select('*')
    .single();
  if (error) throw error;

  const config = data as ScalingBonusConfig;
  await logAudit(clinicId, '00000000-0000-0000-0000-000000000000', 'config_changed', null, config as unknown as Record<string, unknown>, user?.id ?? null);
  return config;
}

export async function fetchEligiblePatients(): Promise<Array<ScalingBonusEligibility & { patient_name: string; patient_number: string; phone: string | null; whatsapp: string | null }>> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('scaling_bonus_eligibility')
    .select('*, patient:patients(id, full_name, patient_number, phone, whatsapp)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const patient = row.patient as { id: string; full_name: string; patient_number: string; phone: string | null; whatsapp: string | null } | null;
    return {
      ...row,
      patient_name: patient?.full_name ?? '—',
      patient_number: patient?.patient_number ?? '—',
      phone: patient?.phone ?? null,
      whatsapp: patient?.whatsapp ?? null,
    };
  });
}

export async function addEligibility(input: {
  patient_id: string;
  qualifying_amount?: number;
  expiry_date: string;
  notes?: string | null;
}): Promise<ScalingBonusEligibility> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('scaling_bonus_eligibility')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      qualifying_amount: input.qualifying_amount ?? 0,
      eligible_date: new Date().toISOString().split('T')[0],
      expiry_date: input.expiry_date,
      status: 'manually_added',
      notes: input.notes ?? null,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  const eligibility = data as ScalingBonusEligibility;
  await logAudit(clinicId, input.patient_id, 'manually_added', null, eligibility as unknown as Record<string, unknown>, user?.id ?? null);
  return eligibility;
}

export async function revokeEligibility(id: string, patientId: string): Promise<void> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: old, error: fetchErr } = await supabase
    .from('scaling_bonus_eligibility')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const { error } = await supabase
    .from('scaling_bonus_eligibility')
    .update({ status: 'revoked' })
    .eq('id', id);
  if (error) throw error;

  await logAudit(clinicId, patientId, 'manually_removed', old as unknown as Record<string, unknown>, null, user?.id ?? null);
}

export async function fetchAuditLog(patientId?: string): Promise<ScalingBonusAudit[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('scaling_bonus_audit')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (patientId) query = query.eq('patient_id', patientId);
  const { data, error } = await query;
  if (error) throw error;
  return data as ScalingBonusAudit[];
}

async function logAudit(
  clinicId: string,
  patientId: string,
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  performedBy: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('scaling_bonus_audit')
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      action,
      old_values: oldValues,
      new_values: newValues,
      performed_by: performedBy,
    });
  if (error) console.error('Failed to log audit:', error.message);
}
