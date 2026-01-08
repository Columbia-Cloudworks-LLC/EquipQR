# Create PR

## Overview

Create a well-structured pull request with proper description, labels, and reviewers. The PR should merge the preview branch into the main branch. If we are not on the preview branch, then merge the current branch into the preview branch instead.

## Steps

1. **Prepare branch**
   - Ensure that packages, package-lock, README.md and CHANGELOG.md are up-to-date. If the appropriate major, minor, or revision number for this PR has not been incremented, so so first.
   - Ensure all changes are committed
   - Push branch to remote
   - Verify branch is up to date with main

2. **Write PR description**
   - Summarize changes clearly
   - Include context and motivation
   - List any breaking changes
   - Add screenshots if UI changes

3. **Set up PR**
   - Create PR with descriptive title
   - Add appropriate labels
   - Link related issues
   - GitHub Copilot will automatically review the new pull request upon creation, do not assign reviewers.
   - Use the GitHub MCP tools like `create_pull_request`.

## PR Template

- [ ] Feature A
- [ ] Bug fix B
- [ ] Unit tests pass
- [ ] Manual testing completed
