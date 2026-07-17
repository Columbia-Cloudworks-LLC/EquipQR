# EquipQR Development Lifecycle

Authoritative day-to-day workflow. See also [`docs/ops/git-and-deploy.md`](../ops/git-and-deploy.md).

## Ground truth

- **`preview`** is the integration train; branch off **`preview`** for work.
- **`main`** is production; ship via controlled **`preview` → `main`** (or `/release`).
- **Default QA URL:** commit-specific Vercel Preview (`*.vercel.app`) after you push a work branch; **`preview.equipqr.app`** after merge to git **`preview`**.
- Feature PRs accumulate CHANGELOG `[Unreleased]` and **do not** bump `package.json`. Version bumps happen on promote to `main`.

## Lifecycle

```text
Plan → branch off preview → implement → verify locally
→ push work branch → test on *.vercel.app Preview URL
→ PR to preview → CI green → merge
→ (later) /release or preview → main → Production Release Readiness → equipqr.app
```

## Steps

### 1) Plan

Use Cursor Plan/Agent mode for non-trivial changes. Store plans under `docs/plans/` when helpful.

### 2) Branch and implement

```powershell
git fetch origin preview
git switch -c feat/<short-name> origin/preview
```

Run local stack via `dev-start.bat`. Gate: lint, type-check, targeted tests, smallest credible E2E proof.

### 3) Push and validate on Preview

```powershell
git push -u origin HEAD
```

- Vercel creates a Preview deployment for the branch.
- Open the deployment URL from the PR or Vercel dashboard (`equipqr-<hash>-columbia-cloudworks-llc.vercel.app`).
- After merge to git **`preview`**, **`preview.equipqr.app`** updates via that branch’s Vercel deploy.

### 4) PR to preview

```powershell
gh pr create --base preview --head feat/<short-name> --title "feat: ..." --body-file "$env:TEMP\pr-body.md"
```

Requirements: CI green, visual evidence for UI changes, Qodo/threads clear per team policy. Release-metadata mode is **preview** (Unreleased notes; no version bump).

### 5) Promote to production

When ready to ship, run **`/release`** (or open `preview` → `main` / `chore/release-v*` with version bump). On push to `main`:

1. Vercel builds a staged Production deployment.
2. **Production Release Readiness** applies migrations, strict schema drift, waits for the build, runs **`vercel promote`**.

No manual Vercel dashboard promote step.

## Release-ready checklist

- Validated on the **Preview deployment URL**, local stack, and/or **`preview.equipqr.app`** (as appropriate).
- CI green on PR to **`preview`** (and on the promote PR to **`main`** when shipping).
- Migrations/auth-sensitive paths verified locally when applicable.
- Review threads and automated review items addressed.

## Onboarding

Branch off **`preview`**, PR to **`preview`**. Promote to **`main`** separately. See `.cursor/rules/branching.mdc`.
