# Git and Deploy (authoritative)

Solo-developer workflow for EquipQR after #1033 cutover. **There is no git `preview` integration branch.**

## Branches

| Git | Role |
|-----|------|
| **`main`** | Production source of truth. Merge target for all work. |
| **`feat/*`, `fix/*`, etc.** | Short-lived work branches. Branch off `main`. |

```powershell
git fetch origin main
git switch -c feat/<short-name> origin/main
```

Open PRs with `--base main` only.

## Hostnames (do not confuse with git branch names)

| URL | Meaning |
|-----|---------|
| **https://equipqr.app** | Production (Vercel Production, live after `vercel promote`) |
| **https://preview.equipqr.app** | Stable **pre-production** hostname on Vercel **Preview** — shows your latest in-progress work |
| **Per-PR `*.vercel.app` URLs** | Automatic Preview deployments for open PRs |

`preview.equipqr.app` is **not** tied to a git branch named `preview`. Any push to a non-`main` branch (or PR Preview deploy) can update it via `preview-domain-alias.yml`.

## Day-to-day loop

1. Branch off `origin/main`.
2. Implement and verify locally (`dev-stop.bat` / `dev-start.bat`, lint, tests, E2E).
3. Push your work branch → Vercel builds a **Preview** deployment.
4. Confirm **`preview.equipqr.app`** shows the latest build (alias workflow runs on successful Preview deploys).
5. Open PR **`feat/*` → `main`**. CI + Supabase ephemeral branch (when `supabase/**` changes) must pass.
6. Merge to `main` → **Production Release Readiness** applies migrations, checks schema drift, waits for Vercel build, runs **`vercel promote`** → **equipqr.app** updates.

## Vercel configuration

| Setting | Value |
|---------|--------|
| **Production** env | Branch tracking: **`main`**. Auto-assign production domains. |
| **Preview** env | Branch tracking: **enabled** → all unassigned branches. Domain: **`preview.equipqr.app`**. |
| **`vercel.json`** | Do **not** restrict `git.deploymentEnabled` to named branches — all non-`main` pushes must build. |

## Supabase

- **Cloud app:** single production project (`https://supabase.equipqr.app`).
- **PR branches:** ephemeral Supabase branches when `supabase/**` changes on a PR to `main` (schema/RLS validation only).
- **OAuth:** vendor callbacks stay on production edge URLs; test integrations on the **local stack** before merge.

## Release / version tags

- Bump `package.json` version on `main` (via PR or direct commit per branch protection).
- `version-tag.yml` creates `vX.Y.Z` tags on push to `main` when `package.json` changes.
- No `preview → main` release train PR.

## Retired (do not use)

- Git branch **`preview`** as integration branch
- Vercel custom **`staging`** environment
- Persistent Supabase branch **`olsdirkvvfegvclbpgrg`**
- PRs targeting **`preview`**

See `docs/ops/preview-architecture-migration.md` for cutover history.

## Related docs

- `.cursor/rules/branching.mdc` — agent branching rules
- `docs/ops/ci-cd-pipeline.md` — GitHub Actions
- `docs/ops/deployment.md` — Vercel/Supabase operations detail
- `CONTRIBUTING.md` — contributor onboarding
