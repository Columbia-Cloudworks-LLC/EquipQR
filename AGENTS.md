# AGENTS.md

> Agent-facing project context for EquipQR™ — a fleet equipment management SaaS platform built with React + Vite + Supabase.

## Project overview

EquipQR™ is a multi-tenant fleet equipment management platform. It features QR-code-based equipment access, work order management, real-time fleet map visualization, team/role management, and inventory tracking. The frontend is a React SPA deployed to Vercel; the backend is Supabase (Postgres + Edge Functions + Auth + Realtime).

**Repository**: `Columbia-Cloudworks-LLC/EquipQR`
**Version**: See `package.json` `version` field (currently 2.3.0).
**License**: Proprietary — Copyright Columbia Cloudworks LLC.

> See `.cursor/rules/tech-stack.mdc` for the full tech stack reference.

## Setup commands

```bash
# One-click dev environment (Windows — idempotent)
.\dev-start.bat    # Start Docker + Supabase + Vite (skips already-running services)
.\dev-stop.bat     # Gracefully stop all dev processes

# Install dependencies (npm only — no yarn/pnpm)
npm ci

# Start dev server (http://localhost:8080)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Run database tests (requires local Supabase)
npm run test:db

# Start local Supabase
npm run db:start
```

> See `.cursor/rules/coding-standards.mdc` for code style guidelines.

## Directory structure

```
src/
├── components/    # Shared UI components (shadcn/ui in components/ui/)
├── config/        # App configuration
├── contexts/      # React contexts (Auth, Theme, etc.)
├── features/      # Feature modules — each has components/, hooks/, services/, types/, utils/
├── hooks/         # Shared custom hooks
├── integrations/  # Third-party integration clients (Supabase)
├── lib/           # Utility libraries (cn(), utils)
├── pages/         # Route page components
├── services/      # Shared services (data, permissions, sync)
├── test/          # Test utilities, mocks, setup
├── tests/         # Journey/integration tests
├── types/         # Shared TypeScript types
└── utils/         # Shared utility functions

supabase/
├── functions/     # Deno Edge Functions (_shared/ for common utilities)
├── migrations/    # SQL migration files (timestamped)
├── seeds/         # Seed data (numbered for ordering)
└── tests/         # pgTAP database tests
```

> See `.cursor/rules/testing.mdc` for testing standards.

## Build & CI

The CI pipeline (`.github/workflows/ci.yml`) runs on every PR and push to `main`/`preview`:

1. **Lint & Type Check** — ESLint + `tsc --noEmit`
2. **Test Suite** — Vitest with coverage (Node 20.x + 22.x matrix)
3. **Security Scan** — npm audit + CodeQL analysis
4. **Build & Bundle Analysis** — `npm run build`, bundle size limits:
   - Total build: ≤12 MB
   - Individual JS bundle (gzipped): ≤500 KB
5. **Quality Gates** — Aggregates all checks

Always run these before submitting a PR:
```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## PR instructions

- Use the PR template at `.github/pull_request_template.md`.
- Title should be descriptive; no specific prefix required.
- Link related issues with `Fixes #123` or `Relates to #456`.
- Fill in the **Type of Change** checklist.
- Include before/after screenshots for UI changes.
- Ensure all CI checks pass before requesting review.
- All data access must filter by `organization_id` for multi-tenancy.
- RLS policies must not be bypassed.
- No sensitive data or secrets in code.

## Commit message conventions

- Follow [Keep a Changelog](https://keepachangelog.com/) categories: Added, Changed, Fixed, Removed, Security.
- Messages should focus on "why" not just "what".
- Reference issue numbers when applicable.

## Multi-tenancy rules

EquipQR is a multi-tenant application. **Every database query must be scoped to an organization**:

- All tables with user data include an `org_id` or `organization_id` column.
- Supabase Row Level Security (RLS) enforces tenant isolation at the database level.
- Frontend queries must always include organization context.
- When creating or updating RLS policies, use `(select auth.uid())` instead of `auth.uid()` to avoid per-row function calls (see Postgres best practices).
- Use `security definer` helper functions for complex RLS checks.
- Always index columns used in RLS policies.
- After DDL changes, check Supabase advisors for missing RLS policies.

## Roles & permissions (RBAC)

The app has a two-tier role system:

**Organization-level**: Owner > Admin > Member
**Team-level**: Manager > Technician > Viewer

- Permission checks happen both in RLS policies and in frontend via `usePermissions` hook.
- The `usePagePermissions` hook controls route-level access.
- All permission types are defined in `src/types/permissions.ts`.
- See `docs/guides/permissions.md` for the full RBAC matrix.

> See `.cursor/rules/supabase-migrations.mdc` for database & migration standards.

> See `.cursor/rules/supabase-functions.mdc` for Edge Function conventions.

## Environment variables

Three categories of environment variables:

| Category | Prefix | Where to Set | Access |
|---|---|---|---|
| Client (Vite) | `VITE_` | `.env` or `.env.local` | Exposed to browser at build time |
| Server (Edge Functions) | None | `supabase/functions/.env` | Server-side only (local dev) |
| Edge Function Secrets | None | Supabase Dashboard | Server-side only (production) |

**Required** (minimum to run):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

See `.env.example` for the full list with descriptions.

### Dual-environment deployment (Vercel + Supabase)

EquipQR runs on **two** independent platforms. Each has its own secrets store:

| Platform | What Lives There | How to Update |
|---|---|---|
| **Vercel** | `VITE_*` build-time env vars (Supabase URL, anon key, feature flags) | Vercel Dashboard → Project → Settings → Environment Variables |
| **Supabase** | Edge Function runtime secrets (API keys, OAuth secrets, encryption keys) | Supabase Dashboard → Project → Settings → Edge Functions → Secrets |

**Critical**: Redeploying on Vercel does **not** update Supabase Edge Function secrets, and vice versa. When rotating an API key used by an Edge Function, you must update it in the **Supabase Dashboard**, not Vercel.

Common Edge Function secrets that are **not** Vercel env vars:
- `GOOGLE_MAPS_BROWSER_KEY` — served to the browser at runtime by the `public-google-maps-key` edge function
- `GOOGLE_MAPS_SERVER_KEY` — used server-side by `places-autocomplete` and `geocode-location`
- `INTUIT_CLIENT_SECRET`, `GOOGLE_WORKSPACE_CLIENT_SECRET` — OAuth secrets
- `TOKEN_ENCRYPTION_KEY`, `KDF_SALT` — encryption secrets
- `RESEND_API_KEY`, `GITHUB_PAT` — third-party API keys

For local development, these are set in `supabase/functions/.env` (not the root `.env`).

## Feature flags

Feature flags are controlled via `VITE_` environment variables:
- `VITE_ENABLE_QUICKBOOKS` — QuickBooks Online integration
- `VITE_ENABLE_QB_PDF_ATTACHMENT` — QB PDF attachment feature

> See `.cursor/rules/architecture.mdc` and `.cursor/rules/design-system.mdc` for libraries & patterns.

> See `.cursor/rules/security-supabase.mdc` for security standards.

> See `.cursor/rules/performance.mdc` for performance guidelines.

## Documentation

Detailed documentation lives in `docs/`:
- `docs/technical/setup.md` — Full setup guide
- `docs/technical/architecture.md` — System architecture
- `docs/guides/permissions.md` — RBAC matrix
- `docs/guides/workflows.md` — User workflows
- `docs/ops/deployment.md` — Deployment procedures
- `docs/ops/migrations.md` — Migration guide
- `docs/ops/local-supabase-development.md` — Local Supabase setup
- `docs/features/` — Feature-specific documentation
