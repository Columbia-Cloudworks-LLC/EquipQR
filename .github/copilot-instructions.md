# EquipQR - GitHub Copilot Code Review Instructions

These instructions guide Copilot code review across all files in this repository.
Language and framework-specific rules are in `.github/instructions/`.

## Purpose

EquipQR is a multi-tenant equipment management SaaS built with React, TypeScript, and Supabase.
Critical concerns: **multi-tenancy isolation**, **RLS security**, and **RBAC permissions**.

---

## Review Philosophy

- **Only comment when you have HIGH CONFIDENCE (>80%) that an issue exists**
- Be concise: 1-2 sentences per comment when possible
- Focus on actionable feedback, not observations or "maybes"
- If you're uncertain whether something is an issue, **stay silent**
- Do not comment on things CI will catch (see below)

### Response Format

When you do comment, use this structure:

1. **State the problem** (1 sentence)
2. **Why it matters** (1 sentence, only if needed)
3. **Suggested fix** (code snippet or specific action)

```
Example:
This query fetches all columns but only uses `id` and `name`. Select only needed fields to reduce payload size.
```

### When to Stay Silent

Do NOT comment if:

- You're less than 80% confident it's a real issue
- The suggestion is speculative ("consider...", "might be...", "could potentially...")
- It's a style preference with no functional impact
- CI will catch it automatically
- It's a minor improvement that doesn't fix a bug, security issue, or performance problem

## What CI Already Catches

The following are automatically flagged by our CI pipeline—Copilot should **not** focus on these:

- **ESLint**: `any` types, unused variables, hook dependency arrays, console usage
- **TypeScript**: Type errors (`tsc --noEmit`)
- **CodeQL**: Hardcoded secrets, SQL injection, XSS vulnerabilities
- **npm-audit-ci**: Dependency vulnerabilities
- **Quality Gates**: Bundle size limits (12MB total, 500KB gzipped per bundle)
- **Vitest**: Test coverage (70% baseline)

Focus review time on **domain-specific patterns** that automated tools cannot detect.

---

## Multi-Tenancy Requirements (HIGH PRIORITY)

**CI cannot detect these domain-specific patterns.**

- Every data query MUST filter by `organization_id`
- Never hardcode organization IDs - use `useOrganization()` context
- Service functions must accept `organizationId` as a required parameter
- Mutations must include `organization_id` in insert/update payloads

```typescript
// VIOLATION: Missing organization_id filter
const { data } = await supabase.from('equipment').select('*');

// CORRECT: Always filter by organization
const { data } = await supabase
  .from('equipment')
  .select('id, name, status')
  .eq('organization_id', orgId);
```

---

## Service Layer Pattern (HIGH PRIORITY)

**CI cannot enforce architectural patterns.**

Components MUST NOT call Supabase directly. Enforce the service layer:

1. **Service** (`src/services/` or `src/features/*/services/`): Supabase queries
2. **Hook** (`src/hooks/` or `src/features/*/hooks/`): TanStack Query wrapper
3. **Component**: Consumes the hook

```typescript
// VIOLATION: Direct Supabase call in component
function EquipmentList() {
  const { data } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => supabase.from('equipment').select('*'),
  });
}

// CORRECT: Use service layer
function EquipmentList() {
  const { data } = useEquipmentList(orgId);
}
```

---

## Query Optimization (MEDIUM PRIORITY)

**CI cannot detect query inefficiencies.**

- Always select only needed fields: `.select('id, name, status')`
- Avoid N+1 query patterns
- Set appropriate `staleTime` (1-5 minutes for non-critical data)
- Query keys must include dependencies: `['equipment', orgId, { status }]`

```typescript
// VIOLATION: Overfetching
.select('*')

// CORRECT: Select specific fields
.select('id, name, status, created_at')
```

---

## RBAC Permission Checks (HIGH PRIORITY)

**CI cannot verify business logic for role-based access.**

