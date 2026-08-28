import { useState, useEffect, useCallback } from 'react';
import { Plus, CalendarDays, Loader2, Clock, Trash2 } from 'lucide-react';
import { fetchAppointmentsByPatient, deleteAppointment, updateAppointment } from '@/services/appointment.service';
import type { Appointment } from '@/types/appointment';
import { APPOINTMENT_STATUS_OPTIONS, APPOINTMENT_TYPE_OPTIONS, APPOINTMENT_TYPE_COLORS } from '@/constants/appointment';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import AppointmentFormModal from '@/features/appointments/AppointmentFormModal';

interface AppointmentsTabProps {
  patientId: string;
}

export default function AppointmentsTab({ patientId }: AppointmentsTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppointmentsByPatient(patientId);
      setAppointments(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateAppointment(id, { status: status as Appointment['status'] });
      await load();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAppointment(id);
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
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Book Appointment
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CalendarDays className="h-7 w-7" />}
            title="No appointments"
            description="Book an appointment for this patient."
          />
        </div>
      ) : (
        appointments.map((apt) => {
          const typeOpt = APPOINTMENT_TYPE_OPTIONS.find((t) => t.value === apt.type);
          const statusOpt = APPOINTMENT_STATUS_OPTIONS.find((s) => s.value === apt.status);
          return (
            <div key={apt.id} className="card card-pad">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${APPOINTMENT_TYPE_COLORS[apt.type]}`}>
                      {typeOpt?.label ?? apt.type}
                    </span>
                    {statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}
                  </div>
                  <p className="text-sm text-neutral-600 flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
                    {new Date(apt.start_time).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    <Clock className="h-3.5 w-3.5 text-neutral-400 ml-2" />
                    {new Date(apt.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{apt.duration_min} min
                  </p>
                  {apt.chair && <p className="text-xs text-neutral-400 mt-1">Chair: {apt.chair}</p>}
                  {apt.notes && <p className="text-sm text-neutral-500 mt-2">{apt.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="input text-xs py-1 px-2 w-auto"
                    value={apt.status}
                    onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                  >
                    {APPOINTMENT_STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleDelete(apt.id)} className="text-neutral-300 hover:text-error-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {showForm && (
        <AppointmentFormModal
          defaultPatientId={patientId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
