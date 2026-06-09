---
name: address-pr-feedback
description: >-
  Triage, implement, and respond to pull request review feedback end-to-end.
  Fetches unresolved review threads via GraphQL (isResolved filter), pulls
  review bodies for non-inline feedback, categorizes each item as addressed,
  deferred (with a tracking GitHub issue), or rejected with rationale, then
  requires a Plan Mode handoff before any fixes are applied. After the user
  approves the plan, verifies with a proportionate gate (scoped tests for targeted
  fixes; full suite when the change is broad), commits, pushes,
  replies in-thread, and posts a structured summary comment on the PR. Use when
  PR feedback needs addressing, automated reviewers leave comments, or the user
  asks to fix, resolve, or respond to PR review comments.
---

# Address PR Feedback

End-to-end workflow for triaging PR review comments, implementing fixes, tracking deferred work, and posting a structured response.

## Mandatory Mode Boundary

This skill is intentionally two-phase:

- **Agent Mode discovery:** Use Agent Mode only for Steps 1-3: identify the PR, inspect the working tree, fetch review threads/reviews, read the relevant code, and verify whether each feedback item is valid. Do not edit files, create issues, commit, push, or reply to PR comments during this phase.
- **Plan Mode gate:** After Step 3, call `SwitchMode` to enter Plan Mode and write the implementation plan there. The plan is the authorization artifact.
- **Approval before execution:** Stop after presenting the Plan Mode plan. Do not continue to implementation until the user approves the plan and the session is back in Agent Mode.
- **Agent Mode execution:** After approval, perform Steps 5-9 exactly as planned: implement fixes, verify, commit, push, create deferred tracking issues, reply to threads, post the summary comment, and spot-check PR checks.

If a prior instruction says to "proceed from this plan after writing it," this mode boundary wins. The agent must not write a plan in Agent Mode and then continue executing it in the same pass.

## Workflow

```
- [ ] Step 1: Identify the PR and preflight the working tree
- [ ] Step 2: Fetch review threads + PR reviews (GraphQL); classify outdated unresolved threads
- [ ] Step 3: Triage each item (respect release / compliance rules)
- [ ] Step 4: Switch to Plan Mode and write the implementation plan (mandatory gate before edits)
- [ ] Step 5: Implement fixes for Address items
- [ ] Step 6: Verify changes (fast path for targeted fixes; full suite only when warranted)
- [ ] Step 7: Commit and push
- [ ] Step 8: Track deferred items (GitHub issues), thread replies, summary comment
- [ ] Step 9: Spot-check PR checks (optional but recommended)
```

### Script helpers (EquipQR repository)

From the repo root, prefer the shared PowerShell drivers to reduce long inline `gh`/`git` blocks:

| Step | Script |
|------|--------|
| 1 | [`scripts/pr-feedback/Get-PrContext.ps1`](../../../scripts/pr-feedback/Get-PrContext.ps1) |
| 2 (inline threads) | [`scripts/pr-feedback/Get-PrFeedbackThreads.ps1`](../../../scripts/pr-feedback/Get-PrFeedbackThreads.ps1) |
| 2b (review bodies) | [`scripts/pr-feedback/Get-PrReviewBodies.ps1`](../../../scripts/pr-feedback/Get-PrReviewBodies.ps1) |
| 6 | [`scripts/pr-feedback/Invoke-PrVerification.ps1`](../../../scripts/pr-feedback/Invoke-PrVerification.ps1) |
| 8 | [`scripts/pr-feedback/Publish-PrFeedbackResponses.ps1`](../../../scripts/pr-feedback/Publish-PrFeedbackResponses.ps1) |
| 9 | [`scripts/pr-feedback/Get-PrChecks.ps1`](../../../scripts/pr-feedback/Get-PrChecks.ps1) |

JSON manifest formats, dry-run behavior, and examples live in [`scripts/pr-feedback/README.md`](../../../scripts/pr-feedback/README.md). Run [`scripts/pr-feedback/tests/Run-PrFeedbackSmoke.ps1`](../../../scripts/pr-feedback/tests/Run-PrFeedbackSmoke.ps1) after changing these scripts.

### Step 1: Identify the PR and Preflight the Working Tree

**Script (recommended):**

```powershell
.\scripts\pr-feedback\Get-PrContext.ps1 -Json
# or for an explicit PR:
.\scripts\pr-feedback\Get-PrContext.ps1 -PullRequestNumber <number> -Json
```

**Manual fallback —** determine the PR number from user context, branch name, or auto-detect:

```powershell
gh pr view --json number,title,url,baseRefName
```

