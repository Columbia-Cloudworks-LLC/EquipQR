# Address GitHub PR Comments

## Overview

Review all unresolved comments on the current branch's pull request. Categorize by source (human, Copilot, code scanning, bots), prioritize, fix, verify, commit, push, and post a summary comment.

**Skill reference:** `.cursor/skills/github-pr-comments/SKILL.md` contains the full workflow, inline templates, and code scanning alert guidance. Read it first.

## Steps

1. **Read Skill**
   - Read `.cursor/skills/github-pr-comments/SKILL.md` for the full workflow and templates.

2. **Get Pull Request**
   - `git branch --show-current`
   - `git remote -v`
   - MCP Tools: `list_pull_requests:github`, `pull_request_read:github`

3. **Categorize & Prioritize**
   - Fetch review threads via `pull_request_read` with `get_review_comments`
   - Categorize using the IsResolved/IsOutdated matrix from the skill
   - **Distinguish comment sources:** human reviewers, Copilot, `github-advanced-security` (code scanning), and third-party bots (e.g., `qodo-code-review`)
   - Code scanning alerts (`github-advanced-security`) persist until the scanner re-evaluates -- if `IsOutdated === true`, verify the code is already fixed before making changes
   - Present a prioritized summary table to the user (HIGH/MEDIUM/LOW per the resolution playbook)

4. **Address Issues**
   - For each unresolved + current issue: read the file, apply the fix
   - For each unresolved + outdated issue: read the file, verify if already fixed
   - Launch subagents for independent fixes when there are 3+ issues to parallelize

5. **Test Changes**
   - `npm run type-check` and `npm run lint` (run in parallel)
   - Fix any errors introduced by the changes

6. **Commit & Push**
   - Use PowerShell-safe syntax (no heredoc, no `$(...)` substitution)
   - Preferred: multiple `-m` flags for short messages
   - Alternative: temp file via `Set-Content` + `git commit -F` for complex messages
   - Push to the remote branch

7. **Generate PR Comment**
   - Use the inline template from the skill (Step 7)
   - Include tables for: Fixed, Verified Already Addressed, Not Addressed
   - Include verification results (type-check, lint)
   - Post via `add_issue_comment` MCP tool
