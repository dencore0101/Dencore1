import { useState, useRef, useCallback } from 'react';
import { Settings as SettingsIcon, Download, Upload, FileJson, FileSpreadsheet, Loader2, CheckCircle, Database, Users } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import {
  exportBackup, downloadBackup, parsePatientCSV, importPatients,
  type PatientCSVRow,
} from '@/services/backup.service';

type Tab = 'overview' | 'backup' | 'import';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <PageHeader title="Settings" subtitle="Clinic configuration and data management" />

        {/* Tab toggle */}
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 mb-6 w-fit">
          {([
            { value: 'overview', label: 'Overview' },
            { value: 'backup', label: 'Backup' },
            { value: 'import', label: 'Import' },
          ] as { value: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <OverviewTab clinicName={profile?.clinic?.name ?? '—'} role={profile?.role ?? 'member'} />}
        {activeTab === 'backup' && <BackupTab />}
        {activeTab === 'import' && <ImportTab />}
      </div>
    </AppShell>
  );
}

// ── Overview Tab ─────────────────────────────────────────────
function OverviewTab({ clinicName, role }: { clinicName: string; role: string }) {
  return (
    <div className="space-y-6">
      <div className="card card-pad">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Clinic Information</h3>
            <p className="text-sm text-neutral-500 mt-1">{clinicName}</p>
            <p className="text-xs text-neutral-400 mt-0.5">Your role: <span className="font-medium text-neutral-600 capitalize">{role}</span></p>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Data Management</h3>
            <p className="text-sm text-neutral-500 mt-1">Export your clinic data as a versioned JSON backup, or import patients from a CSV file. For restore, use the Supabase dashboard or contact support.</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-neutral-200 p-3">
                <FileJson className="h-5 w-5 text-primary-500 mb-1" />
                <p className="text-sm font-medium text-neutral-900">JSON Backup</p>
                <p className="text-xs text-neutral-400">Full clinic export</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <FileSpreadsheet className="h-5 w-5 text-accent-500 mb-1" />
                <p className="text-sm font-medium text-neutral-900">CSV Import</p>
                <p className="text-xs text-neutral-400">Bulk add patients</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Backup Tab ───────────────────────────────────────────────
function BackupTab() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    setSuccess(false);
    try {
      const backup = await exportBackup();
      downloadBackup(backup);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export backup');
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="card card-pad">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <FileJson className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Export Backup</h3>
          <p className="text-sm text-neutral-500 mt-1">Download a versioned JSON file containing all your clinic data across 22 tables.</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700 mb-4">{error}</div>}
      {success && <div className="rounded-lg bg-success-50 border border-success-200 px-3 py-2 text-sm text-success-700 mb-4 flex items-center gap-2"><CheckCircle className="h-4 w-4" />Backup downloaded successfully.</div>}

      <button onClick={handleExport} disabled={exporting} className="btn-primary">
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {exporting ? 'Exporting...' : 'Export Backup'}
      </button>
    </div>
  );
}

// ── Import Tab ───────────────────────────────────────────────
function ImportTab() {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [preview, setPreview] = useState<PatientCSVRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const rows = parsePatientCSV(text);
      if (rows.length === 0) {
        setError('No valid rows found. Ensure the CSV has a "full_name" or "name" column.');
        return;
      }
      setPreview(rows);
    } catch {
      setError('Failed to parse CSV file');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await importPatients(preview);
      setResult(res);
      if (res.imported > 0) setPreview([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import');
    } finally {
      setImporting(false);
    }
  }, [preview]);

  return (
    <div className="space-y-6">
      <div className="card card-pad">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Import Patients from CSV</h3>
            <p className="text-sm text-neutral-500 mt-1">Upload a CSV file with patient data. Required column: <code className="text-xs bg-neutral-100 px-1 rounded">full_name</code> or <code className="text-xs bg-neutral-100 px-1 rounded">name</code>.</p>
          </div>
        </div>

        <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 mb-4">
          <p className="text-xs font-medium text-neutral-500 mb-1">Supported columns:</p>
          <p className="text-xs text-neutral-400">full_name, phone, email, date_of_birth, gender, blood_group, address, occupation</p>
        </div>

        {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700 mb-4">{error}</div>}

        {result && (
          <div className="rounded-lg bg-success-50 border border-success-200 px-3 py-2 text-sm text-success-700 mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Imported {result.imported} patient{result.imported !== 1 ? 's' : ''} successfully.
            {result.errors.length > 0 && <span className="text-error-600 ml-2">({result.errors.length} errors)</span>}
          </div>
        )}

        {result && result.errors.length > 0 && (
          <div className="rounded-lg bg-error-50 border border-error-200 p-3 mb-4 max-h-32 overflow-y-auto">
            {result.errors.map((err, i) => (
              <p key={i} className="text-xs text-error-600">{err}</p>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
          <FileSpreadsheet className="h-4 w-4" />
          Select CSV File
        </button>
      </div>

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Preview ({preview.length} rows)</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Review the data before importing</p>
            </div>
            <button onClick={handleImport} disabled={importing} className="btn-primary">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Importing...' : `Import ${preview.length} Patients`}
            </button>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 sticky top-0">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-2">Name</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-2">Phone</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-2">Email</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-2">Gender</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-2">DOB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {preview.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-4 py-2 text-sm font-medium text-neutral-900">{row.full_name}</td>
                    <td className="px-4 py-2 text-sm text-neutral-600">{row.phone ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-neutral-600">{row.email ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-neutral-600">{row.gender ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-neutral-500">{row.date_of_birth ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <p className="text-xs text-neutral-400 text-center py-2">Showing first 50 of {preview.length} rows</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
