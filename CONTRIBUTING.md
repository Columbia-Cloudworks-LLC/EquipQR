# Contributing to EquipQR

Thank you for your interest in contributing to EquipQR! This document provides guidelines and information for contributing to the project.

## Table of Contents

- [Project Overview](#project-overview)
- [Branching Model](#branching-model)
- [Versioning & Release Process](#versioning--release-process)
- [Development Workflow](#development-workflow)
- [CI/CD Policy](#cicd-policy)
- [Reporting Issues](#reporting-issues)
- [Support Contact](#support-contact)
- [Coding Guidelines](#coding-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)

## Project Overview

EquipQR is a comprehensive fleet equipment management platform built with React, TypeScript, and Supabase. The application helps organizations track equipment, manage work orders, and coordinate maintenance teams.

**Key Technologies:**
- Frontend: React 18, TypeScript, Vite
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Styling: Tailwind CSS, shadcn/ui
- State: TanStack Query
- Testing: Vitest, React Testing Library

## Branching Model

EquipQR uses a three-branch strategy to maintain code quality and controlled releases:

### Branch Environments

| Branch | Purpose | Deployment | Public URL |
|--------|---------|------------|------------|
| `dev` | Active development | None (local only) | N/A |
| `preview` | Staging/testing | Auto-deploy on merge | preview.equipqr.app |
| `main` | Production | Auto-deploy on merge | equipqr.app |

### Branch Flow

1. **Development** (`dev` branch)
   - All feature development happens here
   - Push to `origin/dev` for backup
   - No public deployment

2. **Staging** (`preview` branch)
   - Merge `dev` → `preview` via Pull Request
   - Triggers CI checks
   - Deploys to preview.equipqr.app for user testing

3. **Production** (`main` branch)
   - Merge `preview` → `main` via Pull Request
   - Triggers strict CI checks
   - Deploys to equipqr.app (production)

4. **Hotfixes** (direct to `main`)
   - Emergency fixes can go directly to `main`
   - Should be rare; prefer the normal flow

**Note**: Versions are created manually using the Manual Version Bump workflow after deployments are verified, not automatically on merge.

## Versioning & Release Process

EquipQR uses **manual semantic versioning** with git tags and GitHub releases.

### How It Works

Versions are created manually by maintainers through a GitHub Actions workflow:

1. **Navigate to the workflow**:
   - Go to **Actions** → **Manual Version Bump**
   - Click **Run workflow**
   - Select the branch (typically `main` or `preview`)

2. **Enter version information**:
   - **Version**: Enter the new version number (e.g., `1.2.3` - without `v` prefix)
   - **Message**: Optional release message (defaults to "Release vX.Y.Z")
   - The workflow displays current version and suggested bumps in the job summary

3. **Workflow automatically**:
   - Validates version format
   - Checks if tag already exists
   - Updates `package.json` with new version
   - Commits the change: `chore: bump version to X.Y.Z`
   - Creates git tag: `vX.Y.Z`
   - Pushes commit and tag to the repository
   - Creates GitHub Release with auto-generated notes
   - Triggers deployment with the new version

### Semantic Versioning Guidelines

Follow semantic versioning principles when choosing version numbers:

- **Major** (X.0.0): Breaking changes, significant new features
  - Example: `1.5.3` → `2.0.0`
- **Minor** (X.Y.0): New features, backward-compatible changes
  - Example: `1.5.3` → `1.6.0`
- **Patch** (X.Y.Z): Bug fixes, minor improvements
  - Example: `1.5.3` → `1.5.4`

### Version Display

The application displays the current version in the footer:
- Local development: `vdev`
- Deployed environments: Shows the version from the latest git tag (e.g., `v1.2.3`)

### Rollback

If a version is created incorrectly:

```bash
# Delete tag locally and remotely
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z

# Delete GitHub Release via GitHub UI (Releases → Delete)

# Revert package.json commit if needed
git revert <commit-sha>
git push origin <branch>
```

### Reference Documentation

For technical details, see [`docs/deployment/versioning-system.md`](./docs/deployment/versioning-system.md).

## Development Workflow

### Setting Up Your Development Environment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Columbia-Cloudworks-LLC/EquipQR.git
   cd EquipQR
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `env.example` to `.env`
   - Fill in required values (see [README.md](./README.md))

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Making Changes

1. Work on the `dev` branch
2. Follow the coding guidelines below
3. Write tests for new features
4. Run linting and tests before pushing:
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

### Pushing Your Work

```bash
# Push to dev for backup
git push origin dev

# When ready for staging, open PR to preview
# Use GitHub UI or:
gh pr create --base preview --head dev --title "Your feature description"
```

## CI/CD Policy

### Preview Branch (`preview`)

**On Pull Requests** (e.g., `dev` → `preview`):
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Unit tests with coverage
- ✅ Build validation
- ✅ Security scan (npm audit)

### Main Branch (`main`)

**Strict Requirements**:
- ✅ All CI checks must pass
- ✅ Preview deployment must be successful
- ✅ At least 1 maintainer review
- ✅ No force pushes or deletions

## Reporting Issues

We welcome bug reports, feature requests, and questions!

### Before Reporting

1. Search existing issues to avoid duplicates
2. Check the [documentation](./docs/)
3. Verify the issue on the latest version

### Creating an Issue

Include the following information:

**For Bug Reports:**
- **Summary**: Brief description of the problem
- **Reproduction Steps**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**:
  - Browser/OS version
  - EquipQR version (check footer)
  - Organization role (admin, technician, etc.)
- **Screenshots/Logs**: If applicable
- **Additional Context**: Any other relevant information

**For Feature Requests:**
- **Use Case**: Describe the problem you're trying to solve
- **Proposed Solution**: Your idea for solving it
- **Alternatives**: Other approaches you've considered
- **Impact**: Who would benefit from this feature

**For Questions:**
- **Context**: What are you trying to accomplish
- **What You've Tried**: Steps you've already taken
- **References**: Links to relevant docs or code

### Labels

Use these labels to categorize your issue:
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `question`: Further information requested
- `documentation`: Improvements or additions to docs
- `good first issue`: Good for newcomers

## Support Contact

### For Customers

If you're a EquipQR customer experiencing issues or need support:

**Email**: [nicholas.king@columbiacloudworks.com](mailto:nicholas.king@columbiacloudworks.com)

Please include:
- Your organization name
- Description of the issue
- Any error messages or screenshots
- Urgency level (critical, high, normal, low)

### For General Bugs/Features

Please use GitHub Issues for:
- Bug reports
- Feature requests
- General questions about the codebase

This helps maintain a public record and benefits the entire community.

## Coding Guidelines

EquipQR follows strict coding standards to maintain quality and consistency.

### Language & Style

- **TypeScript**: Use TypeScript for all new code
- **Strict Mode**: Enable strict type checking
- **No `any`**: Avoid `any` type; use proper types or `unknown`
- **ESLint**: Follow the project's ESLint configuration
- **Formatting**: Code is auto-formatted (handled by tooling)

### Architecture Patterns

Follow the patterns documented in [`docs/architecture/`](./docs/architecture/):

1. **Component Hierarchy**:
   - Pages: `src/pages/` (route-level, <300 LOC)
   - Features: `src/components/[feature]/` (e.g., `equipment/`, `work-orders/`)
   - UI Primitives: `src/components/ui/` (shadcn-style, no business logic)

2. **Data Patterns**:
   - Custom Hooks: `src/hooks/` for data fetching (TanStack Query)
   - Services: `src/services/` for business logic (stateless)
   - Contexts: `src/contexts/` for global state (Auth, Organization, Settings)

3. **File Naming**:
   - Components: PascalCase (e.g., `EquipmentList.tsx`)
   - Files/folders: kebab-case (e.g., `equipment-list.tsx`)
   - Hooks: `use` prefix (e.g., `useEquipment.ts`)

### Multi-Tenancy

**Critical**: Every database query must filter by `organization_id`:

```typescript
// ✅ Correct
const { data } = await supabase
  .from('equipment')
  .select('*')
  .eq('organization_id', orgId);

// ❌ Wrong - security vulnerability!
const { data } = await supabase
  .from('equipment')
  .select('*');
```

### Testing

EquipQR follows a **journey-first** testing strategy. See [`docs/technical/testing-guidelines.md`](./docs/technical/testing-guidelines.md) for complete details.

**Key principles**:
- **Default to journey tests**: Render real pages, use `userEvent`, assert on visible outcomes
- **Mock at boundaries**: Mock Supabase client, not internal hooks
- **Unit tests are selective**: Use for pure utilities and complex business rules only
- Aim for >70% code coverage

```bash
# Run tests
npm run test

# Journey tests only
npm run test:journeys

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Journey test template** (for new features):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderJourney } from '@/test/journey/render-journey';
import { seedSupabaseMock, resetSupabaseMock } from '@/test/mocks/supabase-scenario';

describe('Feature Journey', () => {
  beforeEach(() => {
    resetSupabaseMock();
    seedSupabaseMock({ /* fixture data */ });
  });

  it('allows user to perform action', async () => {
    const user = userEvent.setup();
    renderJourney({ persona: 'admin', route: '/dashboard/feature' });

    await user.click(await screen.findByRole('button', { name: /action/i }));

    expect(await screen.findByText(/success/i)).toBeInTheDocument();
  });
});
```

### Documentation

- Add JSDoc comments for public APIs
- Update relevant docs in `docs/` for major changes
- Include inline comments for complex logic
- Reference architecture docs when applicable

## Change Management Policy

**CRITICAL**: All code changes to EquipQR must follow this Change Management Policy to ensure security, quality, and compliance.

### Requirements

1. **All Changes Require Pull Requests**
   - No direct commits to `main` or `preview` branches (except emergency hotfixes with post-merge review)
   - All changes must go through a Pull Request (PR) workflow
   - PRs must be created from feature branches (`feat/`, `fix/`, etc.)

2. **Pull Request Approval Required**
   - At least **one maintainer approval** is required before merging
   - PRs cannot be merged by the author without approval
   - Maintainers must review code for:
     - Security implications (RLS policies, authentication, authorization)
     - Code quality and adherence to standards
     - Test coverage
     - Documentation updates

3. **CI/CD Checks Must Pass**
   - All CI checks must pass before merge:
     - Linting (ESLint)
     - Type checking (TypeScript)
     - Unit tests with coverage thresholds
     - Build validation
     - Security scans (npm audit)

4. **Database Changes**
   - All database migrations must be reviewed for:
     - RLS policy correctness
     - Performance implications
     - Data migration safety
   - Migrations must be idempotent and reversible (where possible)

5. **Security Review**
   - Changes affecting authentication, authorization, or data access require security review
   - RLS policy changes must be verified for tenant isolation
   - New API endpoints must have proper authentication and authorization

6. **Documentation**
   - Code changes that affect user-facing features require documentation updates
   - API changes require API documentation updates
   - Breaking changes require migration guides

### Emergency Hotfixes

In rare cases, emergency hotfixes may bypass normal PR approval:
- Only for critical production issues (security vulnerabilities, data loss, service outages)
- Must be followed by immediate post-merge review
- Must include explanation of why normal process was bypassed
- Must be documented in the PR description

### Enforcement

- GitHub branch protection rules enforce these policies
- Automated CI/CD pipelines block merges that don't meet requirements
- Manual review by maintainers ensures compliance

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows the style guidelines
- [ ] Tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated if needed

### PR Structure

**Title**: Use conventional commit format
- `feat: add equipment photo upload`
- `fix: resolve work order assignment bug`
- `docs: update API reference`
- `refactor: simplify auth context`
- `chore: bump version to 1.2.0`

**Description**: Include
- Summary of changes
- Related issue(s): `Fixes #123`, `Relates to #456`
- Testing performed
- Screenshots for UI changes
- Breaking changes (if any)
- Migration steps (if any)

### Size Guidelines

- Keep PRs focused and small (<500 lines changed)
- Break large features into multiple PRs
- Separate refactoring from feature changes
- One concern per PR

### Review Process

1. Create PR from `dev` to `preview` (or `preview` to `main`)
2. CI checks run automatically
3. Address any failing checks
4. Request review from maintainers
5. Make requested changes
6. Maintainer approves and merges
7. Deployment triggered
8. After successful deployment, maintainer manually creates version using the Manual Version Bump workflow

### Merge Strategy

- **Squash and merge** for feature PRs (clean history)

---

## Questions?

If you have questions about contributing, feel free to:
- Open a GitHub Discussion
- Create an issue tagged `question`
- Email [nicholas.king@columbiacloudworks.com](mailto:nicholas.king@columbiacloudworks.com)

Thank you for contributing to EquipQR! 🎉

