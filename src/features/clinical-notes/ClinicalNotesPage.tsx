import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import type { ClinicalNote } from '@/types/clinical';

interface NoteWithPatient extends ClinicalNote {
  patient_name: string;
  patient_number: string;
}

export default function ClinicalNotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clinicId = localStorage.getItem('clinic_id');
      if (!clinicId) throw new Error('No active clinic');

      const { data, error } = await supabase
        .from('clinical_notes')
        .select('*, patient:patients(id, full_name, patient_number)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped = (data ?? []).map((n: Record<string, unknown>) => ({
        ...(n as unknown as ClinicalNote),
        patient_name: (n.patient as Record<string, string>)?.full_name ?? '—',
        patient_number: (n.patient as Record<string, string>)?.patient_number ?? '—',
      }));
      setNotes(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clinical notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader title="Clinical Notes" subtitle="Recent clinical notes across all patients" />

        <div className="card">
          {loading ? (
            <LoadingState label="Loading notes..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : notes.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-7 w-7" />}
              title="No clinical notes found"
              description="Clinical notes are created from the patient profile."
            />
          ) : (
            <div className="divide-y divide-neutral-100">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => navigate(`/app/patients/${note.patient_id}`)}
                  className="p-4 flex items-start justify-between hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge color="primary">{note.note_type === 'soap' ? 'SOAP' : 'Free-form'}</StatusBadge>
                      <p className="text-sm font-medium text-neutral-900">{note.patient_name}</p>
                      <span className="text-xs text-neutral-400">({note.patient_number})</span>
                    </div>
                    <p className="text-sm text-neutral-500 truncate">
                      {note.note_type === 'soap'
                        ? [note.subjective, note.objective, note.assessment, note.plan].filter(Boolean).join(' · ')
                        : note.notes}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(note.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-300 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