Extract owner/repo for API calls:

```powershell
gh repo view --json owner,name --jq '"\(.owner.login)/\(.name)"'
```

**Dirty-tree guard (required before edits):**

```powershell
git status
git diff
```

- Scope product commits to files touched for this PR-feedback pass.
- Include dirty **workflow artifacts** on the same commit per `.cursor/rules/workflow-artifacts.mdc` (no triage).
- Stash or exclude other unrelated product edits before committing.

**Release PR guard:** Read `baseRefName` from `gh pr view`. If the PR targets `main` (`preview` → `main` release / `/raise` flow), **do not defer** compliance, security, RBAC/RLS, or service-boundary findings — resolve them in this PR or stop and escalate. Deferred tracking issues apply to normal integration PRs (typically base `preview`).

### Step 2: Fetch Review Threads and PR Reviews (GraphQL)

**Scripts (recommended):**

```powershell
.\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -PullRequestNumber <number> -Json
.\scripts\pr-feedback\Get-PrReviewBodies.ps1 -PullRequestNumber <number> -Json
# current branch PR:
.\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -Json
.\scripts\pr-feedback\Get-PrReviewBodies.ps1 -Json
```

**Inline threads:** Prefer GraphQL `reviewThreads` — it returns resolution state and comment content together. Do not use REST `pulls/{pr}/comments` as the primary source for inline threads.

```powershell
$query = 'query($owner:String!,$repo:String!,$pr:Int!,$after:String){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviewThreads(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{id isResolved isOutdated comments(first:10){nodes{databaseId body author{login} path line}}}}}}}'
gh api graphql -f query="$query" -f owner="{owner}" -f repo="{repo}" -F pr={pr_number}
```

**Pagination:** If `pageInfo.hasNextPage` is `true`, re-run with `-f after="{endCursor}"` until `hasNextPage` is false.

**Comment pagination:** If a thread has more than 10 comments, increase `comments(first:10)` or paginate `comments` — otherwise you may miss the latest remark when triaging.

Build two sets:

```
workingSet      = threads where isResolved == false AND isOutdated == false
outdatedOpenSet = threads where isResolved == false AND isOutdated == true
```

- **`workingSet`:** Primary actionable inline threads.
- **`outdatedOpenSet`:** Still unresolved but marked outdated (often because lines shifted). For each, decide: already fixed by recent commits, still applicable against current code, or obsolete. Mention non-trivial outcomes in the PR summary.

**If both sets are empty *and* there is no actionable review-body feedback (next section),** post one short comment that there are no unresolved inline threads; still scan Step 2b for review summaries.

**Top-level / review-body feedback (Step 2b):**

Review bodies and summaries often carry requested changes without an inline thread. Fetch PR reviews:

```powershell
$queryReviews = 'query($owner:String!,$repo:String!,$pr:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviews(first:50){nodes{databaseId author{login} body state submittedAt}}}}}'
gh api graphql -f query="$queryReviews" -f owner="{owner}" -f repo="{repo}" -F pr={pr_number}
```

Triage each review with meaningful `body` or `state` of `CHANGES_REQUESTED` like any other comment (Address / Defer / Reject). Use `databaseId` only if you need to reference the review; inline replies use review **comment** `databaseId` from threads.

**Bot-reply skip rule:** Within each unresolved thread, if the repo owner (non-bot login) has already commented, skip that thread UNLESS the reply contains one of: `"deferred"`, `"follow-up"`, `"tracked in #"`, `"Tracked in #"`, `"Fixed —"`. Those phrases mean the thread was acknowledged but may still need follow-up.

**Stale-round heuristic:** If the PR has several prior summary comments from the repo owner (look for `## PR Feedback Response` in top-level issue comments), prioritize unresolved threads and fresh review feedback from the latest push; avoid re-litigating fully resolved rounds.

### Step 3: Triage Each Comment

Categorize every distinct feedback item into exactly one bucket:

| Category | Criteria | Action |
|----------|----------|--------|
| **Address** | Technically valid, improves the code | Implement the fix |
| **Defer** | Valid but out of scope or requires broader follow-up | Rationale + **tracking GitHub issue** (see Step 7) |
| **Reject** | Incorrect, misunderstanding, or invalid for the codebase | Explain with technical reasoning; **no** tracking issue unless it reveals separate work |

**Triage rules:**

- Verify each suggestion against the actual codebase before categorizing.
- Check whether a suggestion would break functionality or tests.
- For automated reviewer comments (Copilot, CodeRabbit, Qodo, etc.), apply higher skepticism — verify before accepting.
- Group related comments that address the same concern (one issue per theme for deferred work).

