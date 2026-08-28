import { useState, useEffect, useCallback } from 'react';
import { Plus, Stethoscope, Loader2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import {
  fetchTreatmentsByPatient, createTreatment, deleteTreatment,
  addTreatmentItem, deleteTreatmentItem, fetchProcedures,
} from '@/services/clinical.service';
import type { Treatment, Procedure } from '@/types/clinical';
import { TREATMENT_STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/constants/clinical';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';

interface TreatmentsTabProps {
  patientId: string;
}

export default function TreatmentsTab({ patientId }: TreatmentsTabProps) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    procedure_id: '', tooth_numbers: '', fee: 0, discount: 0, quantity: 1, priority: 'normal', notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([fetchTreatmentsByPatient(patientId), fetchProcedures()]);
      setTreatments(t);
      setProcedures(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newCaseName.trim()) return;
    setSaving(true);
    try {
      await createTreatment({ patient_id: patientId, case_name: newCaseName.trim() });
      setShowNew(false);
      setNewCaseName('');
      await load();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (treatmentId: string) => {
    setSaving(true);
    try {
      await addTreatmentItem({
        treatment_id: treatmentId,
        patient_id: patientId,
        procedure_id: itemForm.procedure_id || null,
        tooth_numbers: itemForm.tooth_numbers ? itemForm.tooth_numbers.split(',').map((s) => s.trim()).filter(Boolean) : [],
        fee: itemForm.fee,
        discount: itemForm.discount,
        quantity: itemForm.quantity,
        priority: itemForm.priority,
        notes: itemForm.notes || null,
      });
      setShowAddItem(null);
      setItemForm({ procedure_id: '', tooth_numbers: '', fee: 0, discount: 0, quantity: 1, priority: 'normal', notes: '' });
      await load();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTreatment(id);
      await load();
    } catch {
      // ignore
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteTreatmentItem(id);
      await load();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="card card-pad flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (treatments.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<Stethoscope className="h-7 w-7" />}
          title="No treatments yet"
          description="Create a treatment case to start planning procedures."
          action={
            <button onClick={() => setShowNew(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              New Treatment
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Treatment
        </button>
      </div>

      {treatments.map((t) => {
        const isExpanded = expanded.has(t.id);
        const totalValue = (t.items ?? []).reduce((sum, i) => sum + Number(i.final_amount), 0);
        const statusOption = TREATMENT_STATUS_OPTIONS.find((s) => s.value === t.status);
        return (
          <div key={t.id} className="card">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"
              onClick={() => toggleExpand(t.id)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
                <div>
                  <p className="text-sm font-medium text-neutral-900">{t.case_name}</p>
                  <p className="text-xs text-neutral-400">
                    <span className="font-mono">{t.treatment_number}</span>
                    {' · '}
                    {t.items?.length ?? 0} item{(t.items?.length ?? 0) !== 1 ? 's' : ''}
                    {' · '}
                    ₹{totalValue.toFixed(0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusOption && <StatusBadge color={statusOption.color as 'primary'}>{statusOption.label}</StatusBadge>}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                  className="text-neutral-300 hover:text-error-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-neutral-100">
                {(t.items ?? []).length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-neutral-400 mb-3">No items in this treatment yet.</p>
                    <button onClick={() => { setShowAddItem(t.id); setItemForm({ procedure_id: '', tooth_numbers: '', fee: 0, discount: 0, quantity: 1, priority: 'normal', notes: '' }); }} className="btn-secondary">
                      <Plus className="h-4 w-4" />
                      Add Item
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-neutral-100 bg-neutral-50">
                            <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-2">Procedure</th>
                            <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-2">Teeth</th>
                            <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-2">Fee</th>
                            <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-2">Disc.</th>
                            <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-2">Final</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {(t.items ?? []).map((item) => (
                            <tr key={item.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-neutral-900">{item.procedure?.name ?? 'Custom'}</p>
                                {item.notes && <p className="text-xs text-neutral-400">{item.notes}</p>}
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-600">{item.tooth_numbers.join(', ') || '—'}</td>
                              <td className="px-4 py-3 text-right text-sm text-neutral-600">₹{Number(item.fee).toFixed(0)}</td>
                              <td className="px-4 py-3 text-right text-sm text-neutral-600">₹{Number(item.discount).toFixed(0)}</td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-neutral-900">₹{Number(item.final_amount).toFixed(0)}</td>
                              <td className="px-4 py-3">
                                <button onClick={() => handleDeleteItem(item.id)} className="text-neutral-300 hover:text-error-600 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 border-t border-neutral-100">
                      <button onClick={() => { setShowAddItem(t.id); setItemForm({ procedure_id: '', tooth_numbers: '', fee: 0, discount: 0, quantity: 1, priority: 'normal', notes: '' }); }} className="btn-secondary">
                        <Plus className="h-4 w-4" />
                        Add Item
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* New treatment modal */}
      {showNew && (
        <Modal
          open={true}
          onClose={() => setShowNew(false)}
          title="New Treatment Case"
          footer={
            <>
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !newCaseName.trim()} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </button>
            </>
          }
        >
          <div>
            <label className="label">Case Name</label>
            <input
              className="input"
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              placeholder="e.g. Full mouth rehabilitation"
              autoFocus
            />
          </div>
        </Modal>
      )}

      {/* Add item modal */}
      {showAddItem && (
        <Modal
          open={true}
          onClose={() => setShowAddItem(null)}
          title="Add Treatment Item"
          footer={
            <>
              <button onClick={() => setShowAddItem(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleAddItem(showAddItem)} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Item'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">Procedure</label>
              <select
                className="input"
                value={itemForm.procedure_id}
                onChange={(e) => {
                  const proc = procedures.find((p) => p.id === e.target.value);
                  setItemForm((f) => ({ ...f, procedure_id: e.target.value, fee: proc?.default_fee ?? 0 }));
                }}
              >
                <option value="">Custom (no procedure)</option>
                {procedures.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ₹{p.default_fee}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tooth Numbers (comma-separated)</label>
                <input
                  className="input"
                  value={itemForm.tooth_numbers}
                  onChange={(e) => setItemForm((f) => ({ ...f, tooth_numbers: e.target.value }))}
                  placeholder="e.g. 16, 17"
                />
              </div>
              <div>
                <label className="label">Quantity</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={itemForm.fee}
                  onChange={(e) => setItemForm((f) => ({ ...f, fee: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="label">Discount (₹)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={itemForm.discount}
                  onChange={(e) => setItemForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={itemForm.priority} onChange={(e) => setItemForm((f) => ({ ...f, priority: e.target.value }))}>
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={itemForm.notes} onChange={(e) => setItemForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
