---
name: tailwind-design-system
description: >-
  Tailwind CSS design system patterns for EquipQR, adapted from wshobson/agents
  tailwind-design-system skill (v4). Covers design tokens, component variants
  (CVA), compound components, form patterns, responsive grids, animations, dark
  mode, and v3→v4 migration guidance. Use when creating or modifying Tailwind-
  styled components, working with design tokens, or reviewing UI component code.
license: MIT
metadata:
  author: wshobson
  version: "1.0.0"
  source_repo: wshobson/agents
  adapted_for: EquipQR
---

# Tailwind Design System (adapted for EquipQR)

Build production-ready design systems with Tailwind CSS, including design tokens, component variants, responsive patterns, and accessibility.

> **Note**: The upstream skill targets Tailwind CSS v4. EquipQR currently uses
> **Tailwind CSS v3** (`^3.4.11`) with `tailwind.config.ts`, HSL-based CSS
> variables in `src/index.css`, and `tailwindcss-animate`. All patterns below
> have been adapted accordingly. A v3→v4 migration checklist is included at the
> bottom for future reference.

## When to Use This Skill

* Creating or modifying UI components with Tailwind
* Implementing design tokens or theming
* Building responsive and accessible components
* Standardizing UI patterns across the codebase
* Working with CVA (Class Variance Authority) variants
* Reviewing component styling for consistency

## EquipQR Applicability Notes (Important)

This repository uses **Tailwind v3 + shadcn/ui + Radix primitives**. When applying these patterns:

- **Configuration**: EquipQR uses `tailwind.config.ts` (not CSS `@theme` blocks). All color/spacing/animation tokens are defined there.
- **CSS Variables**: HSL-based variables live in `src/index.css` under `@layer base :root` and `.dark`. Reference them via `hsl(var(--token-name))` in the config.
- **Dark Mode**: Configured as `darkMode: ["class"]` in `tailwind.config.ts`. Dark overrides live in `.dark { ... }` in `src/index.css`.
- **Animations**: Use `tailwindcss-animate` plugin plus custom keyframes in `tailwind.config.ts`.
- **Components**: Always use existing primitives from `src/components/ui/` (shadcn/ui). Do not create custom buttons, dialogs, etc.
- **Icons**: Import from `lucide-react`.
- **`forwardRef`**: EquipQR uses React 18, so `forwardRef` is still required (unlike React 19).

## Core Concepts

### 1. Design Token Hierarchy

```text
Brand Tokens (abstract)
    └── Semantic Tokens (purpose)
        └── Component Tokens (specific)

Example (EquipQR):
    HSL(258 82% 57%) → --primary → bg-primary
```

EquipQR's tokens are defined in two places:
- **CSS variables** in `src/index.css` (`:root` and `.dark`)
- **Tailwind mapping** in `tailwind.config.ts` → `theme.extend.colors`

### 2. Component Architecture

```text
Base styles → Variants → Sizes → States → Overrides
```

## Patterns

### Pattern 1: CVA (Class Variance Authority) Components

```typescript
// components/ui/button.tsx
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

// Usage
<Button variant="destructive" size="lg">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button asChild><Link to="/home">Home</Link></Button>
```

### Pattern 2: Compound Components

```typescript
// components/ui/card.tsx
import { cn } from '@/lib/utils'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm',
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

// ... CardTitle, CardDescription, CardContent, CardFooter follow the same pattern

// Usage
<Card>
  <CardHeader>
    <CardTitle>Account</CardTitle>
    <CardDescription>Manage your account settings</CardDescription>
  </CardHeader>
  <CardContent>
    <form>...</form>
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Pattern 3: Form Components

```typescript
// components/ui/input.tsx
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <div className="relative">
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${props.id}-error`}
          className="mt-1 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
)
Input.displayName = 'Input'

// Usage with React Hook Form + Zod (EquipQR standard)
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
      </div>
      <Button type="submit" className="w-full">Sign In</Button>
    </form>
  )
}
```

### Pattern 4: Responsive Grid System

```typescript
// Reusable grid pattern using EquipQR's breakpoints (xs, sm, md, lg, xl, 2xl)
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const gridVariants = cva('grid', {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    },
    gap: {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    cols: 3,
    gap: 'md',
  },
})

interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {}

function Grid({ className, cols, gap, ...props }: GridProps) {
  return (
    <div className={cn(gridVariants({ cols, gap, className }))} {...props} />
  )
}

// Usage
<Grid cols={4} gap="lg">
  {items.map((item) => (
    <ItemCard key={item.id} item={item} />
  ))}
</Grid>
```

### Pattern 5: Animations (EquipQR v3 approach)

EquipQR defines keyframes and animations in `tailwind.config.ts`:

