import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, User, AlertTriangle,
  Activity, Clock, FolderOpen, ClipboardList, Stethoscope, PhoneCall, FileText, CalendarDays, CreditCard, Pill, FileCheck,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import { fetchPatientById, fetchMedicalHistory, fetchPatientAlerts } from '@/services/patient.service';
import type { Patient, PatientMedicalHistoryEntry, PatientAlert } from '@/types/db';
import MedicalHistoryTab from './MedicalHistoryTab';
import DentalChartTab from './DentalChartTab';
import TreatmentsTab from './TreatmentsTab';
import ClinicalNotesTab from './ClinicalNotesTab';
import FollowUpsTab from './FollowUpsTab';
import AppointmentsTab from './AppointmentsTab';
import BillingTab from './BillingTab';
import PrescriptionsTab from './PrescriptionsTab';
import ConsentFormsTab from './ConsentFormsTab';

type Tab = 'overview' | 'timeline' | 'medical' | 'chart' | 'treatments' | 'notes' | 'followups' | 'appointments' | 'billing' | 'prescriptions' | 'consents' | 'files';

const TABS: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'medical', label: 'Medical History', icon: AlertTriangle },
  { key: 'chart', label: 'Dental Chart', icon: Activity },
  { key: 'treatments', label: 'Treatment Plan', icon: Stethoscope },
  { key: 'notes', label: 'Clinical Notes', icon: FileText },
  { key: 'followups', label: 'Follow-ups', icon: PhoneCall },
  { key: 'appointments', label: 'Appointments', icon: CalendarDays },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { key: 'consents', label: 'Consent Forms', icon: FileCheck },
  { key: 'files', label: 'Files', icon: FolderOpen },
];

function calculateAge(dob: string | null): string {
  if (!dob) return '—';
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age}y`;
}

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<PatientMedicalHistoryEntry[]>([]);
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [p, mh, al] = await Promise.all([
        fetchPatientById(id),
        fetchMedicalHistory(id),
        fetchPatientAlerts(id),
      ]);
      if (!p) {
        setError('Patient not found');
        return;
      }
      setPatient(p);
      setMedicalHistory(mh);
      setAlerts(al);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const activeAlerts = alerts.filter((a) => a.severity !== 'low');
  const presentConditions = medicalHistory.filter((m) => m.status === 'present');

  if (loading) {
    return (
      <AppShell>
        <LoadingState label="Loading patient..." />
      </AppShell>
    );
  }

  if (error || !patient) {
    return (
      <AppShell>
        <div className="p-6 max-w-7xl mx-auto">
          <ErrorState message={error ?? 'Patient not found'} onRetry={() => navigate('/app/patients')} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => navigate('/app/patients')}
          className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </button>

        {/* Patient Header */}
        <div className="card mb-6">
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 text-xl font-semibold">
                {patient.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-semibold text-neutral-900">{patient.full_name}</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      <span className="font-mono">{patient.patient_number}</span>
                      <span className="mx-2">·</span>
                      {calculateAge(patient.date_of_birth)}
                      <span className="mx-2">·</span>
                      {patient.gender !== 'unknown' ? patient.gender : '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {presentConditions.length > 0 && (
                      <StatusBadge color="error">
                        <AlertTriangle className="h-3 w-3" />
                        {presentConditions.length} medical alert{presentConditions.length > 1 ? 's' : ''}
                      </StatusBadge>
                    )}
                    {patient.blood_group && (
                      <StatusBadge color="error">Blood: {patient.blood_group}</StatusBadge>
                    )}
                  </div>
                </div>

                {/* Contact info row */}
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-neutral-600">
                  {patient.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-neutral-400" />
                      {patient.phone}
                    </span>
                  )}
                  {patient.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-neutral-400" />
                      {patient.email}
                    </span>
                  )}
                  {patient.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      <span className="truncate max-w-xs">{patient.address}</span>
                    </span>
                  )}
                </div>

                {/* Alert badges */}
                {activeAlerts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeAlerts.map((a) => (
                      <div
                        key={a.id}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                          a.severity === 'high'
                            ? 'bg-error-50 text-error-700 border border-error-200'
                            : 'bg-warning-50 text-warning-700 border border-warning-200'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {a.alert_text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-neutral-200 px-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-thin">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <OverviewTab patient={patient} />}
        {activeTab === 'timeline' && (
          <div className="card card-pad">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-400">Timeline will be built as clinical modules are added</p>
            </div>
          </div>
        )}
        {activeTab === 'medical' && (
          <MedicalHistoryTab
            patientId={patient.id}
            initialData={medicalHistory}
            onSaved={() => load()}
          />
        )}
        {activeTab === 'chart' && (
          <DentalChartTab patientId={patient.id} />
        )}
        {activeTab === 'treatments' && (
          <TreatmentsTab patientId={patient.id} />
        )}
        {activeTab === 'notes' && (
          <ClinicalNotesTab patientId={patient.id} />
        )}
        {activeTab === 'followups' && (
          <FollowUpsTab patientId={patient.id} />
        )}
        {activeTab === 'appointments' && (
          <AppointmentsTab patientId={patient.id} />
        )}
        {activeTab === 'billing' && (
          <BillingTab patientId={patient.id} />
        )}
        {activeTab === 'prescriptions' && (
          <PrescriptionsTab patientId={patient.id} />
        )}
        {activeTab === 'consents' && (
          <ConsentFormsTab patientId={patient.id} />
        )}
        {activeTab === 'files' && (
          <div className="card card-pad">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-400">File upload will be available in a later phase</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function OverviewTab({ patient }: { patient: Patient }) {
  const fields = [
    { label: 'Date of Birth', value: patient.date_of_birth ?? '—' },
    { label: 'Gender', value: patient.gender !== 'unknown' ? patient.gender : '—' },
    { label: 'Blood Group', value: patient.blood_group ?? '—' },
    { label: 'Occupation', value: patient.occupation ?? '—' },
    { label: 'WhatsApp', value: patient.whatsapp ?? '—' },
    { label: 'Emergency Contact', value: patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone ?? '—'})` : '—' },
    { label: 'Referral Source', value: patient.referral_source?.name ?? patient.referred_by_name ?? '—' },
    { label: 'Anniversary', value: patient.anniversary_date ?? '—' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Demographics */}
      <div className="card card-pad lg:col-span-2">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">Patient Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{f.label}</p>
              <p className="text-sm text-neutral-900 mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
        {patient.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {patient.tags.map((t) => (
                <StatusBadge key={t} color="secondary">{t}</StatusBadge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clinical intake */}
      <div className="card card-pad">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-neutral-400" />
          Clinical Intake
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Chief Complaint</p>
            <p className="text-sm text-neutral-900 mt-0.5">{patient.chief_complaint ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">On Examination</p>
            <p className="text-sm text-neutral-900 mt-0.5">{patient.on_examination ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Provisional Diagnosis</p>
            <p className="text-sm text-neutral-900 mt-0.5">{patient.provisional_diagnosis ?? '—'}</p>
          </div>
          {patient.notes && (
            <div>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Notes</p>
              <p className="text-sm text-neutral-900 mt-0.5">{patient.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
