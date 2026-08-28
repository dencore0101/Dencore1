import { useState, useEffect, useCallback } from 'react';
import { Bell, Loader2, Trash2, Send, MessageSquare, Mail, Smartphone, Globe } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { fetchNotifications, createNotification, deleteNotification } from '@/services/clinical.service';
import { fetchPatients } from '@/services/patient.service';
import type { Notification, NotificationChannel } from '@/types/clinical';
import type { Patient } from '@/types/db';

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string; icon: typeof Bell }[] = [
  { value: 'sms', label: 'SMS', icon: Smartphone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'in_app', label: 'In-App', icon: Globe },
];

const TEMPLATE_OPTIONS = [
  { value: 'appointment_reminder', label: 'Appointment Reminder' },
  { value: 'payment_receipt', label: 'Payment Receipt' },
  { value: 'treatment_update', label: 'Treatment Update' },
  { value: 'birthday', label: 'Birthday Wish' },
  { value: 'follow_up', label: 'Follow-up Reminder' },
  { value: 'custom', label: 'Custom Message' },
];

const STATUS_COLORS: Record<string, string> = {
  sent: 'success',
  pending: 'warning',
  failed: 'error',
  delivered: 'success',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications(channelFilter ? { channel: channelFilter } : undefined);
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [channelFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try { await deleteNotification(id); await load(); } catch { /* ignore */ }
  };

  const channelIcon = (channel: string) => {
    const opt = CHANNEL_OPTIONS.find((c) => c.value === channel);
    return opt ? opt.icon : Bell;
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Notifications"
          subtitle="Notification history and message center"
          actions={<button onClick={() => setShowForm(true)} className="btn-primary"><Send className="h-4 w-4" />Send Notification</button>}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {CHANNEL_OPTIONS.map((ch) => {
            const count = notifications.filter((n) => n.channel === ch.value).length;
            return (
              <div key={ch.value} className="card card-pad">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <ch.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-400 uppercase">{ch.label}</p>
                    <p className="text-lg font-semibold text-neutral-900">{count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="p-4 border-b border-neutral-200">
            <select className="input max-w-xs" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="">All channels</option>
              {CHANNEL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {loading ? (
            <LoadingState label="Loading notifications..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : notifications.length === 0 ? (
            <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications" description="Send a notification to get started." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {notifications.map((notif) => {
                const Icon = channelIcon(notif.channel);
                const template = TEMPLATE_OPTIONS.find((t) => t.value === notif.template_key);
                return (
                  <div key={notif.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-neutral-900">{notif.subject ?? template?.label ?? notif.template_key}</p>
                            <StatusBadge color={(STATUS_COLORS[notif.status] ?? 'neutral') as 'primary'}>{notif.status}</StatusBadge>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {notif.patient?.full_name ?? '—'}{' · '}
                            {new Date(notif.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{notif.body}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button onClick={() => handleDelete(notif.id)} className="text-neutral-300 hover:text-error-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <NotificationFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </AppShell>
  );
}

// ── Notification Form Modal ──────────────────────────────────
function NotificationFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_id: '', channel: 'sms' as NotificationChannel, template_key: 'custom', subject: '', body: '',
  });

  useEffect(() => {
    fetchPatients({ pageSize: 1000 }).then((res) => setPatients(res.data)).catch(() => {});
  }, []);

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patient_number.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phone ?? '').includes(patientSearch)
  );

  const handleSubmit = async () => {
    if (!form.body.trim()) { setError('Message body is required'); return; }
    setSaving(true); setError(null);
    try {
      await createNotification({
        patient_id: form.patient_id || null,
        channel: form.channel,
        template_key: form.template_key,
        subject: form.subject || null,
        body: form.body,
      });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Send Notification" size="lg"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !form.body.trim()} className="btn-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</button></>}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Channel</label>
            <select className="input" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as NotificationChannel }))}>
              {CHANNEL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Template</label>
            <select className="input" value={form.template_key} onChange={(e) => setForm((f) => ({ ...f, template_key: e.target.value }))}>
              {TEMPLATE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Patient (optional)</label>
          <input className="input mb-2" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patient..." />
          <select className="input" value={form.patient_id} onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}>
            <option value="">No specific patient</option>
            {filteredPatients.slice(0, 20).map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.patient_number})</option>)}
          </select>
        </div>
        <div><label className="label">Subject (optional)</label><input className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} /></div>
        <div><label className="label">Message <span className="text-error-500">*</span></label><textarea className="input" rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Type your message..." /></div>
      </div>
    </Modal>
  );
}
