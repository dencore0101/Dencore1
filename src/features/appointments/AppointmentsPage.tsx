import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import { fetchAppointments, updateAppointment, deleteAppointment } from '@/services/appointment.service';
import type { Appointment } from '@/types/appointment';
import {
  APPOINTMENT_STATUS_OPTIONS, APPOINTMENT_TYPE_OPTIONS,
  APPOINTMENT_TYPE_COLORS, STATUS_COLOR_MAP,
} from '@/constants/appointment';
import AppointmentFormModal from './AppointmentFormModal';

type ViewMode = 'list' | 'day' | 'week';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (viewMode === 'day') {
        startDate = `${formatDate(selectedDate)}T00:00:00`;
        endDate = `${formatDate(selectedDate)}T23:59:59`;
      } else if (viewMode === 'week') {
        const start = startOfWeek(selectedDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        startDate = `${formatDate(start)}T00:00:00`;
        endDate = `${formatDate(end)}T00:00:00`;
      }

      const data = await fetchAppointments({
        startDate, endDate,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedDate, statusFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  };

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

  const dateLabel = (() => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const start = startOfWeek(selectedDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return 'All appointments';
  })();

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Appointments"
          subtitle="Schedule and manage patient appointments"
          actions={
            <button
              onClick={() => { setEditAppt(null); setShowForm(true); }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              New Appointment
            </button>
          }
        />

        {/* Controls */}
        <div className="card mb-4">
          <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* View toggle */}
            <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
              {(['list', 'day', 'week'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                    viewMode === m ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Date navigation */}
            {viewMode !== 'list' && (
              <div className="flex items-center gap-2">
                <button onClick={handlePrev} className="btn-ghost p-1.5">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-neutral-700 min-w-[200px] text-center">{dateLabel}</span>
                <button onClick={handleNext} className="btn-ghost p-1.5">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs text-primary-600 hover:text-primary-700 ml-2"
                >
                  Today
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 sm:ml-auto">
              <select
                className="input text-sm py-1.5 w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {APPOINTMENT_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select
                className="input text-sm py-1.5 w-auto"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                {APPOINTMENT_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState label="Loading appointments..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : appointments.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<CalendarDays className="h-7 w-7" />}
              title="No appointments found"
              description={viewMode === 'list' ? 'Create your first appointment to get started.' : 'No appointments for this period.'}
              action={
                <button onClick={() => { setEditAppt(null); setShowForm(true); }} className="btn-primary">
                  <Plus className="h-4 w-4" />
                  New Appointment
                </button>
              }
            />
          </div>
        ) : viewMode === 'week' ? (
          <WeekView
            appointments={appointments}
            onEdit={(a) => { setEditAppt(a); setShowForm(true); }}
            onPatientClick={(id) => navigate(`/app/patients/${id}`)}
            weekStart={startOfWeek(selectedDate)}
          />
        ) : (
          <ListView
            appointments={appointments}
            onEdit={(a) => { setEditAppt(a); setShowForm(true); }}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onPatientClick={(id) => navigate(`/app/patients/${id}`)}
          />
        )}
      </div>

      {showForm && (
        <AppointmentFormModal
          appointment={editAppt}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setEditAppt(null);
            load();
          }}
          defaultDate={viewMode === 'day' ? formatDate(selectedDate) : undefined}
        />
      )}
    </AppShell>
  );
}

// ── List View ─────────────────────────────────────────────────
function ListView({
  appointments, onEdit, onStatusChange, onDelete, onPatientClick,
}: {
  appointments: Appointment[];
  onEdit: (a: Appointment) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onPatientClick: (id: string) => void;
}) {
  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Patient</th>
              <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Date & Time</th>
              <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {appointments.map((apt) => {
              const typeOpt = APPOINTMENT_TYPE_OPTIONS.find((t) => t.value === apt.type);
              return (
                <tr key={apt.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onPatientClick(apt.patient_id)}
                      className="text-sm font-medium text-neutral-900 hover:text-primary-600"
                    >
                      {apt.patient?.full_name ?? 'Unknown'}
                    </button>
                    <p className="text-xs text-neutral-400">{apt.appointment_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-neutral-600">
                      {new Date(apt.start_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs text-neutral-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(apt.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{apt.duration_min}min
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${APPOINTMENT_TYPE_COLORS[apt.type]}`}>
                      {typeOpt?.label ?? apt.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="input text-xs py-1 px-2 w-auto"
                      value={apt.status}
                      onChange={(e) => onStatusChange(apt.id, e.target.value)}
                    >
                      {APPOINTMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit(apt)} className="text-xs text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => onDelete(apt.id)} className="text-xs text-neutral-400 hover:text-error-600">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────
function WeekView({
  appointments, onEdit, onPatientClick, weekStart,
}: {
  appointments: Appointment[];
  onEdit: (a: Appointment) => void;
  onPatientClick: (id: string) => void;
  weekStart: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const apptsByDay = days.map((day) => {
    const dayStr = formatDate(day);
    return {
      day,
      appointments: appointments
        .filter((a) => formatDate(new Date(a.start_time)) === dayStr)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    };
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {apptsByDay.map(({ day, appointments: dayAppts }) => (
        <div key={day.toISOString()} className="card min-h-[200px]">
          <div className="p-3 border-b border-neutral-200">
            <p className="text-xs font-semibold text-neutral-500 uppercase">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
            <p className="text-sm font-medium text-neutral-900">
              {day.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div className="p-2 space-y-2">
            {dayAppts.length === 0 ? (
              <p className="text-xs text-neutral-300 text-center py-4">No appointments</p>
            ) : (
              dayAppts.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => onEdit(apt)}
                  className="w-full text-left rounded-lg border border-neutral-200 p-2 hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${APPOINTMENT_TYPE_COLORS[apt.type]}`}>
                      {apt.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p
                    onClick={(e) => { e.stopPropagation(); onPatientClick(apt.patient_id); }}
                    className="text-xs font-medium text-neutral-900 hover:text-primary-600 truncate"
                  >
                    {apt.patient?.full_name ?? 'Unknown'}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {new Date(apt.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="mt-1">
                    <StatusBadge color={(STATUS_COLOR_MAP[apt.status] ?? 'neutral') as 'primary'}>
                      {APPOINTMENT_STATUS_OPTIONS.find((s) => s.value === apt.status)?.label ?? apt.status}
                    </StatusBadge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
