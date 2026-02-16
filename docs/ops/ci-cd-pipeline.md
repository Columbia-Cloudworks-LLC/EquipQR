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
│  └─────────┘    │  │ CI Workflow │  │ Deploy   │  │ Configure Auth    │  │ │
│                 │  │ (parallel)  │  │ Workflow │  │ (4min delay)      │  │ │
│                 │  └─────────────┘  └──────────┘  └───────────────────┘  │ │
│                 └────────────────────────────────────────────────────────┘ │
│                                       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         External Services                               ││
│  │  ┌──────────────────┐    ┌─────────────────────────────────────────┐   ││
│  │  │     Vercel       │───▶│        Supabase-Vercel Integration      │   ││
│  │  │ (auto-deploys)   │    │  (sets Site URL to per-commit URL)     │   ││
│  │  └──────────────────┘    └─────────────────────────────────────────┘   ││
│  │           │                              │                              ││
│  │           ▼                              ▼                              ││
│  │  ┌──────────────────┐    ┌─────────────────────────────────────────┐   ││
│  │  │   Live Site      │    │   Configure Supabase Auth Workflow      │   ││
│  │  │ equipqr.app or   │    │   (runs AFTER Vercel/Supabase finish)   │   ││
│  │  │ preview.equipqr  │    │   Sets correct Site URL & Redirects    │   ││
│  │  └──────────────────┘    └─────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Environments

| Environment | Branch | Frontend URL | Supabase Project ID |
|-------------|--------|--------------|---------------------|
| **Production** | `main` | https://equipqr.app | `ymxkzronkhwxzcdcbnwq` |
| **Preview/Staging** | `preview` | https://preview.equipqr.app | `olsdirkvvfegvclbpgrg` |

## GitHub Actions Workflows

### 1. Continuous Integration (`ci.yml`)

**Trigger:** Push or PR to `main` or `preview` branches

**Purpose:** Validate code quality, run tests, and ensure build works

**Jobs (run in parallel where possible):**

| Job | Runner | Purpose |
|-----|--------|---------|
| `lint-and-typecheck` | Self-hosted | ESLint + TypeScript type checking |
| `test` | Self-hosted | Vitest tests with coverage (Node 20.x, 22.x matrix) |
| `security` | GitHub-hosted | npm audit + CodeQL security scan |
| `build` | Self-hosted | Production build + bundle analysis |
| `quality-gates` | Self-hosted | Final checks (bundle size limits, gzip size) |
| `report-coverage` | GitHub-hosted | Post coverage report to PRs |

**Quality Gates:**
- Build size must be < 12MB total
- Individual JS bundles must be < 500KB gzipped
- Test coverage must meet baseline (70%)

### 2. Deploy Workflow (`deploy.yml`)

**Trigger:** Push to `main` or `preview` branches

**Purpose:** Notification workflow for Vercel deployments

> **Note:** Actual deployment is handled by Vercel's GitHub integration, not this workflow. This workflow provides deployment notifications and version tracking.

### 3. Configure Supabase Auth (`configure-supabase-auth.yml`)

**Trigger:** Push to `preview` branch

**Purpose:** Fix OAuth redirect URLs after Supabase-Vercel integration overwrites them

**Important:** This workflow includes a **4-minute delay** to ensure it runs AFTER:
1. Vercel deployment completes (~2-3 minutes)
2. Supabase-Vercel integration sets incorrect URLs

**What it does:**
- Sets `site_url` to `https://preview.equipqr.app`
- Sets `uri_allow_list` to include preview URL and localhost variants for OAuth callbacks

