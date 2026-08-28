import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';
import { logError } from '@/lib/errorLogger';
import type {
  Procedure, ProcedureCategory, Treatment, TreatmentItem,
  ClinicalNote, DentalChartCondition, FollowUp,
  Notification, NotificationChannel, PortalAccess,
} from '@/types/clinical';

// ── Procedures ───────────────────────────────────────────────
export async function fetchProcedures(): Promise<Procedure[]> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('procedures')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as unknown as Procedure[];
}

export async function fetchProcedureCategories(): Promise<ProcedureCategory[]> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('procedure_categories')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data as unknown as ProcedureCategory[];
}

// ── Treatments ────────────────────────────────────────────────
export async function fetchTreatmentsByPatient(patientId: string): Promise<Treatment[]> {
  const { data, error } = await supabase
    .from('treatments')
    .select('*, items:treatment_items(*, procedure:procedures(id, name))')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Treatment[];
}

export async function createTreatment(input: {
  patient_id: string;
  case_name: string;
  notes?: string | null;
}): Promise<Treatment> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: numData, error: numError } = await supabase.rpc('next_treatment_number', { p_clinic_id: clinicId });
  if (numError) {
    logError({ module: 'Treatment', operation: 'createTreatment_number', message: numError.message, severity: 'critical' });
    throw numError;
  }

  const { data, error } = await supabase
    .from('treatments')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      treatment_number: numData as string,
      case_name: input.case_name,
      status: 'proposed',
      dentist_id: user?.id ?? null,
      planned_value: 0,
      discount: 0,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) {
    logError({ module: 'Treatment', operation: 'createTreatment', message: error.message, severity: 'critical' });
    throw error;
  }
  return data as unknown as Treatment;
}

export async function deleteTreatment(id: string): Promise<void> {
  const { error } = await supabase.from('treatments').delete().eq('id', id);
  if (error) throw error;
}

export async function addTreatmentItem(input: {
  treatment_id: string;
  patient_id: string;
  procedure_id: string | null;
  tooth_numbers?: string[];
  tooth_region?: string | null;
  quantity?: number;
  fee: number;
  discount?: number;
  priority?: string;
  expected_sittings?: number;
  notes?: string | null;
}): Promise<TreatmentItem> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const quantity = input.quantity ?? 1;
  const discount = input.discount ?? 0;
  const finalAmount = Math.max(0, input.fee * quantity - discount);

  const { data, error } = await supabase
    .from('treatment_items')
    .insert({
      clinic_id: clinicId,
      treatment_id: input.treatment_id,
      patient_id: input.patient_id,
      procedure_id: input.procedure_id,
      tooth_numbers: input.tooth_numbers ?? [],
      tooth_region: input.tooth_region ?? null,
      quantity,
      fee: input.fee,
      discount,
      final_amount: finalAmount,
      priority: input.priority ?? 'normal',
      status: 'planned',
      dentist_id: user?.id ?? null,
      expected_sittings: input.expected_sittings ?? 1,
      notes: input.notes ?? null,
    })
    .select('*, procedure:procedures(id, name)')
    .single();
  if (error) {
    logError({ module: 'Treatment', operation: 'addTreatmentItem', message: error.message });
    throw error;
  }

  // Update treatment planned_value
  const { data: items } = await supabase
    .from('treatment_items')
    .select('final_amount')
    .eq('treatment_id', input.treatment_id);
  const totalPlanned = (items ?? []).reduce((s: number, i: { final_amount: number }) => s + Number(i.final_amount), 0);
  await supabase.from('treatments').update({ planned_value: totalPlanned }).eq('id', input.treatment_id);

  return data as unknown as TreatmentItem;
}

export async function deleteTreatmentItem(id: string): Promise<void> {
  const { error } = await supabase.from('treatment_items').delete().eq('id', id);
  if (error) throw error;
}

// ── Clinical Notes ────────────────────────────────────────────
export async function fetchClinicalNotes(patientId: string): Promise<ClinicalNote[]> {
  const { data, error } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as ClinicalNote[];
}

