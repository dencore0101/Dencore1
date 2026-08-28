import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';
import type { Expense, ExpenseCategory, ExpensePaymentMethod } from '@/types/expense';

export async function fetchExpenses(opts?: {
  category?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Expense[]> {
  const clinicId = getClinicId();
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('expense_date', { ascending: false });

  if (opts?.category) query = query.eq('category', opts.category);
  if (opts?.startDate) query = query.gte('expense_date', opts.startDate);
  if (opts?.endDate) query = query.lte('expense_date', opts.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Expense[];
}

export async function createExpense(input: {
  description: string;
  category: ExpenseCategory;
  amount: number;
  expense_date?: string;
  vendor?: string | null;
  payment_method?: ExpensePaymentMethod;
  is_recurring?: boolean;
  notes?: string | null;
}): Promise<Expense> {
  const clinicId = getClinicId();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      clinic_id: clinicId,
      description: input.description,
      category: input.category,
      amount: input.amount,
      expense_date: input.expense_date ?? new Date().toISOString().split('T')[0],
      vendor: input.vendor ?? null,
      payment_method: input.payment_method ?? 'cash',
      is_recurring: input.is_recurring ?? false,
      notes: input.notes ?? null,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Expense;
}

export async function updateExpense(id: string, updates: Partial<Pick<Expense, 'description' | 'category' | 'amount' | 'expense_date' | 'vendor' | 'payment_method' | 'is_recurring' | 'notes'>>): Promise<void> {
  const { error } = await supabase.from('expenses').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}
