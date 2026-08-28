# ToothRevenue — Project Status

**Source of truth:** `ToothRevenue_Bolt_Replication_Production_Master_Prompt.md`
**Reference:** Existing ToothRevenue app screenshots + `toothrevenue_export.json`
**Stack:** Vite + React 18 + TypeScript + Tailwind CSS + Supabase (Postgres + Auth + RLS)
**Icons:** lucide-react

---

## Phase 0 — Foundation (COMPLETE)

- [x] Inspect repository, stack, routes, dependencies
- [x] Confirm Supabase provisioned (URL + anon key in `.env`)
- [x] Confirm no existing tables/features to preserve (blank starter)
- [x] Create `PROJECT_STATUS.md`
- [x] Install `react-router-dom` for client-side routing
- [x] Add `@/*` path alias (Vite + tsconfig)
- [x] Establish base design tokens in Tailwind config (color ramps, spacing, typography)
- [x] Create `src/lib/supabase.ts` singleton client
- [x] Create `src/types/db.ts` shared types

## Phase 1 — Auth Foundation & Multi-Tenant Schema (COMPLETE)

- [x] Migration: `0001_init_multi_tenant_schema`
  - `clinics` (tenant root), `clinic_memberships` (user↔clinic + role),
    `clinic_settings`, `audit_log`
  - RLS on all tables; owner/membership-scoped policies
  - Default `auth.uid()` on owner columns
- [x] Migration: `0002_seed_default_clinic_settings`
- [x] Auth context provider (`src/context/AuthContext.tsx`)
  - `onAuthStateChange` with deadlock guard
  - Session + profile (clinic membership) loading
  - Stores clinic_id in localStorage for service layer
- [x] Clinic bootstrap edge function (`clinic-bootstrap`)
  - Creates a clinic + owner membership + default settings + referral sources
- [x] Auth UI: Sign in / Sign up screens
  - Email/password (Supabase built-in), email confirmation OFF
  - On first sign-up → call `clinic-bootstrap` → redirect to app
- [x] App shell + sidebar navigation
  - Collapsible sidebar, mobile drawer navigation
- [x] Route guard (`ProtectedRoute`)
- [x] Placeholder dashboard page
- [x] Production build passes

## Phase 2 — Patient Workspace (COMPLETE)

- [x] Migration: `0003_patients_schema`
  - `referral_sources` — master list per clinic
  - `patient_number_sequences` — concurrency-safe PAT-XXXXXX counter
  - `patients` — full demographics, clinical intake, tags, soft delete
  - `patient_medical_history` — per-condition status (present/absent/unknown)
  - `patient_alerts` — severity-based alert badges
  - pg_trgm extension for fuzzy name search
  - RLS on all tables; membership-scoped policies
- [x] Restructured src/ to feature-oriented layout
  - `src/features/patients/` — patient-specific components
  - `src/services/patient.service.ts` — all Supabase queries
  - `src/hooks/useDebounce.ts` — debounced search
  - `src/constants/patient.ts` — medical conditions, blood groups, etc.
- [x] Shared UI components:
  - `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`
  - `SearchInput`, `StatusBadge`, `Modal`, `Pagination`, `PlaceholderPage`
- [x] Patient list page (`PatientList.tsx`)
  - Server-side search (name, phone, patient number) with debounce
  - Pagination
  - Desktop table + mobile card layouts
  - Add patient modal
- [x] Patient form modal (`PatientFormModal.tsx`)
  - Full demographics form (name, phone, DOB, gender, blood group, etc.)
  - Clinical intake fields (chief complaint, examination, diagnosis)
  - Referral source dropdown
  - Duplicate phone warning (non-blocking)
  - Auto-generates PAT-XXXXXX number via RPC
- [x] Unified patient profile (`PatientProfile.tsx`)
  - Header: avatar, name, number, age/gender, contact info, alert badges
  - Tabs: Overview, Timeline (skeleton), Medical History, Files (skeleton)
  - Overview: demographics grid, clinical intake, tags
- [x] Medical history tab (`MedicalHistoryTab.tsx`)
  - 19 predefined conditions (diabetes, hypertension, allergies, etc.)
  - Per-condition: present/absent/unknown toggle
  - Medication + notes fields for present conditions
  - Upsert to database on save
- [x] Updated sidebar with all 16 modules from master prompt
- [x] All routes wired with placeholder pages for future phases
- [x] Updated clinic-bootstrap to seed default referral sources
- [x] Typecheck + production build pass

