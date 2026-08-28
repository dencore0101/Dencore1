import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Trash2, MessageCircle, Copy, Check, Loader2, AlertCircle, Settings2, History } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import {
  fetchBonusConfig, upsertBonusConfig, fetchEligiblePatients,
  addEligibility, revokeEligibility, fetchAuditLog,
  type ScalingBonusConfig, type ScalingBonusAudit,
} from '@/services/scaling-bonus.service';
import { fetchPatients } from '@/services/patient.service';
import type { Patient } from '@/types/db';

export default function ScalingBonusPage() {
  const [config, setConfig] = useState<ScalingBonusConfig | null>(null);
  const [eligible, setEligible] = useState<Array<{ id: string; patient_id: string; patient_name: string; patient_number: string; phone: string | null; whatsapp: string | null; eligible_date: string; expiry_date: string; status: string; qualifying_amount: number }>>([]);
  const [audit, setAudit] = useState<ScalingBonusAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, elig, aud] = await Promise.all([
        fetchBonusConfig().catch(() => null),
        fetchEligiblePatients().catch(() => []),
        fetchAuditLog().catch(() => []),
      ]);
      setConfig(cfg);
      setEligible(elig);
      setAudit(aud);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const whatsappLink = (phone: string | null, name: string) => {
    const num = (phone ?? '').replace(/\D/g, '');
    if (!num) return null;
    const msg = config?.patient_message
      ? config.patient_message
          .replace('{years}', String(config.free_scaling_years))
          .replace('{expiry_date}', new Date().toLocaleDateString())
      : `Hello ${name}, you qualify for free scaling!`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) return <AppShell><div className="p-6"><LoadingState label="Loading scaling bonus..." /></div></AppShell>;
  if (error) return <AppShell><div className="p-6"><ErrorState message={error} onRetry={load} /></div></AppShell>;

  const activeCount = eligible.filter((e) => e.status === 'active' || e.status === 'manually_added').length;
  const expiredCount = eligible.filter((e) => e.status === 'expired' || e.status === 'revoked').length;

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader title="Scaling Bonus" subtitle="Reward loyal patients with free scaling after qualifying treatment amounts" />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card card-pad">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-600"><Sparkles className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold text-neutral-900">{activeCount}</p><p className="text-xs text-neutral-400">Active Eligible</p></div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500"><History className="h-5 w-5" /></div>
              <div><p className="text-2xl font-bold text-neutral-900">{expiredCount}</p><p className="text-xs text-neutral-400">Expired/Revoked</p></div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Settings2 className="h-5 w-5" /></div>
              <div><p className="text-sm font-bold text-neutral-900">{config ? `₹${config.qualifying_amount}` : 'Not set'}</p><p className="text-xs text-neutral-400">Qualifying Amount</p></div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setShowConfig(true)} className="btn-secondary"><Settings2 className="h-4 w-4" /> Configure</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Eligibility</button>
          <button onClick={() => setShowAudit(true)} className="btn-secondary"><History className="h-4 w-4" /> Audit Log</button>
        </div>

        {/* Eligible patients list */}
        <div className="card">
          {eligible.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-7 w-7" />} title="No eligible patients yet" description="Add patients manually or configure auto-qualification based on treatment amounts." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {eligible.map((e) => {
                const isActive = e.status === 'active' || e.status === 'manually_added';
                const isExpired = !isActive && new Date(e.expiry_date) < new Date();
                const waLink = whatsappLink(e.whatsapp ?? e.phone, e.patient_name);
                return (
                  <div key={e.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-neutral-900">{e.patient_name}</p>
                        <span className="text-xs text-neutral-400">({e.patient_number})</span>
                        <StatusBadge color={isActive ? 'success' : isExpired ? 'neutral' : 'warning'}>
                          {isActive ? 'Active' : e.status === 'revoked' ? 'Revoked' : 'Expired'}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Eligible: {new Date(e.eligible_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}Expires: {new Date(e.expiry_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {e.qualifying_amount > 0 && ` · Qualifying: ₹${e.qualifying_amount}`}
                      </p>
                      {(e.phone || e.whatsapp) && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => copyPhone(e.whatsapp ?? e.phone ?? '')}
                            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            {copiedPhone === (e.whatsapp ?? e.phone) ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {e.whatsapp ?? e.phone}
                          </button>
                          {waLink && (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs text-success-600 hover:text-success-700 flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" /> WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <button
                        onClick={() => { revokeEligibility(e.id, e.patient_id).then(load).catch(console.error); }}
                        className="text-error-500 hover:text-error-700 p-1.5 rounded-lg hover:bg-error-50"
                        title="Revoke"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Config Modal */}
      {showConfig && <ConfigModal config={config} onClose={() => setShowConfig(false)} onSaved={() => { setShowConfig(false); load(); }} />}
      {/* Add Eligibility Modal */}
      {showAdd && <AddEligibilityModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
      {/* Audit Log Modal */}
      {showAudit && <AuditModal audit={audit} onClose={() => setShowAudit(false)} />}
    </AppShell>
  );
}

function ConfigModal({ config, onClose, onSaved }: { config: ScalingBonusConfig | null; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(config?.qualifying_amount ?? 5000));
  const [years, setYears] = useState(String(config?.free_scaling_years ?? 1));
  const [message, setMessage] = useState(config?.patient_message ?? 'Congratulations! You qualify for free scaling for {years} year(s). Valid until {expiry_date}.');
  const [active, setActive] = useState(config?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await upsertBonusConfig({
        qualifying_amount: Number(amount),
        free_scaling_years: Number(years),
        patient_message: message,
        is_active: active,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} title="Configure Scaling Bonus" onClose={onClose}>
      <div className="space-y-4">
        {err && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{err}</div>}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Qualifying Treatment Amount (₹)</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-xs text-neutral-400 mt-1">Patients who complete treatments above this amount become eligible.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Free Scaling Years</label>
          <input type="number" className="input" value={years} onChange={(e) => setYears(e.target.value)} />
          <p className="text-xs text-neutral-400 mt-1">How many years of free scaling the patient receives.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Patient Message</label>
          <textarea className="input min-h-20" value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-xs text-neutral-400 mt-1">Use {'{years}'} and {'{expiry_date}'} as placeholders.</p>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" />
          <span className="text-sm text-neutral-700">Program active</span>
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddEligibilityModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [expiry, setExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (search.trim().length > 1) {
      fetchPatients({ search, pageSize: 10 }).then((r) => setPatients(r.data)).catch(() => setPatients([]));
    } else {
      setPatients([]);
    }
  }, [search]);

  const handleAdd = async () => {
    if (!selected || !expiry) return;
    setSaving(true);
    setErr(null);
    try {
      await addEligibility({ patient_id: selected.id, expiry_date: expiry, notes: notes || null });
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} title="Add Eligibility" onClose={onClose}>
      <div className="space-y-4">
        {err && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{err}</div>}
        {!selected ? (
          <div>
            <input className="input" placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-neutral-100">
              {patients.map((p) => (
                <button key={p.id} onClick={() => { setSelected(p); setExpiry(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]); }} className="w-full text-left p-2 hover:bg-neutral-50 rounded">
                  <span className="text-sm font-medium text-neutral-900">{p.full_name}</span>
                  <span className="text-xs text-neutral-400 ml-2">{p.patient_number}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-sm font-medium text-neutral-900">{selected.full_name}</p>
              <p className="text-xs text-neutral-400">{selected.patient_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Expiry Date</label>
              <input type="date" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="btn-secondary">Back</button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function AuditModal({ audit, onClose }: { audit: ScalingBonusAudit[]; onClose: () => void }) {
  return (
    <Modal open={true} title="Audit Log" onClose={onClose}>
      {audit.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-neutral-400 py-8 justify-center">
          <AlertCircle className="h-4 w-4" /> No audit entries yet
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {audit.map((a) => (
            <div key={a.id} className="rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <StatusBadge color={a.action.includes('revoke') || a.action.includes('remove') ? 'error' : a.action.includes('config') ? 'primary' : 'success'}>
                  {a.action.replace(/_/g, ' ')}
                </StatusBadge>
                <span className="text-xs text-neutral-400">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              {a.old_values && <p className="text-xs text-neutral-400">Old: {JSON.stringify(a.old_values).substring(0, 100)}</p>}
              {a.new_values && <p className="text-xs text-neutral-500">New: {JSON.stringify(a.new_values).substring(0, 100)}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
