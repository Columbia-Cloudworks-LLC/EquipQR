# Versioning System

EquipQR uses an automated semantic versioning system where `package.json` is the single source of truth for the application version.

## How It Works

### Version Format
- **Format**: `MAJOR.MINOR.PATCH` (e.g., `1.12.3`)
- **Tag Format**: `vMAJOR.MINOR.PATCH` (e.g., `v1.12.3`)
- **Source of Truth**: the `version` field in `package.json`

### Automatic Version Tagging

The versioning system is fully automated:

1. **Update version in `package.json`**:
   - Edit `package.json` and change the `version` field (e.g., `"1.2.3"`)
   - Commit and push to the `main` branch

2. **Auto-tagging workflow**:
   - The `version-tag.yml` workflow automatically triggers on push to `main` when `package.json` changes
   - Reads version from `package.json`
   - Checks if tag `v{version}` already exists
   - If tag doesn't exist, creates annotated git tag `v{version}` and pushes it
   - If tag exists, skips creation (no-op)

3. **Build integration**:
   - CI workflows read version directly from `package.json`
   - Exposes as `VITE_APP_VERSION` environment variable during build
   - App displays version in footer

### Semantic Versioning Guidelines

- **Major** (X.0.0): Breaking changes, major new features
- **Minor** (X.Y.0): New features, backward-compatible changes
- **Patch** (X.Y.Z): Bug fixes, minor improvements

## Workflow

### To Release a New Version

1. Update `package.json` version field:
   ```json
   {
     "version": "1.2.3"
   }
   ```

2. Commit and push to `main`:
   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.2.3"
   git push origin main
   ```

3. The auto-tagging workflow will:
   - Detect the version change
   - Create tag `v1.2.3` if it doesn't exist
   - Push the tag to the repository

### Local Development

For local development, the version will show as `dev` if no `VITE_APP_VERSION` is set. The build process reads from `package.json` as a fallback.

## Manual Tag Management

### Rollback a Version

If you need to undo a version:

```bash
# Delete tag locally and remotely
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z

# Revert package.json version change
git revert <commit-sha>
git push origin main
```

### Emergency Manual Tag Creation

If the auto-tagging workflow fails, you can create a tag manually:

```bash
# Ensure package.json has the correct version
# Then create and push tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## Troubleshooting

### Tag not created after version change

- Check if workflow ran: Go to Actions tab and look for "Auto Version Tag" workflow
- Verify `package.json` was actually changed in the commit
- Check workflow logs for errors
- Ensure workflow has `contents: write` permission

### Version not showing in deployed app

- Verify `package.json` has the correct version
- Check CI logs: Ensure version was read from `package.json` during build
- Verify `VITE_APP_VERSION` was set during build

### Version in footer shows "dev"

- Expected in local development without `VITE_APP_VERSION` env var
- In production: Check that build read version from `package.json`

### Duplicate tag error

- The workflow checks if a tag exists before creating it
- If you see this error, the tag already exists for that version
- Either use a different version number or delete the existing tag first

## Version Display

The version is displayed in the footer of all pages in the format: `© 2024 EquipQR v1.2.3 by COLUMBIA CLOUDWORKS LLC`

## Files Involved

- `package.json` - **Source of truth** for version number
- `.github/workflows/version-tag.yml` - Auto-tagging workflow (creates tags when version changes)
- `.github/workflows/ci.yml` - Reads version from `package.json` during build
- `.github/workflows/deploy.yml` - Reads version from `package.json` for deployment notifications
- `src/components/layout/LegalFooter.tsx` - Version display in UI
- `src/lib/version.ts` - Version constant with fallback chain (`VITE_APP_VERSION` → `package.json` → `"dev"`)
- `vite.config.ts` - Reads from `package.json` as fallback for `__APP_VERSION__` constant