### Step 4: Switch to Plan Mode and Write the Implementation Plan

After triage and before code edits, call `SwitchMode` with `target_mode_id: "plan"` and a brief explanation that PR feedback has been verified and now needs an approval-gated implementation plan. Do not write the implementation plan in Agent Mode unless `SwitchMode` is unavailable.

Once in Plan Mode, write a short implementation plan unless the user explicitly requested investigation-only output. The plan is the handoff artifact for Composer 2.5; write it as deterministic `plan.md`-style markdown following `.cursor/rules/composer-plan-format.mdc` so Composer can complete the whole feedback round without inferring missing workflow details.

The plan must be simple, concrete, and action-oriented:

- Identify every actionable feedback item and its bucket: **Address**, **Defer**, or **Reject**.
- For each **Address** item, name the exact file(s), symbol(s), and behavior to change.
- For each **Defer** item, specify the tracking GitHub issue title/body outline and the reply text that will link to it.
- For each **Reject** item, specify the concise technical rationale to post back.
- Use semantic XML-style boundary tags: `<context-anchor>`, `<execution-steps>`, `<authorized-commands>`, `<verification-plan>`, `<summary-checkpoints>`, and `<stop-conditions>`.
- Start with `<context-anchor>` and require the execution agent to read `AGENTS.md`, relevant `.cursor/rules/*.mdc`, this skill, PR context, and touched source/test files before editing.
- Use markdown checkboxes (`- [ ]`) for every executable task and instruct the execution agent to edit the plan file to mark each task `- [x]` as it progresses.
- For behavior changes, require test-first verification: author/update the focused test, run the exact command to confirm the expected failure, then implement and rerun to green.
- Never use triple backticks inside the generated plan. Boundary tags and markdown headers must start at column 0; nested code, schemas, JSON, SQL, and commands must be free text indented with exactly four leading spaces.
- Include the exact verification commands: for **targeted** fixes, default to `npm run lint`, `npx tsc --noEmit`, and **scoped** `npm test -- <touched test paths>` (runs `scripts/test-runner.mjs`) — not a repo-wide `npm test` unless the plan documents why the change is broad or high-risk (see Step 6). State the expected pass condition.
- Include an `<authorized-commands>` list of the exact PowerShell-compatible commands allowed for this PR-feedback pass and tell the execution agent not to invent terminal commands.
- Include the commit message, push target, in-thread reply plan, top-level PR summary sections, and `gh pr checks` spot-check.
- Include stop conditions: dirty unrelated files, unclear reviewer intent, failing verification that is not obviously caused by this change, or release/compliance feedback that cannot be resolved in the PR.

Use this plan shape:

# PR Feedback Implementation Plan