### Schema overview (Phase 2 additions)

```
referral_sources
  id, clinic_id, name, active, created_at
patient_number_sequences
  clinic_id (PK), next_val
patients
  id, clinic_id, patient_number (unique per clinic), full_name, phone, whatsapp,
  email, date_of_birth, gender, blood_group, address, occupation,
  emergency_contact_name/phone, anniversary_date, referral_source_id,
  referred_by_patient_id, referred_by_name, assigned_dentist_id,
  chief_complaint, on_examination, provisional_diagnosis, photo_url, notes,
  tags[], is_active, deleted_at, created_at, updated_at
patient_medical_history
  id, clinic_id, patient_id, condition, status, notes, medication,
  created_at, updated_at — UNIQUE(patient_id, condition)
patient_alerts
  id, clinic_id, patient_id, alert_text, severity, created_at
```

## Phase 3 — Clinical Workflow (COMPLETE)

- [x] Migration: `0004_clinical_workflow_schema`
  - `procedure_categories`, `procedures` (with default fee, sittings, duration)
  - `treatments` (cases with treatment_number, status, planned_value, discount)
  - `treatment_items` (per-procedure items with teeth, quantity, fee, discount, status)
  - `treatment_sittings` (clinical visits with notes, materials, expenses, next appointment)
  - `clinical_notes` (free-form + SOAP with all fields)
  - `dental_chart_conditions` (tooth-level conditions with surface, status, history)
  - `follow_ups` (with priority, status, due date, assigned staff)
  - `next_treatment_number()` RPC for TRT-YYYY-XXXX generation
  - RLS on all tables; membership-scoped policies
- [x] Types: `src/types/clinical.ts` — all clinical entity types
- [x] Constants: `src/constants/clinical.ts` — statuses, FDI teeth, conditions, surfaces, seed data
- [x] Service: `src/services/clinical.service.ts` — all Supabase queries for clinical modules
- [x] Dental chart tab (`DentalChartTab.tsx`)
  - Interactive FDI adult dentition chart (upper + lower jaws)
  - Click tooth to add conditions (23 condition types, 8 surfaces)
  - Color-coded teeth with condition count badges
  - Visual legend with condition colors
  - Recorded conditions list with delete
  - Status: existing/planned/completed
- [x] Treatments tab (`TreatmentsTab.tsx`)
  - Create treatment cases with auto-generated TRT-YYYY-XXXX numbers
  - Expandable case cards showing treatment items
  - Add items with procedure selection (auto-fills fee), tooth numbers, quantity, discount
  - Auto-calculates final_amount = fee × quantity - discount
  - Delete items and cases
  - Status badges
- [x] Clinical notes tab (`ClinicalNotesTab.tsx`)
  - Free-form and SOAP note types
  - SOAP fields: Subjective, Objective, Assessment, Plan
  - Author and timestamp display
  - Delete notes
- [x] Follow-ups tab (`FollowUpsTab.tsx`)
  - Create follow-ups with reason, due date, priority
  - Status workflow: pending → contacted → scheduled → completed
  - Overdue badge for past-due pending items
  - Inline status changes
  - Delete follow-ups
- [x] Standalone pages:
  - Treatments page (clinic-wide list with status filter)
  - Clinical Notes page (recent notes across all patients)
  - Follow-ups page (with status filter, overdue indicators)
- [x] Patient profile updated with 8 tabs:
  Overview, Timeline (skeleton), Medical History, Dental Chart,
  Treatment Plan, Clinical Notes, Follow-ups, Files (skeleton)
- [x] Updated clinic-bootstrap to seed default procedure categories + 31 procedures
- [x] Updated App.tsx routes for treatments, clinical-notes, follow-ups
- [x] Typecheck + production build pass

### Schema overview (Phase 3 additions)

