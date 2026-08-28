import { supabase } from '@/lib/supabase';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorLogInput {
  module: string;
  operation?: string;
  message: string;
  severity?: ErrorSeverity;
  details?: Record<string, unknown>;
}

const REDACTED_KEYS = [
  'password', 'token', 'apikey', 'api_key', 'secret', 'authorization',
  'service_role', 'supabase_key', 'access_token', 'refresh_token',
  'card', 'cvv', 'pan', 'medical_history', 'diagnosis',
];

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Error) {
    return { name: obj.name, message: obj.message, stack: obj.stack?.split('\n').slice(0, 5).join('\n') };
  }
  if (Array.isArray(obj)) return obj.slice(0, 10).map(redact);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACTED_KEYS.some((rk) => key.toLowerCase().includes(rk))) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(value);
    }
  }
  return result;
}

function fingerprint(input: ErrorLogInput): string {
  const base = `${input.module}:${input.operation ?? ''}:${input.message}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  return String(hash);
}

const recentLogCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 10_000;

export async function logError(input: ErrorLogInput): Promise<void> {
  try {
    const fp = fingerprint(input);
    const now = Date.now();
    const lastSeen = recentLogCache.get(fp);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) return;
    recentLogCache.set(fp, now);

    const clinicId = localStorage.getItem('clinic_id');
    if (!clinicId) return;

    const { data: { user } } = await supabase.auth.getUser();
    const safeDetails = input.details ? redact(input.details) : null;

    await supabase.from('error_logs').upsert({
      clinic_id: clinicId,
      user_id: user?.id ?? null,
      severity: input.severity ?? 'error',
      module: input.module,
      operation: input.operation ?? null,
      message: input.message,
      details: safeDetails,
      fingerprint: fp,
      last_seen_at: new Date().toISOString(),
    }, {
      onConflict: 'clinic_id,fingerprint',
      ignoreDuplicates: false,
    }).select('id').limit(1);

    // Increment occurrence_count on conflict
    await supabase.rpc('increment_error_occurrence', { p_fingerprint: fp, p_clinic_id: clinicId }).then(() => {});
  } catch {
    // Silently fail — logging must never interfere with normal operation
  }
}

export async function fetchErrorLogs(opts?: {
  resolved?: boolean;
  severity?: string;
  limit?: number;
}): Promise<Array<ErrorLogRow>> {
  const clinicId = localStorage.getItem('clinic_id');
  if (!clinicId) return [];
  let query = supabase
    .from('error_logs')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('last_seen_at', { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.resolved !== undefined) query = query.eq('resolved', opts.resolved);
  if (opts?.severity) query = query.eq('severity', opts.severity);
  const { data, error } = await query;
  if (error) return [];
  return data as unknown as ErrorLogRow[];
}

export async function resolveErrorLog(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from('error_logs')
    .update({ resolved: true, resolved_by: user?.id ?? null, resolved_at: new Date().toISOString() })
    .eq('id', id);
}

export async function clearOldErrorLogs(olderThanDays: number): Promise<number> {
  const clinicId = localStorage.getItem('clinic_id');
  if (!clinicId) return 0;
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  const { count } = await supabase
    .from('error_logs')
    .delete({ count: 'exact' })
    .eq('clinic_id', clinicId)
    .lt('timestamp', cutoff);
  return count ?? 0;
}

export async function clearResolvedErrorLogs(): Promise<number> {
  const clinicId = localStorage.getItem('clinic_id');
  if (!clinicId) return 0;
  const { count } = await supabase
    .from('error_logs')
    .delete({ count: 'exact' })
    .eq('clinic_id', clinicId)
    .eq('resolved', true);
  return count ?? 0;
}

export interface ErrorLogRow {
  id: string;
  clinic_id: string;
  user_id: string | null;
  timestamp: string;
  severity: ErrorSeverity;
  module: string;
  operation: string | null;
  message: string;
  details: Record<string, unknown> | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  fingerprint: string;
  occurrence_count: number;
  last_seen_at: string;
}
