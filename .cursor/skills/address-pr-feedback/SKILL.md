---
name: address-pr-feedback
description: >-
  Triage, implement, and respond to pull request review feedback end-to-end in
  Agent Mode. Waits for CI to finish and prioritizes red checks over comments.
  Fetches unresolved review threads and review bodies, audits resolved threads
  for post-open regressions, parses the Qodo persistent Code Review comment for
  unstriked findings (action required, review recommended, and optional),
  implements fixes directly when scope is clear, and only switches to Plan Mode
  for overly complex or assumption-heavy feedback. Verifies with lint,
  type-check, Fallow, and targeted tests; commits, pushes, posts inline replies
  and a summary comment with visual evidence when UI changed; watches CI until
  green before handoff. Use when PR feedback needs addressing, automated
  reviewers leave comments, or the user asks to fix, resolve, or respond to PR
  review comments.
---

# Address PR Feedback

End-to-end workflow for triaging PR review comments, implementing fixes, and posting structured responses. Optimized for **Agent Mode + Composer 2.5** from the start — no mandatory Plan Mode gate unless the feedback round is genuinely complex or ambiguous.

## Priority order (mandatory)

Before triaging human or bot comments, establish CI and Qodo state:

| Priority | Signal | Action |
|----------|--------|--------|
| **1 — CI pending** | Any PR check still running | **Wait** (`Get-PrChecks.ps1 -Watch`) until all checks finish. Pending CI can surface new failures that change the work queue. |
| **2 — CI failed** | Any check in `fail` bucket | **Fix CI first** — higher priority than review comments, Qodo findings, or deferrals. Re-watch after each push. |
| **3 — Qodo in progress** | Status comment says check back / reviewing, or parent review not updated for latest `headSha` | **Wait or poll** `Get-PrQodoFindings.ps1` until the persistent **Code Review by Qodo** comment reflects the latest commit. |
| **4 — Open Qodo findings** | Unstriked items in the persistent Qodo parent comment | Triage and address every open item (all three buckets) before treating the PR as merge-ready. |
| **5 — Inline / review-body feedback** | Unresolved threads, `CHANGES_REQUESTED`, review bodies | Triage after CI is green and Qodo open items are handled. |

Do **not** implement comment fixes while required CI is red or still pending. Do **not** hand off while CI is red or pending.

## Execution Model

**Default: single-pass Agent Mode.** Discover → triage → implement → verify → commit → push → respond — in one session when scope is clear.

**Plan only when necessary.** Call `SwitchMode` to Plan Mode and write a Composer 2.5 executable plan (per `.cursor/rules/composer-plan-format.mdc`) only when one or more of these apply:

- Multiple conflicting reviewer directions and the correct path is not obvious from code
- Large cross-cutting refactor spanning many modules or architectural decisions
- Compliance / security / release-PR findings that need explicit approval before deferring
- Assumptions required that cannot be verified from the codebase or PR context alone

If none apply, **do not** stop for a plan — proceed directly to implementation after triage.

**Stop and ask** when reviewer direction is unclear, mutually exclusive, or would change product behavior in a way the PR description does not support. Do not guess.

## Workflow

```
- [ ] Step 1: Identify the PR and preflight the working tree
- [ ] Step 1b: CI gate — inspect checks; if pending, watch until complete; if failed, fix CI before comments
- [ ] Step 2: Fetch all feedback (threads, review bodies, Qodo parent comment, resolved-thread audit)
- [ ] Step 2b: If Qodo review still in progress for latest commit, wait/poll before triaging findings
- [ ] Step 3: Triage each item; stop and ask if direction is unclear
- [ ] Step 3b: (Conditional) Switch to Plan Mode only if the round is complex or assumption-heavy
- [ ] Step 4: Implement fixes (CI failures first, then Qodo open items, then other feedback)
- [ ] Step 5: Self-review changes for regressions; verify locally (lint, type-check, Fallow, tests)
- [ ] Step 6: Capture PR visual evidence when UI remediation is relevant
- [ ] Step 7: Commit and push to the PR branch
- [ ] Step 8: Post inline replies for every addressed thread + top-level summary comment
- [ ] Step 9: Watch PR checks until green; fix forward if any fail
```

### Script helpers (EquipQR repository)

From the repo root, prefer the shared PowerShell drivers:

