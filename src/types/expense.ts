export type ExpenseCategory = 'rent' | 'utilities' | 'supplies' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'lab' | 'other';
export type ExpensePaymentMethod = 'cash' | 'bank' | 'card' | 'upi' | 'cheque' | 'other';

export interface Expense {
  id: string;
  clinic_id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  vendor: string | null;
  payment_method: ExpensePaymentMethod;
  is_recurring: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
