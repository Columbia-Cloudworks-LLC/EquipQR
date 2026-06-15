---
name: release
description: >-
  Prepare and open a production release PR from preview to main, capture and
  publish PR visual evidence, then babysit until merge-ready (CI green, Qodo
  openCount=0, all review threads addressed). Syncs to origin/preview, runs the
  changelog-version-curator subagent for release metadata, runs scoped Vitest on
  changed test files only, commits and pushes release metadata when needed, opens
  a customer-facing preview → main PR, and does not hand off until the PR can
  merge. Use when the user runs /release or asks to release, promote to main, or
  open the preview → main release PR.
disable-model-invocation: true
---

# Release

End-to-end workflow to prepare EquipQR for production promotion: align with `origin/preview`, curate release metadata, verify changed tests locally, capture and publish **PR visual evidence**, push release prep to `preview`, open a **customer-facing** PR into `main`, and **babysit until merge-ready**.

**Opening the release PR is not handoff.** The agent owns the PR until every CI check passes and every review comment — including Qodo optional/review-recommended items, CodeQL/GHAS findings, and unresolved `github-copilot` threads — is addressed.

This is the explicit release gate. Merging to `main` is the release candidate; **Production Release Readiness** auto-promotes production traffic in Vercel after migrations and schema drift pass.

## Mandatory Rules

- **Windows / PowerShell only.** No bash heredocs, no `&&`, no Unix-only utilities. Use `--body-file` for multiline PR bodies.
- **Never auto-discard local changes.** Resolve dirty trees per `.cursor/rules/workflow-artifacts.mdc`: if workflow-artifact-only dirt blocks Step 1a branch switching or fast-forward alignment, path-stash it before switching (Step 1a preflight), then commit on `preview` in Step 1b; **stop** on unresolved product or mixed dirt. Do not run `git reset --hard` or `git clean`.
- **Never push to `main`.** The only git write on `main` is opening the PR (`preview` → `main`).
- **Never run the full Vitest suite.** Run only updated or added test files from the release diff.
- **PR visual evidence is required.** Every release PR must include local-stack screenshots and an H.264 MP4 demo published to the PR per `.cursor/rules/pr-visual-evidence.mdc`. Do not open or hand off without evidence in the PR body and a `-Publish` comment.
- **No handoff until merge-ready.** Follow `.cursor/rules/pr-merge-ready-workflow.mdc` exit criteria in full. Do not report "release PR opened" while CI is red, Qodo is in progress, Qodo `openCount > 0`, or unresolved review threads remain.
- **Do not edit an attached plan file** unless it follows the Composer 2.5 plan format in `.cursor/rules/composer-plan-format.mdc`; in that case, update checkboxes and append summary checkpoints exactly as the plan instructs.
- **PR summary is customer-facing.** Lead with user-visible outcomes, workflow improvements, fixes, and new capabilities. Keep file paths, migration names, internal agent/process details, and implementation jargon out of the top summary.

## Workflow

```
- [ ] Step 1: Preflight — fetch, align with origin/preview, resolve dirty tree (workflow artifacts or clean)
- [ ] Step 2: Run changelog-version-curator subagent
- [ ] Step 3: Commit and push release metadata (if changed)
- [ ] Step 4: Run scoped Vitest on changed test files only
- [ ] Step 5: Capture release visual evidence (local stack)
- [ ] Step 6: Open or update preview → main release PR (body includes evidence)
- [ ] Step 7: Publish visual evidence comment on the PR
- [ ] Step 8: Babysit until merge-ready (CI, Qodo, CodeQL/GHAS, threads)
- [ ] Step 9: Report merge-ready handoff in chat
```

---

## Step 1: Preflight

Run from the repo root.

```powershell
git fetch origin preview main --tags
```

### 1a. Ensure on `preview` and aligned with `origin/preview`

```powershell
git branch --show-current
git rev-parse HEAD
git rev-parse origin/preview
```

#### 1a-preflight. Dirty tree before switching or fast-forward

Before `git switch preview` or `git merge --ff-only origin/preview`, inspect the working tree:

