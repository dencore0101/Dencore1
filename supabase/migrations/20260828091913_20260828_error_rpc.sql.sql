-- RPC to increment occurrence count on duplicate error
CREATE OR REPLACE FUNCTION increment_error_occurrence(p_fingerprint text, p_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE error_logs
  SET occurrence_count = occurrence_count + 1,
      last_seen_at = now()
  WHERE fingerprint = p_fingerprint AND clinic_id = p_clinic_id;
END;
$$;