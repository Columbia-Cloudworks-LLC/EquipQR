---
name: itil-issue-resolver
description: Primary EquipQR implementation workflow for one approved issue or small change. Use when the user asks to resolve, implement, execute, or fix a single issue after the scope is clear. Always integrates via merge-ready PR to preview per pr-merge-ready-workflow.mdc — never stop at commit-only or open-and-walk-away handoff. Production promote (preview → main) is a separate /release step.
---

# ITIL Issue Resolver

## Purpose

Resolve one clear EquipQR issue or change without reintroducing the old Incident/Problem/Change Record ceremony. This is the default build path once the user has authorized implementation.

## When To Use

Use this skill when:

- The user names one GitHub issue and asks to resolve, implement, or fix it.
- A Problem Summary, Service Summary, or Change Plan already gives enough direction.
- The change is small enough to implement directly without a separate formal plan.

If the request is still unclear, use:

- `itil-problem-record` for bug diagnosis.
- `itil-service-request` for feature feasibility or vendor cost.
- `itil-change-record` for a concise approval plan.

## Operating Rules

1. Work on one issue or change only.
2. Check idempotency before creating branches, comments, or PRs.
3. Respect `.cursor/rules/branching.mdc`:
   - Main worktree: push work branch after local verify; open PR to `preview` when ready.
   - Linked worktree: branch from `origin/preview`, push the branch, and open a PR into `preview`.
   - Never direct-push to `main` or `preview`. Production ships via a separate `preview` → `main` (or `/release`) promote.
4. Use subagents only when they reduce uncertainty:
   - `explore` for broad impact discovery.
   - `docs-researcher` for current library/vendor docs.
   - `ci-watcher` or `ci-investigator` after a PR exists or checks fail.
5. Stage task files plus any dirty **workflow artifacts** per `.cursor/rules/workflow-artifacts.mdc`. Do not stage other unrelated product dirt.
6. Prefer targeted verification over full-suite loops unless the change is broad or high-risk.

## Workflow

### 1. Read And Confirm Scope

For GitHub issues:

```powershell
gh issue view <number> --json number,title,body,labels,state,comments,url
```

Extract:

- Acceptance criteria or user-visible outcome.
- Explicitly in-scope files/surfaces.
- Dependencies, blockers, and related issues.
- Any prior Problem Summary, Service Summary, Change Plan, or reviewer guidance.

Stop and ask if there is no clear definition of done.

### 2. Idempotency And Working Tree Check

Inspect:

```powershell
git status --short
git branch --show-current
gh pr list --state open --search "<issue-number> in:body" --json number,title,headRefName,baseRefName,url
```

If an open PR or branch already covers the issue, resume it instead of duplicating work. On authorized commits, include dirty workflow artifacts (`AGENTS.md`, `.cursor/**` per `workflow-artifacts.mdc`) without triage. Leave other unrelated product changes unstaged.

### 3. Plan The Edit Briefly

Before editing, state a concise implementation note:

- Files/symbols expected to change.
- Tests expected to add or update.
- Verification commands.
- Any stop condition.

Use `explore` first if the affected code path is not obvious.

### 4. Implement

Work in focused chunks:

1. Schema/migration changes, if required.
2. Generated Supabase types, if required.
3. Product implementation.
4. Tests.
5. Docs/support copy only when required by the issue.

Follow local patterns and existing service boundaries. Preserve organization scoping, RBAC, and RLS expectations.

### 5. Verify

Follow `.cursor/rules/local-verify-before-preview-push.mdc` — **no push to preview until this phase passes with zero user manual steps.**

Choose the smallest credible gate:

- Always run Fallow (both scans) before commit per `fallow-before-commit.mdc`.
- Always run lint/type checks when product code changed:
  ```powershell
  npm run lint
  npm run type-check
  ```
- Run targeted tests for touched behavior:
  ```powershell
  npm test -- <test-paths>
  ```
- Run `npm run build` when routing, bundling, PWA, Vite, or env wiring may be affected.
- For UI changes, smoke the affected route with browser MCP or `.\dev-test.bat` critical when a spec exists.
- For OAuth/integrations, exercise the flow on the local stack (browser MCP + edge logs + RPC/DB confirmation).
- For migrations/RLS/edge functions, run the relevant Supabase or Deno checks when the local stack is healthy.

If verification fails outside the change scope, report the blocker instead of broadening the work silently. If E2E cannot be automated locally, **stop before integrate** — do not push.

### 6. Integrate (merge-ready PR — mandatory)

**Prerequisite:** Section 5 completed; cite verification commands and outcomes in the handoff.

**Default exit:** Always follow **`.cursor/rules/pr-merge-ready-workflow.mdc`** end-to-end — branch, Fallow, `npm ci`, lint, `test:ci`, build, local E2E, PR visual evidence when UI or user-visible behavior changed (including help/docs discovery), push, open PR, babysit CI + Qodo + threads until merge-ready. **Do not** hand off after commit-only, after push-only, or immediately after `gh pr create`.

Summary commands:

```powershell
git fetch origin preview
git switch -c <type>/issue-<number>-<slug> origin/preview
# ... implement, verify (Fallow, npm ci, lint, test:ci, build, E2E) ...
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow "<slug>" -Spec "e2e/pr-evidence/<feature>.spec.ts"
git push -u origin HEAD
gh pr create --base preview --head <branch> --title "<title>" --body-file <body-file-with-evidence-markdown>
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow "<slug>" -Spec "e2e/pr-evidence/<feature>.spec.ts" -PrNumber <num> -Publish
gh pr checks <num> --watch
# Poll Get-PrQodoFindings until openCount=0; clear threads — see pr-merge-ready-workflow.mdc
```

Accumulate CHANGELOG notes under `[Unreleased]`; **do not** bump `package.json` on feature PRs. Use `Fixes #<number>` or `Closes #<number>` in the commit body or PR body when the issue should close after merge to `preview` (or after promote, if the issue should stay open until production).

Merge `tmp/pr-evidence/<slug>/evidence-markdown.md` into the PR body. Add `e2e/pr-evidence/<feature>.spec.ts` when no existing spec covers the UI change.

**Do not hand off after `gh pr create`.** Merge-ready exit criteria are defined in `pr-merge-ready-workflow.mdc`.

### 7. Report Completion

For **PR paths**, handoff only when **`pr-merge-ready-workflow.mdc`** exit criteria pass — not when the PR is merely opened.

Final response should include:

- Issue/change resolved.
- Commit SHA and push target, or PR URL.
- Verification commands and outcomes.
- PR visual evidence: capture command, spec path, uploaded screenshot/MP4 URLs or PR comment link (when a PR was opened).
- Acceptance criteria status.
- Any follow-up or blocker.

## Guardrails

- No opportunistic refactors.
- No `git add .`.
- No destructive git commands.
- No new dependencies without clear need.
- No feature flags unless the user explicitly asks.
- No secret values in commits, comments, logs, or chat.