export async function createClinicalNote(input: {
  patient_id: string;
  note_type: string;
  chief_complaint?: string | null;
  examination?: string | null;
  diagnosis?: string | null;
  treatment_advised?: string | null;
  procedure_performed?: string | null;
  postop_instructions?: string | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  notes?: string | null;
}): Promise<ClinicalNote> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('clinical_notes')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      note_type: input.note_type,
      chief_complaint: input.chief_complaint ?? null,
      examination: input.examination ?? null,
      diagnosis: input.diagnosis ?? null,
      treatment_advised: input.treatment_advised ?? null,
      procedure_performed: input.procedure_performed ?? null,
      postop_instructions: input.postop_instructions ?? null,
      subjective: input.subjective ?? null,
      objective: input.objective ?? null,
      assessment: input.assessment ?? null,
      plan: input.plan ?? null,
      notes: input.notes ?? null,
      author_id: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as ClinicalNote;
}

export async function deleteClinicalNote(id: string): Promise<void> {
  const { error } = await supabase.from('clinical_notes').delete().eq('id', id);
  if (error) throw error;
}

// ── Dental Chart ──────────────────────────────────────────────
export async function fetchDentalChart(patientId: string): Promise<DentalChartCondition[]> {
  const { data, error } = await supabase
    .from('dental_chart_conditions')
    .select('*')
    .eq('patient_id', patientId)
    .order('tooth_number', { ascending: true });
  if (error) throw error;
  return data as unknown as DentalChartCondition[];
}

export async function addChartCondition(input: {
  patient_id: string;
  tooth_number: number;
  condition: string;
  surface?: string | null;
  status?: string;
  notes?: string | null;
}): Promise<DentalChartCondition> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('dental_chart_conditions')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      tooth_number: input.tooth_number,
      condition: input.condition,
      surface: input.surface ?? null,
      status: input.status ?? 'present',
      notes: input.notes ?? null,
      author_id: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as DentalChartCondition;
}

export async function deleteChartCondition(id: string): Promise<void> {
  const { error } = await supabase.from('dental_chart_conditions').delete().eq('id', id);
  if (error) throw error;
}

// ── Follow-ups ────────────────────────────────────────────────
export async function fetchFollowUps(opts?: {
  status?: string; patientId?: string;
}): Promise<FollowUp[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('follow_ups')
    .select('*, patient:patients(id, full_name, patient_number, phone)')
    .eq('clinic_id', clinicId)
    .order('due_date', { ascending: true });

  if (opts?.status) query = query.eq('status', opts.status);
  if (opts?.patientId) query = query.eq('patient_id', opts.patientId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as FollowUp[];
}

export async function createFollowUp(input: {
  patient_id: string;
  reason: string;
  due_date: string;
  priority?: string;
  notes?: string | null;
  reminder_time?: string | null;
  reminder_message?: string | null;
  reminder_1week?: boolean;
  reminder_1day?: boolean;
  reminder_sameday?: boolean;
}): Promise<FollowUp> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      reason: input.reason,
      due_date: input.due_date,
      priority: input.priority ?? 'normal',
      status: 'pending',
      notes: input.notes ?? null,
      reminder_time: input.reminder_time ?? null,
      reminder_message: input.reminder_message ?? null,
      reminder_1week: input.reminder_1week ?? false,
      reminder_1day: input.reminder_1day ?? false,
      reminder_sameday: input.reminder_sameday ?? false,
    })
    .select('*, patient:patients(id, full_name, patient_number, phone)')
    .single();
  if (error) {
    logError({ module: 'FollowUp', operation: 'createFollowUp', message: error.message });
    throw error;
  }
  return data as unknown as FollowUp;
}

