import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  fetchDentalChart, addChartCondition, deleteChartCondition,
} from '@/services/clinical.service';
import type { DentalChartCondition } from '@/types/clinical';
import {
  ADULT_TEETH_UPPER_RIGHT, ADULT_TEETH_UPPER_LEFT,
  ADULT_TEETH_LOWER_LEFT, ADULT_TEETH_LOWER_RIGHT,
  TOOTH_CONDITIONS,
} from '@/constants/clinical';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';

interface DentalChartTabProps {
  patientId: string;
}

const CONDITION_COLORS: Record<string, string> = {
  present: 'bg-white border-neutral-300',
  missing: 'bg-neutral-200 border-neutral-400 text-neutral-500',
  caries: 'bg-error-100 border-error-400',
  recurrent_caries: 'bg-error-100 border-error-400',
  composite: 'bg-primary-100 border-primary-400',
  gic: 'bg-primary-50 border-primary-300',
  amalgam: 'bg-neutral-300 border-neutral-500',
  temporary_restoration: 'bg-warning-100 border-warning-400',
  crown: 'bg-secondary-100 border-secondary-400',
  bridge_abutment: 'bg-secondary-100 border-secondary-400',
  bridge_pontic: 'bg-secondary-50 border-secondary-300',
  veneer: 'bg-secondary-50 border-secondary-300',
  implant: 'bg-accent-100 border-accent-400',
  rct_planned: 'bg-warning-50 border-warning-300',
  rct_completed: 'bg-success-100 border-success-400',
  periapical_lesion: 'bg-error-50 border-error-300',
  fracture: 'bg-error-100 border-error-400',
  extraction_planned: 'bg-warning-50 border-warning-300',
  extraction_completed: 'bg-neutral-200 border-neutral-400',
  treatment_planned: 'bg-warning-50 border-warning-300',
  treatment_completed: 'bg-success-50 border-success-300',
  unerupted: 'bg-neutral-50 border-neutral-200 text-neutral-300',
  impacted: 'bg-neutral-100 border-neutral-300',
};

function getToothColor(conditions: DentalChartCondition[]): string {
  if (conditions.length === 0) return CONDITION_COLORS.present;
  const latest = conditions[conditions.length - 1];
  return CONDITION_COLORS[latest.condition] ?? CONDITION_COLORS.present;
}

function ToothButton({
  number, conditions, onClick,
}: {
  number: number; conditions: DentalChartCondition[]; onClick: () => void;
}) {
  const color = getToothColor(conditions);
  return (
    <button
      onClick={onClick}
      className={`relative flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all hover:scale-105 hover:shadow-md ${color}`}
      title={conditions.length > 0 ? conditions.map((c) => `${c.condition}${c.surface ? ` (${c.surface})` : ''}`).join(', ') : 'Healthy'}
    >
      {number}
      {conditions.length > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white text-[10px]">
          {conditions.length}
        </span>
      )}
    </button>
  );
}

export default function DentalChartTab({ patientId }: DentalChartTabProps) {
  const [chart, setChart] = useState<Record<number, DentalChartCondition[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCondition, setNewCondition] = useState('');
  const [newSurface, setNewSurface] = useState('');
  const [newStatus, setNewStatus] = useState('present');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDentalChart(patientId);
      const map: Record<number, DentalChartCondition[]> = {};
      for (const c of data) {
        if (!map[c.tooth_number]) map[c.tooth_number] = [];
        map[c.tooth_number].push(c);
      }
      setChart(map);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddCondition = async () => {
    if (!selectedTooth || !newCondition) return;
    setSaving(true);
    try {
      await addChartCondition({
        patient_id: patientId,
        tooth_number: selectedTooth,
        condition: newCondition,
        surface: newSurface || null,
        status: newStatus,
        notes: newNotes || null,
      });
      setShowAdd(false);
      setNewCondition('');
      setNewSurface('');
      setNewNotes('');
      setNewStatus('present');
      await load();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCondition = async (id: string) => {
    try {
      await deleteChartCondition(id);
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

  return (
    <div className="space-y-4">
      <div className="card card-pad">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-900">Dental Chart (FDI)</h3>
          <span className="text-xs text-neutral-400">Click a tooth to add conditions</span>
        </div>

        {/* Upper jaw */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-center gap-1 flex-wrap">
            {[...ADULT_TEETH_UPPER_RIGHT, ...ADULT_TEETH_UPPER_LEFT].map((n) => (
              <ToothButton
                key={n}
                number={n}
                conditions={chart[n] ?? []}
                onClick={() => { setSelectedTooth(n); setShowAdd(true); }}
              />
            ))}
          </div>
        </div>

        <div className="border-t-2 border-dashed border-neutral-200 my-4" />

        {/* Lower jaw */}
        <div className="space-y-2">
          <div className="flex justify-center gap-1 flex-wrap">
            {[...ADULT_TEETH_LOWER_RIGHT, ...ADULT_TEETH_LOWER_LEFT].reverse().map((n) => (
              <ToothButton
                key={n}
                number={n}
                conditions={chart[n] ?? []}
                onClick={() => { setSelectedTooth(n); setShowAdd(true); }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card card-pad">
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Legend</h4>
        <div className="flex flex-wrap gap-2">
          {TOOTH_CONDITIONS.slice(0, 12).map((c) => (
            <div key={c.value} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded border ${CONDITION_COLORS[c.value] ?? CONDITION_COLORS.present}`} />
              <span className="text-xs text-neutral-600">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conditions list */}
      {Object.entries(chart).length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-neutral-200">
            <h4 className="text-sm font-semibold text-neutral-900">Recorded Conditions</h4>
          </div>
          <div className="divide-y divide-neutral-100">
            {Object.entries(chart).map(([tooth, conditions]) => (
              <div key={tooth} className="p-4">
                <p className="text-sm font-medium text-neutral-900 mb-2">Tooth {tooth}</p>
                <div className="space-y-1.5">
                  {conditions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge color={c.status === 'completed' ? 'success' : c.status === 'planned' ? 'warning' : 'neutral'}>
                          {TOOTH_CONDITIONS.find((tc) => tc.value === c.condition)?.label ?? c.condition}
                        </StatusBadge>
                        {c.surface && <span className="text-xs text-neutral-400">Surface: {c.surface}</span>}
                        {c.notes && <span className="text-xs text-neutral-400">— {c.notes}</span>}
                      </div>
                      <button
                        onClick={() => handleDeleteCondition(c.id)}
                        className="text-neutral-300 hover:text-error-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add condition modal */}
      {showAdd && selectedTooth && (
        <Modal
          open={true}
          onClose={() => setShowAdd(false)}
          title={`Add Condition — Tooth ${selectedTooth}`}
          footer={
            <>
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddCondition} disabled={saving || !newCondition} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">Condition</label>
              <select className="input" value={newCondition} onChange={(e) => setNewCondition(e.target.value)}>
                <option value="">Select condition...</option>
                {TOOTH_CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Surface (optional)</label>
                <select className="input" value={newSurface} onChange={(e) => setNewSurface(e.target.value)}>
                  <option value="">—</option>
                  {['M', 'O', 'I', 'D', 'B', 'F', 'L', 'P'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="present">Existing</option>
                  <option value="planned">Planned</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
