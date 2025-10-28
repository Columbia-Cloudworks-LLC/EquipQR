<!--
SYNC IMPACT REPORT
==================
Version: 1.1.0 → 1.2.0 (MINOR - Database Migration Governance Added)
Ratification Date: 2025-10-13
Last Amended: 2025-10-28

Modified Sections:
✅ Development Workflow - Added Database Migration Integrity subsection
✅ Pull Request Process - Added migration validation step
✅ CI/CD Quality Gates - Added migration verification requirement

Added Sections:
✅ Database Migration Integrity (NEW)
  - Never rename applied migrations (timestamps are permanent)
  - Production is source of truth
  - Mandatory MCP tool verification
  - Migration naming conventions
  - Idempotent operations requirement
  - Local/remote sync validation

Existing Principles (Unchanged):
✅ I. Multi-Tenancy & Data Isolation (NON-NEGOTIABLE)
✅ II. Type Safety & Code Quality (NON-NEGOTIABLE)
✅ III. Component Architecture & Modularity
✅ IV. Security & Access Control (NON-NEGOTIABLE)
✅ V. Test Coverage & Quality Gates (NON-NEGOTIABLE)
✅ VI. Performance & Bundle Optimization
✅ VII. End-to-End Observability & Testing

Template Updates Required:
✅ .specify/templates/plan-template.md - Add migration integrity checks
✅ .specify/templates/tasks-template.md - Add migration validation tasks
⚠️  .specify/templates/spec-template.md - Review needed (no changes expected)
⚠️  .specify/templates/commands/README.md - Review needed (no changes expected)

Version Bump Rationale:
MINOR (1.1.0 → 1.2.0) - Material expansion of governance adding mandatory database
migration integrity requirements. Introduces new quality gates (MCP tool verification
before migration changes) and critical workflow rules (never rename applied migrations).
This is based on production incidents documented in MIGRATION_RULES_ADDED_TO_SPEC.md
where migration renaming caused deployment failures and local/remote database mismatches.
-->

# EquipQR Constitution

## Core Principles

### I. Multi-Tenancy & Data Isolation (NON-NEGOTIABLE)

EquipQR is a multi-tenant SaaS platform where data isolation is paramount. Every piece of data MUST be scoped to an organization to prevent data leakage.

**Mandatory Requirements:**
- Every database query MUST filter by `organization_id` from `OrganizationContext`
- Row Level Security (RLS) policies MUST be enabled on all tables
- Database-level isolation is non-negotiable; RLS policies MUST never be bypassed in application code
- All Supabase real-time subscriptions MUST include organization filter: `filter: 'organization_id=eq.${orgId}'`
- Services layer MUST always validate organization context before data operations

**Rationale:** Multi-tenant data isolation is the foundation of trust in SaaS platforms. A single data leak can destroy customer confidence and violate compliance requirements. Database-level enforcement (RLS) provides defense-in-depth beyond application logic.

**Testing Verification:**
- Integration tests MUST verify organization_id filtering in all queries
- Security tests MUST attempt cross-organization data access and verify denial
- All new database tables MUST have RLS policies before production deployment

### II. Type Safety & Code Quality (NON-NEGOTIABLE)

TypeScript strict mode and comprehensive type coverage prevent runtime errors and improve developer experience.

**Mandatory Requirements:**
- TypeScript strict mode enabled (baseUrl configured, paths aliased with `@/*`)
- Zero tolerance for `any` type; ESLint MUST warn on explicit `any` usage
- All data structures MUST have explicit TypeScript interfaces defined in `src/types/`
- All props, service functions, and API responses MUST be typed
- ESLint rules enforced: no unused variables, no unused imports, React hooks rules

**Rationale:** Type safety catches bugs at compile time rather than runtime. Explicit types serve as living documentation and enable confident refactoring. The cost of maintaining types is far less than debugging runtime type errors in production.

**Testing Verification:**
- `npm run type-check` MUST pass with zero errors
- ESLint MUST pass with zero errors: `npm run lint`
- New code MUST not introduce `any` types or disable type checking

### III. Component Architecture & Modularity

Clear architectural boundaries prevent code complexity and enable team scalability.

**Component Hierarchy:**
- **Pages** (`src/pages/`): Route-level components, coordinate data fetching, manage layouts
  - MUST NOT exceed 300 lines of code
  - Handle route-specific state only
  - Compose smaller feature components
  
- **Feature Components** (`src/components/[feature]/`): Domain-specific business logic
  - Equipment: `src/components/equipment/`
  - Work Orders: `src/components/work-orders/`
  - Teams: `src/components/teams/`
  - Container/Presentational pattern: Containers manage data, presentational render UI
  
