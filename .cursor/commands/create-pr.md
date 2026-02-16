# Create PR

## Overview

Create a well-structured pull request with proper description, labels, and reviewers. The PR should merge the preview branch into the main branch. If we are not on the preview branch, then merge the current branch into the preview branch instead.

## Steps

### 1. Prepare branch

- **Verify key files are current**:
  - Read `/package.json` — confirm `version` field is correct
  - Check if `package-lock.json` has uncommitted changes (it should be in sync with `package.json`)
  - Read `/README.md` — confirm version references, feature descriptions, and setup instructions are current
  - Read `/CHANGELOG.md` — confirm the current version has a dated entry (not `[Unreleased]`) and comparison links at the bottom are updated
- **Ensure all changes are committed** — run `git status --short` and confirm clean working tree. If there are uncommitted changes, ask the user before committing.
- **Verify branch is up to date with base**:
  - Run `git fetch origin` to get latest remote state
  - Run `git log HEAD..origin/main --oneline` (if merging to main) or `git log HEAD..origin/preview --oneline` (if merging to preview) to check for upstream commits
  - If behind, warn the user and suggest merging or rebasing before creating the PR
- **Push branch to remote** — run `git push -u origin HEAD`

### 2. Gather context

- **Check for existing PRs** — avoid duplicates by listing open PRs first
- **Find related issues** — search open issues with relevant labels to link in the PR body
- **Read the PR template** — always read `.github/pull_request_template.md` and use its structure for the PR body
- **Review the full diff** — run `git log origin/main..HEAD --oneline` (or the appropriate base) to understand ALL commits being included, not just the latest ones

### 3. Write PR description

- **Summarize changes clearly** — focus on the "why" not just the "what"
- **Include context and motivation** — link to issues, explain the problem being solved
- **List breaking changes** — even if N/A, explicitly state it
- **Flag screenshot needs** — if the PR includes UI changes (new components, layout changes, avatar/image displays, etc.), add a note in the PR body: `<!-- TODO: Add before/after screenshots for UI changes -->`
- **Use the PR template structure** — fill in all sections from `.github/pull_request_template.md`

### 4. Create and finalize the PR

- **Create the PR** using GitHub MCP tools with full parameters
- **Add labels after creation** — the `create_pull_request` tool does not accept labels, so use `issue_write` with `method: "update"` and the PR number to add labels (PRs are issues in GitHub's API). Choose from: `enhancement`, `bug`, `security`, `documentation`, `dependencies`, etc.
- **Link related issues** — use `Fixes #N` (auto-closes) or `Relates to #N` (reference only) syntax in the PR body

### 5. Post-creation verification

- **Return the PR URL** to the user so they can review
- **Summarize what was included** — list the commit count, key features, and any items that need manual attention (screenshots, reviewer assignment, etc.)

## MCP Tool Reference (Specific Parameters)

### Check for existing PRs first

```typescript
CallMcpTool({ server: "user-github", toolName: "list_pull_requests", arguments: {
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  state: "OPEN",
  perPage: 10
}})
```

### Get related issues to link

```typescript
CallMcpTool({ server: "user-github", toolName: "list_issues", arguments: {
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  state: "OPEN",
  labels: ["enhancement", "bug"],
  perPage: 20
}})
```

### Read the PR template

```typescript
Read({ path: ".github/pull_request_template.md" })
```

### Create the PR

```typescript
CallMcpTool({ server: "user-github", toolName: "create_pull_request", arguments: {
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  title: "feat(equipment): Add status field to equipment model",
  head: "preview",                    // current branch
  base: "main",                       // or "preview" if on a feature branch
  body: "## Summary\n...",            // Use PR template structure
  draft: false,
  maintainer_can_modify: true
}})
```

### Add labels after PR creation

```typescript
// PRs are issues in GitHub's API — use issue_write to add labels
CallMcpTool({ server: "user-github", toolName: "issue_write", arguments: {
  method: "update",
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  issue_number: 560,                  // PR number returned from create
  labels: ["enhancement", "security"] // Appropriate labels
}})
```

## Common Label Choices

| Label | When to use |
|---|---|
| `enhancement` | New features or improvements |
| `bug` | Bug fixes |
| `security` | Security fixes or hardening |
| `documentation` | Docs-only changes |
| `dependencies` | Dependency updates |

## Checklist (agent self-check before creating PR)

- [ ] `package.json` version is correct
- [ ] `package-lock.json` is in sync (no uncommitted changes)
- [ ] `README.md` is current (version refs, feature list)
- [ ] `CHANGELOG.md` has a dated version entry with updated comparison links
- [ ] Working tree is clean
- [ ] Branch is up to date with base (fetched and compared)
- [ ] Branch is pushed to remote
- [ ] PR template was read and used
- [ ] All commits in the diff were reviewed (not just the latest)
- [ ] Related issues were searched and linked
- [ ] Labels will be added after creation
- [ ] UI changes flagged for screenshots
