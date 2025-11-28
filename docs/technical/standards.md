# Coding Standards and UI System Guide

This guide documents the comprehensive coding standards and UI system for EquipQR™, providing consistent design tokens, components, patterns, and development practices.

## Coding Standards

### TypeScript

From `tsconfig.json` – baseUrl `@/*`, allowJs true, but prefer explicit types. Avoid `any` (warn via ESLint); use interfaces for props/data (e.g., `interface Equipment { id: string; ... }`). Define types in `src/types/` (e.g., `equipment.ts`).

#### TypeScript Usage
```typescript
// ✅ Good: Proper typing
interface EquipmentProps {
  equipment: Equipment;
  onEdit: (id: string) => void;
}

const EquipmentCard: React.FC<EquipmentProps> = ({ equipment, onEdit }) => {
  // Implementation
};

// ❌ Bad: Using any
const EquipmentCard = ({ equipment }: any) => {
  // Implementation
};
```

### ESLint

Follow `eslint.config.js` – no unused vars/explicit any (warn), React hooks rules. Run `npm run lint` before commits. Use `typescript-eslint` for TS-specific rules.

### Naming Conventions

- **Variables/Functions**: camelCase (e.g., `fetchEquipment`)
- **Components/Types**: PascalCase (e.g., `EquipmentCard`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_STALE_TIME`)
- **Queries**: Descriptive TanStack keys (e.g., `['work-orders', orgId, status]`)

### Error Handling

Use try/catch in services; propagate via TanStack Query errors. Components: Show user-friendly messages (e.g., via `useAppToast`). Log with context (user/org ID).

```typescript
// ✅ Good: Proper error handling
const useEquipment = (orgId: string) => {
  return useQuery({
    queryKey: ['equipment', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', orgId);
      
      if (error) {
        console.error('Failed to fetch equipment:', error);
        throw new Error(`Failed to load equipment: ${error.message}`);
      }
      
      return data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};
```

### Performance

Memoize with `useMemo`/`useCallback`. Lazy-load routes/components. Limit re-renders with `React.memo`. In Supabase queries, use `select()` for specific fields to reduce payload.

```typescript
// Expensive calculations
const expensiveValue = useMemo(() => 
  calculateComplexMetrics(equipment), 
  [equipment]
);

// Stable callback references
const handleEquipmentUpdate = useCallback((id: string, data: EquipmentData) => {
  updateEquipment.mutate({ id, data });
}, [updateEquipment]);

// Lazy load heavy components
const FleetMap = lazy(() => import('./pages/FleetMap'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <FleetMap />
</Suspense>
```

### Comments

JSDoc for hooks/components. Reference docs for complex logic (e.g., "// See database-schema.md for RLS details").

## UI System Guide

This guide documents the comprehensive UI system implemented for EquipQR™, providing consistent design tokens, components, and patterns.

### Design Tokens

#### Colors
All colors are defined as CSS variables in `src/index.css` and exposed through Tailwind utilities:

```css
:root {
  /* Primary colors */
  --primary: 258 82% 57%;
  --primary-foreground: 210 40% 98%;
  
  /* Semantic colors */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --destructive: 0 84.2% 60.2%;
  --info: 217 91% 60%;
  
  /* Brand colors */
  --brand: var(--primary);
  --brand-foreground: var(--primary-foreground);
}
```

#### Spacing
Consistent spacing tokens for content padding:

```css
:root {
  --content-padding: 1.5rem; /* p-6 */
  --content-padding-sm: 1rem; /* p-4 */
  --content-padding-xs: 0.75rem; /* p-3 */
  --content-padding-lg: 2rem; /* p-8 */
}
```

#### Typography
Standardized font sizes and line heights:

```css
:root {
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
}
```

#### Shadows
Consistent shadow system:

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

#### Z-Index Scale
Organized z-index system:

```css
:root {
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-toast: 1080;
}
```

## Layout Components

### Page Component
Provides consistent page layout with standardized padding and max-width:

```tsx
import Page from '@/components/layout/Page';

<Page maxWidth="7xl" padding="responsive">
  <h1>Page Content</h1>
</Page>
```

**Props:**
- `maxWidth`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'
- `padding`: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'responsive'
- `centered`: boolean (default: true)

### PageHeader Component
Standardized page headers with breadcrumbs and actions:

```tsx
import PageHeader from '@/components/layout/PageHeader';

<PageHeader
  title="Page Title"
  description="Page description"
  breadcrumbs={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Current Page', href: '#' }
  ]}
  actions={<Button>Add Item</Button>}
/>
```

## Form Components

### TextField
Standardized text input with validation:

```tsx
import TextField from '@/components/form/TextField';

<TextField
  name="email"
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  description="We'll never share your email"
  required
/>
```

### SelectField
Dropdown select with options:

```tsx
import SelectField from '@/components/form/SelectField';

<SelectField
  name="role"
  label="Role"
  placeholder="Select a role"
  options={[
    { value: 'admin', label: 'Administrator' },
    { value: 'user', label: 'User' }
  ]}
  required
/>
```

### TextareaField
Multi-line text input:

```tsx
import TextareaField from '@/components/form/TextareaField';

<TextareaField
  name="description"
  label="Description"
  placeholder="Enter description"
  rows={4}
/>
```

## UI Components

### Skeleton
Loading state placeholder:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-4 w-[200px]" />
```

### EmptyState
Consistent empty state messaging:

```tsx
import EmptyState from '@/components/ui/empty-state';

<EmptyState
  icon={Package}
  title="No items found"
  description="Get started by creating your first item."
  action={<Button>Create Item</Button>}
/>
```

### TableToolbar
Search, filters, and bulk actions for tables:

```tsx
import TableToolbar from '@/components/ui/table-toolbar';

<TableToolbar
  searchValue={searchValue}
  onSearchChange={setSearchValue}
  searchPlaceholder="Search items..."
  selectedCount={selectedItems.length}
  bulkActions={[
    { label: 'Delete', onClick: handleDelete, icon: <Trash2 /> }
  ]}
  actions={<Button>Add Item</Button>}
/>
```

## Dialog System

### Standardized Sizes
Dialogs now support consistent sizing:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog>
  <DialogContent size="lg">
    <DialogHeader>
      <DialogTitle>Large Dialog</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

**Available sizes:**
- `sm`: max-w-sm
- `md`: max-w-lg (default)
- `lg`: max-w-2xl
- `xl`: max-w-4xl
- `full`: max-w-[95vw] max-h-[95vh]

## Toast System

### useAppToast Hook
Standardized toast notifications:

```tsx
import { useAppToast } from '@/hooks/useAppToast';

const { success, error, warning, info } = useAppToast();

// Usage
success({ title: 'Success!', description: 'Operation completed' });
error({ title: 'Error!', description: 'Something went wrong' });
warning({ title: 'Warning!', description: 'Please check input' });
info({ title: 'Info', description: 'Here is information' });
```

## Icon System

### Standardized Sizes
Consistent icon sizing throughout the application:

```tsx
import LucideIcon from '@/components/ui/LucideIcon';

<LucideIcon icon={Package} size="sm" />   // 16px
<LucideIcon icon={Package} size="base" /> // 20px (default)
<LucideIcon icon={Package} size="lg" />   // 24px
<LucideIcon icon={Package} size="xl" />   // 28px
```

**Available sizes:**
- `xs`: 12px
- `sm`: 16px
- `base`: 20px (default)
- `lg`: 24px
- `xl`: 28px
- `2xl`: 32px

## Organization Branding

### CSS Variables
Organization colors are now applied via CSS variables:

```tsx
// AppSidebar automatically applies organization branding
const sidebarStyle = {
  '--brand': orgBackgroundColor,
  '--brand-foreground': isLightBrand ? '#1a1a1a' : '#ffffff',
  backgroundColor: orgBackgroundColor,
};
```

This allows consistent usage of `text-brand-foreground`, `bg-brand`, etc. throughout the application.

## Accessibility

### Focus Management
All interactive elements use consistent focus rings:

```css
:root {
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-color: hsl(var(--ring));
}
```

### ARIA Attributes
Form components automatically include proper ARIA attributes:
- `aria-invalid` for validation states
- `aria-describedby` for descriptions and error messages
- `aria-current="page"` for breadcrumbs

## Dark Mode

All design tokens support dark mode with appropriate color adjustments. Dark mode shadows use higher opacity values for better visibility.

## Usage Guidelines

### Do's
- ✅ Use design tokens instead of hard-coded values
- ✅ Use Page component for consistent layout
- ✅ Use PageHeader for page titles and breadcrumbs
- ✅ Use form field components for all forms
- ✅ Use EmptyState for empty list states
- ✅ Use Skeleton for loading states
- ✅ Use useAppToast for notifications
- ✅ Use proper TypeScript types
- ✅ Follow naming conventions
- ✅ Handle errors gracefully
- ✅ Memoize expensive operations

### Don'ts
- ❌ Don't use hard-coded hex colors
- ❌ Don't use inline styles for spacing
- ❌ Don't create custom form fields without using the base components
- ❌ Don't use raw text-gray-* classes (use design tokens)
- ❌ Don't create custom loading states (use Skeleton)
- ❌ Don't use `any` type
- ❌ Don't skip error handling
- ❌ Don't forget to memoize callbacks

## Migration Guide

### Replacing Hard-coded Colors
```tsx
// Before
<div className="text-gray-600 bg-gray-100">

// After
<div className="text-muted-foreground bg-muted">
```

### Using Page Layout
```tsx
// Before
<main className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto">

// After
<Page maxWidth="7xl" padding="responsive">
```

### Standardizing Forms
```tsx
// Before
<div className="space-y-2">
  <label>Name</label>
  <input />
  <p className="text-red-500">Error message</p>
</div>

// After
<TextField
  name="name"
  label="Name"
  required
/>
```

This UI system and coding standards ensure consistency, accessibility, and maintainability across the entire application.

