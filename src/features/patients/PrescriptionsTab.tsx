import { useState, useEffect, useCallback } from 'react';
import { Plus, Pill, Loader2, Trash2, Printer } from 'lucide-react';
import { fetchPrescriptionsByPatient, createPrescription, deletePrescription, type PrescriptionItemInput } from '@/services/prescription.service';
import type { Prescription } from '@/types/prescription';
import { PRESCRIPTION_STATUS_OPTIONS, FREQUENCY_OPTIONS, DURATION_OPTIONS, COMMON_DRUGS } from '@/constants/prescription';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';

interface PrescriptionsTabProps {
  patientId: string;
}

export default function PrescriptionsTab({ patientId }: PrescriptionsTabProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<PrescriptionItemInput[]>([{ drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPrescriptionsByPatient(patientId);
      setPrescriptions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const addItem = () => setItems((p) => [...p, { drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateItem = (idx: number, field: keyof PrescriptionItemInput, value: string) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleCreate = async () => {
    if (items.every((i) => !i.drug_name.trim())) return;
    setSaving(true);
    try {
      await createPrescription({ patient_id: patientId, notes: notes || null, items: items.filter((i) => i.drug_name.trim()) });
      setShowForm(false);
      setItems([{ drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
      setNotes('');
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deletePrescription(id); await load(); } catch { /* ignore */ }
  };

  const handlePrint = (rx: Prescription) => {
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    const rows = (rx.items ?? []).map((i) => `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:600">${i.drug_name}</td><td style="padding:6px;border:1px solid #ddd">${i.dosage ?? '—'}</td><td style="padding:6px;border:1px solid #ddd">${i.frequency ?? '—'}</td><td style="padding:6px;border:1px solid #ddd">${i.duration ?? '—'}</td><td style="padding:6px;border:1px solid #ddd">${i.instructions ?? '—'}</td></tr>`).join('');
    w.document.write(`<html><head><title>Prescription ${rx.prescription_number}</title><style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#1a1a1a}h1{font-size:20px;margin:0}h2{font-size:14px;color:#666;margin:4px 0 20px}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}th{background:#f5f5f5;padding:6px;border:1px solid #ddd;text-align:left;font-size:12px}.rx{font-size:36px;float:right;margin-top:-60px;color:#2563eb}.footer{margin-top:40px;border-top:1px solid #ddd;padding-top:12px;font-size:12px;color:#666}</style></head><body><div style="display:flex;justify-content:space-between;align-items:start"><div><h1>Prescription</h1><h2>${rx.prescription_number} · ${new Date(rx.created_at).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</h2></div><div class="rx">Rx</div></div><table><thead><tr><th>Drug</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>${rows}</tbody></table>${rx.notes?`<p style="margin:16px 0;font-size:13px"><strong>Notes:</strong> ${rx.notes}</p>`:''}<div class="footer"><p>This prescription is generated electronically and is valid for the stated duration.</p><p style="margin-top:40px">___________________________<br>Dentist Signature</p></div></body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) {
    return <div className="card card-pad flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="h-4 w-4" />New Prescription</button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="card"><EmptyState icon={<Pill className="h-7 w-7" />} title="No prescriptions" description="Create a prescription for this patient." /></div>
      ) : (
        prescriptions.map((rx) => {
          const statusOpt = PRESCRIPTION_STATUS_OPTIONS.find((s) => s.value === rx.status);
          return (
            <div key={rx.id} className="card card-pad">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary-600">Rx</span>
                    <p className="text-sm font-medium text-neutral-900">{rx.prescription_number}</p>
                    {statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">{new Date(rx.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handlePrint(rx)} className="text-neutral-400 hover:text-primary-600 transition-colors" title="Print"><Printer className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(rx.id)} className="text-neutral-300 hover:text-error-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {(rx.items ?? []).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-neutral-100">
                      <th className="text-left text-xs font-semibold text-neutral-400 uppercase px-2 py-1.5">Drug</th>
                      <th className="text-left text-xs font-semibold text-neutral-400 uppercase px-2 py-1.5">Dosage</th>
                      <th className="text-left text-xs font-semibold text-neutral-400 uppercase px-2 py-1.5">Frequency</th>
                      <th className="text-left text-xs font-semibold text-neutral-400 uppercase px-2 py-1.5">Duration</th>
                    </tr></thead>
                    <tbody className="divide-y divide-neutral-50">
                      {(rx.items ?? []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-2 font-medium text-neutral-900">{item.drug_name}</td>
                          <td className="px-2 py-2 text-neutral-600">{item.dosage ?? '—'}</td>
                          <td className="px-2 py-2 text-neutral-600">{item.frequency ?? '—'}</td>
                          <td className="px-2 py-2 text-neutral-600">{item.duration ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(rx.items ?? []).some((i) => i.instructions) && (
                <div className="mt-2 space-y-1">
                  {(rx.items ?? []).filter((i) => i.instructions).map((item) => (
                    <p key={item.id} className="text-xs text-neutral-500"><span className="font-medium">{item.drug_name}:</span> {item.instructions}</p>
                  ))}
                </div>
              )}
              {rx.notes && <p className="text-sm text-neutral-500 mt-3 pt-3 border-t border-neutral-100">{rx.notes}</p>}
            </div>
          );
        })
      )}

      {showForm && (
        <Modal open={true} onClose={() => setShowForm(false)} title="New Prescription" size="xl"
          footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={saving || items.every((i) => !i.drug_name.trim())} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</button></>}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx}>
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-4">
                      <input className="input" list="drugs" placeholder="Drug name" value={item.drug_name} onChange={(e) => updateItem(idx, 'drug_name', e.target.value)} />
                      <datalist id="drugs">{COMMON_DRUGS.map((d) => <option key={d} value={d} />)}</datalist>
                    </div>
                    <div className="col-span-2"><input className="input" placeholder="Dosage" value={item.dosage ?? ''} onChange={(e) => updateItem(idx, 'dosage', e.target.value)} /></div>
                    <div className="col-span-2"><select className="input" value={item.frequency ?? ''} onChange={(e) => updateItem(idx, 'frequency', e.target.value)}><option value="">Freq...</option>{FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
                    <div className="col-span-2"><select className="input" value={item.duration ?? ''} onChange={(e) => updateItem(idx, 'duration', e.target.value)}><option value="">Duration...</option>{DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                    <div className="col-span-1 flex items-center justify-center pt-1">{items.length > 1 && <button onClick={() => removeItem(idx)} className="text-neutral-300 hover:text-error-600"><Trash2 className="h-4 w-4" /></button>}</div>
                    <div className="col-span-11 col-start-2"><input className="input" placeholder="Instructions (optional)" value={item.instructions ?? ''} onChange={(e) => updateItem(idx, 'instructions', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="btn-secondary text-xs"><Plus className="h-3 w-3" />Add Drug</button>
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="General notes..." /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
