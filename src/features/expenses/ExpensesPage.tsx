import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Loader2, Trash2, RefreshCw } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { fetchExpenses, createExpense, deleteExpense } from '@/services/expense.service';
import type { Expense, ExpenseCategory, ExpensePaymentMethod } from '@/types/expense';
import { EXPENSE_CATEGORY_OPTIONS, EXPENSE_PAYMENT_METHOD_OPTIONS, formatCurrency } from '@/constants/expense';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses(categoryFilter ? { category: categoryFilter } : undefined);
      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try { await deleteExpense(id); await load(); } catch { /* ignore */ }
  };

  const totalThisMonth = expenses
    .filter((e) => {
      const now = new Date();
      const expDate = new Date(e.expense_date);
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = EXPENSE_CATEGORY_OPTIONS.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0),
  })).filter((c) => c.total > 0);

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Expenses"
          subtitle="Track clinic operating expenses"
          actions={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="h-4 w-4" />Add Expense</button>}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">This Month</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{formatCurrency(totalThisMonth)}</p>
          </div>
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Total Entries</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{expenses.length}</p>
          </div>
        </div>

        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="card mb-6">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">By Category</h3>
            </div>
            <div className="p-4 space-y-2">
              {byCategory.map((cat) => {
                const maxTotal = Math.max(...byCategory.map((c) => c.total));
                const pct = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0;
                return (
                  <div key={cat.value} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-600 w-24 flex-shrink-0">{cat.label}</span>
                    <div className="flex-1 h-6 bg-neutral-100 rounded-md overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-md transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium text-neutral-900 w-28 text-right">{formatCurrency(cat.total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expense list */}
        <div className="card">
          <div className="p-4 border-b border-neutral-200">
            <select className="input max-w-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {loading ? (
            <LoadingState label="Loading expenses..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : expenses.length === 0 ? (
            <EmptyState icon={<Receipt className="h-7 w-7" />} title="No expenses found" description="Add an expense to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Description</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Category</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Vendor</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {expenses.map((exp) => {
                    const catOpt = EXPENSE_CATEGORY_OPTIONS.find((c) => c.value === exp.category);
                    return (
                      <tr key={exp.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-neutral-900">{exp.description}</p>
                          {exp.is_recurring && <span className="inline-flex items-center gap-0.5 text-xs text-primary-600 mt-0.5"><RefreshCw className="h-3 w-3" />Recurring</span>}
                        </td>
                        <td className="px-4 py-3">{catOpt && <StatusBadge color={catOpt.color as 'primary'}>{catOpt.label}</StatusBadge>}</td>
                        <td className="px-4 py-3 text-sm text-neutral-500">{new Date(exp.expense_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">{exp.vendor ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{formatCurrency(Number(exp.amount))}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDelete(exp.id)} className="text-neutral-300 hover:text-error-600"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ExpenseFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </AppShell>
  );
}

// ── Expense Form Modal ───────────────────────────────────────
function ExpenseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '', category: 'other' as ExpenseCategory, amount: 0,
    expense_date: new Date().toISOString().split('T')[0], vendor: '',
    payment_method: 'cash' as ExpensePaymentMethod, is_recurring: false, notes: '',
  });

  const handleSubmit = async () => {
    if (!form.description.trim() || form.amount <= 0) { setError('Description and amount are required'); return; }
    setSaving(true); setError(null);
    try {
      await createExpense({
        description: form.description.trim(), category: form.category, amount: form.amount,
        expense_date: form.expense_date, vendor: form.vendor || null,
        payment_method: form.payment_method, is_recurring: form.is_recurring, notes: form.notes || null,
      });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Expense"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !form.description.trim() || form.amount <= 0} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}</button></>}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>}
        <div><label className="label">Description <span className="text-error-500">*</span></label><input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} autoFocus /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}>{EXPENSE_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="label">Amount (₹) <span className="text-error-500">*</span></label><input type="number" min={0} step="0.01" className="input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Date</label><input type="date" className="input" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} /></div>
          <div><label className="label">Payment Method</label><select className="input" value={form.payment_method} onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value as ExpensePaymentMethod }))}>{EXPENSE_PAYMENT_METHOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
        </div>
        <div><label className="label">Vendor</label><input className="input" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} /></div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
          <label htmlFor="recurring" className="text-sm text-neutral-700">Recurring expense</label>
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
      </div>
    </Modal>
  );
}
