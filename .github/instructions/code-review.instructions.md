---
applyTo: "**/*"
---

# Code Review Focus Areas

## Purpose

Prioritized code review guidelines. Focus on what CI **cannot** catch.
Priority order: Multi-tenancy > Security/RBAC > Query Patterns > Accessibility > Style.

## What CI Already Catches (Skip These)

- **ESLint**: `any` types, unused variables, hook dependencies, console usage
- **TypeScript**: Type errors
- **CodeQL**: Hardcoded secrets, SQL injection, XSS
- **npm-audit-ci**: Vulnerable dependencies
- **Quality Gates**: Bundle size, test coverage

---

## HIGH PRIORITY: Multi-Tenancy

CI cannot detect these domain-specific patterns:

- [ ] All queries filter by `organization_id`
- [ ] No hardcoded organization IDs
- [ ] `useOrganization()` context used for current org
- [ ] Service functions accept `organizationId` parameter
- [ ] Mutations include `organization_id` in payloads

---

## HIGH PRIORITY: RBAC & Permissions

CI cannot verify business logic for role-based access:

- [ ] `usePermissions()` check before sensitive operations
- [ ] Edit/Delete buttons gated by role
- [ ] Edge Functions validate permissions at start
- [ ] No `service_role` key usage outside approved Edge Functions

---

## HIGH PRIORITY: Service Layer Pattern

CI cannot enforce architectural patterns:

- [ ] Components don't call Supabase directly
- [ ] Data fetching goes through service -> hook -> component
- [ ] Services are in correct directory (`src/services/` or `src/features/*/services/`)

---

## MEDIUM PRIORITY: Query Patterns

CI cannot detect query inefficiencies:

- [ ] Queries select only needed fields (no `select('*')`)
- [ ] Query keys include all dependencies `['entity', orgId, { filters }]`
- [ ] `staleTime` set appropriately (1-5 min for non-critical data)
- [ ] N+1 query patterns avoided

---

## MEDIUM PRIORITY: Error Handling

CI cannot verify UX patterns:

- [ ] `useAppToast` used for user-facing errors
- [ ] Loading and error states handled in UI
- [ ] Network errors don't expose internal details

---

## MEDIUM PRIORITY: Accessibility

CI has no accessibility linting:

- [ ] Icon-only buttons have `aria-label`
- [ ] Inputs have associated labels
- [ ] Images have `alt` text
- [ ] Interactive elements keyboard accessible
- [ ] Focus rings visible

---

## LOW PRIORITY: UI Patterns

These are style preferences, not critical issues:

- [ ] Semantic colors used (`bg-primary`, not `bg-[#hex]`)
- [ ] `Skeleton` for loading states (not spinners)
- [ ] `EmptyState` for empty lists
- [ ] Existing UI components from `src/components/ui/` used

---

## LOW PRIORITY: Documentation

- [ ] Complex functions have explanatory comments
- [ ] Public APIs have JSDoc

---

## Skip These (CI Catches Them)

Do NOT comment on - CI will flag automatically:

- `any` type usage
- Unused variables/imports
- Missing hook dependencies
- Console statements
- TypeScript type errors
- Hardcoded secrets
- SQL injection patterns
- Bundle size issues
