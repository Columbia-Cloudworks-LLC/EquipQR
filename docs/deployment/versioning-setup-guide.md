# Versioning System Setup Guide

## Overview

This guide explains how to set up and use the automated versioning system for EquipQR. The system uses `package.json` as the single source of truth and automatically creates git tags when the version changes.

## How It Works

### Source of Truth

The version number is stored in `package.json`:

```json
{
  "name": "equipqr",
  "version": "1.0.0"
}
```

### Automatic Tagging

When you update the version in `package.json` and push to `main`:

1. The `version-tag.yml` workflow automatically triggers
2. Reads the version from `package.json`
3. Checks if tag `v{version}` already exists
4. Creates and pushes the tag if it doesn't exist
5. Skips if tag already exists (no-op)

### Build Integration

- CI workflows read version directly from `package.json`
- Version is exposed as `VITE_APP_VERSION` during build
- App displays version in footer

## Initial Setup

### Step 1: Set Initial Version

1. Update `package.json`:
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. Commit and push:
   ```bash
   git add package.json
   git commit -m "chore: set initial version to 1.0.0"
   git push origin main
   ```

### Step 2: Create Initial Tag

The auto-tagging workflow will create the tag automatically when you push. However, if you want to create it manually first:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Step 3: Verify GitHub Repository Permissions

1. **Go to Repository Settings**:
   - Navigate to **Settings** → **Actions** → **General**
   - Under **"Workflow permissions"**, select **"Read and write permissions"**
   - This allows the workflow to create and push tags

2. **Check Branch Protection Rules**:
   - Go to **Settings** → **Branches**
   - Edit the `main` branch protection rule
   - Ensure **"Allow force pushes"** is disabled
   - Ensure **"Allow deletions"** is disabled

## Using the Versioning System

### To Release a New Version

1. **Update `package.json`**:
   ```json
   {
     "version": "1.2.3"
   }
   ```

2. **Commit and push to `main`**:
   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.2.3"
   git push origin main
   ```

3. **Auto-tagging happens automatically**:
   - Workflow triggers on push to `main` when `package.json` changes
   - Tag `v1.2.3` is created and pushed automatically
   - Check Actions tab to verify workflow ran successfully

### Semantic Versioning Guidelines

- **Major** (X.0.0): Breaking changes, major new features
- **Minor** (X.Y.0): New features, backward-compatible changes
- **Patch** (X.Y.Z): Bug fixes, minor improvements

## Workflow Files

- **`.github/workflows/version-tag.yml`**: Auto-tagging workflow (creates tags when `package.json` version changes)
- **`.github/workflows/ci.yml`**: Reads version from `package.json` during build
- **`.github/workflows/deploy.yml`**: Reads version from `package.json` for deployment notifications

## Version Display

The version is automatically displayed in the app footer:
```
© 2024 EquipQR v1.2.3 by COLUMBIA CLOUDWORKS LLC
```

## Troubleshooting

### Issue: Tag not created after version change

**Symptoms**: Updated `package.json` version but no tag was created

**Solutions**:
1. Check if workflow ran: Go to Actions tab and look for "Auto Version Tag" workflow
2. Verify `package.json` was actually changed in the commit
3. Ensure you pushed to `main` branch (workflow only runs on `main`)
4. Check workflow logs for errors
5. Verify workflow has `contents: write` permission

### Issue: Version shows as "dev" in production

**Symptoms**: App footer shows "dev" instead of version number

**Solutions**:
1. Verify `package.json` has the correct version
2. Check CI logs: Ensure version was read from `package.json` during build
3. Verify `VITE_APP_VERSION` was set during build

### Issue: Duplicate tag error

**Symptoms**: Workflow fails with tag already exists error

**Solutions**:
1. The workflow should skip tag creation if tag exists (no-op)
2. If you see an error, check if tag was created manually
3. Either use a different version number or delete the existing tag first

### Issue: Manual tag creation needed

**Solutions**:
1. Create tag manually:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```
2. Ensure `package.json` version matches the tag version

## Clean Slate: Removing All Tags

If you need to start fresh and remove all existing tags:

```bash
# Delete all local tags
git tag -l | xargs git tag -d

# Delete all remote tags
git tag -l | xargs git push origin --delete
```

Then set `package.json` to `"1.0.0"` and push. The auto-tagging workflow will create `v1.0.0` automatically.

## Files Involved

- `package.json` - **Source of truth** for version number
- `.github/workflows/version-tag.yml` - Auto-tagging workflow
- `.github/workflows/ci.yml` - Build workflow (reads from `package.json`)
- `.github/workflows/deploy.yml` - Deployment workflow (reads from `package.json`)
- `src/lib/version.ts` - Version constant with fallback chain
- `vite.config.ts` - Reads from `package.json` as fallback

## Next Steps

1. **Set initial version** in `package.json` to `"1.0.0"`
2. **Push to `main`** - auto-tagging will create `v1.0.0` tag
3. **Update version** in `package.json` when ready to release
4. **Push to `main`** - new tag will be created automatically
5. **Verify version display** in the deployed application

The versioning system is now ready for use!
