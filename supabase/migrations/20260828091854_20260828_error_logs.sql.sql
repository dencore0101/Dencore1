-- Error logs table for production error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info','warning','error','critical')),
  module text NOT NULL,
  operation text,
  message text NOT NULL,
  details jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  fingerprint text NOT NULL,
  occurrence_count int NOT NULL DEFAULT 1,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_logs_clinic_id_idx ON error_logs(clinic_id);
CREATE INDEX IF NOT EXISTS error_logs_severity_idx ON error_logs(clinic_id, severity);
CREATE INDEX IF NOT EXISTS error_logs_resolved_idx ON error_logs(clinic_id, resolved);
CREATE INDEX IF NOT EXISTS error_logs_fingerprint_idx ON error_logs(clinic_id, fingerprint);
CREATE INDEX IF NOT EXISTS error_logs_timestamp_idx ON error_logs(clinic_id, timestamp DESC);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Only owner/admin can view error logs
DROP POLICY IF EXISTS "error_logs_select_admin" ON error_logs;
CREATE POLICY "error_logs_select_admin" ON error_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM clinic_memberships m
    WHERE m.clinic_id = error_logs.clinic_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  ));

-- Any authenticated user can insert error logs (they report errors from their clinic)
DROP POLICY IF EXISTS "error_logs_insert_members" ON error_logs;
CREATE POLICY "error_logs_insert_members" ON error_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM clinic_memberships m
    WHERE m.clinic_id = error_logs.clinic_id
      AND m.user_id = auth.uid()
  ));

-- Only owner/admin can update (mark resolved)
DROP POLICY IF EXISTS "error_logs_update_admin" ON error_logs;
CREATE POLICY "error_logs_update_admin" ON error_logs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM clinic_memberships m
    WHERE m.clinic_id = error_logs.clinic_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM clinic_memberships m
    WHERE m.clinic_id = error_logs.clinic_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  ));

-- Only owner/admin can delete (clear logs)
DROP POLICY IF EXISTS "error_logs_delete_admin" ON error_logs;
CREATE POLICY "error_logs_delete_admin" ON error_logs FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM clinic_memberships m
    WHERE m.clinic_id = error_logs.clinic_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  ));