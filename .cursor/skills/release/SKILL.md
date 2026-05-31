---
name: release
description: >-
  Prepare and open a production release PR from preview to main. Syncs to
  origin/preview, runs the changelog-version-curator subagent for release
  metadata, runs scoped Vitest on changed test files only, commits and pushes
  release metadata when needed, then opens a customer-facing preview → main PR.
  Use when the user runs /release or asks to release, promote to main, or open
  the preview → main release PR.
disable-model-invocation: true
---

# Release

End-to-end workflow to prepare EquipQR for production promotion: align with `origin/preview`, curate release metadata, verify changed tests locally, push release prep to `preview`, and open a **customer-facing** PR into `main`.

This is the explicit release gate. It does **not** auto-promote production traffic in Vercel — merging to `main` is the release candidate; the human promotes production manually.

## Mandatory Rules

- **Windows / PowerShell only.** No bash heredocs, no `&&`, no Unix-only utilities. Use `--body-file` for multiline PR bodies.
- **Never auto-discard local changes.** If `git status --porcelain` is non-empty, stop and report what is dirty. Do not run `git reset --hard` or `git clean`.
- **Never push to `main`.** The only git write on `main` is opening the PR (`preview` → `main`).
- **Never run the full Vitest suite.** Run only updated or added test files from the release diff.
- **Do not edit the plan file** if one is attached for this task.
- **PR summary is customer-facing.** Lead with user-visible outcomes, workflow improvements, fixes, and new capabilities. Keep file paths, migration names, internal agent/process details, and implementation jargon out of the top summary.

## Workflow

```
- [ ] Step 1: Preflight — fetch, clean tree, align with origin/preview
- [ ] Step 2: Run changelog-version-curator subagent
- [ ] Step 3: Commit and push release metadata (if changed)
- [ ] Step 4: Run scoped Vitest on changed test files only
- [ ] Step 5: Open or update preview → main release PR
- [ ] Step 6: Report results in chat
```

---

## Step 1: Preflight

Run from the repo root.

```powershell
git fetch origin preview main --tags
```

### 1a. Stop on dirty working tree

```powershell
git status --porcelain
```

If output is non-empty, **stop**. Tell the user to commit, stash, or discard changes manually, then re-run `/release`.

### 1b. Ensure on `preview` and aligned with `origin/preview`

```powershell
git branch --show-current
git rev-parse HEAD
git rev-parse origin/preview
```

If not on `preview`:

```powershell
git switch preview
```

Compare local `preview` to `origin/preview`:

```powershell
git log --oneline origin/preview..HEAD
git log --oneline HEAD..origin/preview
```

- If local is **behind** `origin/preview` and the tree is clean, fast-forward:

  ```powershell
  git merge --ff-only origin/preview
  ```

- If local is **ahead** of `origin/preview` (unpushed commits exist), **stop**. Report the unpushed commits and ask the user to push or reconcile before releasing.

- If local and remote **diverged**, **stop**. Do not reset or force-push.

After alignment, confirm:

```powershell
git rev-parse HEAD
git rev-parse origin/preview
```

These SHAs should match before continuing.

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

Record the selected release version (e.g. `3.7.0`) for commit message and PR title.

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
  Where-Object { $_ -match '\.(test|spec)\.(tsx?)$' }
$testFiles
```

### 4a. When test files exist

Run them through the repo test wrapper (not bare `npx vitest run`):

```powershell
npm test -- @($testFiles)
```

If the path list is long, batch in groups of ~10 files. **All batches must pass.**

### 4b. When no test files changed

Record: `No updated or added test files in origin/main...origin/preview — scoped Vitest skipped.`

### 4c. On failure

**Stop.** Do not open the release PR. Report failing files and log tail.

---

## Step 5: Open or update preview → main release PR

### 5a. Check for an existing release PR

```powershell
gh pr list --base main --head preview --state open --json number,url,title
```

### 5b. Compose customer-facing PR body

Sources:

- New `CHANGELOG.md` release section for version `X.Y.Z`
- `git log origin/main..origin/preview` (outcomes, not internals)
- `git diff --name-status origin/main...origin/preview` (for your reasoning only — do not dump paths into the customer summary)

**Body structure** (write to a UTF-8 temp file, e.g. `$env:TEMP\equipqr-release-pr-body.md`):

```markdown
## Summary

<!-- 2-4 short paragraphs or bullets: what customers and field teams will notice.
     Examples: new workflows, faster screens, fixed bugs, improved reliability.
     No file paths, no migration names, no agent/process details. -->

## What's included

- <!-- customer-visible outcome -->
- <!-- customer-visible outcome -->

## Validation

- Release metadata curated via changelog-version-curator
- Scoped Vitest: <!-- list files run OR "no changed test files in this release" -->
- Full CI will run on this PR (schema drift, build, tests, security)

## Release notes

See CHANGELOG `X.Y.Z` for the complete categorized list.

## Internal checklist

- [ ] Schema drift gate passes
- [ ] Production release readiness workflow passes after merge
- [ ] Manual Vercel production promotion when ready
```

### 5c. Create or update the PR

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

Capture the PR URL.

---

## Step 6: Report in chat

Return a concise summary:

| Item | Value |
|------|-------|
| Release version | `X.Y.Z` |
| Metadata commit | SHA or "no-op" |
| Scoped tests | files run, or skipped |
| Release PR | URL |

Remind the user: merge triggers CI/release readiness; production traffic still requires manual Vercel promotion.

---

## Stop Conditions (fail closed)

Stop without opening/updating the PR when any of these occur:

- Dirty working tree
- Local `preview` diverged from or ahead of unpushed commits relative to `origin/preview`
- changelog-version-curator validation failure or version mismatch
- Push to `origin/preview` failed or remote not aligned after push
- Scoped Vitest failure
- Unable to resolve the next release version
