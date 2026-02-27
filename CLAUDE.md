# CLAUDE.md

> Project context and coding standards for EquipQR -- a multi-tenant fleet equipment management SaaS built with React + Vite + Supabase.

## Project Overview

EquipQR is a multi-tenant fleet equipment management platform featuring QR-code-based equipment access, work order management, real-time fleet map visualization, team/role management, and inventory tracking. The frontend is a React SPA deployed to Vercel; the backend is Supabase (Postgres + Edge Functions + Auth + Realtime).

**Repository**: `Columbia-Cloudworks-LLC/EquipQR`
**License**: Proprietary -- Copyright Columbia Cloudworks LLC.

## Tech Stack

- **Framework:** React 18.3+ with TypeScript 5.6+
- **Build:** Vite 5.4+
- **Styling:** Tailwind CSS 3.4+ with shadcn/ui components
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State:** TanStack Query v5 (server state), React Hook Form + Zod (forms), React Context (global UI only)
- **Routing:** React Router v6
- **Testing:** Vitest + React Testing Library
- **Icons:** Lucide React

## Setup Commands

```bash
# One-click dev environment (Windows -- idempotent)
.\dev-start.bat
.\dev-stop.bat

# Install (npm only -- no yarn/pnpm)
npm ci

# Dev server (http://localhost:8080)
npm run dev

# Verify before PR
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Directory Structure

```
src/
  components/    # Shared UI (shadcn/ui in components/ui/)
  config/        # App configuration
  contexts/      # React contexts (Auth, Theme, etc.)
  features/      # Feature modules -- each has components/, hooks/, services/, types/, utils/
  hooks/         # Shared custom hooks
  integrations/  # Third-party clients (Supabase)
  lib/           # Utilities (cn(), queryKeys)
  pages/         # Route page components
  services/      # Shared services
  test/          # Test utilities, mocks, setup
  types/         # Shared TypeScript types
  utils/         # Shared utility functions

supabase/
  functions/     # Deno Edge Functions (_shared/ for common utilities)
  migrations/    # SQL migration files (timestamped)
  seeds/         # Seed data
  tests/         # pgTAP database tests
```

## Environment (Windows)

This workspace runs on **Windows with PowerShell**. All terminal commands must avoid bash-only syntax:

- **Commit messages:** Use multiple `-m` flags or a temp file. Never use heredoc (`<<'EOF'`).
- **Quote paths** with double quotes.
- **Do not use** `&&` to chain commands (use `;` or separate calls).
- **Do not use** `$(...)` bash-style command substitution in git arguments.

---

## Coding Standards

### Folder Structure

- **Feature-based:** `src/features/<feature-name>/` with `components/`, `hooks/`, `services/`, `types/`
- **Shared UI:** `src/components/ui/` (shadcn/ui) or `src/components/common/`

### Naming

- **Components:** PascalCase (`WorkOrderCard.tsx`)
- **Hooks:** camelCase with `use` prefix (`useWorkOrderData.ts`)
- **Functions:** camelCase (`calculateTotalCost`)
- **Types:** PascalCase, no `I` prefix (`interface WorkOrder`)

### Best Practices

- **No `any`** -- use `unknown` and narrow types
- **Absolute imports** -- `import { Button } from "@/components/ui/button"`
- **Named exports** -- avoid default exports for components
- **Logic separation** -- extract complex logic from UI into custom hooks

---

## Architecture

### Data Flow: Service -> Hook -> Component

UI components MUST NOT call `supabase` directly.

1. **Service** (`src/features/<feature>/services/`): Supabase queries, returns typed promises
2. **Hook** (`src/hooks/` or `src/features/<feature>/hooks/`): Wraps service in `useQuery`/`useMutation`
3. **Component**: Consumes the hook

### State Management

- Prefer **Server State** (React Query) over **Global State** (Context/Redux)
- Context only for truly global app data (Auth, Theme, Toast)

### React Query Patterns

**No inline string arrays for query keys:**
```typescript
// BAD
useQuery({ queryKey: ['equipment', orgId], queryFn: ... })

// GOOD
import { equipment } from '@/lib/queryKeys';
useQuery({ queryKey: equipment.list(orgId), queryFn: ... })
```

- Always import key factories from `@/lib/queryKeys`
- If a factory doesn't exist, add it to `queryKeys.ts` as part of your changeset
- Every `useMutation` must invalidate relevant query keys in `onSuccess`

---

## Design System

- **Components:** Always check `src/components/ui/` for existing shadcn/ui components before creating new ones
- **Styling:** Tailwind CSS utility-first only. No custom CSS modules or `style` tags.
- **Responsiveness:** Mobile-first (`sm:`, `md:`, `lg:` prefixes)
- **Colors:** Semantic colors from `tailwind.config.ts` (`bg-primary`, `text-muted-foreground`). No hardcoded hex.
- **Icons:** `lucide-react` only

---

## Accessibility

- **Forms:** All inputs must have associated labels (`<Label htmlFor="...">` or `aria-label`)
- **Interactive elements:** Buttons and links must have discernible text or `aria-label`
- **Keyboard nav:** All custom interactive components must be focusable and keyboard-usable
- **Images:** All `img` tags must have descriptive `alt` text

---

## Performance

- `useMemo` for expensive calculations, `useCallback` for functions passed as props
- Set `staleTime` for queries (1-5 minutes minimum for non-critical data)
- `React.lazy` for heavy feature routes/pages
- Optimized image formats and sizing

---

## Feature Flags

New major features must be wrapped in feature flags:

```tsx
import { hasFlag } from '@/lib/flags';

