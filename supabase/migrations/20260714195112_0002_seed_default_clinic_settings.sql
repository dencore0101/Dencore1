/*
# Seed default clinic settings for existing clinics

## Summary
Ensures every clinic in the `clinics` table has a corresponding row in
`clinic_settings`. Clinics created without a settings row (edge cases,
manual inserts) get a default empty JSONB settings object.

## Changes
- Inserts a `clinic_settings` row for every `clinics` row that doesn't
  already have one, using `settings = '{}'::jsonb`.
- Idempotent: safe to re-run; only inserts missing rows.

## Security
No policy changes. RLS remains enabled on `clinic_settings`.
*/

INSERT INTO clinic_settings (clinic_id, settings)
SELECT c.id, '{}'::jsonb
FROM clinics c
WHERE NOT EXISTS (
  SELECT 1 FROM clinic_settings cs WHERE cs.clinic_id = c.id
);
