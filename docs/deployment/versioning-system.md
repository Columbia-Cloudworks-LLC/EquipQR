# Versioning System

EquipQR uses a manual semantic versioning system that creates git tags through a GitHub Actions workflow.

## How It Works

### Version Format
- **Format**: `MAJOR.MINOR.PATCH` (e.g., `1.12.3`)
- **Tag Format**: `vMAJOR.MINOR.PATCH` (e.g., `v1.12.3`)

### Manual Versioning Workflow

Versions are created manually by maintainers through the **Manual Version Bump** GitHub Actions workflow:

1. **Trigger the workflow**:
   - Navigate to **Actions** → **Manual Version Bump** on GitHub
   - Click **Run workflow**
   - Select the branch (typically `main` or `preview`)

2. **Provide version details**:
   - **Version**: Enter version number without `v` prefix (e.g., `1.2.3`)
   - **Message**: Optional release message (defaults to "Release vX.Y.Z")

3. **Workflow execution**:
   - Validates version format (`X.Y.Z` with numbers only)
   - Checks if tag already exists (fails if duplicate)
   - Shows current version and suggested bumps in job summary
   - Updates `package.json` with new version
   - Commits: `chore: bump version to X.Y.Z`
   - Creates annotated git tag `vX.Y.Z`
   - Pushes commit and tag to repository
   - Creates GitHub Release with auto-generated notes

4. **Build integration**:
   - CI workflow fetches all tags
   - Derives current version from tags
   - Exposes as `VITE_APP_VERSION` environment variable
   - App displays version in footer

### Semantic Versioning Guidelines

- **Major** (X.0.0): Breaking changes, major new features
- **Minor** (X.Y.0): New features, backward-compatible changes
- **Patch** (X.Y.Z): Bug fixes, minor improvements

## Bootstrap
If no tags exist, the system starts from `v0.0.0`. Use the workflow to create the first version tag.

## Local Development
For local development, the version will show as `dev` if no `VITE_APP_VERSION` is set.

## Manual Tag Management

### Rollback a Version
If you need to undo a version:

```bash
# Delete tag locally and remotely
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z

# Delete GitHub Release via GitHub UI

# Revert package.json commit if needed
git revert <commit-sha>
git push origin <branch>
```

### Emergency Manual Tag Creation
If the workflow fails, you can create a tag manually:

```bash
# Update package.json
npm pkg set version=X.Y.Z

# Commit the change
git add package.json
git commit -m "chore: bump version to X.Y.Z"

# Create and push tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin HEAD
git push origin vX.Y.Z
```

Then create the GitHub Release manually through the UI.

## Troubleshooting

### Workflow fails with "Tag already exists"
- Check existing tags: `git tag -l "v*"`
- Choose a different version number or delete the existing tag if it was created in error

### Version not showing in deployed app
- Verify tag was pushed: Check repository tags on GitHub
- Check CI logs: Ensure tags were fetched during build
- Verify `VITE_APP_VERSION` was set during build

### Version in footer shows "dev"
- Expected in local development without `VITE_APP_VERSION` env var
- In production: Check that build derived version from tags

## Version Display
The version is displayed in the footer of all pages in the format: `© 2024 EquipQR v1.2.3 by COLUMBIA CLOUDWORKS LLC`

## Files Involved
- `.github/workflows/manual-version-bump.yml` - Manual version workflow
- `.github/workflows/ci.yml` - Version derivation during build (lines 303-344)
- `src/components/layout/LegalFooter.tsx` - Version display in UI
- `src/lib/version.ts` - Version constant with fallback chain
- `vite.config.ts` - Environment variable configuration
- `package.json` - Version field (updated by workflow)
- `scripts/get-version.sh` / `scripts/get-version.bat` - Utility scripts for local version derivation