- **UI Primitives** (`src/components/ui/`): Reusable interface elements
  - shadcn/ui based components (Radix UI primitives)
  - MUST NOT contain business logic
  - Fully accessible with ARIA support

**Design Patterns:**
- **Custom Hooks** (`src/hooks/`): Data fetching/mutations with TanStack Query keys (e.g., `['equipment', orgId]`)
- **Services** (`src/services/`): Business logic, Supabase queries, stateless operations
- **Compound Components**: Flexible UIs via Context (e.g., `EquipmentCard.Header`, `EquipmentCard.Title`)

**Rationale:** Separation of concerns enables parallel development, easier testing, and cognitive load reduction. 300 LOC limit for pages prevents monolithic components.

### IV. Security & Access Control (NON-NEGOTIABLE)

Security is built into every layer of the application, from database to UI.

**Mandatory Requirements:**
- **Authentication**: Supabase Auth (GoTrue) with JWT tokens, automatic session refresh
- **Authorization**: Role-Based Access Control (RBAC) with organization and team-level roles
  - Organization roles: Owner, Admin, Member
  - Team roles: Manager, Technician, Requestor, Viewer
- **RLS Policies**: Database-level enforcement of permissions (see `docs/architecture/database-schema.md`)
- **Input Validation**: All user inputs MUST be validated with Zod schemas before processing
- **Storage Security**: Supabase Storage policies MUST verify organization membership
- **No Bypassing**: Application code MUST never bypass RLS or permission checks

**UI Security:**
- Conditionally render actions based on permissions: `if (canEdit) <EditButton />`
- Use `usePermissions` hook for permission checks in components
- Protected routes with `AuthContext` guards

**Rationale:** Defense-in-depth security requires enforcement at multiple layers. Database-level RLS provides protection even if application code has bugs. Input validation prevents injection attacks and data corruption.

**Testing Verification:**
- Permission tests MUST verify RBAC enforcement
- Security tests MUST attempt unauthorized actions and verify denial
- Input validation tests MUST cover edge cases and malicious inputs

### V. Test Coverage & Quality Gates (NON-NEGOTIABLE)

Comprehensive testing prevents regressions and ensures reliability.

**Mandatory Requirements:**
- **Coverage Threshold**: Minimum 70% for lines, functions, branches, statements
- **Testing Framework**: Vitest with React Testing Library
- **Multi-Node Testing**: Node.js 18.x and 20.x in CI pipeline
- **Test Types**:
  - Unit tests: Component rendering, hooks, utilities
  - Integration tests: Complete user workflows, API integration
  - Contract tests: Service interfaces, data schemas

**CI/CD Quality Gates:**
- All tests MUST pass before merge to `main` or `preview` branches
- ESLint MUST pass with zero errors
- TypeScript type-check MUST pass
- Security audit MUST complete (CodeQL, npm-audit)
- Build MUST succeed

**Coverage Configuration:**
- Run: `npm run test:coverage`
- CI enforcement: `scripts/test-ci.mjs` with `COVERAGE_BASELINE=70`
- Coverage ratcheting: `scripts/coverage-ratchet.mjs` prevents coverage regression

**Rationale:** 70% coverage balances thoroughness with pragmatism. Multi-node testing catches environment-specific bugs. Quality gates prevent broken code from reaching production.

### VI. Performance & Bundle Optimization

Fast load times and efficient resource usage are critical for user experience.

**Mandatory Requirements:**
- **Bundle Size Limits**:
  - Total build output: 12MB maximum
  - Individual JS bundles: 500KB gzipped maximum
- **Code Splitting**: React.lazy() and Suspense for heavy components
- **Lazy Loading**: Route-based code splitting with React Router
- **Memoization**: useMemo for expensive calculations, useCallback for stable references

**State Management Optimization:**
- TanStack Query for server state with 5-minute stale time
- Optimistic updates for mutations to improve perceived performance
- Real-time updates via Supabase subscriptions to invalidate/update cache

**Build Optimization:**
- Vite with SWC for fast builds
- Tree-shaking to eliminate dead code
- Asset optimization (images, fonts)

**Monitoring:**
- CI checks bundle sizes in `.github/workflows/ci.yml`
- Performance budgets enforced in quality gates
- Large files flagged during build

**Rationale:** Performance directly impacts user satisfaction and conversion. Bundle size limits prevent bloat. Lazy loading improves initial load time for better Core Web Vitals.

### VII. End-to-End Observability & Testing

Complete system observability enables idempotent feature development and rapid issue resolution across all environments.

