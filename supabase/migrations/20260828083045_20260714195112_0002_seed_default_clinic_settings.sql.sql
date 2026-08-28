/*
# Seed default clinic settings for existing clinics
Ensures every clinic has a corresponding clinic_settings row.
Idempotent: only inserts missing rows.
*/
INSERT INTO clinic_settings (clinic_id, settings)
SELECT c.id, '{}'::jsonb
FROM clinics c
WHERE NOT EXISTS (
  SELECT 1 FROM clinic_settings cs WHERE cs.clinic_id = c.id
);