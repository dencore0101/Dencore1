import { supabase } from '@/lib/supabase';
import type { Invoice, Payment, InvoiceStatus, PaymentMethod } from '@/types/billing';
import { calculateInvoiceTotals as calcTotals, calculateLineTotal, calculatePaymentAllocation } from '@/lib/finance';
import { getClinicId } from '@/lib/clinic';
import { logError } from '@/lib/errorLogger';

// ── Invoices ─────────────────────────────────────────────────
export async function fetchInvoices(opts?: {
  patientId?: string; status?: string;
}): Promise<Invoice[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('invoices')
    .select('*, patient:patients(id, full_name, patient_number)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (opts?.patientId) query = query.eq('patient_id', opts.patientId);
  if (opts?.status) query = query.eq('status', opts.status);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Invoice[];
}

export async function fetchInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*), patient:patients(id, full_name, patient_number)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Invoice | null;
}

export async function fetchInvoicesByPatient(patientId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*), patient:patients(id, full_name, patient_number)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Invoice[];
}

export interface InvoiceItemInput {
  description: string;
  quantity?: number;
  unit_price: number;
  discount?: number;
  procedure_id?: string | null;
  treatment_item_id?: string | null;
}

export async function createInvoice(input: {
  patient_id: string;
  treatment_id?: string | null;
  items: InvoiceItemInput[];
  tax_rate?: number;
  discount?: number;
  notes?: string | null;
  due_date?: string | null;
  status?: InvoiceStatus;
}): Promise<Invoice> {
  const clinicId = getClinicId();
  const { data: numData, error: numError } = await supabase.rpc('next_invoice_number', { p_clinic_id: clinicId });
  if (numError) {
    logError({ module: 'Billing', operation: 'createInvoice_number', message: numError.message, severity: 'critical' });
    throw numError;
  }

  const taxRate = input.tax_rate ?? 0;
  const globalDiscount = input.discount ?? 0;
  const totals = calcTotals(
    input.items.map((i) => ({ quantity: i.quantity ?? 1, unit_price: i.unit_price, discount: i.discount ?? 0 })),
    taxRate,
    globalDiscount,
  );

  const { data: invoiceData, error: invError } = await supabase
    .from('invoices')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      treatment_id: input.treatment_id ?? null,
      invoice_number: numData as string,
      status: input.status ?? 'draft',
      subtotal: totals.subtotal,
      tax_rate: taxRate,
      tax_amount: totals.tax_amount,
      discount: globalDiscount,
      total: totals.total,
      amount_paid: 0,
      balance: totals.total,
      notes: input.notes ?? null,
      due_date: input.due_date ?? null,
      issued_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (invError) {
    logError({ module: 'Billing', operation: 'createInvoice', message: invError.message, severity: 'critical' });
    throw invError;
  }

  const invoice = invoiceData as Invoice;

  if (input.items.length > 0) {
    const itemRows = input.items.map((item) => ({
      clinic_id: clinicId,
      invoice_id: invoice.id,
      patient_id: input.patient_id,
      description: item.description,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price,
      discount: item.discount ?? 0,
      total: calculateLineTotal(item.unit_price, item.quantity ?? 1, item.discount ?? 0),
      procedure_id: item.procedure_id ?? null,
      treatment_item_id: item.treatment_item_id ?? null,
    }));
    const { error: itemError } = await supabase.from('invoice_items').insert(itemRows);
    if (itemError) {
      logError({ module: 'Billing', operation: 'createInvoice_items', message: itemError.message, severity: 'critical' });
      throw itemError;
    }
  }

  return invoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

// ── Payments ──────────────────────────────────────────────────
export async function fetchPayments(opts?: {
  patientId?: string; status?: string;
}): Promise<Payment[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('payments')
    .select('*, patient:patients(id, full_name, patient_number), invoice:invoices(id, invoice_number)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (opts?.patientId) query = query.eq('patient_id', opts.patientId);
  if (opts?.status) query = query.eq('status', opts.status);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Payment[];
}

export async function fetchPaymentsByPatient(patientId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, patient:patients(id, full_name, patient_number), invoice:invoices(id, invoice_number)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Payment[];
}

export async function createPayment(input: {
  patient_id: string;
  invoice_id?: string | null;
  amount: number;
  method?: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  status?: string;
}): Promise<Payment> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: numData, error: numError } = await supabase.rpc('next_payment_number', { p_clinic_id: clinicId });
  if (numError) {
    logError({ module: 'Billing', operation: 'createPayment_number', message: numError.message, severity: 'critical' });
    throw numError;
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      invoice_id: input.invoice_id ?? null,
      payment_number: numData as string,
      amount: input.amount,
      method: input.method ?? 'cash',
      reference: input.reference ?? null,
      status: input.status ?? 'completed',
      notes: input.notes ?? null,
      received_by: user?.id ?? null,
    })
    .select('*, patient:patients(id, full_name, patient_number), invoice:invoices(id, invoice_number)')
    .single();
  if (error) {
    logError({ module: 'Billing', operation: 'createPayment', message: error.message, severity: 'critical' });
    throw error;
  }

  const payment = data as unknown as Payment;

  // If linked to an invoice, update the invoice's amount_paid and balance
  if (input.invoice_id && payment.status === 'completed') {
    const { data: inv, error: invError } = await supabase
      .from('invoices')
      .select('total, amount_paid, balance, status')
      .eq('id', input.invoice_id)
      .single();
    if (invError) {
      logError({ module: 'Billing', operation: 'createPayment_invoiceLookup', message: invError.message, severity: 'critical' });
      throw invError;
    }

    const allocation = calculatePaymentAllocation(Number(inv.amount_paid), Number(inv.total), input.amount);

    const newStatus = allocation.newBalance <= 0 ? 'paid' : allocation.newAmountPaid > 0 ? 'partially_paid' : (inv as unknown as { status: string }).status;

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ amount_paid: allocation.newAmountPaid, balance: allocation.newBalance, status: newStatus })
      .eq('id', input.invoice_id);
    if (updateError) {
      logError({ module: 'Billing', operation: 'createPayment_invoiceUpdate', message: updateError.message, severity: 'critical' });
      throw updateError;
    }

    // Record the allocation
    if (allocation.allocatedAmount > 0) {
      const { error: allocError } = await supabase
        .from('payment_allocations')
        .insert({
          clinic_id: clinicId,
          payment_id: payment.id,
          invoice_id: input.invoice_id,
          amount: allocation.allocatedAmount,
        });
      if (allocError) {
        logError({ module: 'Billing', operation: 'createPayment_allocation', message: allocError.message });
        throw allocError;
      }
    }

    // Excess payment is not silently discarded — it stays on the payment record
    // and the patient's overall balance can be seen via fetchOutstandingBalance
  }

  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

