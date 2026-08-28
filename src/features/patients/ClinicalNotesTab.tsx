import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Loader2, Trash2 } from 'lucide-react';
import { fetchClinicalNotes, createClinicalNote, deleteClinicalNote } from '@/services/clinical.service';
import type { ClinicalNote } from '@/types/clinical';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

interface ClinicalNotesTabProps {
  patientId: string;
}

export default function ClinicalNotesTab({ patientId }: ClinicalNotesTabProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [noteType, setNoteType] = useState<'freeform' | 'soap'>('freeform');
  const [form, setForm] = useState({
    notes: '', subjective: '', objective: '', assessment: '', plan: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClinicalNotes(patientId);
      setNotes(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createClinicalNote({
        patient_id: patientId,
        note_type: noteType,
        notes: noteType === 'freeform' ? form.notes : null,
        subjective: noteType === 'soap' ? form.subjective : null,
        objective: noteType === 'soap' ? form.objective : null,
        assessment: noteType === 'soap' ? form.assessment : null,
        plan: noteType === 'soap' ? form.plan : null,
      });
      setShowNew(false);
      setForm({ notes: '', subjective: '', objective: '', assessment: '', plan: '' });
      await load();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClinicalNote(id);
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
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="No clinical notes"
            description="Add free-form or SOAP notes for this patient."
          />
        </div>
      ) : (
        notes.map((note) => (
          <div key={note.id} className="card card-pad">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <StatusBadge color="primary">{note.note_type === 'soap' ? 'SOAP' : 'Free-form'}</StatusBadge>
                <span className="text-xs text-neutral-400">
                  {new Date(note.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button onClick={() => handleDelete(note.id)} className="text-neutral-300 hover:text-error-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {note.note_type === 'soap' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {note.subjective && <div><p className="text-xs font-semibold text-neutral-400 uppercase">Subjective</p><p className="text-neutral-700 mt-0.5">{note.subjective}</p></div>}
                {note.objective && <div><p className="text-xs font-semibold text-neutral-400 uppercase">Objective</p><p className="text-neutral-700 mt-0.5">{note.objective}</p></div>}
                {note.assessment && <div><p className="text-xs font-semibold text-neutral-400 uppercase">Assessment</p><p className="text-neutral-700 mt-0.5">{note.assessment}</p></div>}
                {note.plan && <div><p className="text-xs font-semibold text-neutral-400 uppercase">Plan</p><p className="text-neutral-700 mt-0.5">{note.plan}</p></div>}
              </div>
            ) : (
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{note.notes}</p>
            )}
          </div>
        ))
      )}

      {showNew && (
        <Modal
          open={true}
          onClose={() => setShowNew(false)}
          title="Add Clinical Note"
          size="lg"
          footer={
            <>
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Note'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setNoteType('freeform')}
                className={`btn ${noteType === 'freeform' ? 'bg-primary-600 text-white' : 'bg-white text-neutral-700 border border-neutral-200'}`}
              >
                Free-form
              </button>
              <button
                onClick={() => setNoteType('soap')}
                className={`btn ${noteType === 'soap' ? 'bg-primary-600 text-white' : 'bg-white text-neutral-700 border border-neutral-200'}`}
              >
                SOAP
              </button>
            </div>

            {noteType === 'freeform' ? (
              <div>
                <label className="label">Note</label>
                <textarea
                  className="input"
                  rows={6}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Write your clinical note..."
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label">Subjective</label>
                  <textarea className="input" rows={2} value={form.subjective} onChange={(e) => setForm((f) => ({ ...f, subjective: e.target.value }))} placeholder="Patient's complaints and symptoms..." />
                </div>
                <div>
                  <label className="label">Objective</label>
                  <textarea className="input" rows={2} value={form.objective} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} placeholder="Clinical findings and observations..." />
                </div>
                <div>
                  <label className="label">Assessment</label>
                  <textarea className="input" rows={2} value={form.assessment} onChange={(e) => setForm((f) => ({ ...f, assessment: e.target.value }))} placeholder="Diagnosis and assessment..." />
                </div>
                <div>
                  <label className="label">Plan</label>
                  <textarea className="input" rows={2} value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} placeholder="Treatment plan..." />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