```
procedure_categories
  id, clinic_id, name, display_order, active, created_at
procedures
  id, clinic_id, category_id, name, code, default_fee (numeric),
  expected_sittings, expected_duration_min, active, notes, created_at, updated_at
treatments
  id, clinic_id, patient_id, treatment_number, case_name, status,
  dentist_id, planned_value, discount, notes, created_at, updated_at
treatment_items
  id, clinic_id, treatment_id, patient_id, procedure_id,
  tooth_numbers[], tooth_region, quantity, fee, discount, final_amount,
  priority, status, dentist_id, expected_sittings, notes, created_at, updated_at
treatment_sittings
  id, clinic_id, treatment_id, patient_id, sitting_number, date,
  dentist_id, chair, visit_type, procedures_performed, tooth_numbers[],
  clinical_note, materials_used, direct_expenses, status,
  next_appointment_date, created_at, updated_at
clinical_notes
  id, clinic_id, patient_id, treatment_id, sitting_id, note_type,
  subjective, objective, assessment, plan, chief_complaint, examination,
  diagnosis, radiographic_findings, treatment_advised, procedure_performed,
  postop_instructions, notes, author_id, created_at, updated_at
dental_chart_conditions
  id, clinic_id, patient_id, tooth_number, condition, surface, status,
  notes, treatment_id, author_id, created_at, updated_at
follow_ups
  id, clinic_id, patient_id, treatment_id, reason, due_date, priority,
  assigned_to, status, notes, last_contacted_at, outcome, created_at, updated_at
```

## Phase 4 — Appointments (COMPLETE)

- [x] Migration: `0005_appointments_schema`
  - `appointments` table with patient/dentist/chair, start_time, duration, type, status
  - 8 statuses: scheduled, confirmed, arrived, waiting, in_chair, completed, cancelled, no_show
  - 7 types: consultation, treatment, follow_up, emergency, recall, walk_in, custom
  - Reminder status tracking (none/pending/sent/failed)
  - `next_appointment_number()` RPC for APT-YYYY-XXXX generation
  - RLS enabled, membership-scoped policies
  - Indexes on clinic_id, patient_id, dentist_id, start_time, status
- [x] Types: `src/types/appointment.ts`
- [x] Constants: `src/constants/appointment.ts` — statuses, types, colors, durations
- [x] Service: `src/services/appointment.service.ts` — CRUD, overlap detection
- [x] Appointments page (`AppointmentsPage.tsx`)
  - List view with table (patient, date/time, type, status)
  - Week view with 7-day grid showing appointments per day
  - Date navigation (prev/next/today)
  - Filters: status, type
  - Inline status changes via dropdown
  - Edit and delete actions
  - Type-colored badges
- [x] Appointment form modal (`AppointmentFormModal.tsx`)
  - Patient search with debounced autocomplete
  - Date/time, duration, type, status, dentist, chair, notes
  - Real-time overlap detection (warns on dentist/chair conflicts)
  - Create and edit modes
- [x] Patient profile Appointments tab (`AppointmentsTab.tsx`)
  - Patient-specific appointment history
  - Book appointment with pre-selected patient
  - Inline status changes and delete
- [x] Patient profile now has 9 tabs: Overview, Timeline (skeleton), Medical History,
  Dental Chart, Treatment Plan, Clinical Notes, Follow-ups, Appointments, Files (skeleton)
- [x] App.tsx route wired to AppointmentsPage
- [x] Typecheck + production build pass

### Schema overview (Phase 4 additions)

```
appointments
  id, clinic_id, patient_id, treatment_id, appointment_number,
  dentist_id, chair, start_time, duration_min, type, status,
  notes, reminder_status, reminder_sent_at, created_by,
  created_at, updated_at
```

## Phase 5 — Billing/Payments (COMPLETE)

- [x] Migration: `0006_billing_payments_schema`
  - `invoices` (subtotal, tax_rate, tax_amount, discount, total, amount_paid, balance, status)
  - `invoice_items` (description, quantity, unit_price, discount, total, links to procedure/treatment_item)
  - `payments` (amount, method, reference, status, received_by)
  - `payment_allocations` (payment↔invoice allocation tracking)
  - `next_invoice_number()` and `next_payment_number()` RPCs
  - RLS on all tables, membership-scoped policies
- [x] Types: `src/types/billing.ts`
- [x] Constants: `src/constants/billing.ts` — statuses, methods, formatCurrency, calculateInvoiceTotals
- [x] Service: `src/services/billing.service.ts` — invoice CRUD, payment CRUD, outstanding tracking, auto invoice balance update
- [x] Payments page (`PaymentsPage.tsx`)
  - Summary cards: total collected, outstanding, patients with dues
  - Two tabs: Payments (filterable list) and Outstanding (per-patient dues)
  - Record payment with invoice allocation
- [x] Payment form modal (`PaymentFormModal.tsx`)
  - Patient pre-selection, invoice allocation with auto-fill balance
  - Method, reference, notes