// ── Outstanding ──────────────────────────────────────────────
export async function fetchOutstandingBalance(patientId: string): Promise<number> {
  const { data, error } = await supabase
    .from('invoices')
    .select('balance')
    .eq('patient_id', patientId)
    .neq('status', 'cancelled')
    .neq('status', 'draft');
  if (error) throw error;
  return (data ?? []).reduce((sum: number, inv: { balance: number }) => sum + Number(inv.balance), 0);
}

export async function fetchClinicOutstanding(): Promise<{ patient_id: string; patient_name: string; patient_number: string; total_outstanding: number }[]> {
  const clinicId = getClinicId();
  const { data, error } = await supabase
    .from('invoices')
    .select('patient_id, balance, patient:patients(id, full_name, patient_number)')
    .eq('clinic_id', clinicId)
    .neq('status', 'cancelled')
    .neq('status', 'draft')
    .gt('balance', 0);
  if (error) throw error;

  const byPatient: Record<string, { patient_name: string; patient_number: string; total_outstanding: number }> = {};
  for (const inv of (data ?? []) as unknown as { patient_id: string; balance: number; patient: { full_name: string; patient_number: string } }[]) {
    if (!byPatient[inv.patient_id]) {
      byPatient[inv.patient_id] = {
        patient_name: inv.patient?.full_name ?? 'Unknown',
        patient_number: inv.patient?.patient_number ?? '—',
        total_outstanding: 0,
      };
    }
    byPatient[inv.patient_id].total_outstanding += Number(inv.balance);
  }

  return Object.entries(byPatient).map(([patient_id, v]) => ({ patient_id, ...v }));
}
