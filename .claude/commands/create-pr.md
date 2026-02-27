Create a well-structured pull request. If on the `preview` branch, merge into `main`. Otherwise, merge the current branch into `preview`.

## Steps

### 1. Prepare Branch

- **Verify key files are current**:
  - Read `package.json` — confirm `version` field is correct
  - Check if `package-lock.json` has uncommitted changes
  - Read `README.md` — confirm version references, feature descriptions, and setup instructions are current
  - Read `CHANGELOG.md` — confirm the current version has a dated entry and comparison links are updated
- **Ensure all changes are committed** — `git status --short`; if uncommitted changes, ask the user
- **Verify branch is up to date with base**:
  - `git fetch origin`
  - `git log HEAD..origin/main --oneline` (or `HEAD..origin/preview`) to check for upstream commits
  - If behind, warn the user and suggest merging or rebasing
- **Push branch to remote** — `git push -u origin HEAD`

### 2. Gather Context

- **Check for existing PRs**: `gh pr list --state open --repo Columbia-Cloudworks-LLC/EquipQR`
- **Find related issues**: `gh issue list --state open --repo Columbia-Cloudworks-LLC/EquipQR`
- **Read the PR template**: `.github/pull_request_template.md`
- **Review the full diff**: `git log origin/main..HEAD --oneline` to understand ALL commits being included

### 3. Write PR Description

- Summarize changes — focus on "why" not just "what"
- Include context and motivation — link to issues
- List breaking changes (even if N/A, explicitly state it)
- Flag screenshot needs for UI changes: `<!-- TODO: Add before/after screenshots for UI changes -->`
- Use the PR template structure from `.github/pull_request_template.md`

### 4. Create and Finalize

- Create the PR: `gh pr create --title "<title>" --body "<body>" --base main --head preview`
- Add labels after creation: `gh pr edit <number> --add-label "enhancement"`
- Link related issues using `Fixes #N` or `Relates to #N` in the body

### 5. Post-Creation

- Return the PR URL to the user
- Summarize commit count, key features, and items needing manual attention (screenshots, reviewer assignment)

## Common Labels

| Label | When to use |
|---|---|
| `enhancement` | New features or improvements |
| `bug` | Bug fixes |
| `security` | Security fixes or hardening |
| `documentation` | Docs-only changes |
| `dependencies` | Dependency updates |

## Checklist

- [ ] `package.json` version is correct
- [ ] `package-lock.json` is in sync
- [ ] `README.md` is current
- [ ] `CHANGELOG.md` has a dated version entry with updated comparison links
- [ ] Working tree is clean
- [ ] Branch is up to date with base
- [ ] Branch is pushed to remote
- [ ] PR template was read and used
- [ ] All commits in the diff were reviewed
- [ ] Related issues were searched and linked
- [ ] Labels added after creation
- [ ] UI changes flagged for screenshots
