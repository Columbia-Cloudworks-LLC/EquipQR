# Create PR

## Overview

Create a well-structured pull request with proper description, labels, and reviewers. The PR should merge the preview branch into the main branch. If we are not on the preview branch, then merge the current branch into the preview branch instead.

## Steps

1. **Prepare branch**
   - Ensure that /packages.json, /package-lock.json, /README.md and /CHANGELOG.md are up-to-date
   - Ensure all changes are committed
   - Push branch to remote
   - Verify branch is up to date with main

2. **Write PR description**
   - Summarize changes clearly
   - Include context and motivation
   - List any breaking changes
   - Add screenshots if UI changes

3. **Set up PR**
   - Use the GitHub MCP tools like `list_pull_requests` and `create_pull_request`
   - Create PR with descriptive title
   - Add appropriate labels
   - Link related issues using GitHub MCP tools like `list_issues` and `issue_read`

## PR Template

- [ ] Feature A
- [ ] Bug fix B
- [ ] Unit tests pass
- [ ] Manual testing completed
