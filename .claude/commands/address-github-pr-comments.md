Review all unresolved comments on the current branch's pull request. Categorize by source, prioritize, fix, verify, commit, push, and post a summary comment.

## Steps

1. **Get Pull Request**
   - Determine current branch: `git branch --show-current`
   - Find the PR: `gh pr view --json number,title,url,reviewDecision`
   - List review comments: `gh api repos/Columbia-Cloudworks-LLC/EquipQR/pulls/<number>/comments`

2. **Categorize & Prioritize**
   - Distinguish comment sources: human reviewers, Copilot, code scanning (`github-advanced-security`), third-party bots
   - Prioritize: HIGH (security, correctness) > MEDIUM (performance, patterns) > LOW (style, suggestions)
   - Present a prioritized summary table to the user

3. **Address Issues**
   - For each unresolved + current issue: read the file, apply the fix
   - For each unresolved + outdated issue: read the file, verify if already fixed

4. **Test Changes**
   - Run `npx tsc --noEmit` and `npm run lint` in parallel
   - Fix any errors introduced by the changes

5. **Commit & Push**
   - Use PowerShell-safe git syntax (no heredoc, no `$(...)` substitution)
   - Push to the remote branch

6. **Generate PR Comment**
   - Include tables for: Fixed, Verified Already Addressed, Not Addressed
   - Include verification results (type-check, lint)
   - Post via: `gh pr comment <number> --body "<summary>"`
