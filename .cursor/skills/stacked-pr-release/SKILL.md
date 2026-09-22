---
name: stacked-pr-release
description: >-
  Create a stacked pull request release as a dependency chain of separate
  branches and separate GitHub pull requests. Each later PR targets the branch
  below it; the bottom PR targets preview. Use when the user asks for a
  stacked PR, PR stack, stacked release, stacked pull requests, or multiple
  dependent pull requests. Do not use for one multi-commit PR, a /release
  preview-to-main promote, or independent fixes that do not depend on each
  other.
---

# Stacked pull request release

Canonical policy: [`docs/ops/stacked-pull-requests.md`](../../../docs/ops/stacked-pull-requests.md). If this skill and that document disagree, follow the document.

A **stacked PR**, **PR stack**, **stacked release**, or **stacked pull request release** is a chain of branches and pull requests. **Stacked commits** on one branch are not a stacked PR. An **aggregate PR** (many separable changes, one pull request) is not a stacked PR.

## Non-negotiable topology

```text
preview
  └─ fix/<layer-one>        → PR 1, base: preview
       └─ fix/<layer-two>   → PR 2, base: fix/<layer-one>
            └─ fix/<layer-three> → PR 3, base: fix/<layer-two>
```

- Bottom base is **`preview`**, not `main`. Production promote stays `/release`.
- Do not open every layer against `preview` or `main`.
- One branch per layer. A `cursor/<name>-<suffix>` session prefix does not collapse layers onto one branch.
- Do not invent a chain for independent work. Those are separate PRs onto `preview`.
- Do not split tightly coupled code just to raise the PR count.
- One layer may close several issues when they share one implementation. One issue may span several layers when the dependency boundary is real (schema, then domain, then UI).

## Workflow

```text
- [ ] 1. Dependency graph and layer list, before code
- [ ] 2. Detect gh stack; do not assume it exists
- [ ] 3. Bottom layer from origin/preview, verify, push, PR base preview
- [ ] 4. Each next layer from the parent branch, verify, push, PR base = parent
- [ ] 5. Confirm each GitHub diff is incremental
- [ ] 6. Descriptions include stack position, depends-on, and next
- [ ] 7. Merge bottom-up only after each layer is merge-ready
```

### 1. Define layers

Inspect the issues and code. Record, before editing:

- branch name and purpose per layer
- parent branch
- issues that layer will `Fixes` / `Closes`, versus `Relates to`
- tests that belong on that layer

Stop if the graph is one coherent change. Ship a normal single PR via `itil-issue-resolver` instead of a fake stack.

### 2. Detect tooling

```powershell
gh --version
gh extension list
gh stack --help
```

`gh stack` is the `github/gh-stack` extension, not a built-in command. Help text that only offers `gh extension install github/gh-stack` means it is **not** installed.

```powershell
gh extension install github/gh-stack
gh stack --help
```

If install fails, use the manual commands. Re-read `gh stack --help` before relying on a flag; the extension is public preview and flags change.

`gh stack init` defaults its trunk to `main`. Always pass `--base preview` for day-to-day stacks.

### 3. With `gh stack`

```powershell
git fetch origin preview
git switch preview
git merge --ff-only origin/preview
gh stack init --base preview fix/<layer-one>
# commit only layer one
gh stack add fix/<layer-two>
# commit only layer two
gh stack submit
```

Commit the current layer before `gh stack add`. `submit` pushes and opens pull requests whose bases are the parent branches, then links them as a GitHub stack.

### 4. Without `gh stack`

```powershell
git fetch origin preview
git switch -c fix/<layer-one> origin/preview
# verify and commit layer one only
git push -u origin HEAD
gh pr create --base preview --head fix/<layer-one> --title "<conventional title>" --body-file "$env:TEMP\pr-stack-1.md"

git switch -c fix/<layer-two>
# verify and commit layer two only
git push -u origin HEAD
gh pr create --base fix/<layer-one> --head fix/<layer-two> --title "<conventional title>" --body-file "$env:TEMP\pr-stack-2.md"
```

Use `--body-file` on Windows.

### 5. Verify each layer

Run the publish gate for **that layer** before its PR is treated as ready: Fallow, lint, type-check, targeted tests, build when relevant, local E2E, and PR visual evidence when that layer changes user-visible behavior. Follow `local-verify-before-preview-push.mdc`, `pr-ci-gate-before-open.mdc`, and `pr-visual-evidence.mdc`.

Later tests must not be the only proof an earlier layer works.

Each pushed branch gets its own Vercel Preview URL. Check that URL for that layer. `preview.equipqr.app` updates only after merge to git `preview`.

### 6. Describe the layer

Every body includes the block below. The GitHub pull request template has no Stack heading; paste the block in anyway. Omit it on pull requests that are not stack layers.

```text
Stack: 2 of 3

Depends on:
#123

Next:
#125
```

Update numbers once the pull requests exist. Closing keywords go on the layer that actually finishes the issue.

### 7. Restack and merge

If a lower layer changes, restack (`gh stack sync` / `gh stack rebase`, or rebase each child onto its parent). `git push --force-with-lease` is allowed on **unmerged stack branches only**. Never force-push `main` or `preview`.

Merge bottom-up with `gh pr merge <num> --merge` after that layer's CI and Supabase gates pass (`pr-merge-ready-workflow.mdc`). Then set the next PR base to `preview`, or use `gh stack merge <pr> --merge --yes` when help text still supports it and every included layer is merge-ready.

Confirm the next diff is still incremental after retarget.

## Do not

- Call a multi-issue or multi-commit pull request a stacked PR.
- Target `main` with the bottom layer of ordinary feature work.
- Put every issue's `Fixes` line on the bottom PR.
- Merge an upper layer first.
- Leave a published aggregate PR in place when this skill is the active request and splitting it is safe. If the work is already one published commit and rewriting it is risky, say so and apply this workflow to new work.
