# Stacked pull requests

Canonical definition for a **PR stack**, **stacked pull requests**, and a **stacked pull request release** in EquipQR.

A request to create, prepare, or release a stacked PR means this topology. It does not mean one branch, one pull request, and many commits.

## Terms

| Term | Meaning |
|------|---------|
| **PR stack / stacked pull requests** | A dependency chain of separate Git branches and separate GitHub pull requests. |
| **Stack layer** | One branch and its corresponding pull request. |
| **Release stack** | The complete ordered chain. |
| **Aggregate PR / monolithic PR** | One pull request that contains several otherwise separable changes. |
| **Stacked commits** | Several commits on one branch. This is normal Git history. It is not a PR stack. |

Other uses of "stack" in this repository are different systems: the local dev stack (`dev-start`), the Cloud Agent ephemeral Supabase stack, and UI layout that stacks controls on a narrow screen.

## Topology

The bottom layer targets EquipQR's integration branch, **`preview`**. Every later layer targets the branch immediately below it.

```text
preview
  └─ fix/renderer-season-foundation     → PR 1, base: preview
       └─ fix/renderer-season-vegetation → PR 2, base: fix/renderer-season-foundation
            └─ fix/renderer-season-water → PR 3, base: fix/renderer-season-vegetation
```

Equivalent chain:

```text
preview ← PR 1 ← PR 2 ← PR 3
```

GitHub must show incremental diffs:

```text
PR 1: foundation only
PR 2: vegetation only
PR 3: water only
```

PR 2 must not appear as foundation plus vegetation. That happens when its base is `preview` (or `main`) instead of the foundation branch.

### Why the trunk is `preview`

Day-to-day integration is **`preview`**. Production is a later **`preview` → `main`** promote (`/release`). See [git-and-deploy.md](./git-and-deploy.md).

GitHub's generic stacked-PR examples use `main` as the trunk. In EquipQR, passing that default skips the integration train. For a feature or fix stack:

- Bottom PR base: **`preview`**
- Later PR bases: the parent stack branch
- Do not open every layer against `preview` or `main`

An emergency hotfix stack may target `main` only when [branching.mdc](../../.cursor/rules/branching.mdc) already allows a production hotfix. Back-merge or rebase `preview` afterward so the train does not diverge.

Branch names describe the layer (`fix/renderer-season-water`, `feat/invoice-date-review`). A session that must use a `cursor/<name>-<suffix>` prefix still creates **one branch per layer**. The prefix does not collapse the stack.

## What is not a stacked PR

- One pull request with many commits, even when each commit is a separate issue.
- One pull request whose body says "stacked from `preview`" or "part of release: &lt;date&gt;" while it contains several separable changes.
- A production `/release` promote (`preview` → `main`). That is one integration PR for an already-merged train, not a stack of implementation layers.
- Independent changes serialized into a fake chain. If two fixes do not depend on each other, open two pull requests that both target `preview`.
- A layer that exists only to increase pull-request count and does not have its own purpose.

Multiple commits on a stack branch are allowed. They are stacked commits inside one layer. Reviewers still need a separate pull request for the next layer.

## Unit of work

Create one layer per independently reviewable implementation unit, not one layer per GitHub issue.

A layer normally has:

- one coherent purpose
- a focused diff
- clear acceptance criteria
- tests appropriate to that layer
- its own verification
- a rollback boundary that does not require reverting unrelated work

Put several issues in the same layer when they are the same underlying change and splitting them would leave a broken intermediate state.

Split one issue across layers when it crosses a real dependency boundary, for example:

```text
schema / data model
  → backend / domain behavior
    → UI integration
      → polish or follow-up behavior
```

Use cohesion and dependencies, not issue count.

## Workflow

### 1. Analyze dependencies first

Before writing code, build the dependency graph:

- independent changes
- changes that depend on other changes
- changes that share a root cause
- migrations or infrastructure prerequisites
- backend / frontend order
- tests that later layers rely on

Build the smallest sensible stack. Independent groups become separate stacks, or separate pull requests onto `preview`, instead of one artificial chain.

### 2. Define the stack

Write down branch names, bases, and which issues each layer satisfies before implementation. Update the list with real pull-request numbers after they exist.

### 3. Implement the bottom layer

Create the first branch from `origin/preview`. Implement only that layer. Run that layer's verification. Commit. Push. Open the pull request with base **`preview`**.

### 4. Implement later layers

Create the next branch from the preceding stack branch, not from `preview` or `main`. Implement only that layer. Verify it. Push. Open the pull request with the preceding branch as its base.

Repeat until the stack is complete.

### 5. Keep diffs incremental

After each pull request exists, confirm GitHub's files changed are only that layer. If a later pull request shows earlier layers, its base is wrong. Fix the base; do not "solve" it by squashing the stack into one pull request.

### 6. Keep the stack synchronized

When an earlier layer changes during implementation or review:

