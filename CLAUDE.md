# CLAUDE.md

> Project context for EquipQR. Detailed coding constraints live in `.cursor/rules/*.mdc`.

## Project Overview

EquipQR is a multi-tenant fleet equipment management SaaS with QR-code-based equipment access, work order management, real-time fleet map visualization, team and role management, and inventory tracking.

- **Frontend:** React + Vite SPA (deployed on Vercel)
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions)
- **Repository:** `Columbia-Cloudworks-LLC/EquipQR`
- **License:** Proprietary (Copyright Columbia Cloudworks LLC)

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TanStack Query + React Hook Form + Zod
- Supabase + PostgreSQL
- Vitest + React Testing Library

## Setup Commands

```bash
# One-click dev environment (Windows)
.\dev-start.bat   # launches dev-start.ps1
.\dev-stop.bat    # launches dev-stop.ps1

# Install
npm ci

# Dev server
npm run dev

# Verify before PR
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Directory Structure

```text
src/
  components/
  config/
  contexts/
  features/
  hooks/
  integrations/
  lib/
  pages/
  services/
  test/
  types/
  utils/

supabase/
  functions/
  migrations/
  seeds/
  tests/
```

## Environment (Windows)

This repo is developed on Windows with PowerShell. Follow PowerShell-safe command conventions; detailed git syntax constraints are defined in `.cursor/rules/git-powershell.mdc`.

## Multi-Tenancy (Critical)

Every database query must be organization-scoped.

- Tables with user data include `org_id` or `organization_id`
- Frontend queries carry organization context via `useOrganization()`
- Service functions take `organizationId` as required input
- Mutations include `organization_id` in payloads
- RLS enforces tenant isolation in Postgres

## RBAC & Permissions

Two-tier roles:

- **Organization:** Owner > Admin > Member
- **Team:** Manager > Technician > Viewer

Requirements:

- Use `usePermissions()` before sensitive operations
- Gate destructive actions (edit/delete) by role
- Validate permissions at Edge Function entrypoints
- Keep permission types in `src/types/permissions.ts`
- Use `docs/guides/permissions.md` as the RBAC reference

## CI/CD Pipeline

Runs on PRs and pushes to `main`/`preview`:

1. Lint and typecheck
2. Unit tests with coverage
3. Security scanning
4. Build and bundle checks
5. Quality gates

## Commit Conventions

- Follow [Keep a Changelog](https://keepachangelog.com/) categories: Added, Changed, Fixed, Removed, Security
- Explain why a change is needed, not only what changed
- Reference issue IDs when relevant

## PR Instructions

- Use `.github/pull_request_template.md`
- Link issues with `Fixes #123` or `Relates to #456`
- Include before/after screenshots for UI changes
- Ensure CI passes before requesting review

## Environment Variables

| Category | Prefix | Where to Set |
|---|---|---|
| Client (Vite) | `VITE_` | `.env` or `.env.local` |
| Server (Edge Functions) | None | `supabase/functions/.env` |
| Edge Function Secrets | None | Supabase Dashboard |

Required client variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Documentation

- `docs/technical/setup.md` - Full setup guide
- `docs/technical/architecture.md` - System architecture
- `docs/guides/permissions.md` - RBAC matrix
- `docs/guides/workflows.md` - User workflows
- `docs/ops/deployment.md` - Deployment procedures
- `docs/ops/migrations.md` - Migration guide

## AI Tooling Baseline

This repository follows a Cursor plugin-first workflow. Prefer installed Cursor plugins and keep custom command usage minimal.

Retained custom command:

- `reflect` for retrospective process improvement when a conversation or workflow is not going well.
