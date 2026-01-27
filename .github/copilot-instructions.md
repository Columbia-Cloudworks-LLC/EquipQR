# EquipQR - GitHub Copilot Code Review Instructions

These instructions guide Copilot code review across all files in this repository.
Language and framework-specific rules are in `.github/instructions/`.

## Purpose

EquipQR is a multi-tenant equipment management SaaS built with React, TypeScript, and Supabase.
Critical concerns: **multi-tenancy isolation**, **RLS security**, and **RBAC permissions**.

## What CI Already Catches

The following are automatically flagged by our CI pipeline—Copilot should **not** focus on these:

- **ESLint**: `any` types, unused variables, hook dependency arrays, console usage
- **TypeScript**: Type errors (`tsc --noEmit`)
- **CodeQL**: Hardcoded secrets, SQL injection, XSS vulnerabilities
- **npm-audit-ci**: Dependency vulnerabilities
- **Quality Gates**: Bundle size limits (12MB total, 500KB gzipped per bundle)
- **Vitest**: Test coverage (51% baseline)

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

## Accessibility (MEDIUM PRIORITY)

**CI has no accessibility linting.**

- Icon-only buttons must have `aria-label`
- All inputs must have associated labels
- Images must have descriptive `alt` text
- Interactive elements must be keyboard accessible

```typescript
// VIOLATION
<button onClick={handleClick}>
  <TrashIcon />
</button>

// CORRECT
<button onClick={handleClick} aria-label="Delete equipment">
  <TrashIcon />
</button>
```

---

## UI Component Patterns (LOW PRIORITY)

- Use semantic colors: `bg-primary`, `text-muted-foreground`
- Never use hardcoded hex values (e.g., `bg-[#6366f1]`)
- Check `src/components/ui/` before creating new components
- Use `Skeleton` for loading states, not spinners
- Use `EmptyState` component for empty lists

---

## Review Style Guidance

- Prioritize: Multi-tenancy > RBAC > Query patterns > Accessibility > Style
- Be specific and actionable in feedback
- Explain the "why" behind recommendations

---

**For detailed documentation, see:**

- `docs/technical/architecture.md` - Full architecture details
- `docs/technical/standards.md` - Complete design system and UI guidelines
- `docs/ops/migrations.md` - Database migration guidelines
