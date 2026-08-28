import { useState, FormEvent, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { createPayment, fetchInvoicesByPatient } from '@/services/billing.service';
import type { Payment, Invoice } from '@/types/billing';
import { PAYMENT_METHOD_OPTIONS, formatCurrency } from '@/constants/billing';

interface PaymentFormModalProps {
  onClose: () => void;
  onSaved: (payment: Payment) => void;
  defaultPatientId?: string | null;
  defaultInvoiceId?: string | null;
}

export default function PaymentFormModal({
  onClose, onSaved, defaultPatientId, defaultInvoiceId,
}: PaymentFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [form, setForm] = useState({
    patient_id: defaultPatientId ?? '',
    invoice_id: defaultInvoiceId ?? '',
    amount: 0,
    method: 'cash' as string,
    reference: '',
    notes: '',
  });

  useEffect(() => {
    if (form.patient_id) {
      fetchInvoicesByPatient(form.patient_id).then((invs) => {
        setInvoices(invs.filter((i) => i.balance > 0 && i.status !== 'cancelled' && i.status !== 'draft'));
      }).catch(() => setInvoices([]));
    }
  }, [form.patient_id]);

  const selectedInvoice = invoices.find((i) => i.id === form.invoice_id);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || form.amount <= 0) {
      setError('Patient and amount are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payment = await createPayment({
        patient_id: form.patient_id,
        invoice_id: form.invoice_id || null,
        amount: form.amount,
        method: form.method as Payment['method'],
        reference: form.reference || null,
        notes: form.notes || null,
      });
      onSaved(payment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Record Payment"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.patient_id || form.amount <= 0} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
            {error}
          </div>
        )}

        {selectedInvoice && (
          <div className="rounded-lg bg-primary-50 border border-primary-200 px-3 py-2 text-sm text-primary-700">
            Invoice {selectedInvoice.invoice_number} — Balance: {formatCurrency(Number(selectedInvoice.balance))}
          </div>
        )}

        <div>
          <label className="label">Allocate to Invoice (optional)</label>
          <select
            className="input"
            value={form.invoice_id}
            onChange={(e) => {
              setForm((f) => ({ ...f, invoice_id: e.target.value }));
              const inv = invoices.find((i) => i.id === e.target.value);
              if (inv) setForm((f) => ({ ...f, amount: Number(inv.balance) }));
            }}
          >
            <option value="">No specific invoice (unallocated)</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} — Balance: {formatCurrency(Number(inv.balance))}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Amount (₹) <span className="text-error-500">*</span></label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Method</label>
            <select className="input" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input className="input" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Txn ID, Cheque no..." />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </form>
    </Modal>
  );
}
