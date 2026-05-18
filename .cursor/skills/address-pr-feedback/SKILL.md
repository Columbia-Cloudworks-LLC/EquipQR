---
name: address-pr-feedback
description: >-
  Triage, implement, and respond to pull request review feedback end-to-end.
  Fetches unresolved review threads via GraphQL (isResolved filter), pulls
  review bodies for non-inline feedback, categorizes each item as addressed,
  deferred (with a tracking GitHub issue), or rejected with rationale, then
  requires a Plan Mode handoff before any fixes are applied. After the user
  approves the plan, executes the fixes, verifies the build, commits, pushes,
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
- [ ] Step 6: Verify changes
- [ ] Step 7: Commit and push
- [ ] Step 8: Track deferred items (GitHub issues), thread replies, summary comment
- [ ] Step 9: Spot-check PR checks (optional but recommended)
```

### Step 1: Identify the PR and Preflight the Working Tree

Determine the PR number from user context, branch name, or auto-detect:

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

- Scope commits to files touched for this PR-feedback pass; do not stage unrelated local changes.
- If unrelated edits exist, stash or exclude them before committing.

**Release PR guard:** Read `baseRefName` from `gh pr view`. If the PR targets `main` (`preview` → `main` release / `/raise` flow), **do not defer** compliance, security, RBAC/RLS, or service-boundary findings — resolve them in this PR or stop and escalate. Deferred tracking issues apply to normal integration PRs (typically base `preview`).

### Step 2: Fetch Review Threads and PR Reviews (GraphQL)

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

Once in Plan Mode, write a short implementation plan unless the user explicitly requested investigation-only output. The plan is the handoff artifact for a cheap model; write it so `Composer 2 (fast)` / Cursor Auto can complete the whole feedback round without inferring missing workflow details.

The plan must be simple, concrete, and action-oriented:

- Identify every actionable feedback item and its bucket: **Address**, **Defer**, or **Reject**.
- For each **Address** item, name the exact file(s), symbol(s), and behavior to change.
- For each **Defer** item, specify the tracking GitHub issue title/body outline and the reply text that will link to it.
- For each **Reject** item, specify the concise technical rationale to post back.
- Include the exact verification commands to run, scoped tests when appropriate, and the expected pass condition.
- Include the commit message, push target, in-thread reply plan, top-level PR summary sections, and `gh pr checks` spot-check.
- Include stop conditions: dirty unrelated files, unclear reviewer intent, failing verification that is not obviously caused by this change, or release/compliance feedback that cannot be resolved in the PR.

Use this plan shape:

```markdown
## PR Feedback Implementation Plan

### Working Set
- PR: #<number> — <title>
- Base: <base branch>
- Branch/worktree: <branch or path>

### Triage
- Address:
  - <thread/review id or author/path>: <why it is valid>
- Defer:
  - <thread/review id or author/path>: <why out of scope>; tracking issue title: `<title>`
- Reject:
  - <thread/review id or author/path>: <why it does not apply>

### Implementation Steps
1. Edit `<file>` at `<symbol>` to <specific change>.
2. Add/update `<test file>` to cover <case>.
3. Create deferred issue(s) with the listed titles and body outlines.
4. Run `<verification command>` and require <expected result>.
5. Commit with `<message>`.
6. Push to `<remote>/<branch>`.
7. Reply to inline threads using the prepared addressed/deferred/rejected text.
8. Post the top-level `## PR Feedback Response` comment.
9. Run `gh pr checks <pr_number>` and report failures if any.

### Stop Conditions
- Stop if <condition> and ask the user how to proceed.
```

Stop after presenting the plan and wait for explicit user approval. If the user approves, return to Agent Mode and continue with Step 5. If the user asked only for review/planning, stop after presenting the plan.

### Step 5: Implement Fixes

For each **Address** item:

1. Make the code change.
2. Confirm behavior and tests for that area.

**Implementation order:** security/correctness → quick fixes → larger refactors.

### Step 6: Verify Changes

Run project verification before committing. Adapt to the project's toolchain:

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
```

At minimum, lint and typecheck must pass. If verification fails, fix before proceeding.

**Worktree-aware verification:** If the PR branch lives in another git worktree (`git worktree list`), run commands **in that worktree**. Optionally scope tests to touched paths for speed; CI still runs on push.

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
gh pr checks <pr_number>
```

If checks fail, fix forward or revert as appropriate before considering the feedback round complete.

## Complementary Skills

This skill covers **GitHub PR workflow mechanics**. For multi-lens review of plans or tricky feedback before you commit to a category, use **`master-mason`** (repo: `.cursor/skills/master-mason/SKILL.md`). For trimming AI-noise in changed files without behavior shifts, use **`deslop`** when installed (typically under the user's Cursor skills directory, e.g. `~/.cursor/skills-cursor/deslop/`).
