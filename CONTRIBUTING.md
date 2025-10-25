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
   - Triggers CI checks and minor version bump
   - Deploys to preview.equipqr.app for user testing

3. **Production** (`main` branch)
   - Merge `preview` → `main` via Pull Request
   - Triggers strict CI checks and major version bump
   - Deploys to equipqr.app (production)

4. **Hotfixes** (direct to `main`)
   - Emergency fixes can go directly to `main`
   - Triggers patch version bump
   - Should be rare; prefer the normal flow

## Versioning & Release Process

EquipQR uses **automated semantic versioning** with git tags and GitHub releases.

### How It Works

When a pull request is merged to `preview` or `main`, the versioning workflow automatically:

1. **Computes the next version** based on the target branch:
   - `dev` → `preview`: **Minor** bump (v1.0.0 → v1.1.0)
   - `preview` → `main`: **Major** bump (v1.1.0 → v2.0.0)
   - `hotfix` → `main`: **Patch** bump (v2.0.0 → v2.0.1)

2. **Creates a version bump Pull Request**:
   - Title: `chore: bump version to X.Y.Z`
   - Updates `package.json` with the new version
   - Tagged with `release` and `automated` labels

3. **Requires maintainer approval**:
   - Review the version bump PR
   - Manually approve and merge it
   - No automated merge for security reasons

4. **Creates tag and release** when bump PR merges:
   - Git tag: `vX.Y.Z`
   - GitHub Release with auto-generated notes
   - Triggers deployment with the new version

### Version Display

The application displays the current version in the footer:
- Local development: `vdev`
- Preview deployment: `v1.X.0` (minor versions)
- Production deployment: `v2.X.0` (major versions)

### Retry Failed Tagging

If a version bump PR merged but tag/release creation failed:
1. Go to Actions → Versioning workflow
2. Find the failed run for the merged bump PR
3. Click "Re-run jobs"
4. The workflow will create the missing tag/release

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

**On Feature PRs** (e.g., `dev` → `preview`):
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Unit tests with coverage
- ✅ Build validation
- ✅ Security scan (npm audit)

**On Version Bump PRs**:
- May skip intensive checks (maintainer discretion)
- Simple package.json change, low risk

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

- Write tests for new features and bug fixes
- Aim for >70% code coverage
- Test critical paths: auth, data mutations, business logic
- Use `@testing-library/react` for component tests
- Mock Supabase calls using test utilities

```bash
# Run tests
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Documentation

- Add JSDoc comments for public APIs
- Update relevant docs in `docs/` for major changes
- Include inline comments for complex logic
- Reference architecture docs when applicable

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
7. Version bump PR is auto-created
8. Maintainer reviews and merges version bump PR
9. Tag/release created automatically
10. Deployment triggered

### Merge Strategy

- **Squash and merge** for feature PRs (clean history)
- **Merge commit** for version bump PRs (preserve version commit)

---

## Questions?

If you have questions about contributing, feel free to:
- Open a GitHub Discussion
- Create an issue tagged `question`
- Email [nicholas.king@columbiacloudworks.com](mailto:nicholas.king@columbiacloudworks.com)

Thank you for contributing to EquipQR! 🎉

