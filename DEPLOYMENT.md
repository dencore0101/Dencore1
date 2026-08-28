# Deployment Guide — ToothRevenue

## Prerequisites

- Node.js 18+
- npm
- A Supabase project (already provisioned)

## Environment Variables

The following are pre-configured in `.env` and must be present at build time:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (safe for browser) |

The Supabase service role key is only used in the edge function and is never exposed to the browser.

## Build

```bash
npm install
npm run build
```

Output is in `dist/`. The app is a static SPA — serve `dist/index.html` as the entry point with a fallback to `index.html` for client-side routing.

## Database Migrations

All migrations are in `supabase/migrations/` and are applied via the Supabase MCP tools. The migrations create:

1. Multi-tenant schema (clinics, memberships, settings, audit log)
2. Patient management (patients, medical history, alerts, referral sources)
3. Clinical workflow (procedures, treatments, sittings, notes, dental chart, follow-ups)
4. Appointments
5. Billing & payments (invoices, invoice items, payments, allocations)
6. Inventory & lab work
7. Expenses
8. Notifications & patient portal
9. Prescriptions & consent forms

### RLS

Row Level Security is enabled on every table. All policies are scoped to `authenticated` users with clinic membership checks via `EXISTS (SELECT 1 FROM clinic_memberships WHERE clinic_id = <table>.clinic_id AND user_id = auth.uid())`. No `FOR ALL` policies. No `SECURITY DEFINER` functions. No views.

## Edge Functions

### clinic-bootstrap

Deployed via the Supabase MCP `deploy_edge_function` tool. Creates a new clinic with:
- Owner membership
- Default clinic settings
- Default referral sources (8)
- Default procedure categories (10) and procedures (31)
- Audit log entry

Requires a valid JWT in the Authorization header. Uses the service role key server-side.

## Security Checklist

- [x] RLS enabled on all 22 tables
- [x] 4 policies per table (SELECT/INSERT/UPDATE/DELETE), no `FOR ALL`
- [x] All policies scoped to `authenticated` with membership checks
- [x] UPDATE policies have matching USING and WITH CHECK predicates
- [x] No SECURITY DEFINER functions in exposed schema
- [x] No views (nothing bypasses RLS)
- [x] Service role key only in edge function, never in client code
- [x] No `dangerouslySetInnerHTML` in client code
- [x] No `eval` or dynamic code execution
- [x] Edge function validates JWT before acting
- [x] Edge function has proper CORS headers
- [x] Auth uses Supabase email/password (no magic links, no social providers)
- [x] Email confirmation is OFF

## Performance

- Routes are code-split via `React.lazy` + `Suspense` — each page loads on-demand
- Error boundary wraps the entire app with a user-friendly recovery screen
- Supabase queries use server-side pagination (range queries)
- Debounced search (300ms) to reduce API calls
- pg_trgm index on patient names for fuzzy search
- Partial index on `deleted_at IS NULL` for soft-delete queries

## Responsive Design

- Mobile-first layout with breakpoints at `sm` (640px), `md` (768px), `lg` (1024px)
- Sidebar collapses to icon-only on desktop, drawer on mobile
- Patient list: desktop table, mobile card layout
- Dashboard: 1-column on mobile, 2-column on tablet, 4-column on desktop
- All forms and modals are responsive with full-width inputs on mobile
