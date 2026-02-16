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
> have been adapted accordingly. A v3→v4 migration checklist is included in
> [references/patterns.md](references/patterns.md).

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

Detailed code examples for each pattern: [references/patterns.md](references/patterns.md)

1. **CVA Components** — Type-safe variant-based components using class-variance-authority
2. **Compound Components** — Multi-part components (Card, Dialog, etc.)
3. **Form Components** — React Hook Form + Zod with accessible inputs
4. **Responsive Grid** — CVA-based responsive grid system
5. **Animations** — Keyframes defined in tailwind.config.ts
6. **Dark Mode** — Class-based dark mode with CSS variable overrides

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

## Resources

* [Tailwind CSS v3 Documentation](https://v3.tailwindcss.com)
* [shadcn/ui Components](https://ui.shadcn.com)
* [CVA Documentation](https://cva.style)
* [Radix Primitives](https://radix-ui.com)
* [Tailwind CSS v4 Documentation](https://tailwindcss.com) (for future migration)
