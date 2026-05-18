---
name: itil-issue-resolver
description: Resolve exactly one well-scoped EquipQR GitHub issue from open issue to PR open against preview. Use when the user asks to resolve, implement, or execute a single issue/sub-issue idempotently, especially when they provide an issue number, issue URL, acceptance criteria, or suggested branch name.
---

# ITIL Issue Resolver

## Purpose

Take **one** well-scoped EquipQR issue or sub-issue from "open" to "PR open against `preview`" without duplicating work, widening scope, or losing audit trail. This is an implementation skill, not a discovery or planning skill.

Use the existing ITIL flow first when needed:

- Bugs / regressions / defects need `itil-problem-record` before implementation.
- Features / enhancements / vendor-cost requests need `itil-service-request`, then `itil-change-record`, before implementation.
- If the issue already contains an approved Change Record or an explicit implementation plan, execute that plan exactly.

## Cursor Workflow Commit Policy

If this workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates only when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Inspect the diff for secrets, destructive rewrites, broad unrelated content, or product behavior changes before staging.

## Operating Rules

1. **One issue only.** Do not combine sibling issues, parent cleanup, opportunistic refactors, or unrelated reviewer feedback.
2. **Idempotent first.** Before acting, check whether the branch, PR, issue comment, migration, implementation, or acceptance criterion already exists. Resume or report; do not duplicate.
3. **PR flow overrides the main-worktree fast path.** When this skill is invoked, the target outcome is a feature branch and PR against `preview`, even if running in the main worktree.
4. **Branch from `origin/preview`.** Never branch from `main` unless the user explicitly says hotfix.
5. **PowerShell only.** No bash heredocs, `&&`, `$()` command substitution in git args, or Unix shell utilities.
6. **No suppressions.** Do not add `// eslint-disable`, `@ts-ignore`, broad `any`, or snapshot churn unless the issue explicitly requires it and the user approves the diff.
7. **No scope expansion.** Do not modify files outside the acceptance criteria surface unless needed to compile or test the change; explain any necessary adjacent edit.
8. **Stop on ambiguity.** If the acceptance criteria, dependency order, or migration state is unclear, post/prepare a blocker comment and stop instead of guessing.

## Required Inputs

Accept any one of:

- A GitHub issue URL.
- An issue number like `#746`.
- A pasted issue body with acceptance criteria and branch name.

Extract and keep visible throughout the run:

- Issue number and title.
- Acceptance criteria checklist: this is the definition of done.
- Suggested branch name: use it verbatim unless unsafe or already taken for unrelated work.
- Parent issue link and sibling dependencies.
- Files or surfaces explicitly in scope.

If the issue has no clear acceptance criteria, stop and ask the user whether to draft an ITIL Change Record or request clarification on the issue.

## Progress Checklist

Copy this checklist and update it while executing:

```markdown
Issue Resolver Progress
- [ ] 1. Read issue, parent, dependencies, and sibling collision risk
- [ ] 2. Check existing branch / PR / comments and decide resume vs new work
- [ ] 3. Sync `origin/preview` and create or resume the feature branch
- [ ] 4. State a concise implementation plan before editing
- [ ] 5. Implement in focused chunks
- [ ] 6. Run local verification gates
- [ ] 7. Walk acceptance criteria line by line
- [ ] 8. Push branch and open or update PR against `preview`
- [ ] 9. Report PR URL, test results, blockers, and next handoff
```

## Workflow

### 1. Read The Issue

Use `gh issue view <number> --json number,title,body,state,labels,assignees,comments,url` or the browser if visual context matters. Read the parent issue and sibling sub-issues enough to identify dependencies and file-collision risk.

Stop and pick a different issue, or ask the user, if:

- A dependency issue has not merged into `preview`.
- A sibling branch is actively touching the same files.
- The issue is too broad to resolve in one PR.
- The issue is a bug with no Problem Record, or a feature with no Service Request / Change Record, unless the user explicitly provided an approved implementation plan.

### 2. Idempotency Check

Before creating anything, inspect current state:

```powershell
git status --short
git branch --show-current
git fetch origin preview
gh issue view <number> --json state,comments,url
gh pr list --state open --search "<issue-number> in:body OR <branch-name> head:<branch-name>" --json number,title,headRefName,baseRefName,isDraft,url
```

Decision rules:

- **Open PR already exists for this issue and branch:** switch to/resume that branch and continue from verification or review feedback.
- **Issue already closed:** verify whether the closing PR merged into `preview`; if yes, report complete and stop.
- **Suggested branch exists locally/remotely:** inspect whether it belongs to this issue. Resume if yes; choose a safe suffix only if the old branch is unrelated and explain why.
- **Dirty working tree:** stash unrelated work before switching. Never start from a dirty tree.

### 3. Sync Preview And Branch

Use PowerShell-safe commands:

```powershell
git fetch origin preview
git switch preview
git pull --ff-only origin preview
git switch -c <suggested-branch-name> origin/preview
git status --short
git log --oneline -5
```

If the branch already exists for this issue:

```powershell
git switch <branch-name>
git rebase origin/preview
```

Stop if rebase conflicts are non-trivial or collide with sibling work. Report the conflict files and ask for sequencing guidance.

### 4. Plan Before Editing

Before writing code, state:

- Files intended to change, in order.
- Tests intended to add or update.
- Any migrations, generated types, edge functions, or manual smoke surfaces.
- Any acceptance criterion that appears risky or ambiguous.

