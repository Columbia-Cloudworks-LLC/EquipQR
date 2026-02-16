---
title: Use Activity Component for Show/Hide
impact: MEDIUM
impactDescription: preserves state/DOM
tags: rendering, activity, visibility, state-preservation
---

## Use Activity Component for Show/Hide

**Note:** This feature requires React 19+ (experimental). For React 18.x, use alternative patterns below.

Use React's `<Activity>` to preserve state/DOM for expensive components that frequently toggle visibility.

**Usage (React 19+):**

```tsx
import { Activity } from 'react'

function Dropdown({ isOpen }: Props) {
  return (
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
      <ExpensiveMenu />
    </Activity>
  )
}
```

**Alternative for React 18.x:**

Keep components mounted but hidden via CSS to preserve state:

```tsx
function Dropdown({ isOpen }: Props) {
  return (
    <div style={{ display: isOpen ? 'block' : 'none' }}>
      <ExpensiveMenu />
    </div>
  )
}
```

Or use `visibility: hidden` or `opacity: 0` with `pointer-events: none` to hide while preserving layout.

Avoids expensive re-renders and state loss.
