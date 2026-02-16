---
description: "Workflow to analyze, plan, and resolve GitHub issues using MCP tools"
triggers: ["/fix-issue", "/gh-issue"]
---

# Address GitHub Issue

## Overview

Discover, analyze, and resolve GitHub issues for the **EquipQR** project. This workflow enforces branch discipline, project standards (Supabase/React), and strict verification.

## Steps

1. **Discover & Identify**
   - Use `mcp_github_list_issues` to find OPEN issues.
     - *Parameters:* `owner`, `repo`, `state: "OPEN"`.
   - Filter by labels if provided (e.g., `bug`, `enhancement`).
   - *Output:* confirm the Issue Number and Title to work on.

2. **Analyze & Contextualize**
   - **Read Issue:** Use `mcp_github_issue_read` (method: "get") to get the description.
   - **Read Comments:** Use `mcp_github_issue_read` (method: "get_comments") to capture the latest discussion.
   - **Codebase Search:** Before planning, use codebase search to locate relevant files mentioned in the issue.
   - **Check Standards:** ALWAYS review `.cursor/rules/tech-stack.mdc` and `.cursor/rules/coding-standards.mdc` to ensure compliance.

3. **Plan & Branch**
   - **Create Branch:** Create a dedicated branch for this issue.
     - *Format:* `git checkout -b fix/{issue_number}-{short-description}` or `feat/{issue_number}-{short-description}`.
   - **Strategy:** Outline the changes required.
     - If DB changes are needed: Reference `.cursor/rules/supabase-migrations.mdc`.
     - If UI changes are needed: Reference `.cursor/rules/design-system.mdc`.

4. **Implement Fixes**
   - Apply code changes in the specific feature folder (`src/features/...`).
   - Ensure all new components use `shadcn/ui` (per Design System).
   - If modifying database: Create a migration file `YYYYMMDDHHMMSS_description.sql`.

5. **Verify (Strict)**
   - **Type Check:** Run `npm run typecheck` to ensure no TypeScript errors.
   - **Test:** Run `npm test` or specific test files related to the change.
   - **Lint:** Run `npm run lint` to ensure code style compliance.

6. **Commit & Respond**
   - **Commit:** Create a commit referencing the issue.
     - *Format:* `git commit -m "fix: #123 resolve authentication bug"`
   - **Update Issue:** Use `mcp_github_add_issue_comment` to post a summary.
     - *Content:* "Fix implemented in branch `[branch-name]`. Changes: [summary]. Verified via `npm test`."
   - **Close (Optional):** If the fix is merged or the user requests, use `mcp_github_issue_write` to close.

## MCP Tool Reference

### Discover

```typescript
mcp_github_list_issues({
  owner: "columbia-cloudworks-llc", // Default for this project
  repo: "EquipQR-preview",          // Default for this project
  state: "OPEN",
  perPage: 20
})

```

### Read

```typescript
mcp_github_issue_read({
  method: "get",
  owner: "...",
  repo: "...",
  issue_number: 123
})

```

### Update

```typescript
mcp_github_add_issue_comment({
  owner: "...",
  repo: "...",
  issue_number: 123,
  body: "Fix deployed to preview..."
})

```

## Completion Checklist

- [ ] Correct Issue selected and analyzed.
- [ ] **Feature Branch** created (not on main).
- [ ] Code changes follow `tech-stack` and `coding-standards`.
- [ ] `npm run typecheck` passed.
- [ ] Commit message includes Issue #.
- [ ] GitHub Comment posted with update.
