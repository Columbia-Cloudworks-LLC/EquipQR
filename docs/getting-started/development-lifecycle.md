# EquipQR Development Lifecycle (Cursor + gstack)

## Purpose

This document is the source of truth for how EquipQR is built and released day to day.
It is written for:

- the current solo developer workflow, and
- onboarding new contributors so they can follow the same process without guessing.

## Ground Truth

- The active development branch is `preview`.
- Work is committed directly to `preview` (no long-lived feature branches in current practice).
- Every push to `preview` updates `preview.equipqr.app`.
- Pull requests are used to merge `preview` into `main` when unreleased work is ready.
- Promotion to production is manual after `main` updates and verification is complete.

## Why This Works

This model keeps feedback loops fast:

1. Build and test quickly on `preview`.
2. Validate against near-production data and behavior on `preview.equipqr.app`.
3. Run full CI/CD and migration checks before `main`.
4. Keep a final manual promotion gate before production.

## Lifecycle Overview

```text
Plan in Cursor -> Implement on preview -> Push preview -> Validate preview env
-> Open PR (preview -> main) -> CI/CD + migration checks + conversations resolved
-> Merge to main -> Verify main deployment output
-> Manual promote to production
```

## Step-by-Step Workflow

### 1) Plan the change in Cursor

- Use Cursor Ask/Plan mode to define scope and risks.
- Use gstack plan-review skills when useful:
  - `plan-eng-review` for architecture, test coverage, and edge cases.
  - `plan-design-review` for UI/UX changes.
  - `autoplan` when you want a full auto-review pipeline.
- Keep plan docs under `docs/plans/` when the change is non-trivial.

### 2) Implement on `preview`

- Pull latest `preview`.
- Build the change locally.
- Run relevant checks (`lint`, `typecheck`, tests, and any targeted manual checks).
- Commit directly to `preview` in logical, reviewable chunks.

### 3) Push `preview` and validate staging behavior

- Push commits to `preview`.
- Confirm the updated environment at `preview.equipqr.app`.
- Validate:
  - intended feature behavior,
  - migration effects,
  - authentication/permissions behavior,
  - data shape and integration behavior.

This environment is treated as a near-production proving ground.

### 4) Open PR from `preview` to `main`

- PR is the release gate, not branch fan-out.
- CI/CD runs on the release candidate and includes migration/deployment checks.
- Resolve all review conversations and open concerns.
- Re-test in preview as needed until confidence is high.

### 5) Merge to `main` when release-ready

- Merge only after:
  - checks are green,
  - conversations are resolved,
  - preview validation is satisfactory.
- `main` update triggers Vercel pipeline behavior for the release path.

### 6) Manual promotion to production

- Perform final human verification.
- Manually promote the validated deployment to production.
- Treat this as the last line of defense against accidental regressions.

## Cursor + gstack Usage Model

Cursor modes and gstack are complementary:

- Cursor modes (`Ask`, `Plan`, `Agent`) control interaction style.
- gstack skills add structured, repeatable quality gates.

Practical sequence used in EquipQR:

1. Plan (`Ask`/`Plan` mode + optional plan reviews).
2. Build (`Agent` mode).
3. Pre-ship checks (`review`, optional `qa`/`qa-only`).
4. Release ops (`ship` if needed for automation, then PR merge flow).

## Definition of Release-Ready

A change is release-ready when all are true:

- Feature behavior is validated in `preview.equipqr.app`.
- CI/CD checks pass.
- Migration and auth-sensitive behaviors are verified.
- Code review conversations are closed.
- The solo owner is satisfied with quality and risk level.

## Onboarding Notes for New Contributors

Even if additional developers join, start by following this exact model:

- Treat `preview` as integration/release branch.
- Validate in preview environment early and often.
- Use PR-to-`main` as the formal promotion gate.
- Keep manual production promotion until team confidence and automation maturity justify changing it.

If team size or release cadence changes, update this document first, then update
`docs/ops/ci-cd-pipeline.md` and `docs/ops/deployment.md` to match.
