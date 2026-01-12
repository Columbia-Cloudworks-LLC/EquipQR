# Address GitHub PR Comments

## Overview

Process outstanding reviewer feedback, apply required fixes, and draft clear
responses for each GitHub pull-request comment.

### Read PR Review Comments (with specific method)

```typescript
// Get review threads (logically grouped comments on code)
CallMcpTool({ server: "user-github", toolName: "pull_request_read", arguments: {
  method: "get_review_comments",  // Gets threads with isResolved, isOutdated metadata
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  pullNumber: 42,
  perPage: 50
}})

// Get files changed (to understand scope)
CallMcpTool({ server: "user-github", toolName: "pull_request_read", arguments: {
  method: "get_files",
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  pullNumber: 42
}})

// Get CI/check status
CallMcpTool({ server: "user-github", toolName: "pull_request_read", arguments: {
  method: "get_status",
  owner: "Columbia-Cloudworks-LLC",
  repo: "EquipQR",
  pullNumber: 42
}})
```

## Steps

1. **Sync and audit comments**
    - Use the GitHub MCP tools like `get_me`, `list_pull_requests`, and `pull_request_read` to view the PR conversations. The repository url is https://github.com/Columbia-Cloudworks-LLC/EquipQR
    - Open the PR conversation view and read every unresolved comment
    - Group comments by affected files or themes
2. **Plan resolutions**
    - List the requested code edits for each thread
    - Identify clarifications or additional context you must provide
    - Note any dependencies or blockers before implementing changes
3. **Implement fixes**
    - Apply targeted updates addressing one comment thread at a time
    - Run relevant tests or linters after impactful changes
    - Stage changes with commits that reference the addressed feedback
4. **Draft responses**
    - Summarize the action taken or reasoning provided for each comment
    - Link to commits or lines when clarification helps reviewers verify
    - Highlight any remaining questions or follow-up needs
    - Use the GitHub MCP tools like `add_comment_to_pending_review` and `add_issue_comment`.

## Response Checklist

- [ ] All reviewer comments acknowledged
- [ ] Required code changes implemented and tested
- [ ] Clarifying explanations prepared for nuanced threads
- [ ] Follow-up items documented or escalated
- [ ] PR status updated for reviewers