| Step | Script |
|------|--------|
| 1 | [`scripts/pr-feedback/Get-PrContext.ps1`](../../../scripts/pr-feedback/Get-PrContext.ps1) |
| 1b, 9 | [`scripts/pr-feedback/Get-PrChecks.ps1`](../../../scripts/pr-feedback/Get-PrChecks.ps1) — use `-Json` for structured status; `-Watch` (and `-FailFast` when diagnosing) to block until checks finish |
| 2 (inline threads) | [`scripts/pr-feedback/Get-PrFeedbackThreads.ps1`](../../../scripts/pr-feedback/Get-PrFeedbackThreads.ps1) |
| 2b (review bodies) | [`scripts/pr-feedback/Get-PrReviewBodies.ps1`](../../../scripts/pr-feedback/Get-PrReviewBodies.ps1) |
| 2c (Qodo findings) | [`scripts/pr-feedback/Get-PrQodoFindings.ps1`](../../../scripts/pr-feedback/Get-PrQodoFindings.ps1) — parses the **persistent parent** comment; open items lack `<s>` / `✓ Resolved` strikethrough |
| 5 | [`scripts/pr-feedback/Invoke-PrVerification.ps1`](../../../scripts/pr-feedback/Invoke-PrVerification.ps1) (supplement with Fallow — see Step 5) |
| 6 | [`scripts/pr-evidence/Invoke-PrEvidence.ps1`](../../../scripts/pr-evidence/Invoke-PrEvidence.ps1) |
| 8 | [`scripts/pr-feedback/Publish-PrFeedbackResponses.ps1`](../../../scripts/pr-feedback/Publish-PrFeedbackResponses.ps1) |

JSON manifest formats, dry-run behavior, and examples live in [`scripts/pr-feedback/README.md`](../../../scripts/pr-feedback/README.md).

**CI watch pattern** (also see `loop-on-ci` skill):

```powershell
# Snapshot before triage
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <number> -Json

# If pendingCount > 0, block until complete
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <number> -Watch

# After push — do not hand off until exit 0 (green)
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <number> -Watch -FailFast
```

### Step 1: Identify the PR and Preflight the Working Tree

**Script (recommended):**

```powershell
.\scripts\pr-feedback\Get-PrContext.ps1 -Json
# or for an explicit PR:
.\scripts\pr-feedback\Get-PrContext.ps1 -PullRequestNumber <number> -Json
```

**Manual fallback:**

```powershell
gh pr view --json number,title,url,baseRefName,headRefName,createdAt
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

**Release PR guard:** Read `baseRefName` from `gh pr view`. If the PR targets `main` (`preview` → `main` release / `/raise` flow), **do not defer** compliance, security, RBAC/RLS, or service-boundary findings — resolve them in this PR or stop and escalate.

### Step 1b: CI Gate (before fetching or triaging comments)

**Inspect attached checks first** — `gh pr checks` is the source of truth (includes all PR-attached checks, not only GitHub Actions workflow runs).

```powershell
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <number> -Json
```

Interpret the JSON:

| Field | Meaning | Next step |
|-------|---------|-----------|
| `hasPending: true` | Checks still running | Run `-Watch` and **stop** — do not triage comments until `pendingCount` is 0 |
| `hasFailed: true` | At least one check failed | **Fix CI first** — inspect `failedChecks[].link`, pull logs with `gh run view <id> --log-failed` when linked to GHA. Comment triage waits. |
| `isGreen: true` | All checks passed | Proceed to Step 2 |

```powershell
# Block until checks settle
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <number> -Watch
```

**After a fix push**, repeat Step 1b before re-reading Qodo or inline threads — a green local verify does not substitute for green PR checks (per `.cursor/rules/pr-ci-gate-before-open.mdc`).

### Step 2: Fetch All Feedback

#### 2a — Unresolved inline threads (primary actionable set)

**Scripts (recommended):**

```powershell
.\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -PullRequestNumber <number> -Json
.\scripts\pr-feedback\Get-PrReviewBodies.ps1 -PullRequestNumber <number> -Json
```

**GraphQL (manual fallback):** Prefer `reviewThreads` — it returns resolution state and comment content together.

```powershell
$query = 'query($owner:String!,$repo:String!,$pr:Int!,$after:String){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviewThreads(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{id isResolved isOutdated comments(first:10){nodes{databaseId body author{login} path line createdAt}}}}}}}'
gh api graphql -f query="$query" -f owner="{owner}" -f repo="{repo}" -F pr={pr_number}
```

Paginate `reviewThreads` and `comments` until complete.

Build sets:

```
workingSet      = threads where isResolved == false AND isOutdated == false
outdatedOpenSet = threads where isResolved == false AND isOutdated == true
resolvedSet     = threads where isResolved == true
```

- **`workingSet`:** Primary actionable inline threads — every item must be triaged and addressed, deferred, rejected, or answered with a question.
- **`outdatedOpenSet`:** Still unresolved but marked outdated. Decide: already fixed, still applicable against current code, or obsolete.
- **`resolvedSet`:** Used for regression audit (Step 2d).

**Bot-reply skip rule:** Within each unresolved thread, if the repo owner has already replied with a clear resolution (`"Fixed —"`, `"Deferred —"`, `"Tracked in #"`, etc.), confirm the fix still holds in current code before skipping.

#### 2b — Top-level / review-body feedback

Fetch PR reviews and top-level issue comments. Triage each review with meaningful `body` or `state` of `CHANGES_REQUESTED` like any inline thread.

#### 2c — Qodo Code Review (mandatory — persistent parent comment)

Qodo posts **two** comment types on every re-push:

1. **Status comment** (short, updated on each push) — e.g. `[Code review](<parent-url>) by qodo was updated up to the latest commit <sha>`, or an in-progress message asking you to check back later.
2. **Parent / persistent comment** (`Code Review by Qodo` heading) — the authoritative checklist. Qodo updates this comment in place (`persistent_comment = true` in `.pr_agent.toml`). **All** action-required, review-recommended, and optional findings live here.

**Script (recommended):**

```powershell
.\scripts\pr-feedback\Get-PrQodoFindings.ps1 -PullRequestNumber <number> -Json
```

**Procedure:**

1. If `reviewInProgress: true`, **wait** (poll every few minutes or after CI completes) until the parent comment reflects the latest `headSha`. Do not triage stale findings.
2. Open `parentCommentUrl` from the JSON output — this is the comment to read.
3. Treat `openFindings` as the mandatory work queue. Each item lacks strikethrough (`<s>…</s>`, `~~…~~`) and lacks the `✓ Resolved` badge.
4. `resolvedFindings` are already struck through — confirm fixes still hold in current code; do not re-implement unless regressed.
5. Parse only the **current** section of the parent comment (above `<!-- FOLDED_SECTION_START -->` / `### Previous review results`). Ignore folded historical results unless auditing regressions.

