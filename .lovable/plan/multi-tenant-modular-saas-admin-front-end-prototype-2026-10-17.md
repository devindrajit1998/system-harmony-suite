# Multi-tenant Modular SaaS Admin — Front-end Prototype

Mock data only, everything saved in the browser (survives refresh), with a "Reset demo data" button. Built exactly to the uploaded spec.

## What you'll get
- Top bar: "Viewing as: Super Admin | Tenant [5 tenants]", dark mode toggle, reset button, impersonation banner.
- **Super Admin (/super)** — distinct accent: Dashboard (KPIs, 12-month MRR chart, tenants by type, recent signups), Tenants (filters, detail drawer, Impersonate, Add tenant), Module Catalog, Bundle Builder (auto-dependencies, live price with 15% discount), Plans & Pricing, Audit Log.
- **Tenant Admin (/app)** — brand color accent: dashboard widgets only for enabled modules, sidebar built from enabled modules with tenant terminology, list + add/edit side sheet per module.
- **Settings**: Modules (dependency enforcement + confirm dialog + live price), Field Builder (locked system fields, toggle/require/rename module fields, custom fields of all 7 types with reorder and live preview), Terminology, Roles & Permissions matrix, Plan & Billing with mock invoices.
- **Onboarding wizard** (5 steps) from Add tenant and "Restart onboarding"; finishes by creating the tenant and opening its dashboard.
- Seed data: 16 modules, 6 bundles, 3 plans, 5 tenants, 20–30 realistic records per entity per tenant.

## Technical details
- Spec says React Router; this project uses TanStack Router (same capability), so routes are files under `src/routes/super.*` and `src/routes/app.*`, including `app.$module.tsx` for generic module pages.
- Zustand store with `persist` (localStorage); typed seed data in `src/data/`.
- Generic `DynamicForm` / `DynamicTable` (search, filters, column visibility, pagination) driven by field definitions + tenant field settings; hooks `useModules`, `useFields(entity)`, `useTerms`.
- Required-field validation generated from config (zod built dynamically).
- Tenant brand color injected as the `--primary` CSS variable; super admin uses its own accent. Recharts for charts, sonner toasts, shadcn sidebar (collapsible to icons).
- Acceptance behaviors (tenant switch, module off, field disable/require, custom fields, terminology) verified in the browser and with small unit tests for dependency and pricing rules.
