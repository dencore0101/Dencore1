import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Loader2, Trash2, Receipt } from 'lucide-react';
import { fetchInvoicesByPatient, fetchPaymentsByPatient, deleteInvoice, deletePayment, fetchOutstandingBalance } from '@/services/billing.service';
import type { Invoice, Payment } from '@/types/billing';
import { INVOICE_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS, formatCurrency } from '@/constants/billing';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { fetchProcedures } from '@/services/clinical.service';
import type { Procedure } from '@/types/clinical';
import { createInvoice, createPayment, type InvoiceItemInput } from '@/services/billing.service';
import { calculateInvoiceTotals } from '@/constants/billing';

interface BillingTabProps {
  patientId: string;
}

export default function BillingTab({ patientId }: BillingTabProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invs, pays, outst] = await Promise.all([
        fetchInvoicesByPatient(patientId),
        fetchPaymentsByPatient(patientId),
        fetchOutstandingBalance(patientId),
      ]);
      setInvoices(invs);
      setPayments(pays);
      setOutstanding(outst);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteInvoice(id);
      await load();
    } catch {
      // ignore
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePayment(id);
      await load();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="card card-pad flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card card-pad">
          <p className="text-xs font-medium text-neutral-400 uppercase">Total Billed</p>
          <p className="text-xl font-semibold text-neutral-900 mt-1">
            {formatCurrency(invoices.reduce((s, i) => s + Number(i.total), 0))}
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-xs font-medium text-neutral-400 uppercase">Total Paid</p>
          <p className="text-xl font-semibold text-success-600 mt-1">
            {formatCurrency(payments.filter((p) => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0))}
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-xs font-medium text-neutral-400 uppercase">Outstanding</p>
          <p className="text-xl font-semibold text-error-600 mt-1">{formatCurrency(outstanding)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button onClick={() => setShowInvoiceForm(true)} className="btn-secondary">
          <FileText className="h-4 w-4" />
          New Invoice
        </button>
        <button onClick={() => setShowPaymentForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      {/* Invoices */}
      <div className="card">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900">Invoices</h3>
        </div>
        {invoices.length === 0 ? (
          <EmptyState icon={<Receipt className="h-7 w-7" />} title="No invoices" description="Create an invoice for this patient." />
        ) : (
          <div className="divide-y divide-neutral-100">
            {invoices.map((inv) => {
              const statusOpt = INVOICE_STATUS_OPTIONS.find((s) => s.value === inv.status);
              const isExpanded = expanded.has(inv.id);
              return (
                <div key={inv.id}>
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"
                    onClick={() => toggleExpand(inv.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{inv.invoice_number}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(inv.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{inv.items?.length ?? 0} item{(inv.items?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-neutral-900">{formatCurrency(Number(inv.total))}</p>
                        {Number(inv.balance) > 0 && (
                          <p className="text-xs text-error-600">Balance: {formatCurrency(Number(inv.balance))}</p>
                        )}
                      </div>
                      {statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv.id); }}
                        className="text-neutral-300 hover:text-error-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (inv.items ?? []).length > 0 && (
                    <div className="border-t border-neutral-100 bg-neutral-50 p-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-neutral-400 uppercase">
                            <th className="text-left py-1 px-2">Description</th>
                            <th className="text-right py-1 px-2">Qty</th>
                            <th className="text-right py-1 px-2">Price</th>
                            <th className="text-right py-1 px-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(inv.items ?? []).map((item) => (
                            <tr key={item.id} className="border-t border-neutral-100">
                              <td className="py-1.5 px-2 text-neutral-700">{item.description}</td>
                              <td className="py-1.5 px-2 text-right text-neutral-600">{item.quantity}</td>
                              <td className="py-1.5 px-2 text-right text-neutral-600">{formatCurrency(Number(item.unit_price))}</td>
                              <td className="py-1.5 px-2 text-right font-medium text-neutral-900">{formatCurrency(Number(item.total))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-end gap-6 mt-2 text-xs">
                        <span className="text-neutral-500">Subtotal: {formatCurrency(Number(inv.subtotal))}</span>
                        {Number(inv.tax_amount) > 0 && <span className="text-neutral-500">Tax: {formatCurrency(Number(inv.tax_amount))}</span>}
                        {Number(inv.discount) > 0 && <span className="text-neutral-500">Discount: -{formatCurrency(Number(inv.discount))}</span>}
                        <span className="font-semibold text-neutral-900">Total: {formatCurrency(Number(inv.total))}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="card">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900">Payments</h3>
        </div>
        {payments.length === 0 ? (
          <EmptyState icon={<Receipt className="h-7 w-7" />} title="No payments" description="Record a payment for this patient." />
        ) : (
          <div className="divide-y divide-neutral-100">
            {payments.map((p) => {
              const methodOpt = PAYMENT_METHOD_OPTIONS.find((m) => m.value === p.method);
              const statusOpt = PAYMENT_STATUS_OPTIONS.find((s) => s.value === p.status);
              return (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{p.payment_number}</p>
                    <p className="text-xs text-neutral-400">
                      {methodOpt?.label ?? p.method}
                      {p.reference && ` · ${p.reference}`}
                      {' · '}{new Date(p.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-neutral-900">{formatCurrency(Number(p.amount))}</span>
                    {statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}
                    <button onClick={() => handleDeletePayment(p.id)} className="text-neutral-300 hover:text-error-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showInvoiceForm && (
        <InvoiceFormModal
          patientId={patientId}
          onClose={() => setShowInvoiceForm(false)}
          onSaved={() => { setShowInvoiceForm(false); load(); }}
        />
      )}
      {showPaymentForm && (
        <PaymentFormModalInline
          patientId={patientId}
          onClose={() => setShowPaymentForm(false)}
          onSaved={() => { setShowPaymentForm(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Invoice Form Modal ───────────────────────────────────────
function InvoiceFormModal({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [items, setItems] = useState<InvoiceItemInput[]>([{ description: '', quantity: 1, unit_price: 0, discount: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchProcedures().then(setProcedures).catch(() => {});
  }, []);

  const totals = calculateInvoiceTotals(
    items.map((i) => ({ quantity: i.quantity ?? 1, unit_price: i.unit_price, discount: i.discount ?? 0 })),
    taxRate, globalDiscount,
  );

  const updateItem = (idx: number, field: keyof InvoiceItemInput, value: string | number | null) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, discount: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
      setError('Add at least one item');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createInvoice({
        patient_id: patientId,
        items: items.filter((i) => i.description.trim()),
        tax_rate: taxRate,
        discount: globalDiscount,
        notes: notes || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="New Invoice"
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Invoice'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>
        )}

        {/* Items */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                <input
                  className="input"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    updateItem(idx, 'description', e.target.value);
                    const proc = procedures.find((p) => p.name === e.target.value);
                    if (proc) updateItem(idx, 'unit_price', proc.default_fee);
                  }}
                  list="procedures"
                />
                <datalist id="procedures">
                  {procedures.map((p) => <option key={p.id} value={p.name}>{p.name} — ₹{p.default_fee}</option>)}
                </datalist>
              </div>
              <div className="col-span-2">
                <input type="number" min={1} className="input" placeholder="Qty" value={item.quantity ?? 1}
                  onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
              </div>
              <div className="col-span-2">
                <input type="number" min={0} step="0.01" className="input" placeholder="Price" value={item.unit_price}
                  onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="col-span-2">
                <input type="number" min={0} step="0.01" className="input" placeholder="Disc" value={item.discount ?? 0}
                  onChange={(e) => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="col-span-1 flex items-center justify-center pt-1">
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-neutral-300 hover:text-error-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button onClick={addItem} className="btn-secondary text-xs">
            <Plus className="h-3 w-3" />
            Add Item
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Tax Rate (%)</label>
            <input type="number" min={0} step="0.01" className="input" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Global Discount (₹)</label>
            <input type="number" min={0} className="input" value={globalDiscount} onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg bg-neutral-50 border border-neutral-200 p-3">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
              {totals.tax_amount > 0 && <div className="flex justify-between text-sm"><span className="text-neutral-500">Tax</span><span>{formatCurrency(totals.tax_amount)}</span></div>}
              <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-neutral-200"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// ── Inline Payment Form ──────────────────────────────────────
function PaymentFormModalInline({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [form, setForm] = useState({ invoice_id: '', amount: 0, method: 'cash', reference: '', notes: '' });

  useEffect(() => {
    fetchInvoicesByPatient(patientId).then((invs) => {
      setInvoices(invs.filter((i) => i.balance > 0 && i.status !== 'cancelled' && i.status !== 'draft'));
    }).catch(() => {});
  }, [patientId]);

  const handleSubmit = async () => {
    if (form.amount <= 0) { setError('Amount required'); return; }
    setSaving(true);
    setError(null);
    try {
      await createPayment({
        patient_id: patientId,
        invoice_id: form.invoice_id || null,
        amount: form.amount,
        method: form.method as 'cash',
        reference: form.reference || null,
        notes: form.notes || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
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
          <button onClick={handleSubmit} disabled={saving || form.amount <= 0} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>}
        <div>
          <label className="label">Allocate to Invoice (optional)</label>
          <select className="input" value={form.invoice_id} onChange={(e) => {
            setForm((f) => ({ ...f, invoice_id: e.target.value }));
            const inv = invoices.find((i) => i.id === e.target.value);
            if (inv) setForm((f) => ({ ...f, amount: Number(inv.balance) }));
          }}>
            <option value="">Unallocated</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.invoice_number} — Balance: {formatCurrency(Number(inv.balance))}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Amount (₹) <span className="text-error-500">*</span></label>
          <input type="number" min={0} step="0.01" className="input" value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Method</label>
            <select className="input" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
              {PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input className="input" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}
