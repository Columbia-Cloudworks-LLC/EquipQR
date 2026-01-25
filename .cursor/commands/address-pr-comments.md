---
description: "Fetch, triage, and address all unresolved GitHub PR review comments for the current branch"
triggers: ["/pr-comments", "/fix-pr-comments", "/address-review"]
---

# Address PR Comments

## Overview

Automatically fetch all review comments from the PR associated with the current branch, categorize them by resolution status, create todos for unresolved items, delegate each todo to a subagent for parallel execution, wait for all fixes to complete, then commit, push, and leave a summary comment on the PR.

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

### Step 6: Delegate Each Todo to Subagents (Parallel Execution)

**CRITICAL**: Each todo must be delegated to a subagent to work on in parallel. Do NOT process todos sequentially.

**Implementation Strategy:**

1. **For each todo item**, create a separate subagent task that will work independently:
   - Each subagent receives one specific todo with all context:
     - File path and line number
     - Full comment text
     - Comment URL
     - Todo ID

2. **Invoke ALL subagents simultaneously** - Do not wait for one to complete before starting the next. Structure the delegation so all subagents begin working in parallel.

3. **Each subagent's task**:
   - Read the file at the specified path and line
   - Understand the comment — what change is requested?
   - Apply the fix following project standards (see `.cursor/rules/`)
   - Mark the todo complete when finished

4. **Wait for completion**: After all subagent invocations are made, monitor the todo list status. Only proceed to Step 7 when ALL todos have been marked as `completed`. Use the todo tracking system to verify completion status.

**How to delegate in Cursor:**

Use agent references to delegate work. For each todo, create an agent invocation like:

```
Invoke @code-reviewer with task:
"Address PR review comment for {path}:{line}
Comment: {comment_body}
URL: {url}
Todo ID: {todo_id}

Instructions:
1. Read {path} at line {line}
2. Understand the requested change: {comment_body}
3. Apply the fix following .cursor/rules/ standards
4. Mark todo {todo_id} as complete"
```

**Example of parallel delegation structure:**

When you have 3 todos, create 3 simultaneous agent invocations:

- Agent 1: `@code-reviewer` → Todo: `[src/services/api.ts:57] Case-sensitive abort detection`
- Agent 2: `@code-reviewer` → Todo: `[src/services/api.ts:72] Signal check too broad`  
- Agent 3: `@code-reviewer` → Todo: `[src/services/api.ts:39] Missing unit tests`

All three agents work concurrently, not sequentially.

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

5. Delegate each todo to subagents in parallel:
   - @code-reviewer: Address [src/features/inventory/services/partAlternatesService.ts:57] lowercase abort detection
   - @code-reviewer: Address [src/features/inventory/services/partAlternatesService.ts:72] remove signal check
   - @code-reviewer: Address [src/features/inventory/services/partAlternatesService.ts:39] add unit tests
   - Wait for all subagents to complete their fixes
   
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
