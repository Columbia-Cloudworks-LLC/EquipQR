# Create PR

## Overview

Create a well-structured pull request with proper description, labels, and reviewers. The PR should merge the preview branch into the main branch. If we are not on the preview branch, then merge the current branch into the preview branch instead.

## Steps

1. **Prepare branch**
   - Ensure that /package.json, /package-lock.json, /README.md and /CHANGELOG.md are up-to-date
   - Ensure all changes are committed
   - Push branch to remote
   - Verify branch is up to date with main

2. **Write PR description**
   - Summarize changes clearly
   - Include context and motivation
   - List any breaking changes
   - Add screenshots if UI changes

3. **Set up PR**
   - Use the GitHub MCP tools like `list_pull_requests` and `create_pull_request`
   - Create PR with descriptive title
   - Add appropriate labels
   - Link related issues using GitHub MCP tools like `list_issues` and `issue_read`

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

### Create the PR with full parameters

```typescript
CallMcpTool({ server: "user-github", toolName: "create_pull_request", arguments: {
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  title: "feat(equipment): Add status field to equipment model",
  head: "feature/equipment-status",  // current branch
  base: "preview",                    // or "main" if on preview branch
  body: "## Summary\n- Added status field...\n\n## Test Plan\n- [ ] Unit tests pass",
  draft: false,
  maintainer_can_modify: true
}})
```

## PR Template

- [ ] Feature A
- [ ] Bug fix B
- [ ] Unit tests pass
- [ ] Manual testing completed