```typescript
// tailwind.config.ts (already configured)
keyframes: {
  'fade-in': {
    from: { opacity: '0' },
    to: { opacity: '1' }
  },
  'slide-up': {
    from: { transform: 'translateY(100%)' },
    to: { transform: 'translateY(0)' }
  },
  'stagger-in': {
    from: { opacity: '0', transform: 'translateY(8px)' },
    to: { opacity: '1', transform: 'translateY(0)' }
  },
},
animation: {
  'fade-in': 'fade-in 0.2s ease-out',
  'slide-up': 'slide-up 0.3s ease-out',
  'stagger-in': 'stagger-in 0.3s ease-out forwards',
}
```

Usage in components:

```tsx
// Dialog overlay
<DialogOverlay className="data-[state=open]:animate-fade-in" />

// Bottom sheet
<SheetContent className="animate-slide-up" />

// Staggered list items
{items.map((item, i) => (
  <div
    key={item.id}
    className="animate-stagger-in"
    style={{ animationDelay: `${i * 50}ms` }}
  >
    <ItemCard item={item} />
  </div>
))}
```

### Pattern 6: Dark Mode (EquipQR v3 approach)

EquipQR's dark mode uses `darkMode: ["class"]` in `tailwind.config.ts` and CSS variable overrides in `src/index.css`.

```css
/* src/index.css - already configured */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 258 82% 57%;
    /* ... more tokens */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 258 82% 67%;
    /* ... dark overrides */
  }
}
```

Toggle via the existing `ThemeProvider` context:

```tsx
import { useTheme } from '@/contexts/ThemeProvider'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

## Utility Functions

```typescript
// lib/utils.ts (already in EquipQR)
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## EquipQR-Specific Design Tokens

EquipQR extends the standard shadcn/ui token set with domain-specific tokens:

| Category | Tokens | Example Usage |
|---|---|---|
| Status colors | `--status-open`, `--status-assigned`, `--status-in-progress`, `--status-completed`, `--status-cancelled`, `--status-overdue` | `bg-status-open`, `text-status-completed` |
| Equipment | `--equipment-operational`, `--equipment-maintenance`, `--equipment-repair`, `--equipment-retired` | `bg-equipment-operational` |
| Priority | `--priority-low`, `--priority-medium`, `--priority-high`, `--priority-critical` | `text-priority-high` |
| Semantic | `--success`, `--info`, `--warning`, `--brand` | `bg-success`, `text-info` |
| Elevation | `shadow-elevation-1` through `shadow-elevation-4` | `shadow-elevation-2` |
| Sidebar | `--sidebar-background`, `--sidebar-foreground`, etc. | `bg-sidebar` |

## Best Practices

### Do's

* **Use semantic tokens** — `bg-primary` not `bg-[hsl(258,82%,57%)]`
* **Compose with CVA** — Type-safe variants for component APIs
* **Use `cn()` helper** — Merge classes safely with `tailwind-merge`
* **Check `src/components/ui/` first** — Use existing shadcn/ui primitives
* **Add accessibility** — ARIA attributes, focus-visible states, sr-only labels
* **Mobile-first** — Use `sm:`, `md:`, `lg:` responsive prefixes
* **Use EquipQR tokens** — Status, priority, and equipment colors for domain objects

### Don'ts

* **Don't hardcode colors** — Use semantic tokens from the design system
* **Don't use arbitrary values** — Extend `tailwind.config.ts` instead
* **Don't create custom UI primitives** — Use shadcn/ui components
* **Don't use inline styles** — Use Tailwind utilities or CSS variables
* **Don't skip focus states** — All interactive elements need `focus-visible:` styles
* **Don't forget dark mode** — Test both themes; use CSS variable tokens

## v3 → v4 Migration Reference (Future)

When EquipQR upgrades to Tailwind v4, apply these changes:

| v3 Pattern | v4 Pattern |
|---|---|
| `tailwind.config.ts` | `@theme` in CSS |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `darkMode: "class"` | `@custom-variant dark (&:where(.dark, .dark *))` |
| `theme.extend.colors` | `@theme { --color-*: value }` |
| `require("tailwindcss-animate")` | CSS `@keyframes` in `@theme` + `@starting-style` |
| `h-10 w-10` | `size-10` |
| `forwardRef` (React 18) | ref as prop (React 19) |

### Migration Checklist

- [ ] Replace `tailwind.config.ts` with CSS `@theme` block
- [ ] Change `@tailwind base/components/utilities` to `@import "tailwindcss"`
- [ ] Move color definitions to `@theme { --color-*: value }`
- [ ] Replace `darkMode: "class"` with `@custom-variant dark`
- [ ] Move `@keyframes` inside `@theme` blocks
- [ ] Replace `tailwindcss-animate` with native CSS animations
- [ ] Update `h-10 w-10` to `size-10` (new utility)
- [ ] Consider OKLCH colors for better perceptual uniformity
- [ ] Replace custom plugins with `@utility` directives

## Resources

* [Tailwind CSS v3 Documentation](https://v3.tailwindcss.com)
* [shadcn/ui Components](https://ui.shadcn.com)
* [CVA Documentation](https://cva.style)
* [Radix Primitives](https://radix-ui.com)
* [Tailwind CSS v4 Documentation](https://tailwindcss.com) (for future migration)
