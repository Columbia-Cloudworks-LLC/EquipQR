# 02: MOBILE CRITIQUE

You are reviewing EquipQR in the Perplexity Comet browser. EquipQR is a multi-tenant fleet equipment management app for heavy equipment repair shops. Users scan QR codes and perform work orders and preventative maintenance (PMs) on heavy equipment. Primary users are field technicians on mobile devices.

**Scope:** This critique applies to virtually any page or series of pages in the app. You may be given a single URL or asked to navigate through multiple pages. Critique whatever you encounter.

**Viewport:** Mobile only. Resize the browser to a mobile viewport (e.g. 390×844 or similar). Do not use desktop width. All feedback must be from a mobile/technician user’s perspective. The app is mobile-first — if it works on mobile, it should work on desktop.

**Context:** This is the local dev version. Equipment and work order data is demo data — focus critique on functionality, layout, touch targets, and mobile workflow, not data quality.

**Note:** A teal/cyan filled circle may appear in screenshots near active UI elements (search bar, buttons, dropdowns, etc.) while you are controlling the browser. This is a Comet browser-control artifact — it is not part of the application UI and should be completely ignored in your critique.

## Instructions

Take control of the browser and:

1. Resize to a mobile viewport before starting.
2. Navigate to the page(s) provided (or explore a series of related pages if given a starting URL).
3. Interact with controls, forms, filters, and navigation to test the mobile UI/UX — pay attention to touch targets, thumb reach, scrolling, and one-handed use.
4. Critique from a UI/UX perspective: visual hierarchy, information architecture, affordances, states (empty, loading, error), microcopy, and technician workflow clarity.

## Required output

At the end of your critique, include a **Cursor plan-mode prompt** — a single block of text the user can copy and paste into Cursor (plan mode) to iterate on development. That prompt must:

- Identify the page(s) or route(s) reviewed.
- Summarize the top 3–5 issues found, with brief rationale.
- List specific, implementable changes (what to change, where, and why).
- Be self-contained so a developer can paste it and immediately start work without extra context.

Format it clearly, e.g.:

```
---
## Cursor plan-mode prompt (copy-paste below)

[Self-contained prompt describing page, issues, and actionable fixes]
---
```