```powershell
git status --porcelain
```

If output is non-empty, classify dirt per `.cursor/rules/workflow-artifacts.mdc`:

- **Workflow-artifact-only dirt** (`AGENTS.md`, `.cursor/**`, `scripts/mcp.template.json`): path-stash only those files, including untracked workflow artifacts, so switching/alignment can proceed. Example:

  ```powershell
  git stash push -u -m "release: workflow artifacts preflight" -- AGENTS.md .cursor scripts/mcp.template.json
  git stash list -n 1
  ```

  Confirm the newest stash entry contains `release: workflow artifacts preflight` before switching or fast-forwarding. If no matching entry was created, **stop** and inspect the working tree before continuing.

- **Product dirt** (`src/**`, `supabase/**`, etc.): **stop**. Tell the user to commit, stash, or discard manually, then re-run `/release`.

- **Mixed dirt**: **stop**. Resolve product dirt manually first; do not auto-stash product paths.

If the tree is clean, or workflow-only dirt was stashed successfully, continue below.

If not on `preview`:

```powershell
git switch preview
```

Compare local `preview` to `origin/preview`:

```powershell
git log --oneline origin/preview..HEAD
git log --oneline HEAD..origin/preview
```

- If local is **behind** `origin/preview`, fast-forward (tree must be clean or workflow-only dirt already stashed):

  ```powershell
  git merge --ff-only origin/preview
  ```

- If local is **ahead** of `origin/preview` (unpushed commits exist), **stop**. Report the unpushed commits and ask the user to push or reconcile before releasing.

- If local and remote **diverged**, **stop**. Do not reset or force-push.

If workflow-only dirt was stashed in the preflight above, restore it now before Step 1b. First confirm the newest stash entry is the expected release preflight stash:

```powershell
git stash list -n 1
git stash pop
git status --porcelain
```

If `git stash pop` exits non-zero, reports conflicts, or `git status --porcelain` shows conflicted paths, **stop**. Ask the user to resolve the stash conflict manually before continuing `/release`; do not proceed to Step 1b while the repository is conflicted.

After alignment, confirm:

```powershell
git rev-parse HEAD
git rev-parse origin/preview
```

These SHAs should match before continuing.

### 1b. Dirty working tree gate

Run only after Step 1a confirms `preview` is checked out.

```powershell
git status --porcelain
```

If output is non-empty:

1. **Workflow-artifact-only dirt** (`AGENTS.md`, `.cursor/**`, `scripts/mcp.template.json` per `.cursor/rules/workflow-artifacts.mdc`): on `preview`, commit with `chore(cursor): sync workflow artifacts`, push to `origin/preview`, then continue `/release`.
2. **Product dirt** (`src/**`, `supabase/**`, etc.): **stop**. Tell the user to commit, stash, or discard manually, then re-run `/release`.
3. **Mixed dirt**: commit workflow artifacts first (step 1), then **stop** until product dirt is resolved.

### 1c. Capture release baseline

Record for later steps:

```powershell
git show origin/main:package.json
git log --oneline origin/main..origin/preview
git diff --name-status origin/main...origin/preview
```

---

## Step 2: Run changelog-version-curator

Launch the repo subagent defined in [`.cursor/agents/changelog-version-curator.md`](../../agents/changelog-version-curator.md).

**Task prompt for the subagent:**

> Curate the next EquipQR release from `origin/main` as baseline. Update `CHANGELOG.md`, `package.json`, `package-lock.json`, and the README version badge as needed. Determine patch vs minor from unreleased work on `origin/preview` relative to `origin/main`. Do not commit or push — the parent `/release` command handles git operations.

When the subagent returns:

1. Inspect `git diff -- CHANGELOG.md package.json package-lock.json README.md`.
2. If **no changes**, note a metadata no-op and continue.
3. If **changes exist**, validate version alignment:

   ```powershell
   node -e "const p=require('./package.json'); const l=require('./package-lock.json'); if (p.version !== l.version || p.version !== l.packages[''].version) { throw new Error('version mismatch') } console.log(p.version)"
   ```

4. If validation fails, **stop** and report the mismatch.

