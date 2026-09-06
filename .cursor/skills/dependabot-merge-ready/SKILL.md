---
name: dependabot-merge-ready
description: >-
  Resolves Dependabot pull requests to merge-ready state with minimal remediation,
  Unreleased changelog notes (no package version bump on preview), tech-debt GitHub
  issue triage, and CI/Supabase monitoring.
  Use when the user provides a Dependabot PR number or link, invokes
  /dependabot-merge-ready, or asks to make a dependabot dependency update
  merge-ready. Do not use for non-Dependabot PRs.
---

# Dependabot Merge-Ready

Automated PR remediation for **Dependabot-originating PRs only**. Objective: resolve the current Dependabot PR with minimal necessary changes, ensure zero feature regression, manage technical debt via GitHub issues, document under CHANGELOG `[Unreleased]` (**no** `package.json` bump on preview), and monitor the CI pipeline to a green state.

**Before starting:** read `AGENTS.md` and relevant `.cursor/rules/*.mdc` (especially `pr-merge-ready-workflow.mdc`, `pr-ci-gate-before-open.mdc`, `fallow-before-commit.mdc`, `git-powershell.mdc`, `workflow-artifacts.mdc`).

## Entry gate (mandatory — do not skip)

Invoking this workflow **MUST** include a PR number or a link to a PR that was opened by Dependabot. If this is **NOT** related to a Dependabot-originating PR, **do NOT proceed** — this workflow is specific to Dependabot so that updating dependencies is consistent and thorough.

**Preflight:**

```powershell
# Accept -PullRequestNumber <n> or parse number from a github.com/.../pull/<n> URL
.\dev\pr-feedback\Get-PrContext.ps1 -PullRequestNumber <number> -Json
gh pr view <number> --json author,title,headRefName,baseRefName,url
```

**Stop immediately** unless all are true:

| Check | Requirement |
|-------|-------------|
| Author | `author.login` is `app/dependabot` |
| PR input | User supplied PR number or Dependabot PR URL |
| Base branch | Expected `preview` (EquipQR Dependabot / integration train) |

Report the PR URL and dependency from the title, then proceed.

**Ecosystem fork:**

- **npm** (`dependabot/npm_and_yarn/...`) — full Phases 1–6 below.
- **github-actions** (`dependabot/github_actions/...`) — skip Phases 1–3 npm work; run Phase 4 if CI/logs expose debt; Phase 5–6 only when remediation commits are required.

---

Execute the following phases sequentially. **Do not proceed to the next phase until the current one is fully resolved.**

## Phase 1: State & Dependency Sync