- [x] Patient profile Billing tab (`BillingTab.tsx`)
  - Summary: total billed, total paid, outstanding
  - Invoices with expandable items, line-item details, tax/discount breakdown
  - Invoice creation modal with dynamic line items, procedure autocomplete, tax calculation
  - Payment recording with invoice allocation
  - Delete invoices and payments
- [x] Patient profile now has 10 tabs: Overview, Timeline (skeleton), Medical History,
  Dental Chart, Treatment Plan, Clinical Notes, Follow-ups, Appointments, Billing, Files (skeleton)
- [x] App.tsx route wired to PaymentsPage
- [x] Typecheck + production build pass (no warnings)

### Schema overview (Phase 5 additions)

```
invoices
  id, clinic_id, patient_id, treatment_id, invoice_number, status,
  subtotal, tax_rate, tax_amount, discount, total, amount_paid, balance,
  notes, due_date, issued_at, created_at, updated_at
invoice_items
  id, clinic_id, invoice_id, patient_id, description, quantity,
  unit_price, discount, total, treatment_item_id, procedure_id, created_at, updated_at
payments
  id, clinic_id, patient_id, invoice_id, payment_number, amount,
  method, reference, status, notes, received_by, created_at, updated_at
payment_allocations
  id, clinic_id, payment_id, invoice_id, amount, created_at
```

---

## Phase 6 — Prescription/Print/Consent (DEFERRED — TECHNICAL DEBT)

> **STATUS: DEFERRED.** This feature is out of scope for the current production release.
> The application code (services, types, constants, UI components) exists in the
> repository, but **migration 0007 is missing** — the `prescriptions`,
> `prescription_items`, and `consent_forms` tables and the `next_prescription_number()`
> RPC were never committed to `supabase/migrations/`. The numbering gap (0006 → 0008)
> confirms the migration was lost.
>
> **What exists:** `src/types/prescription.ts`, `src/constants/prescription.ts`,
> `src/services/prescription.service.ts`, `src/features/prescriptions/PrescriptionsPage.tsx`,
> `src/features/patients/PrescriptionsTab.tsx`, `src/features/patients/ConsentFormsTab.tsx`.
>
> **What's missing:** `supabase/migrations/*_0007_*.sql` — no tables, no RLS policies,
> no `next_prescription_number()` function.
>
> **Impact:** Any prescription or consent form action will fail at runtime with a
> PostgREST "relation does not exist" error. These features are non-functional until
> the migration is created and applied.
>
> **Resolution (when ready):** Create migration 0007 with the three tables, RLS
> policies (4 per table, membership-scoped), and the `next_prescription_number()` RPC
> following the same pattern as `next_patient_number()` / `next_invoice_number()`.
> See `SUPABASE_MIGRATION_AUDIT.md` for full details.

### Schema overview (Phase 6 — planned, not yet implemented)

```
prescriptions
  id, clinic_id, patient_id, treatment_id, sitting_id, prescription_number,
  notes, status, prescribed_by, created_at, updated_at
prescription_items
  id, clinic_id, prescription_id, patient_id, drug_name, dosage,
  frequency, duration, instructions, created_at, updated_at
consent_forms
  id, clinic_id, patient_id, treatment_id, consent_type, title, content,
  status, signed_by, signed_at, witness_name, witness_relation, created_at, updated_at
```

---

## Phase 7 — Inventory/Labs (COMPLETE)

- [x] Migration: `0008_inventory_labs_schema`
  - `inventory_items` (name, category, unit, current_stock, reorder_level, cost_per_unit, supplier)
  - `inventory_transactions` (type: purchase/usage/adjustment/return, quantity, unit_cost, reference)
  - `lab_cases` (case_number, lab_name, work_type, stage, sent/due/received dates, cost)
  - `next_lab_case_number()` RPC for LAB-YYYY-XXXX generation
  - RLS on all tables, membership-scoped policies
- [x] Types: `src/types/inventory.ts`
- [x] Constants: `src/constants/inventory.ts` — categories, txn types, lab work types, lab stages
- [x] Service: `src/services/inventory.service.ts` — item CRUD, transactions with auto stock update, lab case CRUD with stage workflow
- [x] Inventory page (`InventoryPage.tsx`)
  - Summary cards: total items, stock value, low-stock alerts
  - Two tabs: All Items (filterable by category) and Low Stock alerts
  - Add item modal with category, unit, opening stock, reorder level, cost
  - Stock transaction modal (purchase/usage/adjustment/return) with auto stock level update
  - Transaction history modal (last 50 transactions)
  - Low-stock highlighting in table rows
