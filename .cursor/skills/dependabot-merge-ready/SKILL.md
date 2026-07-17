---
name: dependabot-merge-ready
description: >-
  Resolves Dependabot pull requests to merge-ready state with minimal remediation,
  Unreleased changelog notes (no package version bump on preview), tech-debt GitHub
  issue triage, and CI/Qodo monitoring.
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
.\scripts\pr-feedback\Get-PrContext.ps1 -PullRequestNumber <number> -Json
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
.\dev-stop.bat             # if EPERM/EBUSY risk on Windows
npm ci --prefer-offline --no-audit
```

Record: dependency name, from-version, to-version, dev vs prod.

## Phase 2: Impact Analysis & Local Verification

1. Perform a global search across the React/Vite frontend and Supabase backend to identify all direct imports and usages of the updated dependency.
2. Run local type checks (e.g., `tsc --noEmit`), linting, and the local test suite.
3. Attempt a local production build to catch compilation regressions.

### EquipQR Phase 2 commands

Search `src/`, `supabase/functions/`, `e2e/`, `scripts/` for package name and known import paths.

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

Dependabot PRs target **`preview`**. Do **not** bump `package.json` / lockfile app version — that happens on `/release` promote to `main`.

### EquipQR release metadata (required for merge-ready to `preview`)

1. Keep the existing root `package.json` version unchanged vs `origin/preview`.
2. Add at least one bullet under CHANGELOG `## [Unreleased]` (e.g. `### Changed`) describing the dependency update and any minimal remediation.
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
5. Review any Qodo/linter findings generated on the PR.
6. If the CI fails or Qodo flags regressions, return to Phase 3. If all CIs report green and no automated findings remain, halt execution and report success.

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

**CI + Qodo loop** (merge-ready exit criteria per `pr-merge-ready-workflow.mdc`):

```powershell
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <number> -Watch -FailFast

Start-Sleep -Seconds 90
.\scripts\pr-feedback\Get-PrQodoFindings.ps1 -PullRequestNumber <number> -Json
# Wait until reviewInProgress: false, then openCount: 0 (all buckets)

.\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -PullRequestNumber <number> -Json
# unresolved non-outdated thread count must be 0

gh pr view <number> --json mergeable,mergeStateStatus,url
```

### Qodo Fixer auto-fix PRs (prefer before hand-implementing)

When Qodo flags findings, it often opens a **closed** fix PR (`Fix: [for cherry-picking] ...`, author `app/qodo-code-review`) and posts a **Qodo Fixer** comment on the feature PR. Mine it before writing fixes by hand:

```powershell
.\scripts\pr-feedback\Get-PrQodoFixPr.ps1 -PullRequestNumber <number> -Json
```

**Comment pattern (stable):**

- Heading: `### Qodo Fixer`
- Status line: `🍒 Ready to be cherry-picked — ✅ Merged (N) · ☑ Fixed (M)`
- Link: `🔗 Fix PR: [#<fix>](https://github.com/.../pull/<fix>)`
- Items: `- ☑ Fixed: <finding title>` under `Process — M fixed`
- Instruction block: review fix PR, cherry-pick selective changes, do not accept blindly

**When `needsAction: true` (`pendingCount > 0`):**

1. `gh pr diff <fixPrNumber>` — review each hunk against local context.
2. `git fetch origin <fixPr.headRefName>`
3. Apply selectively:
   - Whole commit: `git cherry-pick <fix-commit-sha>`
   - Partial: `git checkout origin/<fix-head> -- <paths>` then edit
   - Avoid blind `git merge` of the entire fix branch when only some items are correct.
4. Re-run Phase 2 verification.
5. Push; Qodo updates `Merged (N)` when fixes land on the feature branch.

**Only hand-implement** findings with no fix PR, rejected fix hunks, or items still open in `Get-PrQodoFindings` after cherry-pick.

Address every unstriked Qodo item and unresolved thread; fix forward → Phase 3 → re-commit → re-watch.

**Handoff comment** on the PR when merge-ready:

- PR URL and dependency bump summary
- Local verify commands run (pass/fail)
- CI run link (green)
- Qodo parent comment URL with `openCount=0`
- Tech-debt issue link (if Phase 4 created/updated one)
- Confirmation: no feature regression; Unreleased changelog note; no package.json version bump

---

## Merge-ready exit checklist

```text
- [ ] Dependabot author verified; base is preview
- [ ] npm ci + lint + type-check + test:ci + build green locally
- [ ] Minimal remediation only (if needed)
- [ ] Tech-debt issues idempotently updated/created (if applicable)
- [ ] CHANGELOG [Unreleased] updated; package.json version unchanged vs preview
- [ ] verify:release-metadata with RELEASE_METADATA_MODE=preview
- [ ] Fallow clean; commit pushed
- [ ] CI green (Get-PrChecks -Watch)
- [ ] Qodo openCount=0
- [ ] Unresolved threads clear
- [ ] PR mergeable
```

## Stop conditions

- PR is not from `app/dependabot` → stop; use `address-pr-feedback` instead.
- Remediation requires product/architecture decisions outside dependency scope → post question on PR; stop.
- CI failure unrelated to the bump persists after merging latest `origin/preview` → report with failing job link.
- Secrets or maintainer-only OAuth needed → escalate per `AGENTS.md` §2.

## Related skills

- [`address-pr-feedback`](../address-pr-feedback/SKILL.md) — thread/Qodo reply patterns after Phase 6 flags items
- `babysit` (Cursor built-in) — optional long CI/Qodo poll handoff