Record the selected release version (e.g. `3.9.0`) for commit message and PR title.

**CRLF note:** `CHANGELOG.md` may be CRLF on disk. If direct text tools fail, use PowerShell-safe editing; avoid double-quoted here-strings that expand `$` tokens.

---

## Step 3: Commit and push release metadata (if changed)

If Step 2 produced changes, stage only release metadata files:

```powershell
git add CHANGELOG.md package.json package-lock.json README.md
git status --short
```

Commit (replace version):

```powershell
@"
chore(release): prepare vX.Y.Z for production

- Finalize CHANGELOG release section
- Align package.json and package-lock.json version
- Update README version badge when needed
"@ | Set-Content -Path ".git/COMMIT_MSG" -Encoding utf8
git commit -F ".git/COMMIT_MSG"
Remove-Item ".git/COMMIT_MSG"
```

Push to preview:

```powershell
git push origin preview
```

Confirm remote is current:

```powershell
git fetch origin preview
git rev-parse HEAD
git rev-parse origin/preview
```

If SHAs differ after push, **stop**.

---

## Step 4: Scoped Vitest (changed test files only)

Identify updated or added test files in the release diff:

```powershell
git fetch origin preview main
$testFiles = git diff --name-only --diff-filter=AM origin/main...origin/preview |
  Where-Object { $_ -match '\.(test|spec)\.(tsx?)$' -and $_ -notmatch '^e2e/' }
$testFiles
```

Exclude `e2e/*.spec.ts` (Playwright) from Vitest batches. Run Deno edge tests separately when present:

```powershell
$denoTests = git diff --name-only --diff-filter=AM origin/main...origin/preview |
  Where-Object { $_ -match '\.deno\.test\.ts$' }
$denoTests
```

### 4a. When Vitest files exist

Run them through the repo test wrapper (pass each file as a separate argument — PowerShell array splatting to `npm test` does not work reliably on Windows):

```powershell
node scripts/test-runner.mjs "path/to/file.test.tsx" "path/to/other.test.ts"
```

If the path list is long, batch in groups of ~10 files. **All batches must pass.**

### 4b. When Deno test files exist

```powershell
deno test --no-check --allow-env <paths-from-$denoTests>
```

### 4c. When no test files changed

Record: `No updated or added test files in origin/main...origin/preview — scoped Vitest skipped.`

### 4d. On failure

**Stop.** Do not open the release PR. Report failing files and log tail.

---

## Step 5: Capture release visual evidence

Release PRs are product PRs. Visual evidence is **mandatory** per `.cursor/rules/pr-visual-evidence.mdc`.

### 5a. Ensure local stack is healthy

```powershell
.\dev-stop.bat
.\dev-start.bat
```

Use `.\dev-start.bat -Force` when migrations, seeds, or fixture drift may affect evidence capture.

### 5b. Choose evidence flows

Pick **1–3 headline customer-visible features** from the new `CHANGELOG.md` release section. Prefer existing specs under `e2e/pr-evidence/`:

| Release theme | Existing spec (if applicable) |
|---------------|------------------------------|
| Getting Started onboarding | `e2e/pr-evidence/getting-started-onboarding.spec.ts` |
| Product onboarding eligibility | `e2e/pr-evidence/product-onboarding-bypass.spec.ts` |
| Mobile work orders | `e2e/pr-evidence/mobile-work-order-details.spec.ts` |
| Google Workspace disconnect | `e2e/pr-evidence/google-workspace-disconnect-ux.spec.ts` |
| Accessibility | `e2e/pr-evidence/accessibility-audit.spec.ts` |
| Broad dashboard smoke | `e2e/pr-evidence/smoke-dashboard.spec.ts` (fallback only) |

Author a new `e2e/pr-evidence/<feature>.spec.ts` when no existing spec covers a headline release feature.

### 5c. Capture each flow

```powershell
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "<short-slug>" `
  -Spec "e2e/pr-evidence/<feature>.spec.ts"
