# EquipQR Development Lifecycle

Authoritative day-to-day workflow. See also [`docs/ops/git-and-deploy.md`](../ops/git-and-deploy.md).

## Ground truth

- **`main`** is the production branch; branch off **`main`** for work.
- Git branch **`preview`** exists only so Vercel can bind **`preview.equipqr.app`** (dashboard requires a branch). It is **not** where feature work lands.
- **Default QA URL:** the commit-specific Vercel Preview link (`*.vercel.app`) after you push a work branch — not `preview.equipqr.app`.
- Ship via **PR into `main`**. Production promotes when **Production Release Readiness** is green.

## Lifecycle

```text
Plan → branch off main → implement → verify locally
→ push work branch → test on *.vercel.app Preview URL
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

### 3) Push and validate on Preview

```powershell
git push -u origin HEAD
```

- Vercel creates a Preview deployment for the branch.
- Open the deployment URL from the PR or Vercel dashboard (`equipqr-<hash>-columbia-cloudworks-llc.vercel.app`).
- **`preview.equipqr.app`** is optional (bound to git **`preview`** in Vercel); use it only when you need that fixed hostname.

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

- Validated on the **Preview deployment URL**, local stack, or both (as appropriate).
- CI green on PR to **`main`**.
- Migrations/auth-sensitive paths verified locally when applicable.
- Review threads and automated review items addressed.

## Onboarding

Branch off **`main`**, PR to **`main`**. Do not open feature PRs into git **`preview`**. The **`preview`** branch is a Vercel domain anchor, not a development queue.