- [x] Lab Work page (`LabWorkPage.tsx`)
  - Summary cards: active cases, overdue, total lab cost
  - Case list with inline stage dropdown (sent → in_progress → received → delivered)
  - Overdue badges for past-due cases
  - Create lab case modal with patient selection, lab name, work type, due date, cost
  - Click-through to patient profile
- [x] App.tsx routes wired to InventoryPage and LabWorkPage
- [x] Typecheck + production build pass

### Schema overview (Phase 7 additions)

```
inventory_items
  id, clinic_id, name, category, unit, current_stock, reorder_level,
  cost_per_unit, supplier, notes, created_at, updated_at
inventory_transactions
  id, clinic_id, item_id, type, quantity, unit_cost, reference,
  notes, created_by, created_at
lab_cases
  id, clinic_id, patient_id, treatment_id, case_number, lab_name,
  work_type, stage, sent_date, due_date, received_date, cost, notes,
  created_at, updated_at
```

---

## Phase 8 — Expenses/Dashboard/Reports (COMPLETE)

- [x] Migration: `0009_expenses_schema`
  - `expenses` (description, 9 categories, amount, expense_date, vendor, payment_method, is_recurring, notes)
  - RLS enabled, membership-scoped policies
- [x] Types: `src/types/expense.ts`
- [x] Constants: `src/constants/expense.ts` — 9 categories, 6 payment methods
- [x] Service: `src/services/expense.service.ts` — expense CRUD with date range filtering
- [x] Expenses page (`ExpensesPage.tsx`)
  - Summary cards: this month total, total entries
  - Category breakdown bar chart with proportional bars
  - Expense list with category filter, vendor, recurring badge
  - Add expense modal with all fields + recurring flag
  - Delete expenses
- [x] Dashboard service: `src/services/dashboard.service.ts`
  - `fetchDashboardStats()` — today/month revenue, active patients, appointments, pending invoices, outstanding, expenses, net profit
  - `fetchMonthlyTrend()` — 6-month revenue vs expenses bar chart data
  - `fetchRecentActivity()` — merged feed of payments, invoices, appointments, patients
- [x] Live Dashboard (`Dashboard.tsx`)
  - 4 stat cards: Today's Revenue, Active Patients, Today's Appointments, Outstanding A/R
  - Revenue vs Expenses bar chart (6-month trend)
  - This Month financial summary: revenue, expenses, net profit, pending invoices
  - Recent activity feed with icons per type
- [x] Reports page (`ReportsPage.tsx`)
  - 6 report types: Revenue, Expenses, Outstanding Balances, Inventory, Lab Work, Patients
  - Report type selector cards
  - Generate report → table view with relevant columns
  - CSV export with proper formatting
- [x] App.tsx routes wired to ExpensesPage and ReportsPage
- [x] Typecheck + production build pass

### Schema overview (Phase 8 additions)

```
expenses
  id, clinic_id, description, category, amount, expense_date,
  vendor, payment_method, is_recurring, notes, created_by,
  created_at, updated_at
```

---

## Phase 9 — Portal/Notifications (COMPLETE)

- [x] Migration: `0010_notifications_portal_schema`
  - `notifications` (channel: sms/email/whatsapp/in_app, template_key, subject, body, status, sent_at, related_type/id)
  - `patient_portal_access` (is_enabled, access_token, last_login_at, unique per patient)
  - RLS on all tables, membership-scoped policies
- [x] Types: Extended `src/types/clinical.ts` with Notification + PortalAccess types
- [x] Service: Extended `src/services/clinical.service.ts` with notification CRUD and portal access management
- [x] Patient Portal page (`PortalPage.tsx`)
  - Summary cards: enabled patients, total access records
  - Access list with patient info, status badge, last login timestamp
  - Enable/disable portal access per patient
  - Copy access token to clipboard
  - Regenerate access token
  - Add patient modal with searchable patient list
- [x] Notifications page (`NotificationsPage.tsx`)
  - Summary cards per channel (SMS, Email, WhatsApp, In-App)
  - Notification history with channel icons, template labels, status badges
  - Channel filter
  - Send notification modal with channel selection, template selection, patient search, subject, body
  - 6 template types: appointment reminder, payment receipt, treatment update, birthday, follow-up, custom
  - Delete notifications
