import { useState, useEffect, useCallback } from 'react';
import { Plus, PhoneCall, Loader2, Trash2, Calendar } from 'lucide-react';
import { fetchFollowUps, createFollowUp, deleteFollowUp, updateFollowUp } from '@/services/clinical.service';
import type { FollowUp } from '@/types/clinical';
import { FOLLOW_UP_STATUS_OPTIONS, FOLLOW_UP_PRIORITY_OPTIONS } from '@/constants/clinical';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

interface FollowUpsTabProps {
  patientId: string;
}

export default function FollowUpsTab({ patientId }: FollowUpsTabProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ reason: '', due_date: '', priority: 'normal', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFollowUps({ patientId });
      setFollowUps(data);
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
    if (!form.reason.trim() || !form.due_date) return;
    setSaving(true);
    try {
      await createFollowUp({
        patient_id: patientId,
        reason: form.reason,
        due_date: form.due_date,
        priority: form.priority,
        notes: form.notes || null,
      });
      setShowNew(false);
      setForm({ reason: '', due_date: '', priority: 'normal', notes: '' });
      await load();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateFollowUp(id, { status, last_contacted_at: status !== 'pending' ? new Date().toISOString() : null });
      await load();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFollowUp(id);
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
          Add Follow-up
        </button>
      </div>

      {followUps.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<PhoneCall className="h-7 w-7" />}
            title="No follow-ups"
            description="Schedule follow-ups or recalls for this patient."
          />
        </div>
      ) : (
        followUps.map((fu) => {
          const statusOpt = FOLLOW_UP_STATUS_OPTIONS.find((s) => s.value === fu.status);
          const isOverdue = fu.status === 'pending' && new Date(fu.due_date) < new Date();
          return (
            <div key={fu.id} className="card card-pad">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-neutral-900">{fu.reason}</p>
                    {statusOpt && <StatusBadge color={statusOpt.color as 'primary'}>{statusOpt.label}</StatusBadge>}
                    {isOverdue && <StatusBadge color="error">Overdue</StatusBadge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {new Date(fu.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span>Priority: {FOLLOW_UP_PRIORITY_OPTIONS.find((p) => p.value === fu.priority)?.label}</span>
                  </div>
                  {fu.notes && <p className="text-sm text-neutral-500 mt-2">{fu.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="input text-xs py-1 px-2 w-auto"
                    value={fu.status}
                    onChange={(e) => handleStatusChange(fu.id, e.target.value)}
                  >
                    {FOLLOW_UP_STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleDelete(fu.id)} className="text-neutral-300 hover:text-error-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {showNew && (
        <Modal
          open={true}
          onClose={() => setShowNew(false)}
          title="Add Follow-up"
          footer={
            <>
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.reason.trim() || !form.due_date} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">Reason <span className="text-error-500">*</span></label>
              <input className="input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Check healing after extraction" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Due Date <span className="text-error-500">*</span></label>
                <input type="date" className="input" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  {FOLLOW_UP_PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
