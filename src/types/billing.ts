export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';

export interface InvoiceItem {
  id: string;
  clinic_id: string;
  invoice_id: string;
  patient_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  treatment_item_id: string | null;
  procedure_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  notes: string | null;
  due_date: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  patient?: { id: string; full_name: string; patient_number: string } | null;
}

export interface Payment {
  id: string;
  clinic_id: string;
  patient_id: string;
  invoice_id: string | null;
  payment_number: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  notes: string | null;
  received_by: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string; patient_number: string } | null;
  invoice?: { id: string; invoice_number: string } | null;
}

export interface PaymentAllocation {
  id: string;
  clinic_id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  created_at: string;
}