**Mandatory Requirements:**
- **Multi-Environment Testing**: All features MUST be validated in dev, preview (preview.equipqr.app), and production (equipqr.app)
- **Playwright Integration**: End-to-end browser tests MUST use Playwright with real user credentials
- **MCP Tool Integration**: Development workflows MUST leverage available MCP tools:
  - **Vercel MCP**: Deployment validation, build logs, environment inspection
  - **Stripe MCP**: Billing flow validation, subscription testing, webhook verification
  - **GitKraken MCP**: Repository state inspection, branch management, PR validation
  - **Supabase MCP**: Database queries, RLS policy verification, real-time subscription testing
- **Idempotent Development**: Features MUST be developed and tested in a way that allows repeatable validation at every step
- **Full-Stack Visibility**: Developers MUST be able to observe and validate every layer (frontend, backend, database, external services)

**Testing Workflow:**
- E2E tests MUST authenticate with real credentials in test environments
- Tests MUST validate complete user journeys across all integrated services
- Pre-deployment validation MUST verify functionality in preview environment
- Production smoke tests MUST run post-deployment to verify core workflows
- MCP tools MUST be used to inspect system state during debugging

**Observable Checkpoints:**
- Database state (via Supabase MCP)
- Deployment status and logs (via Vercel MCP)
- Payment flow completion (via Stripe MCP)
- Repository and PR state (via GitKraken MCP)
- Browser UI state and user interactions (via Playwright)

**Rationale:** End-to-end observability prevents inconsistencies between environments and enables confident deployments. MCP tool integration provides deep system introspection without custom tooling. Playwright tests with real credentials validate actual user experiences rather than mocked scenarios. Idempotent development practices ensure features can be validated repeatedly, catching regressions early.

**Testing Verification:**
- E2E test suite MUST cover critical user journeys
- Tests MUST run successfully in all three environments (dev, preview, production)
- MCP tools MUST be documented in test procedures for debugging
- Feature PRs MUST include E2E test validation evidence

## Security Requirements

### Authentication & Session Management
- Supabase Auth (GoTrue) for all authentication
- JWT tokens with automatic refresh
- Session persistence with secure storage
- Multi-provider support: Email/password, Google OAuth (optional)
- Redirect URL configuration for development and production

### Data Protection
- HTTPS enforced for all communications
- Sensitive data encrypted at rest (Supabase managed)
- No sensitive data in client-side code or logs
- Environment variables for secrets (`VITE_*` prefix for client-safe values)

### Security Auditing
- CodeQL analysis in CI pipeline (`.github/workflows/ci.yml`)
- npm security audits with moderate threshold
- Regular dependency updates
- Security vulnerability tracking in `docs/maintenance/security-fixes.md`

### Compliance
- Row Level Security (RLS) policies documented in `docs/architecture/database-schema.md`
- Permission matrices documented in `docs/features/roles-and-permissions.md`
- Audit logging for sensitive operations (planned)

## Development Workflow

### Branch Strategy
- **main**: Production-ready code
- **preview**: Staging environment for pre-production testing
- **feature branches**: Named `[issue-number]-feature-name`

### Database Migration Integrity (CRITICAL)

**The Golden Rule**: Once a migration has been applied to production, its timestamp is **PERMANENT and IMMUTABLE**.

#### Mandatory Requirements:
- **Migration Format**: `YYYYMMDDHHMMSS_descriptive_name.sql` (year, month, day, hour, minute, second)
- **Never Rename Applied Migrations**: Production timestamps are permanent; renaming causes deployment failures
- **Production is Source of Truth**: Always verify production state before making migration changes
- **MCP Tool Verification**: Use `mcp_supabase_list_migrations` to check production before any migration work
- **Idempotent Operations**: Use `IF NOT EXISTS`, `IF NOT NULL`, etc. for safe repeated execution
- **Local/Remote Sync**: Local migration files MUST match production timestamps exactly

#### Migration Workflow:
1. **Before Migration Work**: Check production with `mcp_supabase_list_migrations(project_id)`
2. **Create Migration**: Use current timestamp, never backdate
3. **Write Migration**: Use idempotent operations (`CREATE TABLE IF NOT EXISTS`)
4. **Test Locally**: Run `supabase db reset` to verify complete migration chain
5. **Validate**: Run `node scripts/supabase-fix-migrations.mjs`
6. **Deploy**: After deployment, timestamp becomes permanent
7. **Never Rename**: Applied migrations are immutable forever

#### Fixing Local/Remote Mismatch:
- Use MCP tools to list production migrations
- Create placeholder files for missing migrations with exact production timestamps
- Revert any incorrectly renamed files to match production
- Never assume local is correct

**Rationale**: Migration renaming causes "Remote migration versions not found" errors, deployment failures, and database state mismatches. Production is the authoritative source; local files must conform. This rule prevents costly production incidents.

**Reference**: `docs/deployment/migration-rules-quick-reference.md`, `docs/deployment/database-migrations.md`

