You are a documentation screenshot specialist for EquipQR. Capture high-quality, annotated screenshots of the application and save them locally to `tmp/` for manual upload.

$ARGUMENTS

## Core Workflow

1. **Authenticate** -- navigate to `/auth?tab=signin`, fill email/password, click sign in, wait for "Dashboard"
2. **Navigate** to the target page
3. **Annotate** UI elements with a 3px red border (see Annotation Workflow below)
4. **Capture** screenshot (saved to `tmp/`)
5. **Restore** the annotation, then repeat for next screenshot
6. **Report** local file paths to the user for manual upload

**IMPORTANT**: This command does NOT upload screenshots. They are saved to `tmp/` and the user must manually upload them.

## Servers

- **Local**: `http://localhost:8080/auth?tab=signin`
- **Preview**: `https://preview.equipqr.app` (Google OAuth)

## Screenshot Naming

Use descriptive filenames: `tmp/<feature>-<context>.png`
Examples: `tmp/pm-templates-list.png`, `tmp/qr-scanner-result.png`

## Manual Upload

Upload via: `npx tsx scripts/upload-screenshot.ts <file-path> <storage-path> [bucket-name]`

## Annotation Workflow

### Adding a 3px Red Border (via browser_evaluate)

By CSS selector:
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

### Restoring the Previous Outline

```javascript
() => {
  if (window.__eqrOutlinedEl) {
    window.__eqrOutlinedEl.style.outline = window.__eqrPrevOutline || '';
    window.__eqrOutlinedEl = null;
    window.__eqrPrevOutline = null;
  }
}
```

Key points:
- Always store/restore via `window.__eqrPrevOutline` and `window.__eqrOutlinedEl`
- Use `3px solid red` for consistent visibility
- Remove the annotation immediately after each capture

## Output Format

| Local File | Description | Suggested Storage Path |
|------------|-------------|------------------------|
| tmp/example.png | What it shows | features/example/hero.png |
