# Address GitHub PR Comments

## Overview

Review all of the unresolved comments on the pull request. Use a cursor subagent to resolve each one. When all of the PR comments have been addressed locally, commit and push the changes.

## Steps

1. **Get Pull Request**
   - `git branch --show-current`
   - `git remote -v`
   - MCP Tools: `list_pull_request:github`, `pull_request_read:github`

2. **Prioritize Issues**
   - Determine if an issue has been addressed already or not
   - Note issues that were already addressed
   - For the remaining issues, sort them by priority using a table

3. **Launch Subagents**
   - For each issue, launch a seperate subagent to address it

4. **Test Changes**
   - Run all tests and fix any warnings, failures, or issues present.

5. **Commit & Push**
   - Once all of the issues have been addressed, commit the changes.
   - Once the changes have been commited, push the changes to the remote repository.

6. **Generate PR Comment**
   - Summarize the changes that were made.
   - Note any unresolved comments that were not addressed.
   - Post the comment containing the summary and the notes to the pull request.
