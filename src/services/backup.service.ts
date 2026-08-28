import { supabase } from '@/lib/supabase';
import { getClinicId } from '@/lib/clinic';

// Tables to include in backup, ordered by dependency (parents first)
const BACKUP_TABLES = [
  'patients',
  'patient_medical_history',
  'patient_alerts',
  'procedure_categories',
  'procedures',
  'treatments',
  'treatment_items',
  'treatment_sittings',
  'clinical_notes',
  'dental_chart_conditions',
  'follow_ups',
  'appointments',
  'invoices',
  'invoice_items',
  'payments',
  'payment_allocations',
  'inventory_items',
  'inventory_transactions',
  'lab_cases',
  'expenses',
  'notifications',
  'patient_portal_access',
] as const;

export interface BackupData {
  version: string;
  exported_at: string;
  clinic_id: string;
  tables: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<BackupData> {
  const clinicId = getClinicId();
  const tables: Record<string, unknown[]> = {};

  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    tables[table] = data ?? [];
  }

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    clinic_id: clinicId,
    tables,
  };
}

export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clinic_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── CSV Import for Patients ──────────────────────────────────
export interface PatientCSVRow {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  address?: string | null;
  occupation?: string | null;
}

export function parsePatientCSV(csvText: string): PatientCSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: PatientCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });

    if (!row['full_name'] || !row['name']) continue;

    rows.push({
      full_name: row['full_name'] || row['name'] || '',
      phone: row['phone'] || null,
      email: row['email'] || null,
      date_of_birth: row['date_of_birth'] || row['dob'] || null,
      gender: row['gender'] || null,
      blood_group: row['blood_group'] || null,
      address: row['address'] || null,
      occupation: row['occupation'] || null,
    });
  }

  return rows;
}

export async function importPatients(rows: PatientCSVRow[]): Promise<{ imported: number; errors: string[] }> {
  const clinicId = getClinicId();
  let imported = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const { data: seqData, error: seqError } = await supabase.rpc('next_patient_number', { p_clinic_id: clinicId });
      if (seqError) throw seqError;

      const { error } = await supabase.from('patients').insert({
        clinic_id: clinicId,
        patient_number: seqData as string,
        full_name: row.full_name,
        phone: row.phone || null,
        email: row.email || null,
        date_of_birth: row.date_of_birth || null,
        gender: (row.gender as 'male' | 'female' | 'other' | 'unknown') || 'unknown',
        blood_group: row.blood_group || null,
        address: row.address || null,
        occupation: row.occupation || null,
        tags: [],
        is_active: true,
      });

      if (error) throw error;
      imported++;
    } catch (err) {
      errors.push(`${row.full_name}: ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  return { imported, errors };
}

// ── CSV Export for any table ─────────────────────────────────
export function exportTableCSV(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
