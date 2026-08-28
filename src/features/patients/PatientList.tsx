import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Phone } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import SearchInput from '@/components/SearchInput';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import { fetchPatients, checkDuplicatePhone } from '@/services/patient.service';
import type { Patient } from '@/types/db';
import { PAGE_SIZE } from '@/constants/patient';
import PatientFormModal from './PatientFormModal';
import { useDebounce } from '@/hooks/useDebounce';

export default function PatientList() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, total } = await fetchPatients({ search: debouncedSearch, page, pageSize: PAGE_SIZE });
      setPatients(data);
      setTotal(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Patients"
          subtitle="Manage patient records and profiles"
          actions={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <UserPlus className="h-4 w-4" />
              New Patient
            </button>
          }
        />

        <div className="card">
          <div className="p-4 border-b border-neutral-200">
            <div className="max-w-md">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Search by name, phone, or patient number..."
              />
            </div>
          </div>

          {loading ? (
            <LoadingState label="Loading patients..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : patients.length === 0 ? (
            <EmptyState
              icon={<Users className="h-7 w-7" />}
              title={search ? 'No patients found' : 'No patients yet'}
              description={search ? 'Try a different search term.' : 'Register your first patient to get started.'}
              action={
                !search && (
                  <button onClick={() => setShowForm(true)} className="btn-primary">
                    <UserPlus className="h-4 w-4" />
                    Register Patient
                  </button>
                )
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Patient</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Number</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Phone</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Gender</th>
                      <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Referral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {patients.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/app/patients/${p.id}`)}
                        className="hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                              {p.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{p.full_name}</p>
                              {p.chief_complaint && (
                                <p className="text-xs text-neutral-400 truncate max-w-xs">{p.chief_complaint}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-neutral-600">{p.patient_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          {p.phone ? (
                            <span className="text-sm text-neutral-600 flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-neutral-400" />
                              {p.phone}
                            </span>
                          ) : (
                            <span className="text-sm text-neutral-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge color="neutral">
                            {p.gender === 'unknown' ? '—' : p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-neutral-500">
                            {p.referral_source?.name ?? p.referred_by_name ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-neutral-100">
                {patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/app/patients/${p.id}`)}
                    className="p-4 hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-neutral-900 truncate">{p.full_name}</p>
                          <span className="text-xs font-mono text-neutral-400 shrink-0">{p.patient_number}</span>
                        </div>
                        {p.phone && <p className="text-sm text-neutral-500 mt-0.5">{p.phone}</p>}
                        {p.chief_complaint && (
                          <p className="text-xs text-neutral-400 truncate mt-0.5">{p.chief_complaint}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-neutral-200">
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <PatientFormModal
          onClose={() => setShowForm(false)}
          onSaved={(patient) => {
            setShowForm(false);
            navigate(`/app/patients/${patient.id}`);
          }}
          checkDuplicatePhone={checkDuplicatePhone}
        />
      )}
    </AppShell>
  );
}
