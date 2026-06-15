# Git and Deploy (authoritative)

Solo-developer workflow for EquipQR after #1033 cutover.

## Branches

| Git | Role |
|-----|------|
| **`main`** | Production source of truth. Merge target for all work. |
| **`feat/*`, `fix/*`, etc.** | Short-lived work branches. Branch off `main`. |
| **`preview`** | **Vercel domain anchor only** — keeps `preview.equipqr.app` attached in the Vercel dashboard (Vercel requires a branch when assigning a custom Preview domain). **Not** an integration branch; do not PR feature work into it. |

```powershell
git fetch origin main
git switch -c feat/<short-name> origin/main
```

Open PRs with `--base main` only.

## Hostnames

| URL | Meaning |
|-----|---------|
| **https://equipqr.app** | Production (after Production Release Readiness + `vercel promote`) |
| **`https://<project>-<hash>-columbia-cloudworks-llc.vercel.app`** | **Default for day-to-day QA** — every Preview deploy on a work branch or PR gets a commit-specific URL (also linked on the PR / Vercel deployment). |
| **https://preview.equipqr.app** | **Optional** stable Preview hostname — Vercel binds this to git branch **`preview`** (dashboard setting). When that branch deploys, `preview-domain-alias.yml` points the custom domain at that deployment. Not updated by arbitrary `feat/*` Preview builds. |

Do **not** confuse git branch **`preview`** (domain anchor) with Vercel environment **Preview** (all non-production deploys).

## Day-to-day loop

1. Branch off `origin/main`.
2. Implement and verify locally (`dev-stop.bat` / `dev-start.bat`, lint, tests, E2E).
3. Push your work branch → Vercel builds a **Preview** deployment.
4. Test on the **commit-specific `*.vercel.app` URL** from the deployment (or local stack).
5. Open PR **`feat/*` → `main`**. CI + Supabase ephemeral branch (when `supabase/**` changes) must pass.
6. Merge to `main` → **Production Release Readiness** → **`vercel promote`** → **equipqr.app**.

Optional: fast-forward or merge `main` into git **`preview`** when you want **`preview.equipqr.app`** to reflect a known snapshot (not part of the default feature loop).

## Vercel configuration

| Setting | Value |
|---------|--------|
| **Production** env | Branch tracking: **`main`**. Auto-assign production domains. |
| **Preview** env | Branch tracking: enabled for work branches (Preview deploys). Custom domain **`preview.equipqr.app`**: assign to git branch **`preview`** (Vercel UI requirement). |
| **`vercel.json`** | `github.deploymentEnabled: true`; allow **`main`** and **`preview`** git deployments. Do not block other branches from Preview builds. |

## Supabase

- **Cloud app:** single production project (`https://supabase.equipqr.app`).
- **PR branches:** ephemeral Supabase branches when `supabase/**` changes on a PR to `main` (schema/RLS validation only).
- **OAuth:** vendor callbacks stay on production edge URLs; test integrations on the **local stack** before merge.

## Release / version tags

- Bump `package.json` on `main` (via PR). **`/release`** opens **`chore/release-v* → main`**, not `preview → main`.
- `version-tag.yml` tags on push to `main` when `package.json` changes.

## Retired (do not use)

- Git **`preview` as integration branch** (feat → preview → main train)
- Vercel custom **`staging`** environment
- Persistent Supabase branch **`olsdirkvvfegvclbpgrg`**
- PRs targeting **`preview`**

See `docs/ops/preview-architecture-migration.md` for cutover history.

## Related docs

- `.cursor/rules/branching.mdc` — agent branching rules
- `docs/ops/ci-cd-pipeline.md` — GitHub Actions
- `docs/ops/deployment.md` — Vercel/Supabase operations detail
- `CONTRIBUTING.md` — contributor onboarding