| Qodo bucket (`openFindings[].bucket`) | Required action |
|-------------|-----------------|
| **actionRequired** | Implement or explicitly reject with technical rationale |
| **reviewRecommended** | Implement or explicitly reject — do not skip as "optional noise" |
| **optional** | Implement or explicitly reject — still must appear in the PR summary |

Cross-check each open Qodo item against inline threads and review bodies so nothing is missed when Qodo grouped findings in its summary comment rather than inline.

For automated reviewer comments (Qodo, Copilot, CodeRabbit, etc.), verify against the actual codebase before accepting — but **default to addressing** when the suggestion is technically valid.

#### 2d — Resolved-thread regression audit (avoid fix-and-regress cycles)

Review **`resolvedSet`** threads for issues that were addressed earlier but **re-introduced by commits pushed after the PR opened**.

Procedure:

1. List commits on the PR branch since `createdAt` (or since the thread was resolved):
   ```powershell
   gh pr view <number> --json commits --jq '.commits[-10:] | .[] | "\(.oid[0:7]) \(.committedDate) \(.messageHeadline)"'
   ```
2. For each resolved thread whose topic touches code changed in those later commits, re-read the current file at the referenced path/line.
3. If the original issue recurred, re-open it in your working set as **Address** — do not assume resolution still holds.
4. Mention any regression re-fixes explicitly in the PR summary under **Regressions re-fixed**.

This audit prevents going back and forth on issues that were "fixed" once but broken again by subsequent pushes.

**If CI is green, Qodo `openCount` is 0, `workingSet` and review-body feedback are empty after audit,** post one short comment that there is no actionable feedback; still confirm resolved-thread audit found no regressions.

### Step 3: Triage Each Comment

Categorize every distinct feedback item into exactly one bucket:

| Category | Criteria | Action |
|----------|----------|--------|
| **Address** | Technically valid, improves the code | Implement the fix |
| **Defer** | Valid but out of scope or requires broader follow-up | Rationale + **tracking GitHub issue** |
| **Reject** | Incorrect, misunderstanding, or invalid for the codebase | Explain with technical reasoning |
| **Question** | Reviewer intent unclear or mutually exclusive with other feedback | Stop and ask before implementing |

**Triage rules:**

- Verify each suggestion against the actual codebase before categorizing.
- Check whether a suggestion would break functionality or tests.
- Group related comments that address the same concern (one issue per theme for deferred work).
- **Every open Qodo item** (all three buckets) must land in Address, Defer, Reject, or Question — none may be silently dropped.
- **CI failures** are always **Address** unless clearly flaky infrastructure — fix or re-run once with evidence.