```

Record each `tmp/pr-evidence/<slug>/evidence-markdown.md` path for Step 6.

If capture fails, **stop before opening the PR** — fix the spec or stack; do not open a release PR without evidence.

---

## Step 6: Open or update preview → main release PR

### 6a. Check for an existing release PR

```powershell
gh pr list --base main --head preview --state open --json number,url,title
```

### 6b. Compose customer-facing PR body

Sources:

- New `CHANGELOG.md` release section for version `X.Y.Z`
- `git log origin/main..origin/preview` (outcomes, not internals)
- `git diff --name-status origin/main...origin/preview` (for your reasoning only — do not dump paths into the customer summary)
- Evidence markdown from Step 5 (`tmp/pr-evidence/<slug>/evidence-markdown.md`)

**Body structure** (write to a UTF-8 temp file, e.g. `$env:TEMP\equipqr-release-pr-body.md`):

```markdown
## Summary

<!-- 2-4 short paragraphs or bullets: what customers and field teams will notice.
     Examples: new workflows, faster screens, fixed bugs, improved reliability.
     No file paths, no migration names, no agent/process details. -->

## What's included

- <!-- customer-visible outcome -->
- <!-- customer-visible outcome -->

## Screenshots / Videos

<!-- Paste evidence-markdown.md content from Step 5 verbatim (screenshots + inline MP4 URL) -->

## Validation

- Release metadata curated via changelog-version-curator
- Scoped Vitest: <!-- list files run OR "no changed test files in this release" -->
- PR visual evidence captured on local stack
- Full CI will run on this PR (schema drift, build, tests, security)

## Release notes

See CHANGELOG `X.Y.Z` for the complete categorized list.

## Internal checklist

- [ ] Schema drift gate passes
- [ ] Production release readiness workflow passes after merge
- [ ] Manual Vercel production promotion when ready
```

### 6c. Create or update the PR

**Title pattern:** `Release vX.Y.Z` (use the version from Step 2/3).

If no open PR:

```powershell
gh pr create --base main --head preview --title "Release vX.Y.Z" --body-file "$env:TEMP\equipqr-release-pr-body.md"
```

If an open PR exists, refresh its body (preserve any footer links/badges if present):

```powershell
gh pr view <num> --json body -q .body | Set-Content -Path "$env:TEMP\equipqr-release-pr-existing-body.md" -Encoding utf8
# Merge new summary into body file, preserving footer content
gh pr edit <num> --title "Release vX.Y.Z" --body-file "$env:TEMP\equipqr-release-pr-body.md"
```

Capture the PR number and URL.

---

## Step 7: Publish visual evidence comment

After `gh pr create` or `gh pr edit`, publish evidence for **each** captured flow:

```powershell
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "<short-slug>" `
  -Spec "e2e/pr-evidence/<feature>.spec.ts" `
  -PrNumber <num> `
  -Publish
```

`-Publish` reuses artifacts in `tmp/pr-evidence/{flow}/` (no Playwright re-run). Pass `-Recapture` only when a fresh capture is needed.

Confirm screenshots **and** demo MP4 uploaded. Record the PR comment URL(s).

---

## Step 8: Babysit until merge-ready

**Do not hand off** until every exit criterion below passes. This step follows `.cursor/rules/pr-merge-ready-workflow.mdc` and mirrors `address-pr-feedback` triage — CI failures outrank review comments; every fix push restarts the loop.

### What happens on an open PR

| Actor | Behavior |
|-------|----------|
| **CI** | Re-runs from the beginning on every push to `preview` (or any head branch) while the PR is open against `preview` or `main`. Includes lint, tests, build, schema drift, CodeQL, and other security/quality gates. New findings may post as PR comments. |
| **Qodo** | Starts a code review when the PR opens; **re-triggers on every subsequent commit**. Review can take **up to ~10 minutes** depending on PR size. Qodo posts one top-level **change summary** comment and one top-level **code review** comment listing numbered findings. On later commits it **updates** the prior code review comment; addressed items show as **strikethrough**. |
| **CodeQL / GitHub Advanced Security** | May post security findings as PR comments. Resolves conversations automatically when the issue is fixed. |
| **github-copilot** | May post review comments. Does **not** auto-resolve — reply in-thread explaining how the issue was fixed to consider the conversation resolved. |

