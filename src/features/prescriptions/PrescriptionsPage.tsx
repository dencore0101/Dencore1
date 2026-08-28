import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, ChevronRight } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import { fetchPrescriptions } from '@/services/prescription.service';
import type { Prescription } from '@/types/prescription';
import { PRESCRIPTION_STATUS_OPTIONS } from '@/constants/prescription';

export default function PrescriptionsPage() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrescriptions(statusFilter ? { status: statusFilter } : undefined);
      setPrescriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader title="Prescriptions" subtitle="All prescriptions across the clinic" />
        <div className="card">
          <div className="p-4 border-b border-neutral-200">
            <select className="input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {PRESCRIPTION_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {loading ? (
            <LoadingState label="Loading prescriptions..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : prescriptions.length === 0 ? (
            <EmptyState icon={<Pill className="h-7 w-7" />} title="No prescriptions found" description="Prescriptions are created from the patient profile." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {prescriptions.map((rx) => {
                const statusOpt = PRESCRIPTION_STATUS_OPTIONS.find((s) => s.value === rx.status);
                return (
                  <div key={rx.id} onClick={() => navigate(`/app/patients/${rx.patient_id}`)} className="p-4 flex items-center justify-between hover:bg-neutral-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary-600">Rx</span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{rx.prescription_number}</p>
                        <p className="text-xs text-neutral-400">{rx.patient?.full_name ?? '—'} ({rx.patient?.patient_number ?? '—'}){' · '}{rx.items?.length ?? 0} drug{(rx.items?.length ?? 0) !== 1 ? 's' : ''}{' · '}{new Date(rx.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}
                      <ChevronRight className="h-4 w-4 text-neutral-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
