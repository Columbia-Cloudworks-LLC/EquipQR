# EquipQR Development Lifecycle

Authoritative day-to-day workflow. See also [`docs/ops/git-and-deploy.md`](../ops/git-and-deploy.md).

## Ground truth

- **`main`** is the only long-lived git branch.
- Branch off **`main`** for work (`feat/*`, `fix/*`, any name).
- **`preview.equipqr.app`** is the stable pre-production URL — it should reflect whatever you last pushed while working, regardless of branch name.
- Ship via **PR into `main`**. Production promotes automatically when **Production Release Readiness** is green after merge.

## Lifecycle

```text
Plan → branch off main → implement → verify locally
→ push work branch → preview.equipqr.app updates
→ PR to main → CI green → merge
→ Production Release Readiness → equipqr.app
```

## Steps

### 1) Plan

Use Cursor Plan/Agent mode for non-trivial changes. Store plans under `docs/plans/` when helpful.

### 2) Branch and implement

```powershell
git fetch origin main
git switch -c feat/<short-name> origin/main
```

Run local stack via `dev-start.bat`. Gate: lint, type-check, targeted tests, smallest credible E2E proof.

### 3) Push and validate preview

```powershell
git push -u origin HEAD
```

- Vercel creates a Preview deployment for the branch.
- **`preview.equipqr.app`** aliases to the latest successful Preview build (see `preview-domain-alias.yml`).
- Validate behavior on the stable preview hostname before opening a PR.

### 4) PR to main

```powershell
gh pr create --base main --head feat/<short-name> --title "feat: ..." --body-file "$env:TEMP\pr-body.md"
```

Requirements: CI green, visual evidence for UI changes, Qodo/threads clear per team policy.

### 5) Merge and production

Merge the PR. On push to `main`:

1. Vercel builds a staged Production deployment.
2. **Production Release Readiness** applies migrations, strict schema drift, waits for the build, runs **`vercel promote`**.

No manual Vercel dashboard promote step.

## Release-ready checklist

- Validated on **`preview.equipqr.app`** (or local stack for non-UI backend changes).
- CI green on PR to **`main`**.
- Migrations/auth-sensitive paths verified locally when applicable.
- Review threads and automated review items addressed.

## Onboarding

New contributors follow the same model: **`main` only**, preview hostname for QA, PR to **`main`**. Do not create or target a git **`preview`** branch.
