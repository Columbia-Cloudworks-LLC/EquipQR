# Address GitHub Issue

## Overview

Discover, analyze, and resolve GitHub issues using GitHub MCP tools. This workflow guides you through identifying specific issues, understanding their context, implementing fixes, and providing updates.

## Steps

1. **Discover and identify the issue**
   - Use the `mcp_github_get_me` tool to get repository owner information if needed
   - Use the `mcp_github_list_issues` tool to list issues in the repository
     - Required parameters: `owner` (repository owner), `repo` (repository name)
     - Optional filters: `state` (OPEN/CLOSED), `labels` (array of label names), `orderBy` (CREATED_AT/UPDATED_AT/COMMENTS), `direction` (ASC/DESC), `perPage` (1-100)
     - For pagination: use the `after` parameter with `endCursor` from previous response's `pageInfo`
   - Filter results to identify the specific issue(s) to address

2. **Analyze the issue**
   - Use `mcp_github_issue_read` with `method: "get"` to retrieve full issue details
     - Required: `owner`, `repo`, `issue_number`, `method: "get"`
   - Use `mcp_github_issue_read` with `method: "get_comments"` to read all comments
     - Required: `owner`, `repo`, `issue_number`, `method: "get_comments"`
     - Optional: `page`, `perPage` for pagination
   - Use `mcp_github_issue_read` with `method: "get_labels"` to see assigned labels
     - Required: `owner`, `repo`, `issue_number`, `method: "get_labels"`
   - Use `mcp_github_issue_read` with `method: "get_sub_issues"` to check for sub-issues if applicable
   - Review issue description, comments, labels, and any linked code/files to understand the problem

3. **Plan the resolution**
   - Break down the issue into actionable tasks
   - Identify dependencies, blockers, or clarification needs
   - Determine if code changes, documentation updates, or configuration changes are required
   - Note any related files or components that need modification

4. **Implement fixes**
   - Make necessary code changes, following project standards
   - Run relevant tests and linters to verify fixes
   - Create commits with clear messages referencing the issue (e.g., "Fix #123: resolve authentication bug")
   - Ensure changes address the root cause, not just symptoms

5. **Respond and update the issue**
   - Use `mcp_github_add_issue_comment` to provide updates on progress
     - Required: `owner`, `repo`, `issue_number`, `body` (comment content)
     - Explain what was changed, why, and how to verify the fix
     - Link to relevant commits or code sections when helpful
   - Use `mcp_github_issue_write` with `method: "update"` to modify issue state or metadata
     - Required: `method: "update"`, `owner`, `repo`, `issue_number`
     - Optional: `state: "closed"` with `state_reason: "completed"` when issue is resolved
     - Optional: `labels` to add/update labels (e.g., "fixed", "verified")
     - Optional: `assignees` to assign the issue to team members
   - If the issue requires follow-up, clearly document what remains

## MCP Tool Reference

### Discover Issues

```typescript
// List open issues
mcp_github_list_issues({
  owner: "organization-or-username",
  repo: "repository-name",
  state: "OPEN",
  orderBy: "UPDATED_AT",
  direction: "DESC",
  perPage: 50
})

// List issues with specific labels
mcp_github_list_issues({
  owner: "organization-or-username",
  repo: "repository-name",
  state: "OPEN",
  labels: ["bug", "priority-high"],
  orderBy: "CREATED_AT",
  direction: "ASC"
})
```

### Read Issue Details

```typescript
// Get issue details
mcp_github_issue_read({
  method: "get",
  owner: "organization-or-username",
  repo: "repository-name",
  issue_number: 123
})

// Get issue comments
mcp_github_issue_read({
  method: "get_comments",
  owner: "organization-or-username",
  repo: "repository-name",
  issue_number: 123,
  page: 1,
  perPage: 100
})

// Get issue labels
mcp_github_issue_read({
  method: "get_labels",
  owner: "organization-or-username",
  repo: "repository-name",
  issue_number: 123
})
```

### Update Issue

```typescript
// Add a comment
mcp_github_add_issue_comment({
  owner: "organization-or-username",
  repo: "repository-name",
  issue_number: 123,
  body: "Fixed in commit abc123. The issue was caused by..."
})

// Close issue as completed
mcp_github_issue_write({
  method: "update",
  owner: "organization-or-username",
  repo: "repository-name",
  issue_number: 123,
  state: "closed",
  state_reason: "completed",
  labels: ["fixed", "verified"]
})
```

## Completion Checklist

- [ ] Issue identified using `list_issues` with appropriate filters
- [ ] Full issue details retrieved including description, comments, and labels
- [ ] Problem understood and root cause identified
- [ ] Fix implemented and tested (code changes, tests, linting)
- [ ] Commits created with clear messages referencing the issue
- [ ] Progress update posted as issue comment using `add_issue_comment`
- [ ] Issue closed (if resolved) using `issue_write` with appropriate state and labels
- [ ] Any follow-up items documented in issue comments
