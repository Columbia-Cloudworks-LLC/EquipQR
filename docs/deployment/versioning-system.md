# Versioning System

EquipQR uses an automated semantic versioning system that creates git tags based on branch merge patterns.

## How It Works

### Version Format
- **Format**: `MAJOR.MINOR.PATCH` (e.g., `1.12.3`)
- **Tag Format**: `vMAJOR.MINOR.PATCH` (e.g., `v1.12.3`)

### Version Bump Rules
- **PR merged into `preview`**: Bump MINOR version, reset PATCH to `0`
- **PR merged into `main` from `preview`**: Bump MAJOR version, reset MINOR/PATCH to `0`
- **PR merged into `main` not from `preview`**: Bump PATCH version (hotfix)

### Workflow
1. When a PR is merged, the `.github/workflows/versioning.yml` workflow automatically:
   - Determines the bump type based on source and target branches
   - Calculates the next version from the latest tag
   - Creates and pushes a new annotated tag

2. During build, the CI workflow:
   - Fetches all tags
   - Derives the current version from tags
   - Exposes it as `VITE_APP_VERSION` environment variable

3. The app displays the version in the footer of all pages

## Bootstrap
If no tags exist, the system starts from `v0.0.0` before applying the first bump.

## Local Development
For local development, the version will show as `dev` if no `VITE_APP_VERSION` is set.

## Manual Tag Management
If needed, you can manually manage tags:
```bash
# Delete a tag (if created incorrectly)
git tag -d v1.0.0
git push --delete origin v1.0.0

# Create a tag manually
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Version Display
The version is displayed in the footer of all pages in the format: `© 2024 EquipQR v1.2.3 by COLUMBIA CLOUDWORKS LLC`

## Files Modified
- `.github/workflows/versioning.yml` - Automated tag creation
- `.github/workflows/ci.yml` - Version derivation during build
- `src/components/layout/LegalFooter.tsx` - Version display
- `vite.config.ts` - Environment variable configuration
- `scripts/get-version.sh` - Utility script for version derivation