- restack dependent branches (rebase or the stack tool's sync)
- resolve conflicts
- rerun verification for affected layers
- confirm each pull request still shows only its incremental diff

Do not leave the chain diverged. Never force-push `main` or `preview`. Force-with-lease is allowed on unmerged stack-layer branches after a restack.

### 7. Merge bottom-up

```text
PR 1, then PR 2, then PR 3
```

Merge a layer only when that layer meets the normal merge gate (local verify, CI, Supabase green or skipped, visual evidence when the layer changes user-visible behavior). See [pr-merge-ready-workflow.mdc](../../.cursor/rules/pr-merge-ready-workflow.mdc).

After a layer merges, point the next pull request at `preview` (the integration branch), or let supported stack tooling retarget it. Confirm GitHub does not duplicate commits or show the already-merged layer again.

Do not merge a downstream pull request before its parent. Do not squash the whole stack into one review before a human has reviewed the layers.

## GitHub tooling

Prefer GitHub's stacked pull request support when it is actually installed.

Check first. Do not assume a command exists:

```powershell
gh --version
gh extension list
gh stack --help
```

`gh stack` is the official `github/gh-stack` extension (public preview). It is not a built-in `gh` subcommand. `gh stack --help` on a machine without the extension only says the extension can be installed. Treat that as unavailable.

When install and auth succeed, install it and re-check help:

```powershell
gh extension install github/gh-stack
gh stack --help
```

If install fails, use the manual topology below. The branch and pull-request graph is the requirement. The command name is not.

### With `gh stack`

Always set the trunk. `gh stack init` otherwise defaults to the repository default branch (`main`).

```powershell
git fetch origin preview
git switch preview
git merge --ff-only origin/preview
gh stack init --base preview fix/renderer-season-foundation
# implement and commit only the foundation layer
gh stack add fix/renderer-season-vegetation
# implement and commit only the vegetation layer
gh stack submit
```

`gh stack add` creates the next branch at the current tip. Commit the current layer before adding the next one. Do not create every branch up front and then commit unrelated work onto the top branch.

Useful follow-ups, when `gh stack --help` still lists them:

| Command | Use |
|---------|-----|
| `gh stack view` | Confirm order, bases, and pull-request links |
| `gh stack submit` | Push branches, open or update pull requests, link the GitHub stack |
| `gh stack sync` / `gh stack rebase` | Restack after a lower layer changes |
| `gh stack merge <pr> --merge --yes` | Merge bottom-up through that layer, only when each included layer is merge-ready |

Flags move. If help text disagrees with this table, follow help text and keep the topology.

### Without `gh stack`

```powershell
git fetch origin preview
git switch -c fix/renderer-season-foundation origin/preview
# implement, verify, commit
git push -u origin HEAD
gh pr create --base preview --head fix/renderer-season-foundation --title "fix: season rendering foundation" --body-file "$env:TEMP\pr-stack-1.md"

git switch -c fix/renderer-season-vegetation
# implement, verify, commit
git push -u origin HEAD
gh pr create --base fix/renderer-season-foundation --head fix/renderer-season-vegetation --title "fix: season vegetation" --body-file "$env:TEMP\pr-stack-2.md"
```

On Windows, write multiline bodies to a file (`git-powershell.mdc`). After the pull requests exist, `gh stack link` can attach them to a GitHub stack if the extension becomes available later. Linking is optional. Correct bases are not.

## Issue linking

Each pull request names the issues that layer addresses.

Use `Fixes #123` or `Closes #123` only when merging **that** pull request should close the issue. Do not put every issue on the bottom pull request because the branches are related. Link an issue on the layer that meets its acceptance criteria.

Use `Relates to #123` when the layer is necessary but not sufficient.

## Testing and verification

Verify each layer before opening its pull request, at the depth in [local-verify-before-preview-push.mdc](../../.cursor/rules/local-verify-before-preview-push.mdc) and [pr-ci-gate-before-open.mdc](../../.cursor/rules/pr-ci-gate-before-open.mdc).

For every layer, as applicable:

- unit tests for that layer
- integration tests
- lint, type-check, and other static checks
- production build
- repository gates (Fallow before commit)
- acceptance criteria for that layer only

A later layer's tests must not be the only proof that an earlier layer works. The bottom branch has to be valid on its own unless the pull request explains why a documented dependency makes that impossible.

## Preview deployments

Vercel builds a commit-specific Preview URL for each pushed branch. Use **that** pull request's preview (and local verification) for that layer.

`preview.equipqr.app` tracks the git **`preview`** branch. It updates after a layer merges into `preview`. It is not evidence for unmerged upper layers.

Do not treat the top branch's preview as verification for every lower pull request unless a platform limit makes per-PR previews impossible. Say so in the affected pull request when that happens.

## Pull request descriptions

Each layer is reviewable on its own. Include:

- purpose of this layer
- issues this layer addresses, with closing keywords only when merge should resolve them
- dependency on the preceding pull request, if any
- position in the stack
- implementation notes a reviewer needs
- tests and manual checks run for this layer
- preview URL when one exists
- limitations or work intentionally left for a later layer

```text
Stack: 2 of 3

Depends on:
#123

Next:
#125
```

Fill real numbers after the pull requests exist. Update the neighbors so the chain is navigable from any layer. Omit the block when the pull request is not a stack layer.

## Completion

A stacked PR request is complete only when:

1. There is a separate branch per layer the dependency graph actually needs.
2. There is a separate pull request per layer.
3. The bottom pull request targets `preview` (or `main` only for an allowed hotfix stack).
4. Every later pull request targets the branch immediately below it.
5. Each pull request's diff is only that layer.
6. Each layer was verified on its own.
7. Issue linkage matches the layer that satisfies the issue.
8. Required previews were checked per layer, or the limitation is written in the pull request.
9. Stack position and dependencies are in the descriptions.
10. A reviewer can read bottom to top without opening one aggregate diff.

One pull request with many commits does not meet this list.

## Agent entry

Execute the stack with [.cursor/skills/stacked-pr-release/SKILL.md](../../.cursor/skills/stacked-pr-release/SKILL.md). This document is the source of truth if the skill and this page disagree.
