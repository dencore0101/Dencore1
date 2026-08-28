import { useState, useEffect, useCallback } from 'react';
import { Globe, Loader2, Plus, Copy, RefreshCw, Check, X, Search } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { fetchPortalAccessList, enablePortal, disablePortal, regenerateToken } from '@/services/clinical.service';
import { fetchPatients } from '@/services/patient.service';
import type { PortalAccess } from '@/types/clinical';
import type { Patient } from '@/types/db';

export default function PortalPage() {
  const [accessList, setAccessList] = useState<PortalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPortalAccessList();
      setAccessList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portal access');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (patientId: string, currentEnabled: boolean) => {
    try {
      if (currentEnabled) { await disablePortal(patientId); } else { await enablePortal(patientId); }
      await load();
    } catch { /* ignore */ }
  };

  const handleRegenerate = async (patientId: string) => {
    try { await regenerateToken(patientId); await load(); } catch { /* ignore */ }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const enabledCount = accessList.filter((a) => a.is_enabled).length;

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Patient Portal"
          subtitle="Manage patient portal access and tokens"
          actions={<button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus className="h-4 w-4" />Enable for Patient</button>}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Enabled Patients</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{enabledCount}</p>
          </div>
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Total Access Records</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{accessList.length}</p>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <LoadingState label="Loading portal access..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : accessList.length === 0 ? (
            <EmptyState icon={<Globe className="h-7 w-7" />} title="No portal access" description="Enable portal access for a patient to get started." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {accessList.map((access) => (
                <div key={access.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${access.is_enabled ? 'bg-success-50 text-success-600' : 'bg-neutral-100 text-neutral-400'}`}>
                        <Globe className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900">{access.patient?.full_name ?? '—'}</p>
                          {access.is_enabled
                            ? <StatusBadge color="success">Active</StatusBadge>
                            : <StatusBadge color="neutral">Disabled</StatusBadge>}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {access.patient?.patient_number ?? '—'}
                          {access.patient?.phone ? ` · ${access.patient.phone}` : ''}
                          {access.patient?.email ? ` · ${access.patient.email}` : ''}
                        </p>
                        {access.last_login_at && (
                          <p className="text-xs text-neutral-400 mt-0.5">Last login: {new Date(access.last_login_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                        {access.is_enabled && (
                          <div className="mt-2 flex items-center gap-2">
                            <code className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded font-mono max-w-[200px] truncate">{access.access_token.substring(0, 24)}...</code>
                            <button onClick={() => handleCopyToken(access.access_token)} className="text-neutral-400 hover:text-primary-600" title="Copy token">
                              {copiedToken === access.access_token ? <Check className="h-3.5 w-3.5 text-success-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => handleRegenerate(access.patient_id)} className="text-neutral-400 hover:text-primary-600" title="Regenerate token">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleToggle(access.patient_id, access.is_enabled)}
                        className={access.is_enabled ? 'btn-secondary text-xs' : 'btn-primary text-xs'}
                      >
                        {access.is_enabled ? <><X className="h-3 w-3" />Disable</> : <><Check className="h-3 w-3" />Enable</>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddPatientModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); load(); }} />
      )}
    </AppShell>
  );
}

// ── Add Patient Modal ────────────────────────────────────────
function AddPatientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients({ pageSize: 1000 }).then((res) => setPatients(res.data)).catch(() => {});
  }, []);

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_number.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone ?? '').includes(search)
  );

  const handleSubmit = async () => {
    if (!selectedPatient) { setError('Select a patient'); return; }
    setSaving(true); setError(null);
    try {
      await enablePortal(selectedPatient);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Enable Portal Access"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !selectedPatient} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}</button></>}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>}
        <div>
          <label className="label">Search Patient</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, number, or phone..." autoFocus />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100">
          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">No patients found</p>
          ) : filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPatient(p.id)}
              className={`w-full text-left p-3 hover:bg-neutral-50 transition-colors ${selectedPatient === p.id ? 'bg-primary-50' : ''}`}
            >
              <p className="text-sm font-medium text-neutral-900">{p.full_name}</p>
              <p className="text-xs text-neutral-400">{p.patient_number} {p.phone ? `· ${p.phone}` : ''}</p>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
