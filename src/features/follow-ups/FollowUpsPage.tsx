import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Calendar, Plus, Trash2, Edit2, MessageCircle, Copy, Check, Clock, Loader2, X, CalendarDays, List } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { fetchFollowUps, createFollowUp, updateFollowUp, deleteFollowUp, rescheduleFollowUp } from '@/services/clinical.service';
import { fetchPatients } from '@/services/patient.service';
import type { FollowUp } from '@/types/clinical';
import type { Patient } from '@/types/db';
import { FOLLOW_UP_STATUS_OPTIONS, FOLLOW_UP_PRIORITY_OPTIONS } from '@/constants/clinical';

interface FollowUpWithPatient extends FollowUp {
  patient_name: string;
  patient_number: string;
  patient_phone: string | null;
}

type ViewMode = 'list' | 'calendar';

export default function FollowUpsPage() {
  const navigate = useNavigate();
  const [followUps, setFollowUps] = useState<FollowUpWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingFu, setEditingFu] = useState<FollowUpWithPatient | null>(null);
  const [rescheduleFu, setRescheduleFu] = useState<FollowUpWithPatient | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFollowUps(statusFilter ? { status: statusFilter } : undefined);
      const mapped = data.map((f) => {
        const patient = f.patient as { id: string; full_name: string; patient_number: string; phone: string | null } | null;
        return {
          ...f,
          patient_name: patient?.full_name ?? '—',
          patient_number: patient?.patient_number ?? '—',
          patient_phone: patient?.phone ?? null,
        };
      });
      setFollowUps(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const whatsappLink = (phone: string | null, name: string, reason: string, dueDate: string) => {
    const num = (phone ?? '').replace(/\D/g, '');
    if (!num) return null;
    const msg = `Hello ${name}, this is a reminder for your follow-up: ${reason}. Scheduled for ${new Date(dueDate).toLocaleDateString()}. Please confirm your visit. Thank you!`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this follow-up?')) return;
    try {
      await deleteFollowUp(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateFollowUp(id, { status });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  // Calendar data
  const calendarData = useMemo(() => {
    const byDate: Record<string, FollowUpWithPatient[]> = {};
    for (const fu of followUps) {
      const dateKey = fu.due_date;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(fu);
    }
    return byDate;
  }, [followUps]);

  const today = new Date();
  const monthDays = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [today]);

  const dateKey = (d: Date) => d.toISOString().split('T')[0];

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader title="Follow-ups" subtitle="Patient follow-up and recall management with reminders" />

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <select className="input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {FOLLOW_UP_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
              <List className="h-4 w-4" /> List
            </button>
            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
              <CalendarDays className="h-4 w-4" /> Calendar
            </button>
          </div>
          <button onClick={() => { setEditingFu(null); setShowForm(true); }} className="btn-primary ml-auto">
            <Plus className="h-4 w-4" /> Add Follow-up
          </button>
        </div>

        {loading ? (
          <LoadingState label="Loading follow-ups..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : viewMode === 'list' ? (
          followUps.length === 0 ? (
            <div className="card">
              <EmptyState icon={<PhoneCall className="h-7 w-7" />} title="No follow-ups found" description="Create follow-ups to track patient recalls and reminders." />
            </div>
          ) : (
            <div className="card">
              <div className="divide-y divide-neutral-100">
                {followUps.map((fu) => {
                  const statusOpt = FOLLOW_UP_STATUS_OPTIONS.find((s) => s.value === fu.status);
                  const isOverdue = fu.status === 'pending' && new Date(fu.due_date) < new Date();
                  const waLink = whatsappLink(fu.patient_phone, fu.patient_name, fu.reason, fu.due_date);
                  const hasReminders = fu.reminder_1week || fu.reminder_1day || fu.reminder_sameday;
                  return (
                    <div key={fu.id} className="p-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/app/patients/${fu.patient_id}`)}>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-medium text-neutral-900">{fu.reason}</p>
                            {statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}
                            {isOverdue && <StatusBadge color="error">Overdue</StatusBadge>}
                          </div>
                          <p className="text-xs text-neutral-400">
                            {fu.patient_name} ({fu.patient_number})
                            {' · '}<Calendar className="h-3 w-3 inline" /> Due: {new Date(fu.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            {' · '}Priority: {FOLLOW_UP_PRIORITY_OPTIONS.find((p) => p.value === fu.priority)?.label}
                            {fu.reminder_time && ` · ⏰ ${fu.reminder_time}`}
                          </p>
                          {hasReminders && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="h-3 w-3 text-neutral-400" />
                              <span className="text-xs text-neutral-400">
                                Reminders: {fu.reminder_1week && '1 week, '}{fu.reminder_1day && '1 day, '}{fu.reminder_sameday && 'same day'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {fu.patient_phone && (
                            <>
                              <button onClick={() => copyPhone(fu.patient_phone!)} className="text-primary-500 hover:text-primary-700 p-1.5 rounded-lg hover:bg-primary-50" title="Copy phone">
                                {copiedPhone === fu.patient_phone ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                              {waLink && (
                                <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-success-500 hover:text-success-700 p-1.5 rounded-lg hover:bg-success-50" title="WhatsApp">
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </>
                          )}
                          <select
                            value={fu.status}
                            onChange={(e) => handleStatusChange(fu.id, e.target.value)}
                            className="text-xs border border-neutral-200 rounded-md px-2 py-1 bg-white"
                          >
                            {FOLLOW_UP_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <button onClick={() => { setEditingFu(fu); setShowForm(true); }} className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100" title="Edit">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setRescheduleFu(fu)} className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100" title="Reschedule">
                            <Calendar className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(fu.id)} className="text-error-400 hover:text-error-600 p-1.5 rounded-lg hover:bg-error-50" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          /* Calendar View */
          <div className="card">
            <div className="p-4 border-b border-neutral-200">
              <p className="text-sm font-semibold text-neutral-900">
                {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="grid grid-cols-7 gap-px bg-neutral-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="bg-neutral-50 p-2 text-center text-xs font-medium text-neutral-400">{d}</div>
              ))}
              {monthDays.map((d, i) => {
                if (!d) return <div key={i} className="bg-white min-h-24" />;
                const key = dateKey(d);
                const items = calendarData[key] ?? [];
                const isToday = key === dateKey(today);
                return (
                  <div key={i} className={`bg-white min-h-24 p-1.5 ${isToday ? 'ring-1 ring-primary-300' : ''}`}>
                    <p className={`text-xs mb-1 ${isToday ? 'font-bold text-primary-600' : 'text-neutral-400'}`}>{d.getDate()}</p>
                    {items.slice(0, 3).map((fu) => (
                      <button
                        key={fu.id}
                        onClick={() => navigate(`/app/patients/${fu.patient_id}`)}
                        className="block w-full text-left text-xs truncate rounded px-1 py-0.5 mb-0.5 bg-primary-50 text-primary-700 hover:bg-primary-100"
                      >
                        {fu.patient_name}
                      </button>
                    ))}
                    {items.length > 3 && <p className="text-xs text-neutral-400">+{items.length - 3} more</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <FollowUpFormModal
          editingFu={editingFu}
          onClose={() => { setShowForm(false); setEditingFu(null); }}
          onSaved={() => { setShowForm(false); setEditingFu(null); load(); }}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleFu && (
        <RescheduleModal
          fu={rescheduleFu}
          onClose={() => setRescheduleFu(null)}
          onRescheduled={() => { setRescheduleFu(null); load(); }}
        />
      )}
    </AppShell>
  );
}

function FollowUpFormModal({ editingFu, onClose, onSaved }: { editingFu: FollowUpWithPatient | null; onClose: () => void; onSaved: () => void }) {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(editingFu ? { id: editingFu.patient_id, full_name: editingFu.patient_name, patient_number: editingFu.patient_number } as Patient : null);
  const [reason, setReason] = useState(editingFu?.reason ?? '');
  const [dueDate, setDueDate] = useState(editingFu?.due_date ?? '');
  const [priority, setPriority] = useState(editingFu?.priority ?? 'normal');
  const [notes, setNotes] = useState(editingFu?.notes ?? '');
  const [reminderTime, setReminderTime] = useState(editingFu?.reminder_time ?? '');
  const [reminderMessage, setReminderMessage] = useState(editingFu?.reminder_message ?? '');
  const [r1week, setR1week] = useState(editingFu?.reminder_1week ?? false);
  const [r1day, setR1day] = useState(editingFu?.reminder_1day ?? false);
  const [rSameday, setRSameday] = useState(editingFu?.reminder_sameday ?? false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!editingFu && search.trim().length > 1) {
      fetchPatients({ search, pageSize: 10 }).then((r) => setPatients(r.data)).catch(() => setPatients([]));
    } else {
      setPatients([]);
    }
  }, [search, editingFu]);

  const handleSave = async () => {
    if (!selectedPatient || !reason || !dueDate) return;
    setSaving(true);
    setErr(null);
    try {
      if (editingFu) {
        await updateFollowUp(editingFu.id, {
          reason,
          due_date: dueDate,
          priority,
          notes: notes || null,
          reminder_time: reminderTime || null,
          reminder_message: reminderMessage || null,
          reminder_1week: r1week,
          reminder_1day: r1day,
          reminder_sameday: rSameday,
        });
      } else {
        await createFollowUp({
          patient_id: selectedPatient.id,
          reason,
          due_date: dueDate,
          priority,
          notes: notes || null,
          reminder_time: reminderTime || null,
          reminder_message: reminderMessage || null,
          reminder_1week: r1week,
          reminder_1day: r1day,
          reminder_sameday: rSameday,
        });
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} title={editingFu ? 'Edit Follow-up' : 'Add Follow-up'} onClose={onClose}>
      <div className="space-y-4">
        {err && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{err}</div>}

        {/* Patient selector */}
        {editingFu ? (
          <div className="rounded-lg bg-neutral-50 p-3">
            <p className="text-sm font-medium text-neutral-900">{selectedPatient?.full_name}</p>
            <p className="text-xs text-neutral-400">{selectedPatient?.patient_number}</p>
          </div>
        ) : !selectedPatient ? (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Patient</label>
            <input className="input" placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="mt-2 max-h-40 overflow-y-auto divide-y divide-neutral-100">
              {patients.map((p) => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]); }} className="w-full text-left p-2 hover:bg-neutral-50 rounded">
                  <span className="text-sm font-medium text-neutral-900">{p.full_name}</span>
                  <span className="text-xs text-neutral-400 ml-2">{p.patient_number}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-50 p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900">{selectedPatient.full_name}</p>
              <p className="text-xs text-neutral-400">{selectedPatient.patient_number}</p>
            </div>
            {!editingFu && <button onClick={() => setSelectedPatient(null)} className="text-neutral-400 hover:text-neutral-600"><X className="h-4 w-4" /></button>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Reason</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Recall after 6 months" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Due Date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {FOLLOW_UP_PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Reminders */}
        <div className="rounded-lg border border-neutral-200 p-3 space-y-3">
          <p className="text-sm font-medium text-neutral-700 flex items-center gap-1.5"><Clock className="h-4 w-4" /> Reminders</p>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Reminder Time</label>
            <input type="time" className="input" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={r1week} onChange={(e) => setR1week(e.target.checked)} className="rounded" />
              <span className="text-sm text-neutral-700">1 week before</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={r1day} onChange={(e) => setR1day(e.target.checked)} className="rounded" />
              <span className="text-sm text-neutral-700">1 day before</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={rSameday} onChange={(e) => setRSameday(e.target.checked)} className="rounded" />
              <span className="text-sm text-neutral-700">Same day morning</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Custom Reminder Message (optional)</label>
            <input className="input" value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} placeholder="Default message will be used if empty" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
          <textarea className="input min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !selectedPatient || !reason || !dueDate} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingFu ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RescheduleModal({ fu, onClose, onRescheduled }: { fu: FollowUpWithPatient; onClose: () => void; onRescheduled: () => void }) {
  const [newDate, setNewDate] = useState(fu.due_date);
  const [saving, setSaving] = useState(false);

  const handleReschedule = async () => {
    setSaving(true);
    try {
      await rescheduleFollowUp(fu.id, newDate);
      onRescheduled();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reschedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} title="Reschedule Follow-up" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-neutral-50 p-3">
          <p className="text-sm font-medium text-neutral-900">{fu.patient_name}</p>
          <p className="text-xs text-neutral-400">{fu.reason}</p>
          <p className="text-xs text-neutral-400 mt-1">Current date: {new Date(fu.due_date).toLocaleDateString()}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">New Date</label>
          <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleReschedule} disabled={saving || !newDate} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Reschedule
          </button>
        </div>
      </div>
    </Modal>
  );
}
