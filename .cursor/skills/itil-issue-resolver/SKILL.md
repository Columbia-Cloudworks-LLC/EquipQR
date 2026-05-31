---
name: itil-issue-resolver
description: Primary EquipQR implementation workflow for one approved issue or small change. Use when the user asks to resolve, implement, execute, or fix a single issue after the scope is clear. Uses subagents for discovery when useful, implements focused changes, verifies them, and integrates through the repo's current preview workflow.
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
   - Main worktree on `preview`: commit and push directly to `origin preview` when the user authorized the change.
   - Linked worktree: branch from `origin/preview`, push the branch, and open a PR into `preview`.
   - Never direct-push to `main`.
4. Use subagents only when they reduce uncertainty:
   - `explore` for broad impact discovery.
   - `docs-researcher` for current library/vendor docs.
   - `ci-watcher` or `ci-investigator` after a PR exists or checks fail.
5. Stage only files needed for the issue. Do not stage unrelated dirty work.
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

If an open PR or branch already covers the issue, resume it instead of duplicating work. If unrelated local changes exist, leave them alone and stage around them.

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

Choose the smallest credible gate:

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
- For UI changes, smoke the affected route with the browser MCP when practical.
- For migrations/RLS/edge functions, run the relevant Supabase or Deno checks when the local stack is healthy.

If verification fails outside the change scope, report the blocker instead of broadening the work silently.

### 6. Integrate

Follow the current worktree policy:

**Main worktree on `preview`:**

```powershell
git add <specific-files>
git commit -m "<conventional message>"
git push origin preview
```

**Linked worktree or user-requested formal PR:**

```powershell
git fetch origin preview
git switch -c <type>/issue-<number>-<slug> origin/preview
git add <specific-files>
git commit -m "<conventional message>"
git push -u origin HEAD
gh pr create --base preview --head <branch> --title "<title>" --body-file <body-file>
```

Use `Fixes #<number>` or `Closes #<number>` in the commit body or PR body when the issue should close after integration.

### 7. Report Completion

Final response should include:

- Issue/change resolved.
- Commit SHA and push target, or PR URL.
- Verification commands and outcomes.
- Acceptance criteria status.
- Any follow-up or blocker.

## Guardrails

- No opportunistic refactors.
- No `git add .`.
- No destructive git commands.
- No new dependencies without clear need.
- No feature flags unless the user explicitly asks.
- No secret values in commits, comments, logs, or chat.
