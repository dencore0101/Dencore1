import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import { fetchPayments, fetchClinicOutstanding } from '@/services/billing.service';
import type { Payment } from '@/types/billing';
import { PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS, formatCurrency } from '@/constants/billing';
import PaymentFormModal from './PaymentFormModal';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstanding, setOutstanding] = useState<{ patient_id: string; patient_name: string; patient_number: string; total_outstanding: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'outstanding'>('payments');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pays, outst] = await Promise.all([
        fetchPayments(statusFilter ? { status: statusFilter } : undefined),
        fetchClinicOutstanding(),
      ]);
      setPayments(pays);
      setOutstanding(outst);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Payments"
          subtitle="Record and track patient payments"
          actions={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Record Payment
            </button>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Total Collected</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">
              {formatCurrency(payments.filter((p) => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0))}
            </p>
          </div>
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Outstanding</p>
            <p className="text-2xl font-semibold text-error-600 mt-1">
              {formatCurrency(outstanding.reduce((s, o) => s + o.total_outstanding, 0))}
            </p>
          </div>
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Patients with Dues</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{outstanding.length}</p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 mb-4 w-fit">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'payments' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
          >
            Payments
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'outstanding' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
          >
            Outstanding
          </button>
        </div>

        {activeTab === 'payments' && (
          <div className="card">
            <div className="p-4 border-b border-neutral-200">
              <select className="input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {PAYMENT_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <LoadingState label="Loading payments..." />
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-7 w-7" />}
                title="No payments found"
                description="Record a payment to get started."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Payment #</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Patient</th>
                      <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Amount</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Method</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {payments.map((p) => {
                      const methodOpt = PAYMENT_METHOD_OPTIONS.find((m) => m.value === p.method);
                      const statusOpt = PAYMENT_STATUS_OPTIONS.find((s) => s.value === p.status);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => navigate(`/app/patients/${p.patient_id}`)}
                          className="hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3"><span className="text-sm font-mono text-neutral-600">{p.payment_number}</span></td>
                          <td className="px-4 py-3"><span className="text-sm font-medium text-neutral-900">{p.patient?.full_name ?? '—'}</span></td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-neutral-900">{formatCurrency(Number(p.amount))}</td>
                          <td className="px-4 py-3"><span className="text-sm text-neutral-600">{methodOpt?.label ?? p.method}</span></td>
                          <td className="px-4 py-3">{statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}</td>
                          <td className="px-4 py-3"><span className="text-sm text-neutral-500">{new Date(p.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'outstanding' && (
          <div className="card">
            {loading ? (
              <LoadingState label="Loading outstanding..." />
            ) : outstanding.length === 0 ? (
              <EmptyState
                icon={<AlertCircle className="h-7 w-7" />}
                title="No outstanding balances"
                description="All invoices are fully paid."
              />
            ) : (
              <div className="divide-y divide-neutral-100">
                {outstanding.map((o) => (
                  <div
                    key={o.patient_id}
                    onClick={() => navigate(`/app/patients/${o.patient_id}`)}
                    className="p-4 flex items-center justify-between hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{o.patient_name}</p>
                      <p className="text-xs text-neutral-400">{o.patient_number}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-error-600">{formatCurrency(o.total_outstanding)}</span>
                      <ChevronRight className="h-4 w-4 text-neutral-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <PaymentFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </AppShell>
  );
}
