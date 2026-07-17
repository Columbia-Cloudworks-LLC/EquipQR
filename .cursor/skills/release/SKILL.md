---
name: release
description: >-
  Cut a production release via preview → main: align with origin/preview, run
  changelog-version-curator (bump only on promote), open a preview→main (or
  chore/release) PR, babysit until merge-ready (CI green, Qodo openCount=0).
  Merge triggers Production Release Readiness and vercel promote. Use when the
  user runs /release or asks to release, bump version, or ship to production.
disable-model-invocation: true
---

# Release

End-to-end workflow to cut a **production release** on the feat → preview → main train: align with `origin/preview`, curate release metadata (**version bump only on promote**), verify changed tests locally, open a **`preview` → `main`** PR (or `chore/release-v*` from the curated preview tip), and **babysit until merge-ready**.

Feature work merges to **`preview`** during normal development and accumulates CHANGELOG `[Unreleased]` **without** bumping `package.json`. `/release` is the **preview → main** promote that empties Unreleased, adds a versioned CHANGELOG section, and bumps package metadata.

**Opening the release PR is not handoff.** Merge to `main` triggers **Production Release Readiness** (migrations, schema drift, **`vercel promote`**).

## Mandatory Rules

- **Windows / PowerShell only.** Use `--body-file` for multiline PR bodies.
- **Never auto-discard local changes.** Resolve dirty trees per `.cursor/rules/workflow-artifacts.mdc`.
- **Never force-push to `main` or `preview`.** Release metadata merges via PR when bases are protected.
- **Never run the full Vitest suite.** Run only updated or added test files from the release diff (since last tag).
- **PR visual evidence** when the release diff includes user-visible UI changes since the last tag (per `.cursor/rules/pr-visual-evidence.mdc`).
- **No handoff until merge-ready** per `.cursor/rules/pr-merge-ready-workflow.mdc`.
- **PR summary is customer-facing.**
- **Feature work does not bump versions** — curator bumps only in this promote path.

## Workflow

```text
- [ ] Step 1: Preflight — fetch, align with origin/preview, resolve dirty tree
- [ ] Step 2: Run changelog-version-curator subagent (release/main mode)
- [ ] Step 3: Commit release metadata on chore/release-vX.Y.Z (from preview tip) or on preview
- [ ] Step 4: Run scoped Vitest on changed test files only
- [ ] Step 5: Capture visual evidence if UI changed since last tag
- [ ] Step 6: Push and open/update preview → main (or chore/release → main) PR
- [ ] Step 7: Publish visual evidence comment when captured
- [ ] Step 8: Babysit until merge-ready
- [ ] Step 9: Report merge-ready handoff
```

---

## Step 1: Preflight

```powershell
git fetch origin preview main --tags
git branch --show-current
git rev-parse HEAD
git rev-parse origin/preview
git status --porcelain
```

### Align with `origin/preview`

- If not on `preview` or `chore/release-v*`, switch after resolving dirty tree.
- If **behind** `origin/preview`: `git merge --ff-only origin/preview` (clean tree required).
- If **ahead** with unpushed non-release commits, **stop** and reconcile with the user.
- If **diverged**, **stop**.

Workflow-artifact-only dirt: commit on current branch per `.cursor/rules/workflow-artifacts.mdc` or path-stash before switching.

Record last tag:

```powershell
git describe --tags --abbrev=0 origin/main
```

---

## Step 2: Changelog-version-curator

Launch **changelog-version-curator** subagent with:

> Curate the next EquipQR release from `origin/preview` for a **promote to main** (release/main mode). Update `CHANGELOG.md`, `package.json`, `package-lock.json`, and the README version badge. Determine patch vs minor from commits on `origin/preview` since the last tag on `origin/main`. Empty `[Unreleased]` into a versioned section. Do not commit or push — the parent `/release` handles git.

Validate version consistency before continuing.

---

## Step 3: Commit release metadata

```powershell
git switch -c chore/release-vX.Y.Z origin/preview   # if not already on release branch / preview tip
# stage CHANGELOG.md package.json package-lock.json README badges only
git commit -m "chore(release): vX.Y.Z" -m "Fallow: exitCode=0, total_issues=0, clone_groups=0"
git push -u origin HEAD
```

If metadata did not change, **stop** — nothing to release.

---

## Step 4: Scoped Vitest

```powershell
$sinceTag = git describe --tags --abbrev=0 origin/main
$testFiles = git diff --name-only --diff-filter=AM "$sinceTag..HEAD" |
  Where-Object { $_ -match '\.(test|spec)\.(ts|tsx)$' }
if ($testFiles) { npx vitest run @testFiles }
```

Record skipped state when no test files changed.

---

## Step 5: Visual evidence (when UI changed)

If `git diff --name-status "$sinceTag..HEAD"` touches `src/**/*.tsx`, capture per `.cursor/rules/pr-visual-evidence.mdc`.

---

## Step 6: Open or update release PR

```powershell
# Prefer chore/release head when metadata lives on a release branch; otherwise --head preview
gh pr create --base main --head chore/release-vX.Y.Z --title "Release vX.Y.Z" --body-file "$env:TEMP\equipqr-release-pr-body.md"
# or: gh pr create --base main --head preview --title "Release vX.Y.Z" --body-file ...
# or gh pr edit when updating an existing release PR
```

Customer-facing summary: user-visible outcomes since last release — not file lists.

---

## Step 7: Publish evidence

```powershell
.\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow "<slug>" -Spec "e2e/pr-evidence/<feature>.spec.ts" -PrNumber <num> -Publish
```

Skip when Step 5 did not apply.

---

## Step 8: Babysit until merge-ready

Follow `.cursor/rules/pr-merge-ready-workflow.mdc` and `.cursor/skills/address-pr-feedback/SKILL.md`.

| Gate | Verify |
|------|--------|
| CI green | `gh pr checks <num> --watch` |
| Qodo | `Get-PrQodoFindings.ps1 -Json` → `reviewInProgress: false`, `openCount: 0` |
| Threads | `Get-PrFeedbackThreads.ps1 -Json` → zero unresolved non-outdated |
| Mergeable | `gh pr view <num> --json mergeable,mergeStateStatus` |

Fix on the release head branch, push, re-watch CI, re-poll Qodo.

---

## Step 9: Handoff

Report only when Step 8 passes:

| Item | Value |
|------|-------|
| Release version | `X.Y.Z` |
| Release PR | URL — merge-ready |
| CI / Qodo / threads | green / openCount=0 / clear |

Remind: merge to `main` triggers **Production Release Readiness** and automatic **`vercel promote`**. After merge, ensure `preview` stays aligned with the promoted tip (back-merge/rebase if the release head was a `chore/release-v*` branch).

---

## Stop Conditions

- Unresolved product dirty tree
- Local branch diverged from `origin/preview`
- changelog-version-curator validation failure
- Push failed
- Scoped Vitest failure
- Evidence capture failure when required
- CI red, Qodo open, or unresolved threads after reasonable polling
