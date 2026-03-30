---
name: level
description: Use when auditing accessibility, keyboard support, contrast, responsive behavior, or experience parity across mobile, tablet, and desktop views.
---

# Level

## Symbolism

The level reminds the builder to meet every user on equal ground.

## Purpose

Perform an accessibility and platform-parity audit so no user is disadvantaged by device, viewport, or assistive need.

In this repository, favor technician speed and legibility on mobile first while maintaining equal polish for tablet and desktop.

## Invocation

- `/level`
- `/level <optional-scope-path>`

## Operating Rules

1. Evaluate WCAG alignment, semantic structure, keyboard support, focus behavior, and contrast together.
2. Review mobile, tablet, and desktop parity instead of assuming one responsive layout is enough.
3. Check light mode, dark mode, and reduced-motion concerns when relevant.
4. Prioritize critical task completion for real users over cosmetic perfection.
5. Report both a11y defects and device-specific parity gaps.

## Workflow

Copy this checklist and track it while running:

```markdown
Level Progress
- [ ] 1) Confirm scope and primary user flows
- [ ] 2) Inspect semantics, labels, focus, and keyboard navigation
- [ ] 3) Review contrast, motion, and responsive layout parity
- [ ] 4) Rank user-impacting accessibility and parity gaps
- [ ] 5) Propose remediation steps
```

### 1) Confirm scope and primary user flows

Identify the key tasks, target devices, and assistive expectations in the scoped UI.

### 2) Inspect semantics, labels, focus, and keyboard navigation

Check:

- accessible names and labels
- heading and landmark structure
- tab order and focus visibility
- keyboard-only completion of key flows

### 3) Review contrast, motion, and responsive layout parity

Look for viewport-specific regressions, low-contrast states, missing touch affordances, clipped content, or motion that should respect reduced-motion preferences.

### 4) Rank user-impacting accessibility and parity gaps

Separate blockers from inconveniences and note which user groups are most affected.

### 5) Propose remediation steps

Recommend the smallest changes that restore equitable access and usable layouts across devices.

## Output Contract

1. **Accessibility Snapshot**
2. **Critical and High-Impact Findings**
3. **Platform Parity Gaps**
4. **Remediation Plan**
5. **Next Step**

## Guardrails

- Do not treat responsive layout alone as proof of accessibility.
- Do not ignore keyboard and screen-reader usage while focusing only on visuals.
- Do not recommend fixes that make desktop cleaner but mobile harder for technicians to use.
- Do not claim WCAG compliance without calling out what was and was not verified.