**Stop and ask** when any **Question** item remains or when implementation would require an assumption the user has not authorized. Do not proceed to edits until direction is clear.

### Step 3b: Conditional Plan Mode (only when necessary)

If the feedback round meets the complexity criteria in **Execution Model**, call `SwitchMode` with `target_mode_id: "plan"` and write a Composer 2.5 executable plan per `.cursor/rules/composer-plan-format.mdc`. Stop for user approval before implementing.

If scope is straightforward (typical case), **skip this step** and continue to Step 4 in Agent Mode.

### Step 4: Implement Fixes

**Implementation order:** CI failures → Qodo open findings (action required → review recommended → optional) → security/correctness from inline threads → quick fixes → larger refactors.

For each **Address** item:

1. Make the code change.
2. Confirm behavior and tests for that area.
3. After each logical group of changes, mentally trace whether the fix could re-break a previously resolved thread (feeds Step 2d on the next round).

Before committing, re-read your own diff as if reviewing someone else's PR — look for off-by-one logic, missing null checks, broken imports, and test gaps.

### Step 5: Verify Locally

Run checks in the PR worktree until all pass. **Do not commit with failing lint, type errors, Fallow findings, or broken targeted tests.**

#### Required gates (every feedback round)

1. **Lint** — `npm run lint` (must pass with zero warnings on touched files; repo uses `--max-warnings 0` on edit)
2. **Type-check** — `npm run type-check` (or `npx tsc --noEmit`)
3. **Fallow** — both scans per `.cursor/rules/fallow-before-commit.mdc`:
   ```powershell
   npx --yes fallow@2.88.0 --format json --quiet --summary > tmp\fallow-pre-commit.json 2>$null
   $code = $LASTEXITCODE
   if ($code -ge 2) { throw "Fallow runtime error $code" }
   $issues = (Get-Content tmp\fallow-pre-commit.json | ConvertFrom-Json).check.total_issues
   if ($issues -gt 0) { throw "Fallow found $issues issue(s)" }

   npx --yes fallow@2.88.0 dupes --format json --quiet > tmp\fallow-pre-commit-dupes.json 2>$null
   $dupesCode = $LASTEXITCODE
   if ($dupesCode -ge 2) { throw "Fallow dupes runtime error $dupesCode" }
   $cloneGroups = (Get-Content tmp\fallow-pre-commit-dupes.json | ConvertFrom-Json).clone_groups.Count
   if ($cloneGroups -gt 0) { throw "Fallow found $cloneGroups duplication clone group(s)" }
   ```
4. **Targeted tests** — scoped Vitest for every behavior you changed:
   ```powershell
   npm test -- src/path/to/__tests__/Something.test.tsx
   ```
   Add or update tests when behavior changed. Prefer the narrowest path set that covers the diff.

#### Additional gates (when warranted)

- **`npm run build`** — when routing, env wiring, Vite, or PWA may be affected
- **Full `npm test`** — when the change is broad or high-risk (shared providers, auth, router shells, cross-feature hooks, build tooling). Use `.\scripts\pr-feedback\Invoke-PrVerification.ps1` for lint → tsc → full test → build in one script.
- **Local E2E** — per `.cursor/rules/local-verify-before-preview-push.mdc` when user-visible UI, OAuth, or integrations changed

**Worktree-aware:** If the PR branch lives in another git worktree (`git worktree list`), run all commands **in that worktree**.

Document commands run and pass/fail outcomes in the handoff.

### Step 6: Capture PR Visual Evidence (when UI remediation is relevant)

When fixes change user-visible behavior, capture fresh evidence per `.cursor/rules/pr-visual-evidence.mdc` **before** posting the summary comment:

```powershell
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "<short-slug>" `
  -Spec "e2e/pr-evidence/<feature>.spec.ts"

# After push, publish hosted URLs for the summary comment:
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "<short-slug>" `
  -Spec "e2e/pr-evidence/<feature>.spec.ts" `
  -PrNumber <num> `
  -Publish
```

- Author or update `e2e/pr-evidence/<feature>.spec.ts` when existing specs do not cover the remediated UI.
- Merge screenshot/GIF markdown from `tmp/pr-evidence/<slug>/evidence-markdown.md` into the **summary comment** (not only the PR body) so reviewers see remediation proof inline.
- If capture fails, fix the spec or local stack before pushing — do not push UI fixes without evidence when the rule applies.

### Step 7: Commit and Push

Commit with a message referencing the PR (PowerShell-safe temp file for multi-line bodies):