### Pull Request Process
1. Create feature branch from `main` or `preview`
2. Implement changes with tests
3. **If PR includes migrations**: Verify production state with MCP tools first
4. Ensure all quality gates pass locally:
   - `npm run lint` - ESLint
   - `npm run type-check` - TypeScript
   - `npm run test:coverage` - Tests with 70% coverage
   - **If migrations**: `node scripts/supabase-fix-migrations.mjs`
5. Open PR to target branch
6. Code review required (minimum 1 approval)
7. CI/CD pipeline runs all quality gates
8. Merge only after all checks pass

### CI/CD Quality Gates

**Lint & Type Check Job:**
- ESLint with JSON output and annotations
- TypeScript type checking (`tsc --noEmit`)

**Test Suite Job:**
- Multi-node matrix (Node 18.x, 20.x)
- Test coverage with 70% threshold
- Coverage uploaded to Codecov

**Security Scan Job:**
- npm audit with moderate severity threshold
- CodeQL security and quality analysis

**Build Job:**
- Production build with Vite
- Bundle size analysis
- Artifact upload for deployment

**Quality Gates Job:**
- Coverage threshold verification
- Bundle size limits (12MB total, 500KB JS gzipped)
- Performance budget analysis

**Migration Integrity Job** (if migrations changed):
- Migration filename validation (`node scripts/supabase-fix-migrations.mjs`)
- Production state verification via MCP tools
- Local/remote timestamp consistency check
- Migration idempotency verification (contains `IF NOT EXISTS` clauses)
- No renamed migration detection

### Code Review Requirements
- All PRs require review before merge
- Focus areas:
  - **Migrations**: Timestamp format, idempotency, RLS policies, production state verification
  - Security: RLS policies, input validation, permission checks
  - Architecture: Component boundaries, separation of concerns
  - Testing: Coverage, edge cases, integration tests
  - Performance: Bundle impact, memoization, lazy loading

## Performance Standards

### State Management
- **Server State**: TanStack Query v5+ with 5-minute stale time for common data
- **Global State**: React Context (AuthContext, OrganizationContext, SettingsContext)
- **Local State**: useState/useReducer for component-specific state

### Caching Strategy
- TanStack Query cache with strategic invalidation
- Optimistic updates for mutations to improve UX
- Query key patterns: `['resource', orgId, filters]` for precise invalidation

### Real-time Updates
- Supabase subscriptions for live data
- Organization-scoped filters: `filter: 'organization_id=eq.${orgId}'`
- Subscription cleanup in useEffect return

### Optimization Techniques
- React.memo for expensive components
- useMemo for complex calculations
- useCallback for stable callback references
- Virtual scrolling (react-window) for large lists
- Image optimization (lazy loading, responsive images)

### Monitoring
- Core Web Vitals tracking (planned)
- Error tracking with context (user/org ID)
- Performance budgets in CI
- Bundle analysis tools

## Governance

### Constitution Authority
This constitution supersedes all other development practices and guidelines. All code, PRs, and architectural decisions MUST comply with these principles.

### Amendment Process
1. **Proposal**: Document proposed change with rationale
2. **Review**: Team discussion and impact analysis
3. **Version Bump**:
   - **MAJOR** (x.0.0): Backward-incompatible governance changes, principle removals/redefinitions
   - **MINOR** (0.x.0): New principle added, material expansion of guidance
   - **PATCH** (0.0.x): Clarifications, wording fixes, non-semantic refinements
4. **Approval**: Consensus required from technical leadership
5. **Migration**: Update templates, propagate changes, document impact
6. **Communication**: Announce to team with migration guide

### Compliance Review
- All PRs MUST verify constitution compliance
- Architecture Review Board (if formed) enforces principles
- Complexity MUST be justified against constitutional principles
- Violations require explicit justification and approval

### Template Synchronization
When constitution changes:
1. Update `.specify/templates/plan-template.md` (Constitution Check section)
2. Update `.specify/templates/spec-template.md` (Requirements alignment)
3. Update `.specify/templates/tasks-template.md` (Task categorization)
4. Update command templates in `.specify/templates/commands/*.md`
5. Review runtime guidance in `docs/architecture/technical-guide.md`

### Versioning
- Constitution follows semantic versioning: MAJOR.MINOR.PATCH
- Version, ratification date, and last amended date tracked in footer
- Sync impact report prepended as HTML comment on updates

### Reference Documentation
- Technical patterns: `docs/architecture/technical-guide.md`
- System architecture: `docs/architecture/system-architecture.md`
- Database schema and RLS: `docs/architecture/database-schema.md`
- RBAC system: `docs/features/roles-and-permissions.md`

**Version**: 1.2.0 | **Ratified**: 2025-10-13 | **Last Amended**: 2025-10-28
