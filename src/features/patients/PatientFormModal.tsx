import { useState, useEffect, FormEvent } from 'react';
import Modal from '@/components/Modal';
import { createPatient, fetchReferralSources, type PatientInput } from '@/services/patient.service';
import type { ReferralSource, Patient } from '@/types/db';
import { GENDER_OPTIONS, BLOOD_GROUPS } from '@/constants/patient';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PatientFormModalProps {
  onClose: () => void;
  onSaved: (patient: Patient) => void;
  checkDuplicatePhone: (phone: string, excludeId?: string) => Promise<number>;
  patient?: Patient | null;
}

export default function PatientFormModal({ onClose, onSaved, checkDuplicatePhone }: PatientFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [referralSources, setReferralSources] = useState<ReferralSource[]>([]);

  const [form, setForm] = useState<PatientInput>({
    full_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    date_of_birth: '',
    gender: 'unknown',
    blood_group: '',
    address: '',
    occupation: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    chief_complaint: '',
    on_examination: '',
    provisional_diagnosis: '',
    referred_by_name: '',
    referral_source_id: null,
    notes: '',
    tags: [],
  });

  useEffect(() => {
    fetchReferralSources().then(setReferralSources).catch(() => {});
  }, []);

  const update = (field: keyof PatientInput, value: string | string[] | null) => {
    setForm((f) => ({ ...f, [field]: value || null }));
  };

  const handlePhoneBlur = async () => {
    if (!form.phone) {
      setPhoneWarning(null);
      return;
    }
    try {
      const count = await checkDuplicatePhone(form.phone);
      setPhoneWarning(count > 0 ? `${count} patient(s) already use this phone number.` : null);
    } catch {
      setPhoneWarning(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError('Full name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const patient = await createPatient({
        ...form,
        full_name: form.full_name.trim(),
      });
      onSaved(patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Register New Patient"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Patient'}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name <span className="text-error-500">*</span></label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.phone ?? ''}
              onChange={(e) => update('phone', e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="+91 98765 43210"
            />
            {phoneWarning && (
              <p className="text-xs text-warning-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {phoneWarning}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">WhatsApp</label>
            <input
              className="input"
              value={form.whatsapp ?? ''}
              onChange={(e) => update('whatsapp', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email ?? ''}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Date of Birth</label>
            <input
              type="date"
              className="input"
              value={form.date_of_birth ?? ''}
              onChange={(e) => update('date_of_birth', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={form.gender ?? 'unknown'}
              onChange={(e) => update('gender', e.target.value)}
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Blood Group</label>
            <select
              className="input"
              value={form.blood_group ?? ''}
              onChange={(e) => update('blood_group', e.target.value)}
            >
              <option value="">—</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea
            className="input"
            rows={2}
            value={form.address ?? ''}
            onChange={(e) => update('address', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Occupation</label>
            <input
              className="input"
              value={form.occupation ?? ''}
              onChange={(e) => update('occupation', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Referral Source</label>
            <select
              className="input"
              value={form.referral_source_id ?? ''}
              onChange={(e) => update('referral_source_id', e.target.value)}
            >
              <option value="">—</option>
              {referralSources.map((rs) => (
                <option key={rs.id} value={rs.id}>{rs.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Emergency Contact Name</label>
            <input
              className="input"
              value={form.emergency_contact_name ?? ''}
              onChange={(e) => update('emergency_contact_name', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Emergency Contact Phone</label>
            <input
              className="input"
              value={form.emergency_contact_phone ?? ''}
              onChange={(e) => update('emergency_contact_phone', e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4">
          <p className="text-sm font-semibold text-neutral-700 mb-3">Clinical Intake</p>
          <div className="space-y-3">
            <div>
              <label className="label">Chief Complaint</label>
              <textarea
                className="input"
                rows={2}
                value={form.chief_complaint ?? ''}
                onChange={(e) => update('chief_complaint', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">On Examination</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.on_examination ?? ''}
                  onChange={(e) => update('on_examination', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Provisional Diagnosis</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.provisional_diagnosis ?? ''}
                  onChange={(e) => update('provisional_diagnosis', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

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
