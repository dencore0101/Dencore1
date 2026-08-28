import { useState, useEffect, useCallback } from 'react';
import { Plus, FileCheck, Loader2, Trash2, Printer, Check, X } from 'lucide-react';
import { fetchConsentFormsByPatient, createConsentForm, updateConsentStatus, deleteConsentForm } from '@/services/prescription.service';
import type { ConsentForm, ConsentType } from '@/types/prescription';
import { CONSENT_TYPE_OPTIONS, CONSENT_STATUS_OPTIONS, CONSENT_TEMPLATES } from '@/constants/prescription';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';

interface ConsentFormsTabProps {
  patientId: string;
}

export default function ConsentFormsTab({ patientId }: ConsentFormsTabProps) {
  const [forms, setForms] = useState<ConsentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<ConsentType>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [signingForm, setSigningForm] = useState<ConsentForm | null>(null);
  const [witnessName, setWitnessName] = useState('');
  const [witnessRelation, setWitnessRelation] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchConsentFormsByPatient(patientId);
      setForms(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const handleTypeChange = (type: ConsentType) => {
    setSelectedType(type);
    const tpl = CONSENT_TEMPLATES[type];
    if (tpl) { setTitle(tpl.title); setContent(tpl.content); }
    else { setTitle(''); setContent(''); }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await createConsentForm({ patient_id: patientId, consent_type: selectedType, title: title.trim(), content: content.trim() });
      setShowForm(false); setTitle(''); setContent(''); setSelectedType('general');
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleSign = async (status: 'signed' | 'declined') => {
    if (!signingForm) return;
    setSaving(true);
    try {
      await updateConsentStatus(signingForm.id, status, witnessName || undefined, witnessRelation || undefined);
      setSigningForm(null); setWitnessName(''); setWitnessRelation('');
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteConsentForm(id); await load(); } catch { /* ignore */ }
  };

  const handlePrint = (form: ConsentForm) => {
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    w.document.write(`<html><head><title>${form.title}</title><style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#1a1a1a;line-height:1.6}h1{font-size:18px;text-align:center;margin-bottom:4px}h2{font-size:13px;color:#666;text-align:center;margin-bottom:24px}pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:13px}.status{text-align:center;padding:8px;border-radius:6px;margin:16px 0;font-weight:600}</style></head><body><h1>${form.title}</h1><h2>Consent Form · ${new Date(form.created_at).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</h2><div class="status" style="background:${form.status==='signed'?'#dcfce7':form.status==='declined'?'#fee2e2':'#fef9c3'};color:${form.status==='signed'?'#166534':form.status==='declined'?'#991b1b':'#854d0e'}">${form.status.toUpperCase()}</div><pre>${form.content}</pre>${form.witness_name?`<p style="margin-top:24px;font-size:13px"><strong>Witness:</strong> ${form.witness_name}${form.witness_relation?` (${form.witness_relation})`:''}</p>`:''}${form.signed_at?`<p style="font-size:13px"><strong>Signed on:</strong> ${new Date(form.signed_at).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>`:''}</body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) {
    return <div className="card card-pad flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => { setShowForm(true); handleTypeChange('general'); }} className="btn-primary"><Plus className="h-4 w-4" />New Consent Form</button>
      </div>

      {forms.length === 0 ? (
        <div className="card"><EmptyState icon={<FileCheck className="h-7 w-7" />} title="No consent forms" description="Create a consent form for this patient." /></div>
      ) : (
        forms.map((form) => {
          const statusOpt = CONSENT_STATUS_OPTIONS.find((s) => s.value === form.status);
          const typeOpt = CONSENT_TYPE_OPTIONS.find((t) => t.value === form.consent_type);
          return (
            <div key={form.id} className="card card-pad">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{form.title}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{typeOpt?.label ?? form.consent_type}{' · '}{new Date(form.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">{statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}</div>
              </div>
              <p className="text-sm text-neutral-600 whitespace-pre-wrap line-clamp-3 mt-2">{form.content}</p>
              {form.witness_name && <p className="text-xs text-neutral-400 mt-2">Witness: {form.witness_name}{form.witness_relation ? ` (${form.witness_relation})` : ''}</p>}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                {form.status === 'pending' && (
                  <>
                    <button onClick={() => setSigningForm(form)} className="btn-secondary text-xs"><Check className="h-3 w-3" />Sign</button>
                    <button onClick={() => handleSign('declined')} className="text-xs text-neutral-400 hover:text-error-600"><X className="h-3 w-3" />Decline</button>
                  </>
                )}
                <button onClick={() => handlePrint(form)} className="text-xs text-neutral-400 hover:text-primary-600 ml-auto"><Printer className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDelete(form.id)} className="text-xs text-neutral-300 hover:text-error-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          );
        })
      )}

      {showForm && (
        <Modal open={true} onClose={() => setShowForm(false)} title="New Consent Form" size="lg"
          footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !title.trim() || !content.trim()} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</button></>}
        >
          <div className="space-y-4">
            <div><label className="label">Consent Type</label><select className="input" value={selectedType} onChange={(e) => handleTypeChange(e.target.value as ConsentType)}>{CONSENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className="label">Content</label><textarea className="input" rows={12} value={content} onChange={(e) => setContent(e.target.value)} /></div>
          </div>
        </Modal>
      )}

      {signingForm && (
        <Modal open={true} onClose={() => setSigningForm(null)} title={`Sign: ${signingForm.title}`}
          footer={<><button onClick={() => setSigningForm(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => handleSign('signed')} disabled={saving} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Confirm Signature</button></>}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 max-h-64 overflow-y-auto"><pre className="whitespace-pre-wrap text-sm text-neutral-700 font-sans">{signingForm.content}</pre></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Witness Name (optional)</label><input className="input" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} /></div>
              <div><label className="label">Witness Relation (optional)</label><input className="input" value={witnessRelation} onChange={(e) => setWitnessRelation(e.target.value)} placeholder="e.g. Parent, Spouse" /></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
