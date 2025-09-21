# Versioning System Setup Guide

## Overview

This guide explains how to set up and use the automated versioning system for EquipQR. The system automatically creates git tags and increments versions based on branch merge patterns.

## Current Status

- **Current Version**: v0.0.0 (bootstrap)
- **Target Version**: v1.0.0 (initial release)
- **System Status**: Ready for bootstrap

## Step-by-Step Setup

### Step 1: Bootstrap the Version System

#### Option A: Using the Bootstrap Script (Recommended)

```bash
# Make the script executable
chmod +x scripts/bootstrap-version.sh

# Run the bootstrap script
./scripts/bootstrap-version.sh
```

#### Option B: Manual Tag Creation

```bash
# Create the initial v1.0.0 tag
git tag -a v1.0.0 -m "Initial release v1.0.0"

# Push the tag to GitHub
git push origin v1.0.0
```

#### Option C: Using GitHub Actions (Manual Workflow)

1. Go to **Actions** tab in GitHub
2. Find **"Manual Version Bump"** workflow
3. Click **"Run workflow"**
4. Enter `v1.0.0` as the version
5. Add message: `"Bootstrap initial release"`
6. Click **"Run workflow"**

### Step 2: Verify GitHub Repository Permissions

1. **Go to Repository Settings**:
   - Navigate to **Settings** → **Actions** → **General**
   - Under **"Workflow permissions"**, select **"Read and write permissions"**
   - Check **"Allow GitHub Actions to create and approve pull requests"**

2. **Check Branch Protection Rules**:
   - Go to **Settings** → **Branches**
   - Edit the `main` branch protection rule
   - Ensure **"Allow force pushes"** is disabled
   - Ensure **"Allow deletions"** is disabled

### Step 3: Test the Versioning System

1. **Create a test feature branch**:
   ```bash
   git checkout -b test/versioning
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test versioning system"
   git push origin test/versioning
   ```

2. **Create PR to preview branch**:
   - Create PR: `test/versioning` → `preview`
   - Merge the PR
   - Check if versioning workflow runs and creates `v1.1.0`

3. **Create PR from preview to main**:
   - Create PR: `preview` → `main`
   - Merge the PR
   - Check if versioning workflow runs and creates `v2.0.0`

## How the Versioning System Works

### Version Bump Rules

| Merge Pattern | Version Bump | Example |
|---------------|--------------|---------|
| `feature` → `preview` | **Minor** | v1.0.0 → v1.1.0 |
| `preview` → `main` | **Major** | v1.1.0 → v2.0.0 |
| `hotfix` → `main` | **Patch** | v1.0.0 → v1.0.1 |

### Workflow Files

- **`.github/workflows/versioning.yml`**: Automatically creates tags on PR merge
- **`.github/workflows/manual-version-bump.yml`**: Manual tag creation workflow
- **`.github/workflows/ci.yml`**: Reads tags and sets version in builds

### Version Display

The version is automatically displayed in the app footer:
```
© 2024 EquipQR v1.2.3 by COLUMBIA CLOUDWORKS LLC
```

## Troubleshooting

### Issue: Versioning workflow doesn't run

**Symptoms**: No new tags created after PR merge

**Solutions**:
1. Check if PR was actually merged (not just closed)
2. Verify `contents: write` permission in versioning workflow
3. Check GitHub repository workflow permissions
4. Look at Actions tab for failed versioning workflow runs

### Issue: Version shows as 0.0.0

**Symptoms**: App shows version 0.0.0 instead of current tag

**Solutions**:
1. Ensure tags are pushed to GitHub repository
2. Check CI workflow is fetching tags correctly
3. Verify `VITE_APP_VERSION` environment variable is set

### Issue: Manual tag creation needed

**Solutions**:
1. Use the manual version bump workflow in GitHub Actions
2. Run the bootstrap script locally
3. Create tags manually via command line

## Expected Flow After Bootstrap

1. **Current**: v0.0.0 → **Bootstrap**: v1.0.0
2. **Feature to preview**: v1.0.0 → v1.1.0
3. **Preview to main**: v1.1.0 → v2.0.0
4. **Hotfix to main**: v2.0.0 → v2.0.1

## Files Modified

- ✅ `.github/workflows/versioning.yml` - Enhanced with better logging and git config
- ✅ `.github/workflows/manual-version-bump.yml` - Manual tag creation workflow
- ✅ `.github/workflows/ci.yml` - Enhanced version display in CI logs
- ✅ `scripts/bootstrap-version.sh` - Bootstrap script for initial setup
- ✅ `docs/deployment/versioning-setup-guide.md` - This setup guide

## Next Steps

1. **Bootstrap the system** with v1.0.0 tag
2. **Test with a sample PR** to verify automation works
3. **Monitor version increments** in subsequent merges
4. **Verify version display** in the deployed application

The versioning system is now ready for use! 🎉
