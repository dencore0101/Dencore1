import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';
import type { InventoryItem, InventoryTransaction, InventoryCategory, InventoryTxnType, LabCase, LabWorkType, LabStage } from '@/types/inventory';

// ── Inventory Items ──────────────────────────────────────────
export async function fetchInventoryItems(opts?: { category?: string }): Promise<InventoryItem[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('inventory_items')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true });

  if (opts?.category) query = query.eq('category', opts.category);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as InventoryItem[];
}

export async function createInventoryItem(input: {
  name: string;
  category: InventoryCategory;
  unit: string;
  current_stock?: number;
  reorder_level?: number;
  cost_per_unit?: number;
  supplier?: string | null;
  notes?: string | null;
}): Promise<InventoryItem> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      clinic_id: clinicId,
      name: input.name,
      category: input.category,
      unit: input.unit,
      current_stock: input.current_stock ?? 0,
      reorder_level: input.reorder_level ?? 0,
      cost_per_unit: input.cost_per_unit ?? 0,
      supplier: input.supplier ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as InventoryItem;
}

export async function updateInventoryItem(id: string, updates: Partial<Pick<InventoryItem, 'name' | 'category' | 'unit' | 'reorder_level' | 'cost_per_unit' | 'supplier' | 'notes'>>): Promise<void> {
  const { error } = await supabase.from('inventory_items').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) throw error;
}

// ── Inventory Transactions ───────────────────────────────────
export async function fetchTransactions(itemId?: string): Promise<InventoryTransaction[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('inventory_transactions')
    .select('*, item:inventory_items(id, name, unit)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (itemId) query = query.eq('item_id', itemId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as InventoryTransaction[];
}

export async function addTransaction(input: {
  item_id: string;
  type: InventoryTxnType;
  quantity: number;
  unit_cost?: number;
  reference?: string | null;
  notes?: string | null;
}): Promise<void> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();

  // Determine stock delta: purchase/return = positive, usage = negative, adjustment = as-is
  let stockDelta = input.quantity;
  if (input.type === 'usage') stockDelta = -Math.abs(input.quantity);
  else if (input.type === 'purchase' || input.type === 'return') stockDelta = Math.abs(input.quantity);

  const { error: txnError } = await supabase.from('inventory_transactions').insert({
    clinic_id: clinicId,
    item_id: input.item_id,
    type: input.type,
    quantity: stockDelta,
    unit_cost: input.unit_cost ?? 0,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    created_by: user?.id ?? null,
  });
  if (txnError) throw txnError;

  // Update item stock
  const { data: item } = await supabase
    .from('inventory_items')
    .select('current_stock')
    .eq('id', input.item_id)
    .single();

  if (item) {
    const newStock = Number(item.current_stock) + stockDelta;
    await supabase.from('inventory_items').update({ current_stock: Math.max(0, newStock) }).eq('id', input.item_id);
  }
}

// ── Lab Cases ────────────────────────────────────────────────
export async function fetchLabCases(opts?: { stage?: string; patientId?: string }): Promise<LabCase[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('lab_cases')
    .select('*, patient:patients(id, full_name, patient_number)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (opts?.stage) query = query.eq('stage', opts.stage);
  if (opts?.patientId) query = query.eq('patient_id', opts.patientId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as LabCase[];
}

export async function fetchLabCasesByPatient(patientId: string): Promise<LabCase[]> {
  const { data, error } = await supabase
    .from('lab_cases')
    .select('*, patient:patients(id, full_name, patient_number)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as LabCase[];
}

export async function createLabCase(input: {
  patient_id: string;
  treatment_id?: string | null;
  lab_name: string;
  work_type: LabWorkType;
  due_date?: string | null;
  cost?: number;
  notes?: string | null;
}): Promise<LabCase> {
  const clinicId = getClinicId();
  const { data: numData, error: numError } = await supabase.rpc('next_lab_case_number', { p_clinic_id: clinicId });
  if (numError) throw numError;

  const { data, error } = await supabase
    .from('lab_cases')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      treatment_id: input.treatment_id ?? null,
      case_number: numData as string,
      lab_name: input.lab_name,
      work_type: input.work_type,
      stage: 'sent',
      sent_date: new Date().toISOString().split('T')[0],
      due_date: input.due_date ?? null,
      cost: input.cost ?? 0,
      notes: input.notes ?? null,
    })
    .select('*, patient:patients(id, full_name, patient_number)')
    .single();
  if (error) throw error;
  return data as unknown as LabCase;
}

export async function updateLabStage(id: string, stage: LabStage): Promise<void> {
  const updates: Record<string, unknown> = { stage };
  if (stage === 'received') updates.received_date = new Date().toISOString().split('T')[0];

  const { error } = await supabase.from('lab_cases').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteLabCase(id: string): Promise<void> {
  const { error } = await supabase.from('lab_cases').delete().eq('id', id);
  if (error) throw error;
}