- Use `usePermissions()` or RBAC context before sensitive operations
- Check roles before rendering Edit/Delete buttons
- Edge Functions must validate permissions at the start

```typescript
// VIOLATION: No permission check before delete
<Button onClick={handleDelete}>Delete</Button>

// CORRECT: Check permissions
const { canDelete } = usePermissions();
{canDelete && <Button onClick={handleDelete}>Delete</Button>}
```

---

## RLS Policy Awareness (MEDIUM PRIORITY)

**CI cannot reason about RLS bypass patterns.**

- Never use `service_role` key outside approved Edge Functions
- Client code must rely on RLS - don't implement duplicate filtering that suggests RLS distrust
- Flag any code that attempts to bypass RLS or use admin clients

---

## Error Handling Patterns (MEDIUM PRIORITY)

**CI cannot verify UX patterns.**

- Show user feedback via `useAppToast` on errors
- Handle loading and error states in UI
- Network errors should not expose internal details

```typescript
// CORRECT: User-friendly error handling
const { toast } = useAppToast();
useMutation({
  mutationFn: createEquipment,
  onError: (error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});
```

---

## Accessibility (MEDIUM PRIORITY - Comment Only on Clear Violations)

**CI has no accessibility linting.** Only comment when there's an obvious, high-confidence violation:

- Icon-only buttons missing `aria-label`
- Inputs without associated labels
- Images missing `alt` text

```typescript
// CLEAR VIOLATION - worth commenting
<button onClick={handleClick}>
  <TrashIcon />
</button>

// CORRECT
<button onClick={handleClick} aria-label="Delete equipment">
  <TrashIcon />
</button>
```

**Do not comment on:** keyboard navigation unless there's a clear broken flow, or minor labeling improvements.

---

## UI Component Patterns (LOW PRIORITY - Usually Skip)

These are style preferences. **Only comment if there's a clear violation with functional impact:**

- Use semantic colors: `bg-primary`, `text-muted-foreground`
- Never use hardcoded hex values (e.g., `bg-[#6366f1]`)
- Check `src/components/ui/` before creating new components
- Use `Skeleton` for loading states, not spinners
- Use `EmptyState` component for empty lists

**In most cases, skip commenting on UI patterns entirely.**

---

## Skip These (Low Value - Do NOT Comment)

These are **not worth commenting on**—they add noise without value:

- Style/formatting (ESLint, Prettier handle this)
- TypeScript type errors (CI catches these)
- Unused imports/variables (ESLint catches these)
- Minor naming suggestions
- Suggestions to add comments or documentation
- Refactoring ideas that don't fix a real bug
- Theoretical edge cases with no practical impact
- "Consider using X instead of Y" without a concrete problem
- Speculative performance improvements without evidence
- Alternative API/library suggestions
- Clipboard/paste formatting preservation ideas
- Filename collision concerns for timestamps
- Hash or unique ID suggestions for filenames

---

## Priority Order

When reviewing, focus on issues in this order:

1. **Multi-tenancy** - Missing `organization_id` filters (data leakage risk)
2. **Security/RBAC** - Missing permission checks, credential exposure
3. **Correctness** - Logic errors, race conditions, resource leaks
4. **Performance** - N+1 queries, missing pagination, memory exhaustion
5. **Accessibility** - Missing aria-labels, keyboard navigation

Only comment on categories 1-4 unless there's a clear, high-confidence issue.
Style and minor improvements should be **skipped entirely**.

---

**For detailed documentation, see:**

- `docs/technical/architecture.md` - Full architecture details
- `docs/technical/standards.md` - Complete design system and UI guidelines
- `docs/technical/testing-guidelines.md` - Test patterns and coverage expectations
- `docs/ops/migrations.md` - Database migration guidelines
- `docs/ops/ci-cd-pipeline.md` - CI/CD pipeline and quality gates
- `docs/guides/permissions.md` - RBAC and permissions system
