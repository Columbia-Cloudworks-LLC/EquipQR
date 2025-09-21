# Vercel-GitHub Integration Setup

This guide explains how to properly configure the integration between Vercel and GitHub to resolve deployment status issues.

## Current Issue

The error "Missing successful active Preview deployment" occurs because GitHub branch protection rules expect deployment status from Vercel, but the integration isn't properly configured.

## Solution Options

### Option 1: Simple Vercel Integration (Recommended)

This approach uses Vercel's built-in GitHub integration without additional secrets.

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Git" section
   - Ensure GitHub integration is connected
   - Enable "GitHub Deployments" in integration settings
   - Set branch mappings:
     - `main` → Production (equipqr.app)
     - `preview` → Preview (preview.equipqr.app)

2. **In GitHub Repository:**
   - Go to Settings → Branches
   - Edit protection rule for `main` branch
   - Under "Required status checks":
     - Keep CI checks: "Security Scan", "Test Suite", "Quality Gates"
     - **Remove** "Require deployments" or set to "Any deployment environment"

### Option 2: Advanced Integration with Secrets

If you want more control over deployment reporting, you can use the provided workflows with Vercel secrets.

1. **Get Vercel Credentials:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and link project
   vercel login
   vercel link
   
   # Get project ID and org ID from .vercel/project.json
   cat .vercel/project.json
   ```

2. **Add GitHub Secrets:**
   - `VERCEL_TOKEN`: Get from Vercel dashboard → Settings → Tokens
   - `VERCEL_ORG_ID`: From .vercel/project.json
   - `VERCEL_PROJECT_ID`: From .vercel/project.json

3. **Enable Workflows:**
   - The `.github/workflows/deploy.yml` will automatically deploy to Vercel
   - The `.github/workflows/deployment-status.yml` will handle status reporting

## Current Configuration

### Branch Protection Rules
- ✅ Require signed commits: **DISABLED** (you removed this)
- ✅ Require status checks: **ENABLED** (CI workflows)
- ❓ Require deployments: **CONFIGURE** (see options above)

### Version Control Flow
- ✅ Automated semantic versioning based on branch merges
- ✅ Version bump logic: preview → minor, main from preview → major
- ✅ Version derivation during build process

### Deployment URLs
- **Production**: `equipqr.app` (main branch)
- **Preview**: `preview.equipqr.app` (preview branch)

## Testing the Integration

1. **Create a test PR** to the preview branch
2. **Verify CI checks pass** (Security Scan, Test Suite, Quality Gates)
3. **Check Vercel deployment** triggers automatically
4. **Verify GitHub shows deployment status** in the PR
5. **Merge PR** and verify version increment works

## Troubleshooting

### If deployment status still shows as missing:
1. Check Vercel project settings for GitHub integration
2. Verify branch protection rules don't require specific deployment environments
3. Ensure Vercel is properly connected to the GitHub repository

### If version increment doesn't work:
1. Check that tags are being created by the versioning workflow
2. Verify the versioning workflow has `contents: write` permission
3. Check that the merge is happening to the correct target branch

## Files Modified

- `.github/workflows/deployment-status.yml` - Handles deployment status reporting
- `.github/workflows/deploy.yml` - Triggers Vercel deployments (optional)
- `vercel.json` - Updated with GitHub integration settings
- `docs/deployment/vercel-github-integration.md` - This setup guide
