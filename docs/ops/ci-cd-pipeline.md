# CI/CD Pipeline Documentation

This document provides a comprehensive overview of EquipQR's entire CI/CD pipeline, including GitHub Actions workflows, external services (Vercel, Supabase), and their interactions.

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EquipQR CI/CD Pipeline                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌────────────────────────────────────────────────────────┐ │
│  │  Push   │───▶│                  GitHub Actions                        │ │
│  │ to Git  │    │  ┌─────────────┐  ┌──────────┐  ┌───────────────────┐  │ │
│  └─────────┘    │  │ CI Workflow │  │ Deploy   │  │ Release metadata │  │ │
│                 │  │ (parallel)  │  │ Workflow │  │ (preview|main)   │  │ │
│                 │  └─────────────┘  └──────────┘  └───────────────────┘  │ │
│                 └────────────────────────────────────────────────────────┘ │
│                                       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         External Services                               ││
│  │  ┌──────────────────┐    ┌─────────────────────────────────────────┐   ││
│  │  │     Vercel       │    │   preview.equipqr.app ← git preview   │   ││
│  │  │ (auto-deploys)   │    │   (normal Preview deploys on merge)   │   ││
│  │  └──────────────────┘    └─────────────────────────────────────────┘   ││
│  │           │                                                              ││
│  │           ▼                                                              ││
│  │  ┌──────────────────┐    ┌─────────────────────────────────────────┐   ││
│  │  │   Live Site      │    │   Shared Supabase (supabase.equipqr.app) │   ││
│  │  │ equipqr.app or   │    │   + ephemeral PR branches when           │   ││
│  │  │ preview.equipqr  │    │     supabase/** changes                  │   ││
│  │  └──────────────────┘    └─────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Environments

| Environment | Git trigger | Frontend URL | Supabase API |
|-------------|-------------|--------------|--------------|
| **Production** | Push to `main` (auto-promote via Production Release Readiness) | https://equipqr.app | `https://supabase.equipqr.app` (`ymxkzronkhwxzcdcbnwq`) |
| **Integration preview** | Push/merge to git **`preview`** | https://preview.equipqr.app | Same production API (`supabase.equipqr.app`) |
| **PR Preview** | Feature PRs / work-branch pushes | Commit-specific `*.vercel.app` | Prod API by default; ephemeral Supabase when `supabase/**` changes |

> **Train (#1282):** feat → preview → main. Authoritative loop: **`docs/ops/git-and-deploy.md`**. Retired: `preview-domain-alias.yml`, Vercel custom **`staging`**, persistent Supabase **`olsdirkvvfegvclbpgrg`**. History: `docs/ops/preview-architecture-migration.md`.

## GitHub Actions Workflows

### 1. Continuous Integration (`ci.yml`)

**Trigger:** Push or PR to `main` or `preview`

**Purpose:** Validate code quality, run tests, and ensure build works

**Jobs (run in parallel where possible):**

| Job | Runner | Purpose |
|-----|--------|---------|
| `lint-and-typecheck` | Self-hosted | ESLint + TypeScript type checking |
| `test` | Self-hosted | Vitest tests with coverage (Node 24.x LTS, matches `ci.yml`) |
| `security` | GitHub-hosted | npm audit + CodeQL security scan |
| `build` | Self-hosted | Production build + bundle analysis |
| `quality-gates` | Self-hosted | Final checks (bundle size limits, gzip size) |
| `report-coverage` | GitHub-hosted | Post coverage report to PRs |
| `preview-release-metadata` | CI | PRs into **`preview`**: Unreleased-only; forbid package version bump |
| `release-metadata` | CI | PRs into **`main`**: empty Unreleased + semver bump when release-relevant |

**Quality Gates:**
- Build size must be < 12MB total
- Individual JS bundles must be < 500KB gzipped
- Test coverage must meet baseline (70%)

### 2. Deploy Workflow (`deploy.yml`)

**Trigger:** Push to `main`

**Purpose:** Notification workflow for Vercel production deployments

> **Note:** Actual deployment is handled by Vercel's GitHub integration, not this workflow. Merges to git **`preview`** update **`preview.equipqr.app`** via normal Vercel Preview deploys. Feature PRs get commit-specific Preview URLs.

### 3. Preview Domain Alias — REMOVED

**`preview-domain-alias.yml` is retired (#1282).** It previously fast-forwarded git `preview` from `main` and fired a deploy hook. Do not reference it as live. `preview.equipqr.app` tracks git **`preview`** through ordinary Vercel deploys on that branch.

### 4. Auto Version Tag (`version-tag.yml`)

**Trigger:** Push to `main` when `package.json` changes

**Purpose:** Automatically create git tags when version is bumped

**Process:**
1. Reads version from `package.json`
2. Validates semver format (x.y.z)
3. Creates annotated tag `vX.Y.Z` if it doesn't exist
4. Pushes tag to origin

### 5. Deployment Status (`deployment-status.yml`)

**Trigger:** `deployment_status` events

**Purpose:** Log deployment success/failure from the **SPA** Vercel project (`equipqr` / `equipqr.app`). Events whose environment name contains `equipqr-docs` are ignored so the separate docs project (`equipqr.info`, main-only deploys) does not fail preview PR checks.

### 6. Export Database Schema (`export-schema.yml`)

**Trigger:** Push to `main` branch, or manual dispatch

**Purpose:** Export the database schema from the **production** Supabase project and commit it to the repository

**What it does:**
- Uses Supabase CLI to dump schema from preview project
- Exports `public`, `storage`, `auth`, and `pgmq_public` schemas to `supabase/schema.sql`
- Queries `pg_policies` / table RLS posture into `supabase/rls-policies.sql`
- Commits both reference files if changed
- Uses `paths-ignore` and bot-actor guard to prevent workflow loops

**Benefits:**
- Instant visibility into current database structure
- No need to mentally reconstruct schema from 160+ migration files
- Useful for onboarding and documentation
- Easy schema review in PRs

**Required Secret:** `PREVIEW_DATABASE_URL` (GitHub secret name unchanged; value should point at production pooler after #1033 cutover)
- Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
- Obtain from: Supabase Dashboard → Production Project (`ymxkzronkhwxzcdcbnwq`) → Settings → Database → Connection string (URI)

---

## External Services

### Vercel

**Integration Type:** GitHub App (automatic)

**Configuration File:** `vercel.json`

**How it works:**
1. Vercel GitHub App is installed on the repository
2. On every push, Vercel automatically:
   - Builds the application (`npm run build`)
   - Deploys to a unique per-commit URL
   - Assigns domain aliases based on branch

**Branch to Domain Mapping:**
| Git context | Vercel target | Stable alias |
|-------------|---------------|--------------|
| `main` | Production | `equipqr.app` (auto-promote after release readiness) |
| `preview` (integration train) | Preview | `preview.equipqr.app` (branch-bound; normal deploys on push/merge) |
| PR / other non-`main` push | Preview | Per-deployment URL only |

**Key Settings (`vercel.json`):**
- SPA routing (all routes → `/index.html`)
- Security headers (HSTS, X-Frame-Options, etc.)
- Asset caching (1 year for `/assets/*`)
- Auto-deploy on git push: **`main`** (production build) and **`preview`** (integration → `preview.equipqr.app`). Feature-branch PRs also receive per-PR Preview URLs via the GitHub integration.

**Preview hostname:** `preview.equipqr.app` is attached to the standard **Preview** environment (not the retired custom **`staging`** environment).

**Environment Variables (Vercel Dashboard):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_APP_VERSION` - Set automatically during build

#### Public documentation site (`equipqr.info`)

Technical documentation is deployed as a **second Vercel project** (same GitHub repo, different **Root Directory**), so `equipqr.app` stays the product SPA and `equipqr.info` serves static docs.

| Item | Value |
|------|--------|
| Repository | `Columbia-Cloudworks-LLC/EquipQR` |
| Vercel project | `equipqr-docs` (`prj_6QicTVywixyyAYc7sxCRDLnqwbM9`) |
| Root Directory | `docs` |
| Install Command | `npm ci` |
| Build Command | `npm run docs:build` |
| Output Directory | `.vitepress/dist` |
| Config | [`docs/vercel.json`](../vercel.json) |
| Production hostname | `https://equipqr.info` (apex). `www.equipqr.info` should redirect to apex. |

**Deployment cadence:** Git-connected Production builds run when **`main`** receives commits that touch **`docs/`** (scoped Root Directory). Non-`main` branches are skipped via `ignoreCommand` in [`docs/vercel.json`](../vercel.json). App-only merges do **not** redeploy the docs bundle unless `docs/` changes — intentional for static documentation.

**Setup (dashboard):** Vercel → **Add New Project** → import the repo → set **Root Directory** to `docs` → confirm build settings above → deploy. Then attach **`equipqr.info`** and **`www.equipqr.info`** to this docs project (move from the app project if they were previously assigned there), and configure **`www` → apex** redirect. DNS must follow Vercel’s instructions at the domain registrar.

Local preview: from repo root, `npm run docs:dev` or `npm run docs:preview` after `npm run docs:build`.

---

### Supabase

**Configuration File:** `supabase/config.toml`

**Projects:**
- **Production (and cloud preview app):** `ymxkzronkhwxzcdcbnwq` — API `https://supabase.equipqr.app`
- **Ephemeral PR branches:** Created automatically when `supabase/**` changes on a PR (schema validation only)
- **Retired persistent preview branch:** `olsdirkvvfegvclbpgrg` — decommission after #1033 cutover (see `preview-architecture-migration.md`)

#### Auth Site URL (production Supabase)

Cloud preview (`preview.equipqr.app`) uses the **same** Supabase project as production. Auth `site_url` and redirect URIs should include:

- `https://preview.equipqr.app/**`
- `https://equipqr.app/**`
- Local dev URLs (`http://localhost:8080/**`, etc.)

The retired `configure-supabase-auth.yml` workflow (which patched **olsdirk** after each `preview` branch deploy) remains removed; cloud preview uses the production Supabase project.

---

## Deployment Timeline

When you open or update a PR (Preview deployment):

| Time | Event |
|------|-------|
| 0:00 | Push to feature branch or PR synchronize |
| 0:01 | GitHub Actions CI starts |
| 0:01 | Vercel receives webhook, starts Preview build |
| ~2:00 | Vercel Preview deployment ready (commit-specific URL; `preview.equipqr.app` is **not** touched by PR builds) |
| ~3:00 | CI complete |

When you merge to git **`preview`**:

| Time | Event |
|------|-------|
| 0:00 | Push/merge to `preview` |
| 0:01 | CI on `preview` |
| 0:01 | Vercel Preview build for branch `preview` |
| ~2:00 | `preview.equipqr.app` points at the new Preview deployment |

When you merge a promote to **`main`**:

| Time | Event |
|------|-------|
| 0:00 | Push to `main` |
| 0:01 | CI + Production Release Readiness workflows |
| ~2:00 | Vercel Production build ready; Production Release Readiness promotes to `equipqr.app` |

---

## Runner Configuration

EquipQR uses a hybrid runner strategy for optimal performance and security.

**Current Configuration:** Self-hosted (Windows)

**Toggle Method:**
```powershell
# Switch to self-hosted
pwsh -File scripts/switch-runner-type.ps1 -RunnerType self-hosted

# Switch to GitHub-hosted
pwsh -File scripts/switch-runner-type.ps1 -RunnerType github-hosted
```

**Runner Assignment:**

| Job Type | Runner | Reason |
|----------|--------|--------|
| Lint, Test, Build | Self-hosted | Faster with local resources |
| Security Scan | GitHub-hosted | Isolation for security scans |
| Coverage Report | GitHub-hosted | Simple, doesn't need local resources |

**Benefits of Self-hosted:**
- 30-50% faster builds
- No queue time
- Persistent cache
- No GitHub Actions minutes consumed

See [Deployment Guide - Self-Hosted Runner Setup](./deployment.md#self-hosted-runner-setup) for detailed configuration.

---

## Secrets Required

### GitHub Repository Secrets

| Secret | Purpose | Where to Obtain |
|--------|---------|-----------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_ACCESS_TOKEN` | Management API auth | Supabase Dashboard → Account → Access Tokens |
| `PREVIEW_DATABASE_URL` | Preview DB connection for schema export | Supabase Dashboard → Preview Project → Settings → Database → Connection string (URI) |
| `CODECOV_TOKEN` | Coverage reporting | Codecov dashboard |
| `GITHUB_TOKEN` | Auto-provided by GitHub | N/A |

### Vercel Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (per environment) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (per environment) |

---

## Troubleshooting

### OAuth redirects to wrong URL (preview)

**Symptom:** Google OAuth redirects to a per-commit Vercel URL instead of `preview.equipqr.app`

**Checks:**
1. Confirm the latest Vercel Preview deployment for git branch **`preview`** is READY and aliased to `preview.equipqr.app`.
2. Confirm Vercel Preview env has `VITE_SUPABASE_URL=https://supabase.equipqr.app` (`sync-vercel-from-1password.ps1 -Check -Environment preview`).
3. Confirm Supabase Auth redirect URIs include `https://preview.equipqr.app/**` on the production project (`ymxkzronkhwxzcdcbnwq`).

### CI failing on self-hosted runner

**Check:**
1. Runner service is running: `Get-Service -Name "actions.runner.*"`
2. Disk space: Should have > 10GB free
3. Node.js: Install **Node 24.x LTS** (must satisfy `engines.node` in root `package.json`).

### Version tag not created

**Check:**
1. The push was to `main` branch
2. `package.json` was modified in the commit
3. Version follows semver format (x.y.z)
4. Tag doesn't already exist

### Build succeeds but app shows old version

**Check:**
1. Vercel deployment completed (check Vercel dashboard)
2. Browser cache cleared
3. `VITE_APP_VERSION` was set during build (check CI logs)

---

## Related Documentation

- [Deployment Guide](./deployment.md) - Detailed deployment and hosting information
- [Supabase Branch Secrets](./supabase-branch-secrets.md) - Edge Function secrets per branch
- [Migrations Guide](./migrations.md) - Database migration workflow
- [Local Supabase Development](./local-supabase-development.md) - Local development setup

---

## Pipeline Files Reference

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Continuous integration (lint, test, build, security) |
| `.github/workflows/deploy.yml` | Deployment notifications |
| `.github/workflows/preview-domain-alias.yml` | **REMOVED (#1282)** — do not restore; `preview.equipqr.app` tracks git `preview` via normal Vercel deploys |
| `.github/workflows/version-tag.yml` | Auto-create git tags on version bump |
| `.github/workflows/deployment-status.yml` | Log deployment status from Vercel |
| `.github/workflows/export-schema.yml` | Export database schema from production to `supabase/schema.sql` |
| `.github/runner-config.yml` | Runner type configuration |
| `vercel.json` | Vercel deployment configuration |
| `supabase/config.toml` | Supabase CLI configuration |
| `scripts/switch-runner-type.ps1` | Toggle self-hosted/GitHub-hosted runners |
| `scripts/test-ci.mjs` | CI test runner with coverage validation |