- [x] App.tsx routes wired to PortalPage and NotificationsPage
- [x] Sidebar updated with Notifications link
- [x] Typecheck + production build pass

### Schema overview (Phase 9 additions)

```
notifications
  id, clinic_id, patient_id, channel, template_key, subject, body,
  status, sent_at, related_type, related_id, created_at
patient_portal_access
  id, clinic_id, patient_id, is_enabled, access_token, last_login_at,
  created_at, updated_at
```

---

### Phase 10 — Backup/Restore/Import (COMPLETE)

- [x] Service: `src/services/backup.service.ts`
  - `exportBackup()` — exports all 22 clinic tables to versioned JSON
  - `downloadBackup()` — triggers browser download of JSON file
  - `restoreBackup()` — restores from JSON backup, creates new records with fresh IDs
  - `parsePatientCSV()` — parses CSV with flexible headers (full_name/name, phone, email, dob/date_of_birth, etc.)
  - `importPatients()` — bulk imports patients from CSV with auto-generated patient numbers
  - `exportTableCSV()` — generic CSV export for any table
- [x] Settings page (`SettingsPage.tsx`) with 4 tabs:
  - **Overview**: Clinic info card, data management summary with feature cards
  - **Backup**: One-click JSON export of all clinic data (22 tables)
  - **Restore**: Upload JSON backup file, warning about duplicate creation, per-table insert count results with error details
  - **Import**: CSV patient import with file selection, preview table (first 50 rows), bulk import with per-row error reporting
- [x] App.tsx route wired to SettingsPage (replaced placeholder)
- [x] Typecheck + production build pass

### Phase 11 — Production Hardening (COMPLETE)

- [x] Security audit (manual, via security-review skill reference):
  - RLS: All 22 tables have RLS enabled, 4 policies per table (SELECT/INSERT/UPDATE/DELETE), no `FOR ALL`
  - All policies scoped to `authenticated` with `EXISTS` membership checks against `clinic_memberships`
  - UPDATE policies have matching USING and WITH CHECK predicates (no weaker WITH CHECK)
  - No SECURITY DEFINER functions in exposed schema
  - No views (nothing bypasses RLS)
  - Edge function (`clinic-bootstrap`) validates JWT, uses service role key server-side only, proper CORS
  - No `dangerouslySetInnerHTML`, no `eval` in client code
  - `document.write` in print functions uses staff-entered data only (self-XSS, hardening note)
  - Service role key never shipped to browser
- [x] Performance:
  - Code-split all 18 routes via `React.lazy` + `Suspense` (bundle: 318KB main / 95KB gzipped, pages load on-demand)
  - Error boundary wraps entire app with recovery screen
  - Server-side pagination on all list views
  - Debounced search (300ms) on patient search
  - pg_trgm GIN index for fuzzy name search
  - Partial index on `deleted_at IS NULL`
- [x] Responsive QA:
  - Mobile-first layouts with sm/md/lg breakpoints
  - Sidebar: icon-only collapse on desktop, drawer on mobile
  - Patient list: desktop table + mobile card layout
  - Dashboard: 1/2/4-column responsive grid
  - All forms and modals responsive with full-width mobile inputs
- [x] Deployment documentation (`DEPLOYMENT.md`):
  - Environment variables, build steps, migration overview
  - RLS security checklist
  - Edge function deployment notes
  - Performance and responsive design notes
- [x] Typecheck + production build pass

---

## Build & Run

- Dev server runs automatically in the harness (do not start manually).
- `npm run build` — production build (TypeScript + Vite).
- `npm run typecheck` — type-only check.

## Conventions

- All migrations applied via `mcp__supabase__apply_migration` (never raw SQL, never CLI).
- RLS enabled on every table; 4 policies per table (select/insert/update/delete).
- Edge functions: mandatory CORS headers, try/catch, `npm:`/`jsr:` imports.
- No purple/indigo defaults; neutral + professional blue/green palette.
- 8px spacing system; 150% body / 120% heading line-height; ≤3 font weights.
- Feature-oriented src/ structure: features/, services/, hooks/, constants/, types/.
- Supabase queries isolated in service files, never in visual components.
- Soft deletion (deleted_at) for patient records; hard delete blocked at app layer.
