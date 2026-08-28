import { useState, FormEvent, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import Modal from '@/components/Modal';
import { createAppointment, updateAppointment, checkOverlap, type AppointmentInput } from '@/services/appointment.service';
import type { Appointment, AppointmentOverlap } from '@/types/appointment';
import type { Patient } from '@/types/db';
import { APPOINTMENT_TYPE_OPTIONS, APPOINTMENT_STATUS_OPTIONS, DURATION_OPTIONS } from '@/constants/appointment';
import SearchInput from '@/components/SearchInput';
import { fetchPatients } from '@/services/patient.service';

interface AppointmentFormModalProps {
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
  appointment?: Appointment | null;
  defaultPatientId?: string | null;
  defaultDate?: string | null;
}

export default function AppointmentFormModal({
  onClose, onSaved, appointment, defaultPatientId, defaultDate,
}: AppointmentFormModalProps) {
  const isEdit = !!appointment;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlaps, setOverlaps] = useState<AppointmentOverlap[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(!defaultPatientId && !isEdit);

  const [form, setForm] = useState<AppointmentInput>({
    patient_id: defaultPatientId ?? appointment?.patient_id ?? '',
    dentist_id: appointment?.dentist_id ?? null,
    chair: appointment?.chair ?? null,
    start_time: appointment?.start_time
      ? new Date(appointment.start_time).toISOString().slice(0, 16)
      : defaultDate
        ? `${defaultDate}T09:00`
        : new Date().toISOString().slice(0, 16),
    duration_min: appointment?.duration_min ?? 30,
    type: appointment?.type ?? 'consultation',
    status: appointment?.status ?? 'scheduled',
    notes: appointment?.notes ?? null,
  });

  const update = (field: keyof AppointmentInput, value: string | number | null) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  useEffect(() => {
    if (patientSearch.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await fetchPatients({ search: patientSearch, page: 1, pageSize: 10 });
        setPatientResults(data);
      } catch {
        setPatientResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleCheckOverlap = async () => {
    if (!form.start_time || !form.dentist_id) {
      setOverlaps([]);
      return;
    }
    try {
      const result = await checkOverlap({
        dentistId: form.dentist_id,
        startTime: new Date(form.start_time).toISOString(),
        durationMin: form.duration_min ?? 30,
        excludeId: appointment?.id,
      });
      setOverlaps(result);
    } catch {
      setOverlaps([]);
    }
  };

  useEffect(() => {
    if (form.start_time && form.dentist_id) {
      handleCheckOverlap();
    } else {
      setOverlaps([]);
    }
  }, [form.start_time, form.dentist_id, form.duration_min]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) {
      setError('Please select a patient');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
      };
      if (isEdit && appointment) {
        const updated = await updateAppointment(appointment.id, payload);
        onSaved(updated);
      } else {
        const created = await createAppointment(payload);
        onSaved(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? 'Edit Appointment' : 'New Appointment'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.patient_id} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Update' : 'Create'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
            {error}
          </div>
        )}

        {/* Patient selection */}
        {showPatientSearch ? (
          <div>
            <label className="label">Patient <span className="text-error-500">*</span></label>
            <SearchInput
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onClear={() => setPatientSearch('')}
              placeholder="Search patient by name or phone..."
            />
            {patientResults.length > 0 && (
              <div className="mt-2 border border-neutral-200 rounded-lg max-h-48 overflow-y-auto scrollbar-thin">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      update('patient_id', p.id);
                      setShowPatientSearch(false);
                      setPatientSearch('');
                      setPatientResults([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-neutral-900">{p.full_name}</p>
                    <p className="text-xs text-neutral-400">{p.patient_number} · {p.phone ?? 'No phone'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-200">
            <p className="text-sm text-neutral-700">Patient selected</p>
            <button
              onClick={() => { setShowPatientSearch(true); update('patient_id', ''); }}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Change patient
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Date & Time <span className="text-error-500">*</span></label>
            <input
              type="datetime-local"
              className="input"
              value={form.start_time}
              onChange={(e) => update('start_time', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Duration</label>
            <select
              className="input"
              value={form.duration_min}
              onChange={(e) => update('duration_min', parseInt(e.target.value))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
            >
              {APPOINTMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              {APPOINTMENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Dentist</label>
            <input
              className="input"
              value={form.dentist_id ?? ''}
              onChange={(e) => update('dentist_id', e.target.value || null)}
              placeholder="Dentist ID (optional)"
            />
          </div>
          <div>
            <label className="label">Chair</label>
            <input
              className="input"
              value={form.chair ?? ''}
              onChange={(e) => update('chair', e.target.value || null)}
              placeholder="Chair number (optional)"
            />
          </div>
        </div>

        {/* Overlap warning */}
        {overlaps.length > 0 && (
          <div className="rounded-lg bg-warning-50 border border-warning-200 px-3 py-2">
            <p className="text-sm font-medium text-warning-800 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-4 w-4" />
              Scheduling conflict detected
            </p>
            <ul className="text-xs text-warning-700 space-y-0.5">
              {overlaps.map((o) => (
                <li key={o.id}>
                  {o.patient_name} — {new Date(o.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({o.duration_min} min)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={form.notes ?? ''}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
