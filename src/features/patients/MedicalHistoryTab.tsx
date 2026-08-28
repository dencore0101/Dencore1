import { useState, useEffect } from 'react';
import { Loader2, Check, X, Minus, Save } from 'lucide-react';
import { upsertMedicalHistory } from '@/services/patient.service';
import type { PatientMedicalHistoryEntry, MedicalStatus } from '@/types/db';
import { MEDICAL_CONDITIONS, MEDICAL_CONDITION_LABELS } from '@/constants/patient';

interface MedicalHistoryTabProps {
  patientId: string;
  initialData: PatientMedicalHistoryEntry[];
  onSaved: () => void;
}

type EntryMap = Record<string, { status: MedicalStatus; notes: string; medication: string }>;

export default function MedicalHistoryTab({ patientId, initialData, onSaved }: MedicalHistoryTabProps) {
  const [entries, setEntries] = useState<EntryMap>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const map: EntryMap = {};
    for (const cond of MEDICAL_CONDITIONS) {
      const existing = initialData.find((e) => e.condition === cond);
      map[cond] = {
        status: (existing?.status as MedicalStatus) ?? 'unknown',
        notes: existing?.notes ?? '',
        medication: existing?.medication ?? '',
      };
    }
    setEntries(map);
  }, [initialData]);

  const setStatus = (condition: string, status: MedicalStatus) => {
    setEntries((prev) => ({ ...prev, [condition]: { ...prev[condition], status } }));
    setSaved(false);
  };

  const setNotes = (condition: string, field: 'notes' | 'medication', value: string) => {
    setEntries((prev) => ({ ...prev, [condition]: { ...prev[condition], [field]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const toSave = Object.entries(entries)
        .filter(([, v]) => v.status !== 'unknown' || v.notes || v.medication)
        .map(([condition, v]) => ({
          condition,
          status: v.status,
          notes: v.notes || null,
          medication: v.medication || null,
        }));
      await upsertMedicalHistory(patientId, toSave);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save medical history');
    } finally {
      setSaving(false);
    }
  };

  const statusIcons: Record<MedicalStatus, typeof Check> = {
    present: Check,
    absent: X,
    unknown: Minus,
  };

  const statusColors: Record<MedicalStatus, string> = {
    present: 'bg-error-100 text-error-700 border-error-300',
    absent: 'bg-success-100 text-success-700 border-success-300',
    unknown: 'bg-neutral-100 text-neutral-400 border-neutral-200',
  };

  return (
    <div className="card">
      <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Medical History</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Track conditions, allergies, and medications</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="m-4 rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
          {error}
        </div>
      )}

      <div className="divide-y divide-neutral-100">
        {MEDICAL_CONDITIONS.map((cond) => {
          const entry = entries[cond];
          if (!entry) return null;
          const Label = MEDICAL_CONDITION_LABELS[cond];
          return (
            <div key={cond} className="p-4 hover:bg-neutral-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900">{Label}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['present', 'absent', 'unknown'] as MedicalStatus[]).map((s) => {
                    const Icon = statusIcons[s];
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(cond, s)}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                          entry.status === s ? statusColors[s] : 'bg-white text-neutral-400 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {s === 'present' ? 'Yes' : s === 'absent' ? 'No' : '—'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {entry.status === 'present' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-0 sm:pl-1">
                  <input
                    className="input"
                    placeholder="Medication (e.g. Metformin 500mg)"
                    value={entry.medication}
                    onChange={(e) => setNotes(cond, 'medication', e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Notes"
                    value={entry.notes}
                    onChange={(e) => setNotes(cond, 'notes', e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
