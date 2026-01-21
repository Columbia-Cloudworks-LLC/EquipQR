---
description: "Workflow to resolve PR feedback using GitHub MCP tools and project standards."
triggers: ["/fix-pr", "/pr-comments"]
---

# Address GitHub PR Comments

**Goal:** Resolve outstanding PR feedback for the current branch efficiently and safely.
**Constraint:** Use **GitHub MCP Tools** exclusively for PR interaction. Do NOT hallucinate `gh` CLI commands.

## Steps

1. **Identify Context**
   - **Branch Check:** Run `git branch --show-current` to confirm the active feature branch.
   - **PR Lookup:**
     - Use `mcp_github_list_pull_requests` (state: "OPEN") to find the PR matching this branch.
     - *If ambiguous:* Ask user for the specific PR number.

2. **Fetch & Triage**
   - **Get Comments:** Use `mcp_github_pull_request_read` with `method: "get_review_comments"`.
   - **Get Files:** Use `mcp_github_pull_request_read` with `method: "get_files"` to scope the work.
   - **Triage:** Filter for **UNRESOLVED** threads only. Group them by file.

3. **Plan & Implement**
   - **Standards Check:** Before fixing, review:
     - `.cursor/rules/coding-standards.mdc` (if UI/React related).
     - `.cursor/rules/supabase-migrations.mdc` (if DB related).
   - **Execution:**
     - Apply fixes file-by-file.
     - *Crucial:* If a comment requests a style change, ensure it matches `shadcn/ui` patterns.

4. **Verify (Strict)**
   - **Local Check:**
     - Run `npm run typecheck` (Frontend).
     - Run `npm test` (Unit tests).
     - Run `/supabase-audit` (if DB schema changed).
   - **CI Health:** Use `mcp_github_pull_request_read` (method: "get_status") to ensure the *current* build isn't already broken.

5. **Response Strategy**
   - **Commit:** `git commit -am "fix: address review comments for PR #<number>"`
   - **Reply:** Use `mcp_github_add_pull_request_review_comment` (or general comment).
     - *Template:* "Fixed in [commit-hash]. [Brief explanation]."
   - **Validation:** Ask user: "Draft replies prepared. Ready to push and submit?"

## MCP Tool Reference

### Fetch PR Context
```typescript
mcp_github_list_pull_requests({
  owner: "columbia-cloudworks-llc",
  repo: "EquipQR-preview",
  state: "OPEN"
})

```

### Fetch Comments

```typescript
mcp_github_pull_request_read({
  owner: "...",
  repo: "...",
  pull_number: 123,
  method: "get_review_comments"
})

```

### Reply to Review

```typescript
// For a general PR comment
mcp_github_add_issue_comment({
  owner: "...",
  repo: "...",
  issue_number: 123, // PRs are issues in API
  body: "Addressed all comments in commit..."
})

```

## Completion Checklist

* [ ] PR identified & matching branch confirmed.
* [ ] Unresolved comments extracted via MCP.
* [ ] Fixes applied following `.cursor/rules`.
* [ ] `npm run typecheck` passed.
* [ ] Changes committed.
* [ ] User confirmation obtained before pushing.
