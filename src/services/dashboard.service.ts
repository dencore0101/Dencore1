import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';

export interface DashboardStats {
  todayRevenue: number;
  monthRevenue: number;
  activePatients: number;
  todayAppointments: number;
  pendingInvoices: number;
  outstandingBalance: number;
  monthExpenses: number;
  netProfit: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const clinicId = getClinicId();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  // Fetch payments for today and this month
  const { data: todayPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('clinic_id', clinicId)
    .eq('status', 'completed')
    .gte('created_at', today + 'T00:00:00')
    .lte('created_at', today + 'T23:59:59');

  const { data: monthPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('clinic_id', clinicId)
    .eq('status', 'completed')
    .gte('created_at', monthStart + 'T00:00:00');

  const todayRevenue = (todayPayments ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);
  const monthRevenue = (monthPayments ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);

  // Active patients count
  const { count: activePatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId);

  // Today's appointments — use start_time, not appointment_date
  const todayStart = today + 'T00:00:00';
  const todayEnd = today + 'T23:59:59';
  const { count: todayAppointments } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .neq('status', 'cancelled');

  // Pending invoices
  const { count: pendingInvoices } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .in('status', ['sent', 'partially_paid', 'overdue']);

  // Outstanding balance
  const { data: outstandingData } = await supabase
    .from('invoices')
    .select('balance')
    .eq('clinic_id', clinicId)
    .neq('status', 'cancelled')
    .neq('status', 'draft')
    .gt('balance', 0);

  const outstandingBalance = (outstandingData ?? []).reduce((s: number, inv: { balance: number }) => s + Number(inv.balance), 0);

  // This month's expenses
  const { data: monthExpensesData } = await supabase
    .from('expenses')
    .select('amount')
    .eq('clinic_id', clinicId)
    .gte('expense_date', monthStart);

  const monthExpenses = (monthExpensesData ?? []).reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);

  return {
    todayRevenue,
    monthRevenue,
    activePatients: activePatients ?? 0,
    todayAppointments: todayAppointments ?? 0,
    pendingInvoices: pendingInvoices ?? 0,
    outstandingBalance,
    monthExpenses,
    netProfit: monthRevenue - monthExpenses,
  };
}

export interface RevenueExpensePoint {
  date: string;
  revenue: number;
  expenses: number;
}

export async function fetchMonthlyTrend(): Promise<RevenueExpensePoint[]> {
  const clinicId = getClinicId();
  const now = new Date();
  const months: RevenueExpensePoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const monthLabel = start.toLocaleDateString('en-US', { month: 'short' });

    const { data: payData } = await supabase
      .from('payments')
      .select('amount')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .gte('created_at', startStr + 'T00:00:00')
      .lte('created_at', endStr + 'T23:59:59');

    const { data: expData } = await supabase
      .from('expenses')
      .select('amount')
      .eq('clinic_id', clinicId)
      .gte('expense_date', startStr)
      .lte('expense_date', endStr);

    const revenue = (payData ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);
    const expenses = (expData ?? []).reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);

    months.push({ date: monthLabel, revenue, expenses });
  }

  return months;
}

export interface RecentActivity {
  id: string;
  type: 'payment' | 'invoice' | 'appointment' | 'patient';
  description: string;
  amount?: number;
  created_at: string;
}

export async function fetchRecentActivity(): Promise<RecentActivity[]> {
  const clinicId = getClinicId();

  const [payments, invoices, appointments, patients] = await Promise.all([
    supabase.from('payments').select('id, amount, created_at, patient:patients(full_name)').eq('clinic_id', clinicId).eq('status', 'completed').order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('id, invoice_number, total, created_at, patient:patients(full_name)').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(5),
    supabase.from('appointments').select('id, start_time, patient:patients(full_name)').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(5),
    supabase.from('patients').select('id, full_name, patient_number, created_at').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(5),
  ]);

  const activities: RecentActivity[] = [];

  for (const p of (payments.data ?? []) as unknown as { id: string; amount: number; created_at: string; patient: { full_name: string } | null }[]) {
    activities.push({ id: p.id, type: 'payment', description: `Payment from ${p.patient?.full_name ?? '—'}`, amount: Number(p.amount), created_at: p.created_at });
  }
  for (const inv of (invoices.data ?? []) as unknown as { id: string; invoice_number: string; total: number; created_at: string; patient: { full_name: string } | null }[]) {
    activities.push({ id: inv.id, type: 'invoice', description: `Invoice ${inv.invoice_number} for ${inv.patient?.full_name ?? '—'}`, amount: Number(inv.total), created_at: inv.created_at });
  }
  for (const appt of (appointments.data ?? []) as unknown as { id: string; start_time: string; patient: { full_name: string } | null }[]) {
    activities.push({ id: appt.id, type: 'appointment', description: `Appointment: ${appt.patient?.full_name ?? '—'}`, created_at: appt.start_time });
  }
  for (const pat of (patients.data ?? []) as unknown as { id: string; full_name: string; patient_number: string; created_at: string }[]) {
    activities.push({ id: pat.id, type: 'patient', description: `New patient: ${pat.full_name} (${pat.patient_number})`, created_at: pat.created_at });
  }

  return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
}
