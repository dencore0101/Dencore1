import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';
import type { Prescription, ConsentForm, ConsentType } from '@/types/prescription';

// ── Prescriptions ────────────────────────────────────────────
export async function fetchPrescriptions(opts?: {
  patientId?: string; status?: string;
}): Promise<Prescription[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('prescriptions')
    .select('*, items:prescription_items(*), patient:patients(id, full_name, patient_number)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (opts?.patientId) query = query.eq('patient_id', opts.patientId);
  if (opts?.status) query = query.eq('status', opts.status);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Prescription[];
}

export async function fetchPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*, items:prescription_items(*), patient:patients(id, full_name, patient_number)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Prescription[];
}

export interface PrescriptionItemInput {
  drug_name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

export async function createPrescription(input: {
  patient_id: string;
  treatment_id?: string | null;
  notes?: string | null;
  items: PrescriptionItemInput[];
}): Promise<Prescription> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: numData, error: numError } = await supabase.rpc('next_prescription_number', { p_clinic_id: clinicId });
  if (numError) throw numError;

  const { data, error } = await supabase
    .from('prescriptions')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      treatment_id: input.treatment_id ?? null,
      prescription_number: numData as string,
      notes: input.notes ?? null,
      status: 'active',
      prescribed_by: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  const prescription = data as Prescription;

  if (input.items.length > 0) {
    const itemRows = input.items.map((item) => ({
      clinic_id: clinicId,
      prescription_id: prescription.id,
      patient_id: input.patient_id,
      drug_name: item.drug_name,
      dosage: item.dosage ?? null,
      frequency: item.frequency ?? null,
      duration: item.duration ?? null,
      instructions: item.instructions ?? null,
    }));
    const { error: itemError } = await supabase.from('prescription_items').insert(itemRows);
    if (itemError) throw itemError;
  }

  return prescription;
}

export async function deletePrescription(id: string): Promise<void> {
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) throw error;
}

// ── Consent Forms ─────────────────────────────────────────────
export async function fetchConsentForms(opts?: {
  patientId?: string; status?: string;
}): Promise<ConsentForm[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('consent_forms')
    .select('*, patient:patients(id, full_name, patient_number)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (opts?.patientId) query = query.eq('patient_id', opts.patientId);
  if (opts?.status) query = query.eq('status', opts.status);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ConsentForm[];
}

export async function fetchConsentFormsByPatient(patientId: string): Promise<ConsentForm[]> {
  const { data, error } = await supabase
    .from('consent_forms')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ConsentForm[];
}

export async function createConsentForm(input: {
  patient_id: string;
  treatment_id?: string | null;
  consent_type: ConsentType;
  title: string;
  content: string;
}): Promise<ConsentForm> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('consent_forms')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      treatment_id: input.treatment_id ?? null,
      consent_type: input.consent_type,
      title: input.title,
      content: input.content,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ConsentForm;
}

export async function updateConsentStatus(id: string, status: 'signed' | 'declined', witnessName?: string, witnessRelation?: string): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    signed_at: new Date().toISOString(),
  };
  if (witnessName) update.witness_name = witnessName;
  if (witnessRelation) update.witness_relation = witnessRelation;

  const { error } = await supabase.from('consent_forms').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteConsentForm(id: string): Promise<void> {
  const { error } = await supabase.from('consent_forms').delete().eq('id', id);
  if (error) throw error;
}
