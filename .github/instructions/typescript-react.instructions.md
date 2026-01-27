---
applyTo: "**/*.{ts,tsx}"
---

# TypeScript & React Development Standards

## Purpose

Standards for TypeScript and React code in the EquipQR codebase.
Uses React 18.3+, TypeScript 5.6+, TanStack Query v5, and shadcn/ui.

## What CI Already Catches

Do NOT focus on these - ESLint and TypeScript already flag them:

- `any` type usage (`@typescript-eslint/no-explicit-any`)
- Unused variables and imports (`@typescript-eslint/no-unused-vars`)
- Hook dependency arrays (`eslint-plugin-react-hooks`)
- Console statements (`no-console`)
- Type errors (`tsc --noEmit`)

Focus on **patterns and architecture** that linting cannot detect.

---

## Service Layer Pattern (HIGH PRIORITY)

Components must NOT call Supabase directly. Enforce:

1. **Service**: Supabase queries in `src/services/` or `src/features/*/services/`
2. **Hook**: TanStack Query wrapper in `src/hooks/` or `src/features/*/hooks/`
3. **Component**: Consumes the hook

```typescript
// VIOLATION: Direct Supabase call in component
function EquipmentList() {
  const { data } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => supabase.from('equipment').select('*'),
  });
}

// CORRECT: Service layer
function EquipmentList() {
  const { data } = useEquipmentList(orgId);
}
```

---

## Container/Presentational Pattern (MEDIUM PRIORITY)

Separate data fetching from UI rendering:

```typescript
// Container: handles data
function EquipmentListContainer() {
  const { data, isLoading } = useEquipmentList(orgId);
  return <EquipmentList equipment={data} isLoading={isLoading} />;
}

// Presentational: pure UI
function EquipmentList({ equipment, isLoading }: EquipmentListProps) {
  if (isLoading) return <Skeleton />;
  return equipment.map((e) => <EquipmentCard key={e.id} {...e} />);
}
```

---

## TanStack Query Patterns (HIGH PRIORITY)

- Query keys must include dependencies: `['equipment', orgId, { status }]`
- Set appropriate `staleTime` (1-5 minutes for non-critical data)
- Invalidate queries on mutation success
- Use optimistic updates for immediate feedback

```typescript
// VIOLATION: Missing staleTime and org dependency
useQuery({ queryKey: ['equipment'], queryFn: fn });

// CORRECT
useQuery({
  queryKey: ['equipment', orgId],
  queryFn: () => fetchEquipment(orgId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Multi-Tenancy in Hooks (HIGH PRIORITY)

All data hooks must accept and use `organizationId`:

```typescript
// VIOLATION: No org parameter
function useEquipmentList() {
  return useQuery({
    queryKey: ['equipment'],
    queryFn: () => fetchEquipment(),
  });
}

// CORRECT: Org-scoped
function useEquipmentList(organizationId: string) {
  return useQuery({
    queryKey: ['equipment', organizationId],
    queryFn: () => fetchEquipment(organizationId),
    enabled: !!organizationId,
  });
}
```

---

## Error Handling (MEDIUM PRIORITY)

- Services: throw descriptive errors
- Components: use `useAppToast` for user feedback
- Handle loading and error states in UI

```typescript
// Service layer
async function fetchEquipment(orgId: string): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select('id, name')
    .eq('organization_id', orgId);

  if (error) throw new Error(`Failed to fetch equipment: ${error.message}`);
  return data;
}

// Component layer
const { toast } = useAppToast();
useMutation({
  mutationFn: createEquipment,
  onError: (error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});
```

---

## UI Components (shadcn/ui) (LOW PRIORITY)

- Check `src/components/ui/` before creating new components
- Use semantic colors: `bg-primary`, `text-muted-foreground`
- Use `Skeleton` for loading states, not spinners
- Use `EmptyState` when lists are empty

```typescript
// VIOLATION
<div className="bg-[#6366f1]">

// CORRECT
<div className="bg-primary">
```

---

## Forms (LOW PRIORITY)

- Use form wrappers from `src/components/form/` (`TextField`, `SelectField`)
- Use React Hook Form + Zod for validation
- Forms must have proper accessibility (labels, error descriptions)

---

## Accessibility (MEDIUM PRIORITY)

CI has no accessibility linting. Check:

- Icon-only buttons have `aria-label`
- Inputs have associated labels
- Images have descriptive `alt` text
- Focus rings on interactive elements

```typescript
// VIOLATION
<button onClick={handleClick}>
  <Icon />
</button>

// CORRECT
<button onClick={handleClick} aria-label="Delete equipment">
  <Icon />
</button>
```

---

## Performance (LOW PRIORITY)

Most performance issues are caught by bundle size checks. Focus on:

- N+1 query patterns
- Missing query field selection (`.select('*')`)
- Large lists without virtualization (`react-window`)

---

## Naming Conventions (LOW PRIORITY)

ESLint doesn't enforce business naming. Check:

- Components/Types: PascalCase (`WorkOrderCard`, `Equipment`)
- Hooks: camelCase with `use` prefix (`useEquipment`)
- Files: kebab-case (`work-order-card.tsx`)
- No `I` prefix for interfaces
