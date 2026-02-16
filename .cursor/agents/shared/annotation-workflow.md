# Shared Annotation Workflow

Common pattern for highlighting UI elements in documentation screenshots.
Used by `screenshot-capture` and `tutorial-writer` subagents.

All calls use `browser_evaluate` from the `user-playwright` MCP server.

## Adding an Annotation (3px Red Border)

### By CSS Selector

```javascript
() => {
  const el = document.querySelector('[data-testid="target"]') || document.querySelector('main');
  if (el) {
    window.__eqrPrevOutline = el.style.outline;
    window.__eqrOutlinedEl = el;
    el.style.outline = '3px solid red';
  }
}
```

### By Element Ref (from snapshot)

Pass `ref` and `element` parameters to `browser_evaluate`:

```javascript
(el) => {
  window.__eqrPrevOutline = el.style.outline;
  window.__eqrOutlinedEl = el;
  el.style.outline = '3px solid red';
}
```

### By Active Element

When highlighting whatever the user just interacted with:

```javascript
() => {
  const el = document.activeElement;
  if (el && el !== document.body) {
    window.__eqrPrevOutline = el.style.outline;
    window.__eqrOutlinedEl = el;
    el.style.outline = '3px solid red';
  }
}
```

If `document.activeElement` is `null` or `document.body`, click the relevant target element first (via `browser_click`) so it becomes active, then annotate.

## Restoring the Previous Outline

Always restore immediately after taking the screenshot:

```javascript
() => {
  if (window.__eqrOutlinedEl) {
    window.__eqrOutlinedEl.style.outline = window.__eqrPrevOutline || '';
    window.__eqrOutlinedEl = null;
    window.__eqrPrevOutline = null;
  }
}
```

## Key Points

- Always store/restore via `window.__eqrPrevOutline` and `window.__eqrOutlinedEl`
- Use `3px solid red` for consistent visibility across all screenshots
- Remove the annotation immediately after each screenshot capture
- If the target element has no existing outline, the restore sets it to `''`
