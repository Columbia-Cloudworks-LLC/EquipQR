---
name: address-pr-feedback
description: >-
  Triage, implement, and respond to pull request review feedback end-to-end.
  Fetches unresolved review threads via GraphQL (isResolved filter), pulls
  review bodies for non-inline feedback, categorizes each item as addressed,
  deferred (with a tracking GitHub issue), or rejected with rationale,
  implements valid fixes, verifies the build, commits, pushes, replies in-thread,
  and posts a structured summary comment on the PR. Use when PR feedback needs
  addressing, automated reviewers leave comments, or the user asks to fix,
  resolve, or respond to PR review comments.
---

# Address PR Feedback

End-to-end workflow for triaging PR review comments, implementing fixes, tracking deferred work, and posting a structured response.

## Workflow

```
- [ ] Step 1: Identify the PR and preflight the working tree
- [ ] Step 2: Fetch review threads + PR reviews (GraphQL); classify outdated unresolved threads
- [ ] Step 3: Triage each item (respect release / compliance rules)
- [ ] Step 4: Implement fixes for Address items
- [ ] Step 5: Verify changes
- [ ] Step 6: Commit and push
- [ ] Step 7: Track deferred items (GitHub issues), thread replies, summary comment
- [ ] Step 8: Spot-check PR checks (optional but recommended)
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

### Step 4: Implement Fixes

For each **Address** item:

1. Make the code change.
2. Confirm behavior and tests for that area.

**Implementation order:** security/correctness → quick fixes → larger refactors.

### Step 5: Verify Changes

Run project verification before committing. Adapt to the project's toolchain:

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
```

At minimum, lint and typecheck must pass. If verification fails, fix before proceeding.

**Worktree-aware verification:** If the PR branch lives in another git worktree (`git worktree list`), run commands **in that worktree**. Optionally scope tests to touched paths for speed; CI still runs on push.

### Step 6: Commit and Push

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

### Step 7: Track Deferred Items, Thread Replies, Summary Comment

#### 7a — Tracking issues for **Defer** items

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

#### 7b — In-thread replies

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

#### 7c — Top-level summary comment

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

### Step 8: Spot-check PR Checks (Recommended)

After push:

```powershell
gh pr checks <pr_number>
```

If checks fail, fix forward or revert as appropriate before considering the feedback round complete.

## Complementary Skills

This skill covers **GitHub PR workflow mechanics**. For multi-lens review of plans or tricky feedback before you commit to a category, use **`master-mason`** (repo: `.cursor/skills/master-mason/SKILL.md`). For trimming AI-noise in changed files without behavior shifts, use **`deslop`** when installed (typically under the user's Cursor skills directory, e.g. `~/.cursor/skills-cursor/deslop/`).
