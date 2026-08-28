import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, Trash2, Loader2, Bug } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  fetchErrorLogs, resolveErrorLog, clearOldErrorLogs, clearResolvedErrorLogs,
  type ErrorLogRow,
} from '@/lib/errorLogger';

const SEVERITY_COLORS: Record<string, 'neutral' | 'warning' | 'error' | 'primary'> = {
  info: 'neutral',
  warning: 'warning',
  error: 'error',
  critical: 'error',
};

export default function ErrorLogsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin';
  const [logs, setLogs] = useState<ErrorLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<ErrorLogRow | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resolved = filter === 'unresolved' ? false : filter === 'resolved' ? true : undefined;
      const data = await fetchErrorLogs({ resolved, severity: severityFilter || undefined });
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filter, severityFilter]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: string) => {
    await resolveErrorLog(id);
    load();
  };

  const handleClearOld = async (days: number) => {
    setClearing(true);
    await clearOldErrorLogs(days);
    setClearing(false);
    load();
  };

  const handleClearResolved = async () => {
    setClearing(true);
    await clearResolvedErrorLogs();
    setClearing(false);
    load();
  };

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="p-6 max-w-7xl mx-auto">
          <EmptyState icon={<Shield className="h-7 w-7" />} title="Access denied" description="Only clinic owners and admins can view error logs." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader title="Error Logs" subtitle="Production error monitoring and resolution tracking" />

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
            {(['unresolved', 'all', 'resolved'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize ${filter === f ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
                {f}
              </button>
            ))}
          </div>
          <select className="input max-w-xs" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">All severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleClearResolved} disabled={clearing} className="btn-secondary">
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Clear Resolved
            </button>
            <button onClick={() => handleClearOld(30)} disabled={clearing} className="btn-secondary">
              <Trash2 className="h-4 w-4" /> Clear 30+ Days
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading error logs..." />
        ) : logs.length === 0 ? (
          <div className="card">
            <EmptyState icon={<Bug className="h-7 w-7" />} title="No error logs" description="No errors have been recorded." />
          </div>
        ) : (
          <div className="card">
            <div className="divide-y divide-neutral-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge color={SEVERITY_COLORS[log.severity] ?? 'neutral'}>{log.severity}</StatusBadge>
                        {log.resolved && <StatusBadge color="success">Resolved</StatusBadge>}
                        {log.occurrence_count > 1 && (
                          <span className="text-xs text-neutral-400">×{log.occurrence_count}</span>
                        )}
                        <span className="text-xs font-medium text-neutral-600">{log.module}</span>
                      </div>
                      <p className="text-sm text-neutral-900 truncate">{log.message}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {log.operation && <span>{log.operation} · </span>}
                        {new Date(log.last_seen_at).toLocaleString()}
                      </p>
                    </div>
                    {!log.resolved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResolve(log.id); }}
                        className="text-success-500 hover:text-success-700 p-1.5 rounded-lg hover:bg-success-50 shrink-0"
                        title="Mark resolved"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <Modal open={true} title="Error Details" onClose={() => setSelectedLog(null)} size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge color={SEVERITY_COLORS[selectedLog.severity] ?? 'neutral'}>{selectedLog.severity}</StatusBadge>
              {selectedLog.resolved ? <StatusBadge color="success">Resolved</StatusBadge> : <StatusBadge color="warning">Unresolved</StatusBadge>}
              {selectedLog.occurrence_count > 1 && <span className="text-xs text-neutral-400">Occurred {selectedLog.occurrence_count} times</span>}
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase">Module</p>
              <p className="text-sm text-neutral-900">{selectedLog.module}</p>
            </div>
            {selectedLog.operation && (
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase">Operation</p>
                <p className="text-sm text-neutral-900">{selectedLog.operation}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase">Message</p>
              <p className="text-sm text-neutral-900">{selectedLog.message}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase">First Seen</p>
              <p className="text-sm text-neutral-600">{new Date(selectedLog.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase">Last Seen</p>
              <p className="text-sm text-neutral-600">{new Date(selectedLog.last_seen_at).toLocaleString()}</p>
            </div>
            {selectedLog.details && (
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Technical Details</p>
                <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg p-3 overflow-x-auto max-h-40">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}
            {!selectedLog.resolved && (
              <button onClick={() => { handleResolve(selectedLog.id); setSelectedLog(null); }} className="btn-primary">
                <CheckCircle className="h-4 w-4" /> Mark Resolved
              </button>
            )}
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
