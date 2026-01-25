---
description: "Fetch, triage, and address all unresolved GitHub PR review comments for the current branch"
triggers: ["/pr-comments", "/fix-pr-comments", "/address-review"]
---

# Address PR Comments

## Overview

Automatically fetch all review comments from the PR associated with the current branch, categorize them by resolution status, create todos for unresolved items, address each one, then commit, push, and leave a summary comment on the PR.

This command is **idempotent** — it can be run repeatedly on the same PR and will only create todos for comments that are still unresolved and not outdated.

## Prerequisites

- Current branch must have an open PR
- GitHub MCP server must be connected and authenticated
- Must have push access to the repository

## Workflow Steps

### Step 1: Identify the PR

Run these git commands to determine context:

```bash
# Get current branch name
git branch --show-current

# Get remote URL to extract owner/repo
git remote get-url origin
```

Parse the remote URL to extract `owner` and `repo`:
- HTTPS format: `https://github.com/{owner}/{repo}.git`
- SSH format: `git@github.com:{owner}/{repo}.git`

For this repository:
- **Owner**: `Columbia-Cloudworks-LLC`
- **Repo**: `EquipQR`

### Step 2: Find the Open PR

```typescript
CallMcpTool({
  server: "user-github",
  toolName: "list_pull_requests",
  arguments: {
    owner: "Columbia-Cloudworks-LLC",
    repo: "EquipQR",
    state: "open"
  }
})
```

Match the current branch to a PR's `head.ref` field. If multiple PRs match (rare), ask the user to specify which one.

### Step 3: Fetch Review Comments

```typescript
CallMcpTool({
  server: "user-github",
  toolName: "pull_request_read",
  arguments: {
    method: "get_review_comments",
    owner: "Columbia-Cloudworks-LLC",
    repo: "EquipQR",
    pullNumber: <pr-number>,
    perPage: 100
  }
})
```

**Response structure:**
```json
{
  "pageInfo": { "hasNextPage": false },
  "reviewThreads": [
    {
      "ID": "PRRT_xxx",
      "IsResolved": false,
      "IsOutdated": false,
      "IsCollapsed": false,
      "Comments": {
        "Nodes": [{
          "ID": "PRRC_xxx",
          "Body": "The comment text...",
          "Path": "src/file.ts",
          "Line": 42,
          "Author": { "Login": "reviewer-name" },
          "URL": "https://github.com/..."
        }],
        "TotalCount": 1
      }
    }
  ],
  "totalCount": 3
}
```

### Step 4: Categorize Comments

| IsResolved | IsOutdated | Status | Action |
|------------|------------|--------|--------|
| `false` | `false` | **Needs Action** | Create todo and address |
| `false` | `true` | Outdated | Skip — code has changed |
| `true` | `false` | Resolved | No action needed |
| `true` | `true` | Resolved + Outdated | No action needed |

### Step 5: Create Todos for Actionable Comments

For each comment where `IsResolved === false && IsOutdated === false`:

1. Create a todo item with:
   - **ID**: Use a sanitized version of the thread ID or comment URL
   - **Content**: `[{path}:{line}] {truncated_comment_body} ({url})`
   - **Status**: `pending`

Example todo list:
```
- [ ] [src/services/api.ts:57] Case-sensitive abort detection — consider normalizing to lowercase
- [ ] [src/services/api.ts:72] Signal check too broad — tighten to known cancellation indicators
- [ ] [src/services/api.ts:39] Missing unit tests for cancellation behavior
```

### Step 6: Address Each Todo

For each todo item:

1. **Read the file** at the specified path and line
2. **Understand the comment** — what change is requested?
3. **Apply the fix** following project standards (see `.cursor/rules/`)
4. **Mark todo complete**

### Step 7: Verify Changes

After addressing all comments, run verification:

```bash
npm run type-check && npm run lint
```

If tests are affected, also run:

```bash
npm test -- --related
```

### Step 8: Commit and Push

```bash
git add .
git commit -m "fix: address PR #<number> review comments

- <summary of change 1>
- <summary of change 2>
- ..."

git push
```

### Step 9: Post Summary Comment on PR

```typescript
CallMcpTool({
  server: "user-github",
  toolName: "add_issue_comment",
  arguments: {
    owner: "Columbia-Cloudworks-LLC",
    repo: "EquipQR",
    issue_number: <pr-number>,
    body: "## Addressed Review Comments\n\nAddressed outstanding review comments in commit <sha>.\n\n### Changes Made\n\n- **src/file.ts (line 42)**: <what was fixed>\n- ...\n\n### Verification\n\n- ✅ TypeScript type-check passed\n- ✅ ESLint passed\n- ✅ Tests passed\n\n---\n*Please re-review when ready.*"
  }
})
```

**Important**: Do NOT tag `@copilot` or request automated reviews in the comment. The user will manually trigger re-review when ready.

## Quick Reference

### MCP Tools Used

| Tool | Purpose |
|------|---------|
| `list_pull_requests` | Find PR for current branch |
| `pull_request_read` (method: `get_review_comments`) | Get all review threads |
| `add_issue_comment` | Post summary comment after fixes |

### Git Commands Used

| Command | Purpose |
|---------|---------|
| `git branch --show-current` | Get current branch name |
| `git remote get-url origin` | Get owner/repo from URL |
| `git add . && git commit -m "..."` | Commit changes |
| `git push` | Push to remote |

### Verification Commands

| Command | Purpose |
|---------|---------|
| `npm run type-check` | TypeScript validation |
| `npm run lint` | ESLint validation |
| `npm test -- --related` | Run affected tests |

## Complete Example Execution

```
1. git branch --show-current
   → fix/522-part-lookup-api-errors

2. list_pull_requests(state: "open")
   → Found PR #523 with head.ref = "fix/522-part-lookup-api-errors"

3. pull_request_read(method: "get_review_comments", pullNumber: 523)
   → 3 review threads:
     - Thread 1: IsResolved=false, IsOutdated=false → NEEDS ACTION
     - Thread 2: IsResolved=false, IsOutdated=false → NEEDS ACTION  
     - Thread 3: IsResolved=false, IsOutdated=false → NEEDS ACTION

4. Create todos:
   - [pending] src/features/inventory/services/partAlternatesService.ts:57 - lowercase abort detection
   - [pending] src/features/inventory/services/partAlternatesService.ts:72 - remove signal check
   - [pending] src/features/inventory/services/partAlternatesService.ts:39 - add unit tests

5. Address each todo:
   - Read file, apply fix, mark complete
   
6. npm run type-check && npm run lint
   → All passed

7. git add . && git commit -m "fix: address PR #523 review comments" && git push

8. add_issue_comment(issue_number: 523, body: "## Addressed Review Comments...")
```

## Troubleshooting

### No PR found for current branch

Ensure:
1. You're on a feature branch (not `main` or `preview`)
2. The branch has been pushed to remote
3. A PR exists and is in "open" state

### Pagination for large PRs

If `pageInfo.hasNextPage` is true, make additional calls using the `after` cursor:

```typescript
CallMcpTool({
  server: "user-github",
  toolName: "pull_request_read",
  arguments: {
    method: "get_review_comments",
    owner: "Columbia-Cloudworks-LLC",
    repo: "EquipQR",
    pullNumber: <pr-number>,
    perPage: 100,
    after: "<endCursor from previous response>"
  }
})
```

### Comments marked outdated

If a comment is outdated (`IsOutdated: true`), the code at that location has already changed. Review the comment to see if it's still relevant, but don't create a todo for it automatically.