**Related Issue:** [#512 - Google OAuth redirects to per-commit Vercel URL](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/512)

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

**Purpose:** Log deployment success/failure from external services (Vercel)

### 6. Repomix Artifact (`repomix.yml`)

**Trigger:** Push or PR to `main`/`preview`, or manual dispatch

**Purpose:** Generate repository snapshot for AI context

### 7. Export Database Schema (`export-schema.yml`)

**Trigger:** Push to `main` branch, or manual dispatch

**Purpose:** Export the database schema from the preview Supabase project and commit it to the repository

**What it does:**
- Uses Supabase CLI to dump schema from preview project
- Exports `public`, `storage`, and `auth` schemas
- Commits `supabase/schema.sql` if changed
- Uses `paths-ignore` and bot-actor guard to prevent workflow loops

**Benefits:**
- Instant visibility into current database structure
- No need to mentally reconstruct schema from 160+ migration files
- Useful for onboarding and documentation
- Easy schema review in PRs

**Required Secret:** `PREVIEW_DATABASE_URL`
- Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
- Obtain from: Supabase Dashboard → Preview Project → Settings → Database → Connection string (URI)

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
| Branch | Production Alias | Per-commit URL Pattern |
|--------|-----------------|------------------------|
| `main` | `equipqr.app` | `equipqr-<hash>-columbia-cloudworks-llc.vercel.app` |
| `preview` | `preview.equipqr.app` | `equipqr-<hash>-columbia-cloudworks-llc.vercel.app` |

**Key Settings (`vercel.json`):**
- SPA routing (all routes → `/index.html`)
- Security headers (HSTS, X-Frame-Options, etc.)
- Asset caching (1 year for `/assets/*`)
- Auto-deploy enabled for `main` and `preview`

**Environment Variables (Vercel Dashboard):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_APP_VERSION` - Set automatically during build

---

### Supabase

**Configuration File:** `supabase/config.toml`

**Projects:**
- **Production:** `ymxkzronkhwxzcdcbnwq` (linked by default)
- **Preview/Staging:** `olsdirkvvfegvclbpgrg` (configured as `[remotes.staging]`)

#### Supabase-Vercel Integration

**What it does:**
The Supabase-Vercel integration automatically configures Supabase Auth settings when Vercel deploys:
- Sets `site_url` to the Vercel deployment URL
- May update `uri_allow_list` (redirect URIs)

**The Problem:**
For preview deployments, this sets the Site URL to a per-commit URL like:
```
https://equipqr-abc123-columbia-cloudworks-llc.vercel.app
```

Instead of the stable alias:
```
https://preview.equipqr.app
```

This breaks Google OAuth because the redirect URL doesn't match Google's authorized redirect URIs.

**The Solution:**
The `configure-supabase-auth.yml` workflow runs 4 minutes after push to `preview`, giving Vercel and the Supabase integration time to complete. It then uses the Supabase Management API to set the correct URLs.

#### Supabase Management API

The `scripts/configure-supabase-auth.mjs` script uses the Management API:

```
PATCH /v1/projects/{project_id}/config/auth
```

**Required Secret:** `SUPABASE_ACCESS_TOKEN`
- Obtain from: Supabase Dashboard → Account → Access Tokens
- Add to: GitHub repository secrets

**Payload format:**
```json
{
  "site_url": "https://preview.equipqr.app",
  "uri_allow_list": "https://preview.equipqr.app/**,http://localhost:5173/**,..."
}
```

> **Important:** `uri_allow_list` must be a comma-separated string, not an array.

---

## Deployment Timeline

When you push to the `preview` branch, here's what happens:

| Time | Event |
|------|-------|
| 0:00 | Push to `preview` branch |
| 0:01 | GitHub Actions workflows start (CI, Deploy, Configure Auth) |
| 0:01 | Vercel receives webhook, starts building |
| 0:30 | CI: lint-and-typecheck completes |
| ~1:30 | CI: tests complete |
| ~2:00 | Vercel: build completes, deploys to per-commit URL |
| ~2:30 | Vercel: assigns `preview.equipqr.app` alias |
| ~2:30 | Supabase-Vercel integration: sets Site URL to per-commit URL ❌ |
| ~3:00 | CI: build + quality-gates complete |
| 4:00 | Configure Auth workflow: wakes from sleep |
| 4:05 | Configure Auth workflow: sets correct Site URL ✅ |
| ~4:10 | All complete, OAuth works correctly |

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

**Symptom:** Google OAuth redirects to `equipqr-xxx.vercel.app` instead of `preview.equipqr.app`

**Cause:** Supabase-Vercel integration overwrote the Site URL

**Solution:** 
1. Wait 5-6 minutes after push for Configure Auth workflow to complete
2. If still wrong, manually run: `node scripts/configure-supabase-auth.mjs --environment preview`

### CI failing on self-hosted runner

**Check:**
1. Runner service is running: `Get-Service -Name "actions.runner.*"`
2. Disk space: Should have > 10GB free
3. Node.js versions: Both 20.x and 22.x should be installed

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
| `.github/workflows/configure-supabase-auth.yml` | Fix OAuth URLs after Vercel deploy |
| `.github/workflows/version-tag.yml` | Auto-create git tags on version bump |
| `.github/workflows/deployment-status.yml` | Log deployment status from Vercel |
| `.github/workflows/repomix.yml` | Generate repository snapshot |
| `.github/workflows/export-schema.yml` | Export database schema from preview to `supabase/schema.sql` |
| `.github/runner-config.yml` | Runner type configuration |
| `vercel.json` | Vercel deployment configuration |
| `supabase/config.toml` | Supabase CLI configuration |
| `scripts/configure-supabase-auth.mjs` | Supabase auth configuration script |
| `scripts/switch-runner-type.ps1` | Toggle self-hosted/GitHub-hosted runners |
| `scripts/test-ci.mjs` | CI test runner with coverage validation |