### Merge-ready exit criteria (all required)

| Gate | Verify |
|------|--------|
| PR visual evidence | Screenshots + MP4 in PR body; `-Publish` comment posted (Step 7) |
| CI green | `gh pr checks <num> --watch` — all required jobs pass on latest head SHA |
| Qodo complete | `Get-PrQodoFindings.ps1 -PullRequestNumber <num> -Json` → `reviewInProgress: false` |
| Qodo resolved | Same JSON → `openCount: 0` (action required, review recommended, **and** optional — all buckets) |
| Threads clear | `Get-PrFeedbackThreads.ps1 -PullRequestNumber <num> -Json` → zero unresolved non-outdated threads |
| Mergeable | `gh pr view <num> --json mergeable,mergeStateStatus` → mergeable |

### Babysit loop

Repeat until all exit criteria pass:

#### 8a — CI first

```powershell
gh pr checks <num> --watch
```

If red: fix on `preview` (or the PR head branch), Fallow + local verify, push, return to 8a. Address CodeQL/GHAS comments with code fixes when required.

#### 8b — Qodo

Poll after green CI on the latest push. Allow up to **10 minutes** for large release diffs:

```powershell
Start-Sleep -Seconds 90
.\scripts\pr-feedback\Get-PrQodoFindings.ps1 -PullRequestNumber <num> -Json
```

Wait until `reviewInProgress: false`, then until `openCount: 0`. Address **every** unstriked finding in all three buckets — not only "action required." Push fixes, re-watch CI (8a), re-poll Qodo.

#### 8c — Inline threads

```powershell
.\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -PullRequestNumber <num> -Json
```

- **Qodo / CodeQL / GHAS:** fix in code; wait for auto-resolve or strikethrough.
- **github-copilot:** post an in-thread reply stating how the issue was fixed (use `gh api` JSON input per `git-powershell.mdc`); then treat as resolved.
- Audit resolved threads for regressions from post-open commits.

#### 8d — Final snapshot

```powershell
.\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber <num> -Json
.\scripts\pr-feedback\Get-PrQodoFindings.ps1 -PullRequestNumber <num> -Json
.\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -PullRequestNumber <num> -Json
gh pr view <num> --json mergeable,mergeStateStatus,url
```

Post a merge-ready handoff comment on the PR citing CI run URL, Qodo parent comment URL with `openCount=0`, evidence links, and confirmation that all threads are clear.

---

## Step 9: Report merge-ready handoff in chat

Return a concise summary **only when Step 8 exit criteria are fully met**:

| Item | Value |
|------|-------|
| Release version | `X.Y.Z` |
| Metadata commit | SHA or "no-op" |
| Scoped tests | files run, or skipped |
| Visual evidence | capture command(s), spec path(s), `-Publish` comment URL(s) |
| CI | green — link to latest workflow run |
| Qodo | `reviewInProgress: false`, `openCount: 0` — parent comment URL |
| Threads | unresolved count `0` |
| Release PR | URL — **merge-ready** |

Remind the user: merge triggers production release readiness CI; production traffic still requires manual Vercel promotion.

---

## Stop Conditions (fail closed)

Stop without claiming merge-ready when any of these occur:

- Dirty working tree with unresolved product changes (workflow-artifact-only dirt should be committed in Step 1b after Step 1a confirms `preview`)
- Local `preview` diverged from or ahead of unpushed commits relative to `origin/preview`
- changelog-version-curator validation failure or version mismatch
- Push to `origin/preview` failed or remote not aligned after push
- Scoped Vitest failure
- Visual evidence capture or `-Publish` failure
- Unable to resolve the next release version
- CI red on latest head SHA after fixes exhausted
- Qodo `reviewInProgress: true` or `openCount > 0` after reasonable polling (escalate if Qodo never posts within 30 minutes after green CI)
- Unresolved non-outdated review threads (including `github-copilot` without a fix reply)
- PR not mergeable (`mergeable: false` or blocked merge state)