<context-anchor>
PR: #<number> - <title>
Base: <base branch>
Branch/worktree: <branch or path>
Stack: React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase + TanStack Query + Vitest + React Testing Library on Windows PowerShell.
Required reading before edits: AGENTS.md, relevant .cursor/rules/*.mdc, .cursor/skills/address-pr-feedback/SKILL.md, PR context, review threads, and <touched files>.
Composer target: Composer 2.5 should be able to execute this without inferring missing files, commands, tests, or stop conditions.
Formatting rule: boundary tags and headers at column 0; nested snippets/examples at exactly four leading spaces; no triple backticks anywhere in this plan.

Triage summary:
Address:
- <thread/review id or author/path>: <why it is valid>
Defer:
- <thread/review id or author/path>: <why out of scope>; tracking issue title: <title>
Reject:
- <thread/review id or author/path>: <why it does not apply>
</context-anchor>

<execution-steps>
## Phase 1: Discovery
- [ ] Read <exact files> and confirm each Address item still applies.
- [ ] Append a short Phase 1 summary under <summary-checkpoints>.

## Phase 2: Test First
- [ ] Add/update <test file> to cover <case>.
- [ ] Run <exact scoped test command> and confirm it fails for the expected reason.
- [ ] Append a short Phase 2 summary under <summary-checkpoints>.

## Phase 3: Implementation
- [ ] Edit <file> at <symbol> to <specific change>.
- [ ] Create deferred issue(s) with the listed titles and body outlines.
- [ ] Append a short Phase 3 summary under <summary-checkpoints>.

## Phase 4: Verification
- [ ] Run lint, `npx tsc --noEmit`, and scoped `npm test -- <paths>` unless this plan authorizes broader verification.
- [ ] Require green output or stop with the failing command and relevant output summary.
- [ ] Append a verification summary under <summary-checkpoints>.

## Phase 5: Publish
- [ ] Commit with <message>.
- [ ] Push to <remote>/<branch>.
- [ ] Reply to inline threads using the prepared addressed/deferred/rejected text.
- [ ] Post the top-level PR Feedback Response comment.
- [ ] Run `gh pr checks <pr_number>` and report failures if any.
</execution-steps>

<authorized-commands>
- <exact PowerShell-compatible command>
- <exact PowerShell-compatible command>
</authorized-commands>

<verification-plan>
- [ ] Expected failing test before implementation: <command and failure signal>.
- [ ] Expected passing checks after implementation: <commands and pass conditions>.
</verification-plan>

<summary-checkpoints>
The execution agent must physically edit this plan file, mark each completed task with `- [x]`, and append summaries here at the end of each major phase.
</summary-checkpoints>

<stop-conditions>
- Stop if a needed command is not listed in <authorized-commands>.
- Stop if unrelated dirty product files would need to be touched.
- Stop if reviewer intent is unclear.
- Stop if verification fails for reasons outside the planned change.
</stop-conditions>

Stop after presenting the plan and wait for explicit user approval. If the user approves, return to Agent Mode and continue with Step 5. If the user asked only for review/planning, stop after presenting the plan.

### Step 5: Implement Fixes

For each **Address** item:

1. Make the code change.
2. Confirm behavior and tests for that area.

**Implementation order:** security/correctness → quick fixes → larger refactors.

### Step 6: Verify Changes

**Do not treat a full local test suite as mandatory for every micro feedback round.** Waiting on `npm test` for the entire repo (often several minutes, and on Windows the `scripts/test-runner.mjs` wrapper enforces a hard timeout) is a poor default when the diff is a few lines in one feature. **CI on push is the authoritative full-suite gate**; the agent’s job is to run *enough* local checks to be confident the change is sound.

#### Default: targeted / small-surface fixes (most PR feedback)

Before commit, run in the PR worktree:

1. `npm run lint`
2. `npx tsc --noEmit`
3. **Scoped unit tests** for the touched area, e.g.
   `npm test -- src/path/to/__tests__/Something.test.tsx`
   (equivalent: `node scripts/test-runner.mjs src/path/to/__tests__/Something.test.tsx`.)
   Add more file paths after `--` if multiple modules are implicated; prefer the narrowest set that covers the behavior you changed.
   Direct `npx vitest run` bypasses the repo timeout wrapper and can hang on Windows — avoid it for default agent verification; non-Windows hosts may still use it when the hang risk is understood.

**Optional** after those pass: `npm run build` when the change could affect bundling (lazy routes, env imports, Vite config, PWA, etc.). Skip if clearly UI-only inside existing components.

#### When to run the full helper (or full `npm test`)

Use `.\scripts\pr-feedback\Invoke-PrVerification.ps1` (lint → tsc → **full** `npm test` → `npm run build`) only when the change is **broad or high-risk**, for example:

- Touches shared providers, auth/session, React Query defaults, router shells, or cross-feature hooks
- Touches build/tooling, CI, Vitest config, path aliases, or environment wiring
- Spans many unrelated directories or refactors types used widely
- You have a concrete reason to doubt CI would catch a regression without a local full run

The user otherwise expects **minutes saved**: document scoped commands in the plan and execute those for narrow feedback.

**Script shortcuts:**

```powershell
# Full local gate — use sparingly (see criteria above).
.\scripts\pr-feedback\Invoke-PrVerification.ps1

# Lint + typecheck + build only (no npm test).
.\scripts\pr-feedback\Invoke-PrVerification.ps1 -SkipTest

# Lint + typecheck only (iteration only — still add scoped `npm test --` before commit).
.\scripts\pr-feedback\Invoke-PrVerification.ps1 -SkipTest -SkipBuild
```

#### Minimum bar

Lint and TypeScript (`tsc --noEmit`) **must** pass before commit. **At least one** relevant automated test command must pass locally: scoped `npm test -- <path>` counts; skipping *all* tests is only acceptable when the change is non-executable docs-only and the plan says so.

If a scoped run fails, fix before proceeding. If CI fails later on unrelated tests, triage normally.

**Worktree-aware verification:** If the PR branch lives in another git worktree (`git worktree list`), run commands **in that worktree**.

### Step 7: Commit and Push

Commit with a message referencing the PR. Prefer a temp file for multi-line bodies (PowerShell-safe; avoids quoting bugs):

```powershell
@"
fix: address PR #<number> review feedback

- <summary of each addressed item>
"@ | Set-Content -Path ".git/COMMIT_MSG" -Encoding utf8
git commit -F ".git/COMMIT_MSG"
Remove-Item ".git/COMMIT_MSG"
```

Or short messages with multiple `-m` flags.

Push to the PR branch. Per workspace workflow: push proactively once verification passes (feature branches / preview policy as in `.cursor/rules/branching.mdc`).

### Step 8: Track Deferred Items, Thread Replies, Summary Comment

**Script (recommended):** prepare JSON manifests and a summary markdown file (see [`scripts/pr-feedback/README.md`](../../../scripts/pr-feedback/README.md)), then run:

```powershell
.\scripts\pr-feedback\Publish-PrFeedbackResponses.ps1 `
  -PullRequestNumber <number> `
  -DeferredIssuesFile .\tmp\deferred.json `
  -ThreadRepliesFile .\tmp\replies.json `
  -SummaryBodyFile .\tmp\pr-feedback-response.md

# rehearsal only (no GitHub mutations):
.\scripts\pr-feedback\Publish-PrFeedbackResponses.ps1 -DryRun -ThreadRepliesFile .\tmp\replies.json -SummaryBodyFile .\tmp\pr-feedback-response.md
```

#### 8a — Tracking issues for **Defer** items

Align with workspace policy (`AGENTS.md`): **when feedback is deferred (not addressed), open a GitHub issue** so backlog stays traceable outside the PR thread.

- One issue can cover multiple related deferred items.
- Issue body should include: link to the PR, bullet list of deferred items, short rationale each, acceptance criteria or next step, and pointers to reviewer/thread where helpful.
- Do **not** open tracking issues for **Reject** items unless rejection uncovered separate real work.

**PowerShell-safe issue creation** (use `--body-file` when the body is multi-line or contains quotes):

```powershell
$issueBody = @'
## Context
Deferred from PR #<number> (<pr url>).

## Items
- ...

## Rationale / next steps
...
'@
$issueBody | Set-Content -Path "$env:TEMP\equipqr-deferred-issue.md" -Encoding utf8
gh issue create --title "Deferred from PR #<number>: <short topic>" --body-file "$env:TEMP\equipqr-deferred-issue.md"
```

Capture returned issue URL(s) for thread replies and the summary.

#### 8b — In-thread replies

**Addressed** inline comments: reply with what changed.

**Deferred** inline comments: reply with rationale and **link the tracking issue**, e.g. `Deferred — out of scope for this PR; tracked in #123.` Create the issue(s) before posting these replies so links are valid.

**Rejected** inline comments: reply with concise technical reasoning (no issue link).

**PowerShell-safe JSON** (escape quotes inside the body as needed):

```powershell
$payload = '{"body":"Fixed — <brief description>","in_reply_to":1234567890}'
$payload | gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --method POST --input -
```

Use the review comment `databaseId` from GraphQL as `in_reply_to`.

**Race-condition rule (required):**

- Attempt thread replies for addressed and deferred inline threads.
- If a reply returns `404` immediately after a push, treat as non-fatal (thread auto-resolved/outdated); continue.
- Always still post the top-level summary comment.

#### 8c — Top-level summary comment

Use `--body-file` for the markdown summary:

```powershell
@"
## PR Feedback Response

### Addressed
- **{area}**: {what changed and why}

### Deferred / tracked
- **{summary}**: {rationale}. Tracked in #{issue}.

### Rejected
- **{summary}**: {why this feedback does not apply}

### Questions
- {items needing reviewer input}
"@ | Set-Content -Path "$env:TEMP\pr-feedback-response.md" -Encoding utf8
gh pr comment <pr_number> --body-file "$env:TEMP\pr-feedback-response.md"
```

**Rules:**

- Every triaged item appears in exactly one section.
- Omit empty sections.
- **Deferred / tracked** lines must include issue links when issues were created.

### Step 9: Spot-check PR Checks (Recommended)

After push:

```powershell
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <pr_number>
# or current branch PR:
.\scripts\pr-feedback\Get-PrChecks.ps1
```

Manual fallback:

```powershell
gh pr checks <pr_number>
```

If checks fail, fix forward or revert as appropriate before considering the feedback round complete.

## Complementary Skills

This skill covers **GitHub PR workflow mechanics**. For multi-lens review of plans or tricky feedback before you commit to a category, use **`master-mason`** (repo: `.cursor/skills/master-mason/SKILL.md`). For trimming AI-noise in changed files without behavior shifts, use **`deslop`** when installed (typically under the user's Cursor skills directory, e.g. `~/.cursor/skills-cursor/deslop/`).
