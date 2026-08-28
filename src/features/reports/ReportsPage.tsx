import { useState, useCallback } from 'react';
import { BarChart3, Download, Loader2, FileText } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { formatCurrency } from '@/constants/inventory';
import { fetchInvoices } from '@/services/billing.service';
import { fetchPayments } from '@/services/billing.service';
import { fetchExpenses } from '@/services/expense.service';
import { fetchInventoryItems } from '@/services/inventory.service';
import { fetchLabCases } from '@/services/inventory.service';
import { fetchPatients } from '@/services/patient.service';
import type { Invoice } from '@/types/billing';
import type { Payment } from '@/types/billing';
import type { Expense } from '@/types/expense';
import type { InventoryItem, LabCase } from '@/types/inventory';
import type { Patient } from '@/types/db';

type ReportType = 'revenue' | 'expenses' | 'outstanding' | 'inventory' | 'lab' | 'patients';

const REPORT_OPTIONS: { value: ReportType; label: string; description: string }[] = [
  { value: 'revenue', label: 'Revenue Report', description: 'All payments received' },
  { value: 'expenses', label: 'Expense Report', description: 'All expenses incurred' },
  { value: 'outstanding', label: 'Outstanding Balances', description: 'Unpaid invoice balances' },
  { value: 'inventory', label: 'Inventory Report', description: 'Current stock levels and values' },
  { value: 'lab', label: 'Lab Work Report', description: 'All lab cases with costs' },
  { value: 'patients', label: 'Patient Report', description: 'All registered patients' },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('revenue');
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const runReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasRun(true);
    try {
      switch (reportType) {
        case 'revenue': {
          const payments = await fetchPayments();
          setData(payments);
          break;
        }
        case 'expenses': {
          const expenses = await fetchExpenses();
          setData(expenses);
          break;
        }
        case 'outstanding': {
          const invoices = await fetchInvoices();
          setData(invoices.filter((inv) => inv.balance > 0 && inv.status !== 'cancelled' && inv.status !== 'draft'));
          break;
        }
        case 'inventory': {
          const items = await fetchInventoryItems();
          setData(items);
          break;
        }
        case 'lab': {
          const cases = await fetchLabCases();
          setData(cases);
          break;
        }
        case 'patients': {
          const result = await fetchPatients({ pageSize: 1000 });
          setData(result.data);
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [reportType]);

  const exportCSV = () => {
    if (data.length === 0) return;
    const rows = buildCSVRows(reportType, data);
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Reports"
          subtitle="Generate and export clinic reports"
          actions={
            <button onClick={exportCSV} disabled={loading || data.length === 0} className="btn-secondary">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          }
        />

        {/* Report type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {REPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setReportType(opt.value); setHasRun(false); setData([]); }}
              className={`card card-pad text-left transition-all ${reportType === opt.value ? 'ring-2 ring-primary-500 border-primary-300' : 'hover:border-neutral-300'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${reportType === opt.value ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">{opt.label}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{opt.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Run report button */}
        <div className="mb-4">
          <button onClick={runReport} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            Generate Report
          </button>
        </div>

        {/* Results */}
        {error && <div className="card card-pad text-sm text-error-600 mb-4">{error}</div>}

        {hasRun && !loading && data.length === 0 && !error && (
          <div className="card card-pad text-center text-sm text-neutral-400 py-12">No data found for this report.</div>
        )}

        {data.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  {getHeaders(reportType).map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    {renderRow(reportType, row).map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-sm text-neutral-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── CSV and table rendering helpers ──────────────────────────
function getHeaders(type: ReportType): string[] {
  switch (type) {
    case 'revenue': return ['Date', 'Patient', 'Amount', 'Method', 'Reference'];
    case 'expenses': return ['Date', 'Description', 'Category', 'Vendor', 'Amount'];
    case 'outstanding': return ['Invoice #', 'Patient', 'Total', 'Paid', 'Balance', 'Status'];
    case 'inventory': return ['Name', 'Category', 'Stock', 'Unit', 'Cost/Unit', 'Value'];
    case 'lab': return ['Case #', 'Patient', 'Lab', 'Work Type', 'Stage', 'Cost'];
    case 'patients': return ['Patient #', 'Name', 'Phone', 'Gender', 'Created'];
  }
}

function renderRow(type: ReportType, row: unknown): (string | JSX.Element)[] {
  switch (type) {
    case 'revenue': {
      const p = row as Payment;
      return [
        new Date(p.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        p.patient?.full_name ?? '—',
        formatCurrency(Number(p.amount)),
        p.method,
        p.reference ?? '—',
      ];
    }
    case 'expenses': {
      const e = row as Expense;
      return [
        new Date(e.expense_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        e.description,
        e.category,
        e.vendor ?? '—',
        formatCurrency(Number(e.amount)),
      ];
    }
    case 'outstanding': {
      const inv = row as Invoice;
      return [
        inv.invoice_number,
        inv.patient?.full_name ?? '—',
        formatCurrency(Number(inv.total)),
        formatCurrency(Number(inv.amount_paid)),
        formatCurrency(Number(inv.balance)),
        inv.status,
      ];
    }
    case 'inventory': {
      const item = row as InventoryItem;
      return [
        item.name,
        item.category,
        String(item.current_stock),
        item.unit,
        formatCurrency(Number(item.cost_per_unit)),
        formatCurrency(Number(item.current_stock) * Number(item.cost_per_unit)),
      ];
    }
    case 'lab': {
      const c = row as LabCase;
      return [
        c.case_number,
        c.patient?.full_name ?? '—',
        c.lab_name,
        c.work_type,
        c.stage,
        formatCurrency(Number(c.cost)),
      ];
    }
    case 'patients': {
      const p = row as Patient;
      return [
        p.patient_number,
        p.full_name,
        p.phone ?? '—',
        p.gender ?? '—',
        new Date(p.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      ];
    }
  }
}

function buildCSVRows(type: ReportType, data: unknown[]): (string | number)[][] {
  const headers = getHeaders(type);
  const rows = data.map((row) => renderRow(type, row).map((cell) => {
    if (typeof cell === 'string') return cell.replace(/₹/g, '').replace(/,/g, '').trim();
    return '';
  }));
  return [headers, ...rows];
}
