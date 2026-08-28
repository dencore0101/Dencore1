import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Plus, Loader2, Trash2, ChevronRight, Calendar } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { fetchLabCases, createLabCase, updateLabStage, deleteLabCase } from '@/services/inventory.service';
import type { LabCase, LabWorkType, LabStage } from '@/types/inventory';
import { LAB_WORK_TYPE_OPTIONS, LAB_STAGE_OPTIONS, formatCurrency } from '@/constants/inventory';
import { fetchPatients } from '@/services/patient.service';
import type { Patient } from '@/types/db';

export default function LabWorkPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<LabCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLabCases(stageFilter ? { stage: stageFilter } : undefined);
      setCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lab cases');
    } finally {
      setLoading(false);
    }
  }, [stageFilter]);

  useEffect(() => { load(); }, [load]);

  const overdueCases = cases.filter((c) => c.due_date && c.stage !== 'delivered' && c.stage !== 'cancelled' && new Date(c.due_date) < new Date());
  const totalCost = cases.filter((c) => c.stage !== 'cancelled').reduce((s, c) => s + Number(c.cost), 0);

  const handleStageChange = async (id: string, stage: LabStage) => {
    try { await updateLabStage(id, stage); await load(); } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try { await deleteLabCase(id); await load(); } catch { /* ignore */ }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Lab Work"
          subtitle="Track lab cases with stages and costs"
          actions={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="h-4 w-4" />New Lab Case</button>}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Active Cases</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{cases.filter((c) => c.stage !== 'delivered' && c.stage !== 'cancelled').length}</p>
          </div>
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Overdue</p>
            <p className={`text-2xl font-semibold mt-1 ${overdueCases.length > 0 ? 'text-error-600' : 'text-neutral-900'}`}>{overdueCases.length}</p>
          </div>
          <div className="card card-pad">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Total Lab Cost</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1">{formatCurrency(totalCost)}</p>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-neutral-200">
            <select className="input max-w-xs" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
              <option value="">All stages</option>
              {LAB_STAGE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {loading ? (
            <LoadingState label="Loading lab cases..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : cases.length === 0 ? (
            <EmptyState icon={<FlaskConical className="h-7 w-7" />} title="No lab cases" description="Create a lab case to track work sent to external labs." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {cases.map((labCase) => {
                const stageOpt = LAB_STAGE_OPTIONS.find((s) => s.value === labCase.stage);
                const workOpt = LAB_WORK_TYPE_OPTIONS.find((w) => w.value === labCase.work_type);
                const isOverdue = labCase.due_date && labCase.stage !== 'delivered' && labCase.stage !== 'cancelled' && new Date(labCase.due_date) < new Date();
                return (
                  <div key={labCase.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          <FlaskConical className="h-5 w-5 text-primary-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-neutral-900">{labCase.case_number}</p>
                            {stageOpt && <StatusBadge color={stageOpt.color as 'primary'}>{stageOpt.label}</StatusBadge>}
                            {isOverdue && <StatusBadge color="error">Overdue</StatusBadge>}
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {labCase.patient?.full_name ?? '—'} ({labCase.patient?.patient_number ?? '—'})
                            {' · '}{workOpt?.label ?? labCase.work_type}
                            {' · '}{labCase.lab_name}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-neutral-400">
                            <span>Sent: {new Date(labCase.sent_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                            {labCase.due_date && (
                              <span className={isOverdue ? 'text-error-600 font-medium' : ''}>
                                <Calendar className="h-3 w-3 inline mr-0.5" />Due: {new Date(labCase.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {Number(labCase.cost) > 0 && <span>Cost: {formatCurrency(Number(labCase.cost))}</span>}
                          </div>
                          {labCase.notes && <p className="text-xs text-neutral-500 mt-1">{labCase.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={labCase.stage}
                          onChange={(e) => handleStageChange(labCase.id, e.target.value as LabStage)}
                          className="input text-xs py-1 px-2 max-w-[140px]"
                        >
                          {LAB_STAGE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button onClick={() => navigate(`/app/patients/${labCase.patient_id}`)} className="text-neutral-300 hover:text-neutral-500"><ChevronRight className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(labCase.id)} className="text-neutral-300 hover:text-error-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <LabCaseFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </AppShell>
  );
}

// ── Lab Case Form Modal ──────────────────────────────────────
function LabCaseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState({
    patient_id: '', lab_name: '', work_type: 'crown' as LabWorkType,
    due_date: '', cost: 0, notes: '',
  });

  useEffect(() => {
    fetchPatients({ pageSize: 1000 }).then((res) => setPatients(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.patient_id || !form.lab_name.trim()) { setError('Patient and lab name are required'); return; }
    setSaving(true); setError(null);
    try {
      await createLabCase({
        patient_id: form.patient_id,
        lab_name: form.lab_name.trim(),
        work_type: form.work_type,
        due_date: form.due_date || null,
        cost: form.cost,
        notes: form.notes || null,
      });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="New Lab Case"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !form.patient_id || !form.lab_name.trim()} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</button></>}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>}
        <div><label className="label">Patient <span className="text-error-500">*</span></label>
          <select className="input" value={form.patient_id} onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}>
            <option value="">Select patient...</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.patient_number})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Lab Name <span className="text-error-500">*</span></label><input className="input" value={form.lab_name} onChange={(e) => setForm((f) => ({ ...f, lab_name: e.target.value }))} autoFocus /></div>
          <div><label className="label">Work Type</label><select className="input" value={form.work_type} onChange={(e) => setForm((f) => ({ ...f, work_type: e.target.value as LabWorkType }))}>{LAB_WORK_TYPE_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Due Date</label><input type="date" className="input" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} /></div>
          <div><label className="label">Cost (₹)</label><input type="number" min={0} step="0.01" className="input" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} /></div>
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
      </div>
    </Modal>
  );
}
