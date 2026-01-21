# Address GitHub PR Comments

## Context & constraints
- **Goal:** Resolve outstanding PR feedback for the current branch.
- **Tooling Rule:** You MUST use the available MCP tools (`user-github` server) to read and reply to comments.
- **Prohibition:** DO NOT use `gh` CLI commands or `git log` to find comments unless the MCP tools explicitly fail.

## Steps

1. **Identify the PR**
   - Check the current git branch name to infer the context.
   - Ask the user for the PR number if it is not provided in the chat and cannot be inferred. (Do NOT assume PR #42).

2. **Fetch Review Context**
   - Use the `pull_request_read` tool with `method: "get_review_comments"` to fetch unresolved threads.
   - Use `pull_request_read` with `method: "get_files"` to see the file scope.
   - Use `pull_request_read` with `method: "get_status"` to check CI health.

3. **Plan & Execute**
   - **Audit:** Group comments by file. Ignore "resolved" or "outdated" comments unless relevant.
   - **Plan:** specific code changes for each unresolved thread.
   - **Implement:** Apply fixes one by one. Run relevant tests after changes.

4. **Response Strategy**
   - Once fixes are applied, use `add_comment_to_pending_review` (or equivalent) to draft replies.
   - **Format:** "Fixed in [commit-hash]. [Brief explanation]."
   - Ask the user before submitting the final review/comments if you are unsure.

## Response Checklist
- [ ] Correct PR number identified.
- [ ] All UNRESOLVED comments listed and addressed.
- [ ] CI status checked.
- [ ] Code changes implemented.
- [ ] Replies drafted (but not sent without confirmation).
