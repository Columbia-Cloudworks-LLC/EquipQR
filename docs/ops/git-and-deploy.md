# Git and Deploy (authoritative)

Solo-developer workflow for EquipQR after #1282 restored the feat → preview → main train.

## Branches

| Git | Role |
|-----|------|
| **`main`** | Production source of truth. Receives controlled promotes from `preview`. |
| **`preview`** | Integration / pre-production train. Default merge target for feature work. Deploys to **`preview.equipqr.app`**. |
| **`feat/*`, `fix/*`, etc.** | Short-lived work branches. Branch off `preview`. |

```powershell
git fetch origin preview
git switch -c feat/<short-name> origin/preview
```

Open day-to-day PRs with `--base preview`. Production ships via **`preview` → `main`** (or `/release`).

## Hostnames

| URL | Meaning |
|-----|---------|
| **https://equipqr.app** | Production (after Production Release Readiness + `vercel promote`) |
| **`https://<project>-<hash>-columbia-cloudworks-llc.vercel.app`** | Commit-specific Vercel Preview URL for every work-branch / PR deploy |
| **https://preview.equipqr.app** | Stable hostname for the **integration** git branch **`preview`** — Vercel Preview deploys on merges/pushes to that branch (branch-bound custom domain). Not fast-forwarded from `main`. |

Do **not** confuse git branch **`preview`** (integration train) with Vercel environment **Preview** (all non-production deploys).

## Day-to-day loop

1. Branch off `origin/preview`.
2. Implement and verify locally (`dev-stop.bat` / `dev-start.bat`, lint, tests, E2E).
3. Push your work branch → Vercel builds a **Preview** deployment.
4. Test on the **commit-specific `*.vercel.app` URL** and/or local stack.
5. Open PR **`feat/*` → `preview`**. CI + Supabase ephemeral branch (when `supabase/**` changes) must pass. Accumulate CHANGELOG `[Unreleased]`; **do not** bump `package.json`.
6. Merge to `preview` → Vercel updates **`preview.equipqr.app`**.
7. When ready to ship: **`/release`** or open **`preview` → `main`** with version bump + empty Unreleased → **Production Release Readiness** → **`vercel promote`** → **equipqr.app**.

## Vercel configuration

| Setting | Value |
|---------|--------|
| **Production** env | Branch tracking: **`main`**. Auto-assign production domains after promote. |
| **Preview** env | Branch tracking: enabled for work branches. Custom domain **`preview.equipqr.app`** assigned to git branch **`preview`** (normal deploys on push/merge to that branch). |
| **`vercel.json`** | `github.deploymentEnabled: true`; allow **`main`** and **`preview`** git deployments. |

Retired: `preview-domain-alias.yml` (fast-forward `preview` from `main` + deploy hook). Do not reintroduce it.

## Supabase

- **Cloud app (`preview.equipqr.app` and `equipqr.app`):** single production project (`https://supabase.equipqr.app`). No perpetual Supabase preview database.
- **PR branches:** ephemeral Supabase branches when `supabase/**` changes (schema/RLS validation only).
- **OAuth:** vendor callbacks stay on production edge URLs; test integrations on the **local stack** before merge.

## Release / version tags

- PRs into **`preview`**: `[Unreleased]` notes only; forbid app version bump.
- PRs into **`main`**: semver bump, versioned CHANGELOG section, empty `[Unreleased]`.
- **`/release`** opens **`preview` → `main`** (or `chore/release-v*` from curated preview tip).
- `version-tag.yml` tags on push to `main` when `package.json` changes.

## Retired (do not use)

- Main-centric day-to-day PRs (`feat` → `main` only) from the #1033 interim model
- `preview-domain-alias.yml` fast-forward of `preview` from `main`
- Vercel custom **`staging`** environment
- Persistent Supabase branch **`olsdirkvvfegvclbpgrg`**

See `docs/ops/preview-architecture-migration.md` for #1033 history and the #1282 reverse-migration note.

## Related docs

- `.cursor/rules/branching.mdc` — agent branching rules
- `docs/ops/ci-cd-pipeline.md` — GitHub Actions
- `docs/ops/deployment.md` — Vercel/Supabase operations detail
- `CONTRIBUTING.md` — contributor onboarding