export async function updateFollowUp(id: string, input: Partial<{
  status: string; outcome: string | null; notes: string | null; last_contacted_at: string | null;
  due_date: string; reason: string; priority: string;
  reminder_time: string | null; reminder_message: string | null;
  reminder_1week: boolean; reminder_1day: boolean; reminder_sameday: boolean;
}>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (input.status) update.status = input.status;
  if (input.outcome !== undefined) update.outcome = input.outcome;
  if (input.notes !== undefined) update.notes = input.notes;
  if (input.last_contacted_at !== undefined) update.last_contacted_at = input.last_contacted_at;
  if (input.due_date !== undefined) update.due_date = input.due_date;
  if (input.reason !== undefined) update.reason = input.reason;
  if (input.priority !== undefined) update.priority = input.priority;
  if (input.reminder_time !== undefined) update.reminder_time = input.reminder_time;
  if (input.reminder_message !== undefined) update.reminder_message = input.reminder_message;
  if (input.reminder_1week !== undefined) update.reminder_1week = input.reminder_1week;
  if (input.reminder_1day !== undefined) update.reminder_1day = input.reminder_1day;
  if (input.reminder_sameday !== undefined) update.reminder_sameday = input.reminder_sameday;
  if (input.status === 'contacted' || input.status === 'completed') {
    update.last_contacted_at = new Date().toISOString();
  }
  const { error } = await supabase.from('follow_ups').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteFollowUp(id: string): Promise<void> {
  const { error } = await supabase.from('follow_ups').delete().eq('id', id);
  if (error) throw error;
}

export async function rescheduleFollowUp(id: string, newDate: string): Promise<void> {
  const { error } = await supabase
    .from('follow_ups')
    .update({ due_date: newDate, status: 'pending' })
    .eq('id', id);
  if (error) throw error;
}

// ── Notifications (Phase 9) ───────────────────────────────────
export async function fetchNotifications(opts?: {
  channel?: string; status?: string; patientId?: string;
}): Promise<Notification[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('notifications')
    .select('*, patient:patients(id, full_name, patient_number)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (opts?.channel) query = query.eq('channel', opts.channel);
  if (opts?.status) query = query.eq('status', opts.status);
  if (opts?.patientId) query = query.eq('patient_id', opts.patientId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Notification[];
}

export async function createNotification(input: {
  patient_id?: string | null;
  channel: NotificationChannel;
  template_key: string;
  subject?: string | null;
  body: string;
  related_type?: string | null;
  related_id?: string | null;
}): Promise<Notification> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id ?? null,
      channel: input.channel,
      template_key: input.template_key,
      subject: input.subject ?? null,
      body: input.body,
      status: 'sent',
      sent_at: new Date().toISOString(),
      related_type: input.related_type ?? null,
      related_id: input.related_id ?? null,
    })
    .select('*, patient:patients(id, full_name, patient_number)')
    .single();
  if (error) throw error;
  return data as unknown as Notification;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

// ── Portal Access (Phase 9) ───────────────────────────────────
export async function fetchPortalAccessList(): Promise<PortalAccess[]> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('patient_portal_access')
    .select('*, patient:patients(id, full_name, patient_number, phone, email)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as PortalAccess[];
}

export async function enablePortal(patientId: string): Promise<PortalAccess> {
  const clinicId = getClinicId();

  const { data: existing } = await supabase
    .from('patient_portal_access')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('patient_portal_access')
      .update({ is_enabled: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*, patient:patients(id, full_name, patient_number, phone, email)')
      .single();
    if (error) throw error;
    return data as unknown as PortalAccess;
  }

  const { data, error } = await supabase
    .from('patient_portal_access')
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      is_enabled: true,
    })
    .select('*, patient:patients(id, full_name, patient_number, phone, email)')
    .single();
  if (error) throw error;
  return data as unknown as PortalAccess;
}

export async function disablePortal(patientId: string): Promise<void> {
  const { error } = await supabase
    .from('patient_portal_access')
    .update({ is_enabled: false, updated_at: new Date().toISOString() })
    .eq('patient_id', patientId);
  if (error) throw error;
}

export async function regenerateToken(patientId: string): Promise<string> {
  const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const { error } = await supabase
    .from('patient_portal_access')
    .update({ access_token: newToken, updated_at: new Date().toISOString() })
    .eq('patient_id', patientId);
  if (error) throw error;
  return newToken;
}
