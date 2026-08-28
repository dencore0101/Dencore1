# Supabase Migration Audit Report

**Date:** 2026-08-27
**Mode:** READ-ONLY — no migrations created, modified, or applied

---

## LOCAL MIGRATIONS

Files in `supabase/migrations/`:

| # | File | Tables Created |
|---|------|----------------|
| 0001 | `20260714195059_0001_init_multi_tenant_schema.sql` | clinics, clinic_memberships, clinic_settings, audit_log |
| 0002 | `20260714195112_0002_seed_default_clinic_settings.sql` | *(seed data only)* |
| 0003 | `20260714200154_0003_patients_schema.sql` | referral_sources, patient_number_sequences, patients, patient_medical_history, patient_alerts |
| 0004 | `20260714201156_0004_clinical_workflow_schema.sql` | procedure_categories, procedures, treatments, treatment_items, treatment_sittings, clinical_notes, dental_chart_conditions, follow_ups |
| 0005 | `20260714203236_0005_appointments_schema.sql` | appointments |
| 0006 | `20260714204153_0006_billing_payments_schema.sql` | invoices, invoice_items, payments, payment_allocations |
| — | **0007** | **MISSING — no file exists** |
| 0008 | `20260715153043_0008_inventory_labs_schema.sql` | inventory_items, inventory_transactions, lab_cases |
| 0009 | `20260715154047_0009_expenses_schema.sql` | expenses |
| 0010 | `20260715155130_0010_notifications_portal_schema.sql` | notifications, patient_portal_access |

**Total:** 9 migration files (0001–0010, excluding 0007), 27 tables.

---

## REMOTE MIGRATIONS

**Unable to query.** The Supabase MCP tools (`list_migrations`, `execute_sql`, `list_tables`) returned an error: `"A database is already setup for this project"`. The remote migration history and remote table inventory could not be retrieved.

---

## MIGRATION HISTORY

**Unable to query.** Same MCP error as above. The `supabase_migrations.schema_migrations` table could not be read.

---

## SCHEMA OBJECTS

### Tables expected by the application (from service layer + types)

The app code in `src/services/prescription.service.ts` and `src/types/prescription.ts` references these tables and functions:

| Object | Type | Expected by | Found in local migrations? |
|--------|------|-------------|---------------------------|
| `prescriptions` | table | `prescription.service.ts`, `PrescriptionsPage.tsx`, `PrescriptionsTab.tsx` | **NO** |
| `prescription_items` | table | `prescription.service.ts` (joined as `items:prescription_items`) | **NO** |
| `consent_forms` | table | `prescription.service.ts`, `ConsentFormsTab.tsx` | **NO** |
| `next_prescription_number` | function (RPC) | `prescription.service.ts` line 55 | **NO** |

### All tables created by local migrations (27 total)

`clinics`, `clinic_memberships`, `clinic_settings`, `audit_log`, `referral_sources`, `patient_number_sequences`, `patients`, `patient_medical_history`, `patient_alerts`, `procedure_categories`, `procedures`, `treatments`, `treatment_items`, `treatment_sittings`, `clinical_notes`, `dental_chart_conditions`, `follow_ups`, `appointments`, `invoices`, `invoice_items`, `payments`, `payment_allocations`, `inventory_items`, `inventory_transactions`, `lab_cases`, `expenses`, `notifications`, `patient_portal_access`

### Tables expected by app but NOT in any local migration

1. **`prescriptions`** — not created by any migration file
2. **`prescription_items`** — not created by any migration file
3. **`consent_forms`** — not created by any migration file

### Functions expected by app but NOT in any local migration

1. **`next_prescription_number(p_clinic_id uuid)`** — called via `supabase.rpc()` in `prescription.service.ts`

---

## MISMATCHES

### 1. Missing migration 0007

There is a gap in the migration numbering: 0006 → 0008. No file for 0007 exists in the repository. The numbering gap suggests a migration was either deleted, lost, or never committed. Given that prescriptions, prescription_items, and consent_forms are all missing and the app expects them, **migration 0007 was likely the prescriptions/consent schema migration**.

### 2. Missing tables: `prescriptions`, `prescription_items`, `consent_forms`

These three tables are referenced throughout the application code but are not created by any migration file in the repository. The application will fail at runtime with PostgREST errors ("relation does not exist") when any prescription or consent form feature is used.

**Affected application files:**
- `src/services/prescription.service.ts` — all functions (fetch, create, delete)
- `src/features/prescriptions/PrescriptionsPage.tsx` — clinic-wide prescription list
- `src/features/patients/PrescriptionsTab.tsx` — patient-level prescription tab
- `src/features/patients/ConsentFormsTab.tsx` — patient consent forms tab

### 3. Missing function: `next_prescription_number`

The service layer calls `supabase.rpc('next_prescription_number', { p_clinic_id: clinicId })` to atomically generate prescription numbers (e.g., `RX-000001`). This function is not defined in any migration file. The pattern matches existing functions like `next_patient_number`, `next_invoice_number`, etc. — but the prescription variant was never committed.

### 4. Remote database state unknown

The Supabase MCP tools are currently unavailable, so it could not be determined whether:
- Migration 0007 was applied to the remote database before being lost from the repo
- The three tables exist remotely despite being absent locally
- The `next_prescription_number` function exists remotely

This is a **deferred finding** — it requires deployment testing to confirm whether the remote database has these objects.

---

## SUMMARY

| Check | Result |
|-------|--------|
| Migration 0007 referenced anywhere? | No direct references, but numbering gap (0006→0008) confirms it existed |
| `prescriptions` table in local migrations? | **MISSING** |
| `prescription_items` table in local migrations? | **MISSING** |
| `consent_forms` table in local migrations? | **MISSING** |
| `next_prescription_number` function in local migrations? | **MISSING** |
| Remote database queryable? | **NO** — MCP tools returned error |
| Migration history queryable? | **NO** — MCP tools returned error |

**Conclusion:** Migration 0007 (prescriptions + consent forms schema) is missing from the repository. The application code expects these tables and the `next_prescription_number` function, but no migration creates them. The remote database state could not be verified due to MCP tool unavailability.
