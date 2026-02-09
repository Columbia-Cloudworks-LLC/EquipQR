---
name: github-pr-comments
description: Fetches GitHub PR review comments, categorizes them, and guides resolution. Use when addressing PR review feedback.
---

# GitHub PR Comments Manager

Fetches review comments from a PR, categorizes by resolution status, and guides systematic fixes.

**Cursor Command:** Use `/address-github-pr-comments` for the full automated workflow.

**Alternative:** If MCP tools fail, use `scripts/` pipeline (requires `gh` CLI auth).

## Workflow

### Step 1: Identify PR

1. Get current branch: `git branch --show-current`
2. Get repository info: `git remote -v` (extract owner/repo from origin URL)
3. Find matching PR using GitHub MCP tool:
   ```typescript
   // MCP Tool Call
   CallMcpTool({
     server: "user-github",
     toolName: "list_pull_requests",
     arguments: {
       owner: "<org-name>",
       repo: "<repo-name>",
       state: "open"
     }
   })
   ```
4. Match the current branch to a PR's `head.ref` field
5. If multiple PRs match, ask user for the PR number

### Step 2: Fetch Review Comments

Use the GitHub MCP tool `pull_request_read` with method `get_review_comments` to get all review threads:

```typescript
// MCP Tool Call
CallMcpTool({
  server: "user-github",
  toolName: "pull_request_read",
  arguments: {
    owner: "<org-name>",
    repo: "<repo-name>",
    pullNumber: <pr-number>,
    method: "get_review_comments",
    perPage: 100
  }
})
```

The response includes `reviewThreads` with fields:
- `IsResolved`: boolean - whether the thread is resolved
- `IsOutdated`: boolean - whether the code has changed since the comment
- `Comments.Nodes[].Body`: the comment text
- `Comments.Nodes[].Author.Login`: the reviewer's username
- `Comments.Nodes[].Path`: the file path
- `Comments.Nodes[].Line`: the line number (may be null)

### Step 3: Categorize Comments

Process the response and categorize each thread into three buckets.

**Important:** Distinguish between comment sources -- they require different handling:

| Source | Identified by | Behavior |
|--------|---------------|----------|
| **Human reviewers** | `Author.Login` is a real user | Standard review comments |
| **Copilot / AI reviewers** | `Author.Login` is `copilot-pull-request-reviewer` or similar | Actionable suggestions, may have `suggestion` blocks |
| **Code scanning alerts** | `Author.Login` is `github-advanced-security` | Static analysis findings that persist until the scanner re-evaluates or they're manually dismissed on GitHub |
| **Third-party bots** | `Author.Login` is `qodo-code-review` or similar bot accounts | Automated findings, often with agent prompts -- treat like code scanning |

#### Category Matrix

| IsResolved | IsOutdated | Status | Action |
|------------|------------|--------|--------|
| `false` | `false` | **Needs Action** | Must address |
| `false` | `true` | Outdated | Verify if still relevant |
| `true` | `false` | Resolved | No action needed |
| `true` | `true` | Resolved + Outdated | No action needed |

#### Code Scanning Alerts — Special Handling

Code scanning alerts from `github-advanced-security` behave differently from human or Copilot review comments:

1. **They don't auto-resolve when code changes.** Even if you fix the underlying issue, the alert stays "unresolved" on the PR until the scanner re-runs against the new commit.
2. **`IsOutdated === true` usually means the code has already been fixed.** Read the current code to verify. If the fix is confirmed, note it as "verified already addressed" -- the scanner will re-evaluate on the next push.
3. **If the alert is still valid**, fix the code to satisfy the scanner's pattern expectations, not just the logical correctness. Static analyzers look for specific patterns (e.g., recursive loop-based HTML stripping vs. single-pass replace).
4. **Do not dismiss alerts manually** -- let the scanner re-evaluate after the fix is pushed.

### Step 4: Present Summary

Present the categorized comments to the user using this format:

```markdown
## PR Review Comments Summary

PR: <pull request URL>

### Unresolved Comments (<count>)

| # | File (Line) | Author | Issue | Priority |
|---|-------------|--------|-------|----------|
| 1 | `path/to/file.ts` (L42) | @reviewer | Brief description | HIGH/MED/LOW |

### Unresolved but Outdated (<count>)

| # | File | Author | Issue | Likely Status |
|---|------|--------|-------|---------------|
| 1 | `path/to/file.ts` | @github-advanced-security | Brief description | Verify if still relevant |

### Resolved (<count>) -- No action needed
```

**Priority assignment** (from [resolution playbook](references/equipqr-resolution-playbook.md)):
- **HIGH**: security issues, data correctness, broken UX, type errors
- **MEDIUM**: performance, maintainability, correctness in edge cases
- **LOW**: naming, formatting, minor refactors, documentation

### Step 5: Address Unresolved Comments

For each unresolved comment:

1. **Read the affected file** at the specified line
2. **Assess priority** and apply fixes per [equipqr-resolution-playbook.md](references/equipqr-resolution-playbook.md)
3. **Verify fix:** `npm run type-check` and `npm run lint` (run in parallel)
4. For **code scanning alerts**: verify the current code already handles the issue before making changes -- many outdated alerts are already resolved

### Step 6: Commit and Push

After all fixes are applied, commit using **PowerShell-safe syntax** (no heredoc):

```powershell
# For short messages -- use multiple -m flags
git add .
git commit -m "fix: address review comments for PR #<number>" -m "- Fix one" -m "- Fix two"
git push
```

```powershell
# For long/complex messages -- use a temp file
@"
fix: address review comments for PR #<number>

- Detailed description of fix one
- Detailed description of fix two
"@ | Set-Content -Path ".git/COMMIT_MSG" -Encoding utf8
git commit -F ".git/COMMIT_MSG"
Remove-Item ".git/COMMIT_MSG"
git push
```

**Never use bash heredoc syntax** (`<<'EOF'`) -- this workspace runs on Windows/PowerShell.

### Step 7: Comment on PR

After pushing, post a summary comment on the PR using this format:

```markdown
## Review Comments Addressed

Commit: <short SHA>

### Fixed (<count>)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Brief description of issue | `path/to/file.ts` | What was done to fix it |

### Verified Already Addressed (<count>, if any)

| # | Issue | File | Status |
|---|-------|------|--------|
| 1 | Brief description | `path/to/file.ts` | Already fixed -- <explanation> |

### Not Addressed (<count>, if any)

| # | Issue | File | Reason |
|---|-------|------|--------|
| 1 | Brief description | `path/to/file.ts` | Requires user decision / out of scope / etc. |

### Verification

- `npm run type-check` -- 0 errors
- `npm run lint` -- 0 errors
```

Post the comment using the GitHub MCP tool:

```typescript
CallMcpTool({
  server: "user-github",
  toolName: "add_issue_comment",
  arguments: {
    owner: "<org-name>",
    repo: "<repo-name>",
    issue_number: <pr-number>,
    body: "<rendered summary>"
  }
})
```