```powershell
@"
fix: address PR #<number> review feedback

- <summary of each addressed item>
Fallow: exitCode=0, total_issues=0, clone_groups=0
"@ | Set-Content -Path ".git/COMMIT_MSG" -Encoding utf8
git commit -F ".git/COMMIT_MSG"
Remove-Item ".git/COMMIT_MSG"
```

Push to the PR branch proactively once verification passes (per `.cursor/rules/branching.mdc`).

### Step 8: Inline Replies and Summary Comment

**Every addressed inline thread** gets an in-thread reply so the conversation can be resolved. Do not rely on the top-level summary alone.

**Script (recommended):**

```powershell
.\scripts\pr-feedback\Publish-PrFeedbackResponses.ps1 `
  -PullRequestNumber <number> `
  -DeferredIssuesFile .\tmp\deferred.json `
  -ThreadRepliesFile .\tmp\replies.json `
  -SummaryBodyFile .\tmp\pr-feedback-response.md
```

#### 8a — Tracking issues for **Defer** items

Open a GitHub issue for each deferred theme (one issue can cover related items). Create issues **before** posting replies that link to them.

```powershell
gh issue create --title "Deferred from PR #<number>: <short topic>" --body-file "$env:TEMP\equipqr-deferred-issue.md"
```

#### 8b — In-thread replies (required for every triaged inline thread)

| Bucket | Reply pattern |
|--------|---------------|
| **Address** | `Fixed — <what changed and where>` |
| **Defer** | `Deferred — <rationale>. Tracked in #<issue>.` |
| **Reject** | `<concise technical rationale why this does not apply>` |
| **Question** | `<specific question>; awaiting direction before changing code>` |

**PowerShell-safe JSON:**

```powershell
$payload = '{"body":"Fixed — <brief description>","in_reply_to":1234567890}'
$payload | gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --method POST --input -
```

Use the review comment `databaseId` from GraphQL as `in_reply_to`.

**Race-condition rule:** If a reply returns `404` immediately after push (thread auto-resolved/outdated), treat as non-fatal and continue. **Always** still post the top-level summary.

#### 8c — Top-level summary comment

Post via `--body-file`. Include every triaged item in exactly one section. Embed visual evidence markdown when Step 6 ran.

```powershell
@"
## PR Feedback Response

### CI
- status: {green | fixed and re-pushed}
- checks watched: {`Get-PrChecks.ps1 -Watch` completed}

### Addressed
- **{area}**: {what changed and why}

### Regressions re-fixed
- **{area}**: {issue that recurred after a later commit; what changed}

### Deferred / tracked
- **{summary}**: {rationale}. Tracked in #{issue}.

### Rejected
- **{summary}**: {why this feedback does not apply}

### Qodo Code Review
- Parent comment: {parentCommentUrl}
- **Action required**: {addressed} / {open + addressed total}
- **Review recommended**: {addressed} / {total}
- **Optional**: {addressed} / {total}
- Open items remaining: {openCount after push — should be 0 at handoff}

### Visual evidence
{paste evidence-markdown.md section when UI changed}

### Verification
- lint: pass
- type-check: pass
- Fallow: exitCode=0, total_issues=0, clone_groups=0
- tests: {scoped commands run}

### Questions
- {items needing reviewer input — omit section if empty}
"@ | Set-Content -Path "$env:TEMP\pr-feedback-response.md" -Encoding utf8
gh pr comment <pr_number> --body-file "$env:TEMP\pr-feedback-response.md"
```

Omit empty sections. **Deferred / tracked** lines must include issue links.

### Step 9: Watch PR Checks Until Green (mandatory handoff gate)

After every push, **watch** until all attached checks pass. Do not mark the feedback round complete on local verify alone.

```powershell
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <pr_number> -Watch
```

If checks fail:

1. Read `failedChecks` from `-Json` output or `gh pr checks <num> --json name,bucket,state,workflow,link`.
2. Fix forward on the same branch (CI failures outrank remaining comment threads).
3. Re-run Step 1b → local verify → push → Step 9 until `isGreen: true`.

**Handoff must cite final CI status** — include `gh pr checks` output or a link to the green workflow run (per `.cursor/rules/pr-ci-gate-before-open.mdc`).

## Complementary Skills

- **`loop-on-ci`** — watch/fix loop when CI failures need multiple iterations
- **`itil-issue-resolver`** — when a feedback item reveals a larger product change needing scoped discovery first
- **`deslop`** — trim AI-noise in changed files without behavior shifts (when installed)
- **`master-mason`** — multi-lens review of tricky feedback before categorizing (repo: `.cursor/skills/master-mason/SKILL.md`)