1. Identify the target Dependabot branch and checkout if not already on it.
2. Parse `package.json` (or equivalent) diff to identify the exact dependency and version bump.
3. Run `npm install` (or your package manager's equivalent) to sync the local environment.

### EquipQR Phase 1 commands

```powershell
git fetch origin
git switch <headRefName>   # from Get-PrContext
git diff origin/preview...HEAD -- package.json package-lock.json

# CI-parity sync (prefer over npm install on this repo)
.\dev\dev-stop.bat             # if EPERM/EBUSY risk on Windows
npm ci --prefer-offline --no-audit
```

Record: dependency name, from-version, to-version, dev vs prod.

## Phase 2: Impact Analysis & Local Verification

1. Perform a global search across the React/Vite frontend and Supabase backend to identify all direct imports and usages of the updated dependency.
2. Run local type checks (e.g., `tsc --noEmit`), linting, and the local test suite.
3. Attempt a local production build to catch compilation regressions.

### EquipQR Phase 2 commands

Search `src/`, `supabase/functions/`, `e2e/`, `dev/` for package name and known import paths.

```powershell
npm run lint
npm run type-check
npm run test:ci
npm run build
npm run verify:spa-routing
```

**No UI evidence** for dependency-only green paths (no user-visible remediation). Capture evidence only if Phase 3 touches UI behavior.

## Phase 3: Minimal Remediation

1. If the build or tests fail, implement the absolute minimal code changes required to restore functionality. Do not refactor unrelated code. Do not implement new features.
2. Re-run Phase 2.2 and 2.3 until the local environment is completely green.

**Scope rules:** fix breakage caused by the bump only; no drive-by cleanup; no version downgrades.

## Phase 4: Issue Triage (Idempotent GitHub Ops)

1. If the dependency update introduces deprecation warnings, requires future architectural changes, or exposes deeper technical debt, extract these findings.
2. Run `gh issue list --search "[Dependency Name]"` to check for existing tracked issues.
3. If an open issue exists, run `gh issue comment <issue-number> --body "<Your detailed findings>"`
4. If no issue exists, run `gh issue create --title "Tech Debt: <Dependency Name> update findings" --body "<Your detailed findings>"`

Use a UTF-8 body file on Windows when findings are multiline (`git-powershell.mdc`):

```powershell
@"
## Context
Dependabot PR #<number>: <title>

## Findings
- ...
"@ | Set-Content -Path "$env:TEMP\dependabot-debt-<slug>.md" -Encoding utf8
gh issue comment <issue-number> --body-file "$env:TEMP\dependabot-debt-<slug>.md"
```

Skip Phase 4 when there are no debt findings beyond the routine bump.

## Phase 5: Changelog metadata (preview mode — no version bump)

This is **not** a versioned release. Dependabot PRs target **`preview`**. Do **not** bump `package.json` / lockfile app version. Do not add a versioned CHANGELOG section.

Preview release-metadata CI treats `package.json` and `package-lock.json` as release-relevant, so add one short `[Unreleased]` Changed note. Follow `.cursor/rules/changelog.mdc`. At the next `/release`, the curator batches that note into one dependency bullet or drops it.

### EquipQR release metadata (required for merge-ready to `preview`)

1. Keep the existing root `package.json` version unchanged vs `origin/preview`.
2. Add one short Changed bullet under CHANGELOG `## [Unreleased]` for the lockfile or `package.json` diff.
3. Ensure `package-lock.json` dependency changes from the bump are committed; root app version stays aligned with `package.json` (no bump).

```powershell
$env:RELEASE_METADATA_MODE = 'preview'
$env:RELEASE_METADATA_BASE_SHA = (git merge-base HEAD origin/preview)
npm run verify:release-metadata
Remove-Item Env:RELEASE_METADATA_MODE, Env:RELEASE_METADATA_BASE_SHA -ErrorAction SilentlyContinue
```

## Phase 6: Commit, Push, & CI Loop

1. Stage all modified files.
2. Commit with the message: `fix: minimal remediation for <Dependency Name> update`
3. Push changes to the current remote branch.
4. Run `gh pr checks` or monitor the repository's CI pipeline.
5. Review linter or review-thread findings only when the user asked to address feedback.
6. If CI or Supabase fails, return to Phase 3. If all CIs are green and Supabase is green or skipped, merge per `pr-merge-ready-workflow.mdc`. Do not wait for Qodo.

### EquipQR Phase 6 extensions

**Fallow (before commit):**

```powershell
npx --yes fallow@2.88.0 --format json --quiet --summary > tmp\fallow-pre-commit.json 2>$null
# exitCode must be 0; total_issues must be 0
npx --yes fallow@2.88.0 dupes --format json --quiet > tmp\fallow-pre-commit-dupes.json 2>$null
# clone_groups must be 0
```

**Commit (PowerShell — no heredoc):**

```powershell
git add -A
git commit -m "fix: minimal remediation for <Dependency Name> update" -m "Fallow: exitCode=0, total_issues=0, clone_groups=0"
git push -u origin HEAD
```

**CI + Supabase loop** (merge gate per `pr-merge-ready-workflow.mdc`):

```powershell
.\dev\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <number> -Watch -FailFast
gh pr view <number> --json mergeable,mergeStateStatus,url
```

Confirm `Validate Supabase Migrations` and `Supabase Preview` are success, or skipped / absent because the PR has no related Supabase changes. Then merge. Do not wait for Qodo.

**Handoff comment** on the PR when merging:

- PR URL and dependency bump summary
- Local verify commands run (pass/fail)
- CI run link (green)
- Supabase result (pass or skipped / not applicable)
- Tech-debt issue link (if Phase 4 created/updated one)
- Confirmation: no feature regression; short Unreleased note; no package.json version bump; not a versioned release

---

## Merge-ready exit checklist

```text
- [ ] Dependabot author verified; base is preview
- [ ] npm ci + lint + type-check + test:ci + build green locally
- [ ] Minimal remediation only (if needed)
- [ ] Tech-debt issues idempotently updated/created (if applicable)
- [ ] Short CHANGELOG [Unreleased] Changed note (CI requirement, not a versioned release); package.json version unchanged vs preview
- [ ] verify:release-metadata with RELEASE_METADATA_MODE=preview
- [ ] Fallow clean; commit pushed
- [ ] CI green (Get-PrChecks -Watch)
- [ ] Supabase green or skipped / not applicable
- [ ] PR mergeable; merged per pr-merge-ready-workflow.mdc
```

## Stop conditions

- PR is not from `app/dependabot` → stop; use `address-pr-feedback` instead.
- Remediation requires product/architecture decisions outside dependency scope → post question on PR; stop.
- CI failure unrelated to the bump persists after merging latest `origin/preview` → report with failing job link.
- Secrets or maintainer-only OAuth needed → escalate per `AGENTS.md` §2.

## Related skills

- [`address-pr-feedback`](../address-pr-feedback/SKILL.md) — review-thread replies when the user asks
- `babysit` (Cursor built-in) — optional long CI poll handoff
