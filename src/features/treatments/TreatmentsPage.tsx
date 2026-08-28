import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ChevronRight } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import type { Treatment } from '@/types/clinical';
import { TREATMENT_STATUS_OPTIONS } from '@/constants/clinical';

interface TreatmentWithPatient extends Treatment {
  patient_name: string;
  patient_number: string;
}

export default function TreatmentsPage() {
  const navigate = useNavigate();
  const [treatments, setTreatments] = useState<TreatmentWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clinicId = localStorage.getItem('clinic_id');
      if (!clinicId) throw new Error('No active clinic');

      let query = supabase
        .from('treatments')
        .select('*, patient:patients(id, full_name, patient_number)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data ?? []).map((t: Record<string, unknown>) => ({
        ...(t as unknown as Treatment),
        patient_name: (t.patient as Record<string, string>)?.full_name ?? '—',
        patient_number: (t.patient as Record<string, string>)?.patient_number ?? '—',
      }));
      setTreatments(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load treatments');
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
        <PageHeader title="Treatments" subtitle="All treatment cases across the clinic" />

        <div className="card">
          <div className="p-4 border-b border-neutral-200 flex items-center gap-3">
            <select
              className="input max-w-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {TREATMENT_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <LoadingState label="Loading treatments..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : treatments.length === 0 ? (
            <EmptyState
              icon={<Stethoscope className="h-7 w-7" />}
              title="No treatments found"
              description="Treatment cases are created from the patient profile."
            />
          ) : (
            <div className="divide-y divide-neutral-100">
              {treatments.map((t) => {
                const statusOpt = TREATMENT_STATUS_OPTIONS.find((s) => s.value === t.status);
                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/app/patients/${t.patient_id}`)}
                    className="p-4 flex items-center justify-between hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{t.case_name}</p>
                        <p className="text-xs text-neutral-400">
                          <span className="font-mono">{t.treatment_number}</span>
                          {' · '}
                          {t.patient_name} ({t.patient_number})
                        </p>
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
