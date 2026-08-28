import type { InvoiceStatus, PaymentMethod, PaymentStatus } from '@/types/billing';

export const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'neutral' },
  { value: 'sent', label: 'Sent', color: 'primary' },
  { value: 'paid', label: 'Paid', color: 'success' },
  { value: 'partially_paid', label: 'Partially Paid', color: 'warning' },
  { value: 'overdue', label: 'Overdue', color: 'error' },
  { value: 'cancelled', label: 'Cancelled', color: 'neutral' },
];

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'failed', label: 'Failed', color: 'error' },
  { value: 'refunded', label: 'Refunded', color: 'neutral' },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateInvoiceTotals(items: { quantity: number; unit_price: number; discount: number }[], taxRate: number, globalDiscount: number) {
  const subtotal = items.reduce((sum, i) => sum + Math.max(0, i.unit_price * i.quantity - i.discount), 0);
  const afterDiscount = Math.max(0, subtotal - globalDiscount);
  const taxAmount = Math.round(afterDiscount * (taxRate / 100) * 100) / 100;
  const total = afterDiscount + taxAmount;
  return { subtotal, tax_amount: taxAmount, total };
}
