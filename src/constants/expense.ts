import type { ExpenseCategory, ExpensePaymentMethod } from '@/types/expense';

export const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: 'rent', label: 'Rent', color: 'primary' },
  { value: 'utilities', label: 'Utilities', color: 'secondary' },
  { value: 'supplies', label: 'Supplies', color: 'accent' },
  { value: 'salary', label: 'Salary', color: 'success' },
  { value: 'equipment', label: 'Equipment', color: 'warning' },
  { value: 'maintenance', label: 'Maintenance', color: 'neutral' },
  { value: 'marketing', label: 'Marketing', color: 'primary' },
  { value: 'lab', label: 'Lab', color: 'secondary' },
  { value: 'other', label: 'Other', color: 'neutral' },
];

export const EXPENSE_PAYMENT_METHOD_OPTIONS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