If the plan would touch broad unrelated areas, narrow it before editing.

### 5. Implement In Focused Chunks

Prefer small, reviewable commits:

1. Schema / migration changes, if applicable.
2. Generated Supabase types using `.cursor/hooks/sync-types.ps1`, if applicable. Do not use `dev-start.bat` just to regenerate types.
3. Implementation.
4. Tests.
5. Documentation or support copy only when acceptance criteria require it.

Commit after each meaningful chunk when it helps review or recovery. Use conventional commit messages aligned with the issue title, for example:

```text
chore(lint): split settings nav sections
```

Do not commit if there are no meaningful changes. Do not stage documented CRLF drift in `supabase/functions/`.

### 6. Local Verification Gates

**Script (recommended, EquipQR repo root):**

```powershell
.\scripts\pr-feedback\Invoke-PrVerification.ps1
```

Run gates in this order, stopping at the first failure:

```powershell
npm run lint
npm run type-check
npm run test
```

Additional gates:

- If touching Edge Functions, run targeted `deno check supabase/functions/<function>/index.ts` or the function-specific Deno tests.
- If touching migrations/RPC/RLS, run the relevant Supabase checks or local migration reset only when the local stack is healthy and the issue scope justifies it.
- If touching UI, manually smoke test the affected route in the running dev app using the browser MCP when possible.

When a gate fails:

- Fix the specific failure only.
- Do not refactor freely.
- After three non-converging fix loops on the same failure mode, stop and escalate with exact output and current state.

### 7. Acceptance Criteria Walk

Before opening the PR, walk every acceptance criterion line by line.

For each criterion, record one of:

- Satisfied by `<commit/file/test/manual step>`.
- Not applicable because `<specific reason>`.
- Blocked by `<specific blocker>`.

Do not open a ready PR while any criterion is unresolved. If work is partially complete but blocked, push the branch and open a **draft** PR with a blocker section.

### 8. Push And Open Or Update PR

Push the feature branch:

```powershell
git push -u origin HEAD
```

Open the PR against `preview`:

```powershell
gh pr create --base preview --head <branch-name> --title "<conventional-prefix>: <issue title>" --body-file <temp-pr-body-file> --draft
```

PR body requirements:

```markdown
Closes #<issue-number>

## Summary

<Short paragraph describing the outcome.>

## Acceptance Criteria

- [x] <criterion> - <how it was satisfied>

## Test Plan

- [x] `npm run lint` - passed
- [x] `npm run type-check` - passed
- [x] `npm run test` - passed
- [x] Manual smoke: <route/flow> - passed

## Risk / Rollback

<Required for migrations, permissions, auth, RLS, Edge Functions, or non-trivial behavior changes. Otherwise write "Low risk; revert the squash commit if needed.">
```

Use `Closes #<issue-number>` on its own line when the PR should auto-close the issue. Do not use `Related to` when closure is intended.

If a PR already exists, update its body instead of opening a duplicate:

```powershell
gh pr edit <number> --body-file <temp-pr-body-file>
```

Mark ready only after local gates pass and any required CI smoke has enough signal:

```powershell
gh pr ready <number>
```

### 9. CI And Review Handoff

After the PR is open:

- Watch initial CI only long enough to catch immediate failures unless the user asks to babysit.
- For reviewer comments, use `address-pr-feedback` with the script helpers in [`scripts/pr-feedback/README.md`](../../../scripts/pr-feedback/README.md) (`Get-PrFeedbackThreads`, `Publish-PrFeedbackResponses`, etc.) to avoid long manual `gh` chains; pre-filter unresolved threads only.
- Do not squash-rewrite review history unless the user asks.
- If CI or review exposes a real blocker, comment on the issue or PR with state, exact failure, and the direct question.

This skill's default endpoint is **PR open against `preview`**, not merge. Merge only when the user explicitly asks or another skill such as `babysit` is invoked for merge readiness.

## Blocker Comment Template

When blocked, post or prepare this comment:

```markdown
Blocked while resolving #<issue-number>.

Done:
- <completed work>

Blocked on:
- <exact ambiguity / dependency / conflict / failing gate>

Evidence:
- `<command>` -> <key failure line or outcome>
- Branch: `<branch-name>`
- Draft PR: <url if opened>

Question:
<direct question for the user/reviewer>
```

## Final Response Contract

End with:

- Issue number and title.
- Branch name.
- PR URL, or blocker status if no PR was opened.
- Verification commands and pass/fail outcomes.
- Acceptance criteria summary.
- Any follow-up skill recommended, such as `babysit` for CI/review looping or `address-pr-feedback` for review comments.

Keep the final response concise. Do not paste full command logs unless they explain a blocker.

## Related

- `.cursor/rules/branching.mdc` - `preview` branch policy and PR base rules.
- `.cursor/rules/git-powershell.mdc` - PowerShell-safe git / gh syntax.
- `.cursor/skills/itil-problem-record/SKILL.md` - required upstream artifact for bugs.
- `.cursor/skills/itil-service-request/SKILL.md` - required upstream artifact for feature requests.
- `.cursor/skills/itil-change-record/SKILL.md` - required authorization plan when no approved plan exists.
- `.cursor/skills/address-pr-feedback/SKILL.md` - focused unresolved review-thread handling after PR open.
