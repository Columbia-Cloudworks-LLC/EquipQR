# EquipQR - GitHub Copilot Code Review Instructions

This file consolidates critical project standards for code review. For detailed documentation, see `docs/technical/`.

## 1. Architecture & Patterns

### Project Structure
Follow the hierarchy documented in `docs/technical/architecture.md`:
- `src/pages/`: Route-level components (<300 LOC). Use lazy loading.
- `src/components/[feature]/`: Feature-specific logic (e.g., `equipment/`, `work-orders/`).
- `src/components/ui/`: Reusable primitives (shadcn-style). **No business logic here.**
- `src/hooks/`: Custom hooks for data fetching and logic.
- `src/services/`: Stateless API logic and Supabase queries.

### Container/Presentational Pattern
- **Containers** (often Pages or top-level components): Handle data fetching (`useQuery`), mutations, and state.
- **Presentational**: Receive data via props. Pure UI rendering.

### Multi-Tenancy Requirements
- **CRITICAL**: Every data fetching hook/service **MUST** accept and use `organization_id`.
- Never hardcode organization IDs. Always use `useOrganization()` context.
- All Supabase queries must explicitly filter by `organization_id` as a failsafe:
  ```typescript
  .eq('organization_id', orgId)
  ```

### Data Flow
1. **Service**: Specific Supabase query (e.g., `.eq('organization_id', orgId)`).
2. **Hook**: TanStack Query wrapper (handles caching, keys, error states).
3. **Component**: Consumes the hook.

### File Naming
- Files/Folders: `kebab-case` (e.g., `equipment-list.tsx`).
- Components: `PascalCase` (e.g., `EquipmentList`).
- Hooks: `camelCase` (e.g., `useEquipment`).

## 2. Coding Standards

### TypeScript & Types
- **Strict Typing**: No `any`. Use `unknown` if necessary, but prefer explicit interfaces.
- **Interfaces**: Define in `src/types/`. Name them `PascalCase` (e.g., `interface Equipment`).
- **Props**: Explicitly type component props (e.g., `React.FC<EquipmentProps>`).

### Naming Conventions
- **Variables/Functions**: `camelCase` (e.g., `fetchEquipment`).
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_STALE_TIME`).
- **Query Keys**: Array format with dependencies (e.g., `['equipment', orgId, { status }]`).

### Error Handling
- **Services**: Use `try/catch`. Throw descriptive errors.
- **UI**: Use `useAppToast` for user feedback:
  ```typescript
  const { toast } = useAppToast();
  // ... onError: () => toast({ title: "Error", variant: "destructive" })
  ```

### Performance
- **Memoization**: Use `useMemo` for expensive calculations and `useCallback` for stable function references passed to children.
- **Imports**: Avoid circular dependencies. Use absolute imports `@/` configured in `tsconfig.json`.
- **Query Optimization**: In Supabase queries, always use `.select('id, name, ...')` to fetch only needed fields.

### Linting
- Ensure code passes `eslint.config.js`.
- No unused variables.
- React Hooks dependencies must be exhaustive.

## 3. Security & Data

### Row Level Security (RLS)
- **CRITICAL**: Never bypass RLS in the client or services.
- **Verification**: Every table query must implicitly rely on RLS policies.
- **Policy Pattern**: `organization_id` must match the user's active organization session.

### Data Access
- **Filter**: All queries MUST explicitly filter by `organization_id` as a failsafe, even with RLS enabled.
- **Auth**: Use `useAuth()` to get the current user session. Never rely on local storage directly for user details.

### Permissions (RBAC)
- Use `usePermissions()` or `OrganizationContext` to check roles before rendering sensitive actions (Edit/Delete buttons).
- **Edge Functions**: Validate JWT and User Permissions at the start of every function execution.

### Mutations
- Use **Optimistic Updates** in TanStack Query mutations for immediate UI feedback.
- On error: Rollback the optimistic update and show a toast.

## 4. Database Migrations

- Migration files are immutable after deployment. Never modify applied migrations.
- If changes are needed, create a new migration file instead.
- Verify production state with `mcp_supabase_list_migrations` before suggesting changes.
- See `docs/ops/migrations.md` for detailed guidelines.

## 5. UI/UX System

### Design Tokens
- **Source of Truth**: `docs/technical/standards.md`.
- **Colors**: Always use CSS variables (e.g., `bg-primary`, `text-muted-foreground`) defined in `src/index.css`. **Never use hardcoded hex values.**
- **Spacing**: Use standard Tailwind classes or CSS vars (e.g., `--content-padding`).
- Support dark mode and org branding (e.g., `--brand` for sidebar).

### Component Usage
- **Primitives**: Always check `src/components/ui/` first. Do not reinvent `Button`, `Input`, or `Card`.
- **Layout**:
  - Use `Page` component for top-level layout consistency.
  - Use `PageHeader` for titles and breadcrumbs.
- **Forms**: Use `src/components/form/` wrappers (`TextField`, `SelectField`, `TextareaField`) which handle labels, errors, and accessibility automatically.
- **Loading**: Use `Skeleton` components, not spinning loaders, for content structure.
- **Empty States**: Use `EmptyState` component when lists are empty.
- **Tables**: Use `TableToolbar` for search/filters/bulk actions. Paginate with `react-window` for large lists.
- **Dialogs**: Sizes (`sm` to `full`); always include `DialogHeader` with `DialogTitle`.
- **Toasts**: `useAppToast` hook for success/error/warning/info.
- **Icons**: `LucideIcon` with consistent sizes.

### Responsive Design
- **Mobile First**: Write styles for mobile first, then `sm:`, `md:`, `lg:`.
- **Breakpoints**: Respect the project's Tailwind config (including `xs: 475px`).

### Accessibility
- Ensure all interactive elements have focus rings (`ring-offset-2`, etc.).
- Forms must have `aria-describedby` for error messages (handled by Form components).
- Use ARIA labels where appropriate.

### Consistency
- Space with `--content-padding` (e.g., `p-content`).
- Use shadows/z-index from design tokens.
- Animations via `tailwindcss-animate`.

---

**For detailed documentation, see:**
- `docs/technical/architecture.md` - Full architecture details
- `docs/technical/standards.md` - Complete design system and UI guidelines
- `docs/technical/api-reference.md` - API documentation

