# AGENTS.md

> Agent-facing project context for EquipQR™ — a fleet equipment management SaaS platform built with React + Vite + Supabase.

## Project overview

EquipQR™ is a multi-tenant fleet equipment management platform. It features QR-code-based equipment access, work order management, real-time fleet map visualization, team/role management, and inventory tracking. The frontend is a React SPA deployed to Vercel; the backend is Supabase (Postgres + Edge Functions + Auth + Realtime).

**Repository**: `Columbia-Cloudworks-LLC/EquipQR`
**Version**: See `package.json` `version` field (currently 2.3.0).
**License**: Proprietary — Copyright Columbia Cloudworks LLC.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Routing | React Router v6 |
| Server state | TanStack Query (React Query) v5 |
| Forms | React Hook Form + Zod validation |
| UI components | shadcn/ui (Radix primitives + Tailwind CSS) |
| Icons | Lucide React |
| Backend | Supabase (Postgres, Auth, Realtime, Storage) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Testing | Vitest + React Testing Library + jsdom |
| Linting | ESLint (flat config) + TypeScript ESLint |
| CI | GitHub Actions |
| Deployment | Vercel |

## Setup commands

```bash
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

## Code style

- TypeScript throughout (`.ts` / `.tsx`). No plain `.js` files in `src/`.
- Path alias: `@/` maps to `./src/` (configured in `tsconfig.json` and `vite.config.ts`).
- ESLint flat config (`eslint.config.js`) with `react-hooks` and `react-refresh` plugins.
- `no-console` is enforced in `src/` — use `console.error` only; use `@/utils/logger.ts` for structured logging.
- `@typescript-eslint/no-unused-vars` and `@typescript-eslint/no-explicit-any` are `warn`.
- Prefer `unknown` over `any`. Avoid introducing new `any` types.
- Single quotes are not enforced by config; follow surrounding code style.
- Use functional React components; no class components.
- Use `React.lazy()` for route-level code splitting of heavy pages.

## Directory structure

```
src/
├── components/        # Shared UI components (shadcn/ui in components/ui/)
├── config/            # App configuration
├── contexts/          # React contexts (Auth, Theme, etc.)
├── features/          # Feature modules (equipment, work-orders, teams, etc.)
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── utils/
├── hooks/             # Shared custom hooks
├── integrations/      # Third-party integration clients (Supabase)
├── lib/               # Utility libraries (cn(), utils)
├── pages/             # Route page components
├── services/          # Shared services (data, permissions, sync)
├── test/              # Test utilities, mocks, setup
├── tests/             # Journey/integration tests
├── types/             # Shared TypeScript types
└── utils/             # Shared utility functions

supabase/
├── functions/         # Deno Edge Functions
│   ├── _shared/       # Shared Edge Function utilities (CORS, auth, clients)
│   └── <function>/    # One folder per Edge Function
├── migrations/        # SQL migration files (timestamped)
├── seeds/             # Seed data (numbered for ordering)
└── tests/             # pgTAP database tests
```

## Testing instructions

- **Framework**: Vitest with jsdom environment and React Testing Library.
- **Config**: `vitest.config.ts` at project root.
- **Setup file**: `src/test/setup.ts`.
- **Test location**: Co-locate test files next to source (e.g., `useAuth.test.tsx` beside `useAuth.ts`), or in `__tests__/` subdirectories.
- **Naming**: `*.test.ts` or `*.test.tsx`.
- **Run all tests**: `npm test`
- **Run specific file**: `npx vitest run src/utils/dateFormatter.test.ts`
- **Run by pattern**: `npx vitest run -t "should format date"`
- **Coverage baseline**: CI enforces ≥51% overall; local thresholds in `vitest.config.ts`.
- **Journey tests** (`src/tests/journeys/`): These render full page components — do NOT import hooks directly or use `renderHook*` in journey tests (ESLint enforces this).
- **Database tests**: `npm run test:db` runs pgTAP tests in `supabase/tests/`.
- **CI matrix**: Tests run on Node 20.x and 22.x.
- Add or update tests for any code you change.
- All tests must pass before merging.

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

## Database & migrations

- **Database**: Supabase-managed Postgres with RLS enabled on all public tables.
- **Migrations**: Located in `supabase/migrations/` with timestamp prefixes (e.g., `20260209005548_fix_security_hardening.sql`).
- **Naming**: Use snake_case for all SQL identifiers (tables, columns, functions).
- **Primary keys**: Use `uuid` (via `gen_random_uuid()`) or `bigint generated always as identity`.
- **Timestamps**: Always use `timestamptz`, never `timestamp`.
- **Seeds**: Numbered files in `supabase/seeds/` (00-99 ordering).
- **Local dev**: `supabase start` to run local Supabase; `supabase db reset` to reset with migrations + seeds.
- Never hardcode generated IDs in migration data.

## Edge Functions

- Located in `supabase/functions/<function-name>/index.ts`.
- Runtime: Deno (not Node.js).
- Shared utilities in `supabase/functions/_shared/` (CORS, auth validation, Supabase clients, origin validation).
- All functions should validate origin using `_shared/origin-validation.ts`.
- All functions must import CORS headers from `_shared/cors.ts`.
- JWT verification should be enabled unless the function implements custom auth.
- Edge Function environment variables are set in `supabase/functions/.env` (local) or Supabase Dashboard (production).

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

## Key libraries & patterns

- **State management**: TanStack Query for server state; React context for client state (auth, theme). No Redux.
- **Data fetching**: All Supabase queries go through service functions in `services/` or `features/*/services/`. Use TanStack Query hooks to wrap them.
- **Forms**: React Hook Form + Zod schemas. Schemas live in `features/*/schemas/`.
- **Toasts**: Use `sonner` via `useAppToast` hook (not raw `toast()`).
- **UI components**: Always use existing primitives from `src/components/ui/` (shadcn/ui). Do not create custom buttons, dialogs, etc.
- **Icons**: Import from `lucide-react`.
- **Date formatting**: Use `date-fns` and `date-fns-tz`. Helper in `src/utils/dateFormatter.ts`.
- **Error handling**: Use `src/utils/errorHandling.ts` patterns. Never swallow errors silently.
- **Route code splitting**: Heavy pages use `React.lazy()` with `Suspense` boundaries.

## Security considerations

- Never commit `.env` files, credentials, or API keys.
- All Edge Functions validate request origin.
- CORS headers are centrally managed in `_shared/cors.ts`.
- hCaptcha protects signup forms.
- Input validation with Zod on both client and server.
- CSP headers are configured in `vite.config.ts` (dev) and deployment config (production).
- Run `npm audit` periodically; CI runs CodeQL security analysis.
- Stripe webhooks use signature verification.
- OAuth tokens (QuickBooks, Google Workspace) are stored server-side only.

## Performance guidelines

- Bundle splitting is configured in `vite.config.ts` `manualChunks`.
- Main JS bundle (gzipped) must stay under 500 KB.
- Total build must stay under 12 MB.
- Use `React.lazy()` for route-level code splitting.
- Prefer direct imports over barrel file imports for large libraries.
- Use `content-visibility: auto` for long lists.
- Use `react-window` for virtualized lists (already a dependency).
- Use functional `setState` updates to avoid stale closures.
- Derive state during render instead of syncing with `useEffect`.

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
