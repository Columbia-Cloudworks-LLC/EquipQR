---
name: github-pr-comments
description: Fetches GitHub PR review comments, categorizes them as resolved or unresolved, and helps systematically address unresolved comments. After fixing issues, comments on the PR with updates. Use when working on pull requests, addressing review feedback, or when the user mentions PR comments, review feedback, or fixing PR issues.
---

# GitHub PR Comments Manager

Fetches all review comments from a GitHub pull request, presents them organized by resolution status, and guides systematic resolution of unresolved comments.

## Workflow

### Step 1: Identify PR

1. Get current branch: `git branch --show-current`
2. Get repository info: `git remote -v`
3. Find matching PR using `mcp_github_list_pull_requests`:
   ```typescript
   mcp_github_list_pull_requests({
     owner: "<org-name>",
     repo: "<repo-name>",
     state: "open"
   })
   ```
4. If multiple PRs match, ask user for the PR number

### Step 2: Fetch Review Comments

Use `mcp_github_pull_request_read` to get all review threads:

```typescript
mcp_github_pull_request_read({
  owner: "<org-name>",
  repo: "<repo-name>",
  pullNumber: <pr-number>,
  method: "get_review_comments",
  perPage: 100
})
```

### Step 3: Categorize Comments

Process the response and categorize each thread:

**Unresolved (Needs Action):**
- `IsResolved === false` AND `IsOutdated === false`
- These require immediate attention

**Unresolved but Outdated:**
- `IsResolved === false` AND `IsOutdated === true`
- Code may have changed; verify if still relevant

**Resolved:**
- `IsResolved === true`
- No action needed

### Step 4: Present Summary

Display comments in this format:

```markdown
# PR Review Comments Summary

## Unresolved Comments (X)
[Priority: HIGH/MEDIUM/LOW]

### File: path/to/file.ts (Line 123)
- **Author:** @reviewer-name
- **Comment:** The comment text...
- **Status:** Needs action
- **Priority:** HIGH (security issue)

### File: path/to/file.tsx (Line 45)
- **Author:** @reviewer-name
- **Comment:** The comment text...
- **Status:** Needs action
- **Priority:** MEDIUM (code quality)

## Unresolved but Outdated (Y)
[Verify if still relevant after code changes]

### File: path/to/file.ts (Line 200)
- **Author:** @reviewer-name
- **Comment:** The comment text...
- **Status:** Outdated - verify relevance

## Resolved Comments (Z)
[No action needed]

[Brief summary of resolved items]
```

### Step 5: Address Unresolved Comments

For each unresolved comment:

1. **Read the affected file** at the specified line
2. **Assess priority:**
   - HIGH: Security issues, breaking bugs, type errors
   - MEDIUM: Code quality, performance, maintainability
   - LOW: Documentation, style, minor suggestions
3. **Apply fix** following project standards:
   - Check `.cursor/rules/coding-standards.mdc` for UI/React changes
   - Check `.cursor/rules/supabase-migrations.mdc` for DB changes
   - Ensure shadcn/ui patterns for style changes
4. **Verify fix:**
   - Run `npm run typecheck`
   - Run `npm run lint`
   - Run `npm test` (if applicable)

### Step 6: Commit and Push

After all fixes are applied:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "fix: address review comments for PR #<number>"
   ```

2. **Push to branch:**
   ```bash
   git push
   ```

### Step 7: Comment on PR

After pushing, add a comment to the PR summarizing the fixes:

```typescript
mcp_github_add_issue_comment({
  owner: "<org-name>",
  repo: "<repo-name>",
  issue_number: <pr-number>,
  body: `## Fixed Review Comments

Addressed all unresolved review comments in commit <sha>.

### Changes Made:
- [File 1]: Fixed [issue description]
- [File 2]: Fixed [issue description]
- [File 3]: Fixed [issue description]

All fixes have been verified with typecheck and lint.`
})
```

## Comment Response Template

Use this template for PR comments:

```markdown
## Fixed Review Comments

Addressed all unresolved review comments in commit [commit-sha].

### Changes Made:
- **[File path] (Line X)**: [Brief description of fix]
- **[File path] (Line Y)**: [Brief description of fix]

### Verification:
- ✅ Typecheck passed
- ✅ Lint passed
- ✅ Tests passed (if applicable)
```

## Priority Guidelines

| Priority | Criteria | Examples |
|----------|----------|----------|
| **HIGH** | Security, breaking bugs, type errors | SQL injection, XSS, const assignment errors |
| **MEDIUM** | Code quality, performance | Unused variables, redundant code, performance issues |
| **LOW** | Documentation, style | Missing comments, formatting, naming suggestions |

## Implementation Order

Address comments in this order:
1. HIGH priority (security, breaking issues)
2. MEDIUM priority (code quality)
3. LOW priority (documentation, style)

## Quick Reference

| IsResolved | IsOutdated | Status | Action |
|------------|------------|--------|--------|
| `false` | `false` | **Needs Action** | Must address |
| `false` | `true` | Outdated | Verify if still relevant |
| `true` | `false` | Resolved | No action needed |
| `true` | `true` | Resolved + Outdated | No action needed |