export function NewFeaturePage() {
  if (!hasFlag('NEW_FEATURE')) return null;
  return <div>...</div>;
}
```

- Check existing flags in `src/lib/flags.ts` first
- Register new flags with default `false`

---

## Testing

- **Framework:** Vitest + React Testing Library
- **Location:** Co-locate with source (`Feature.tsx` -> `Feature.test.tsx`)
- **Philosophy:** Test behavior, not implementation details
- **Mocking:** Mock Supabase client and service layer. Do not mock internal component state.
- **Selectors:** Prefer accessible selectors (`getByRole`, `getByLabelText`) over `getByTestId`

---

## Multi-Tenancy (Critical)

Every database query MUST be scoped to an organization:

- All tables with user data include `org_id` or `organization_id`
- Supabase RLS enforces tenant isolation at the database level
- Frontend queries must always include organization context via `useOrganization()`
- Service functions must accept `organizationId` as a required parameter
- Mutations must include `organization_id` in payloads

---

## RBAC & Permissions

Two-tier role system:

- **Organization:** Owner > Admin > Member
- **Team:** Manager > Technician > Viewer

- Use `usePermissions()` before sensitive operations
- Gate Edit/Delete buttons by role
- Edge Functions must validate permissions at the start
- All permission types defined in `src/types/permissions.ts`
- See `docs/guides/permissions.md` for the full RBAC matrix

---

## Supabase Security & RLS

- **Never** create a policy that returns `true` (public access) without explicit justification
- **Minimize** `service_role` usage (admin tasks only)
- Use `(select auth.uid())` instead of `auth.uid()` in RLS policies to avoid per-row function calls
- Use `security definer` helper functions for complex RLS checks
- Always index columns used in RLS policies
- Only enable necessary extensions
- Use database triggers on `auth.users` for user profile creation

---

## Supabase Migrations

- **Naming:** `YYYYMMDDHHMMSS_description.sql`
- **Idempotency:** `CREATE TABLE IF NOT EXISTS`, `DO $$BEGIN...END$$` blocks
- **Keys:** Always define PKs and FKs with explicit names
- **Indexes:** Name as `idx_<table>_<column>`
- **Snake_case** for all identifiers
- **RLS:** Enable on every table immediately after creation
- **Deployment:** Validate locally first. Deploy via CI/CD, never directly against production.

---

## Edge Functions (Deno)

- **Runtime:** Deno (not Node.js). Use URL imports or JSR.
- **Entry point:** `index.ts` with `serve` handler
- **Shared code:** `supabase/functions/_shared/`
- **CORS:** Always handle `OPTIONS` requests and standard CORS headers
- **Supabase client:** Create inside handler with `Authorization` header context
- **Error handling:** Proper HTTP status codes (400, 401, 500) and JSON error messages

---

## CI/CD Pipeline

Runs on every PR and push to `main`/`preview`:

1. Lint & type check (ESLint + `tsc --noEmit`)
2. Test suite (Vitest with coverage, Node 20.x + 22.x matrix)
3. Security scan (npm audit + CodeQL)
4. Build & bundle analysis (total <=12 MB, individual JS gzipped <=500 KB)
5. Quality gates

---

## Commit Conventions

- Follow [Keep a Changelog](https://keepachangelog.com/) categories: Added, Changed, Fixed, Removed, Security
- Focus on "why" not just "what"
- Reference issue numbers when applicable

## PR Instructions

- Use PR template at `.github/pull_request_template.md`
- Link related issues with `Fixes #123` or `Relates to #456`
- Include before/after screenshots for UI changes
- Ensure all CI checks pass before requesting review

---

## Environment Variables

| Category | Prefix | Where to Set |
|---|---|---|
| Client (Vite) | `VITE_` | `.env` or `.env.local` |
| Server (Edge Functions) | None | `supabase/functions/.env` |
| Edge Function Secrets | None | Supabase Dashboard |

**Required:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Vercel hosts `VITE_*` build-time vars. Supabase Dashboard hosts Edge Function runtime secrets. Redeploying one does NOT update the other.

---

## Documentation

- `docs/technical/setup.md` -- Full setup guide
- `docs/technical/architecture.md` -- System architecture
- `docs/guides/permissions.md` -- RBAC matrix
- `docs/guides/workflows.md` -- User workflows
- `docs/ops/deployment.md` -- Deployment procedures
- `docs/ops/migrations.md` -- Migration guide
