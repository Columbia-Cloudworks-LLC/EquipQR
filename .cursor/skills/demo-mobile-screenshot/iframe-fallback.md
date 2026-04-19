# Method B — iframe fallback (Cursor MCP browser)

This is the fallback method. Use it when:

1. The user explicitly wants to use their already-authenticated Cursor browser session (preserves cookies, theme, localStorage state).
2. The Playwright MCP is unavailable, broken, or returning errors.
3. You only need a screenshot — no clicks, typing, or JS execution inside the page.

This method works around the fact that `cursor-ide-browser` `browser_resize` does NOT actually emulate mobile (it only crops the panel). Instead, we serve a tiny same-origin wrapper page that iframes the target route at fixed pixel dimensions. Because the iframe has its own true viewport, the embedded EquipQR app sees `window.innerWidth = 393`, matchMedia fires, `useIsMobile()` returns `true`. Same-origin → cookies are shared → authenticated routes work without re-login.

Key tools used (all on the `cursor-ide-browser` server):

- `browser_tabs` — list/select tabs
- `browser_lock` / `browser_lock` — lock and unlock the tab so the user doesn't fight you
- `browser_navigate` — load the wrapper URL
- `browser_take_screenshot` — element-cropped to `ref="#f"`

## Workflow

```markdown
iframe Mobile Screenshot Progress
- [ ] 1) Ensure wrapper file exists at public/__mobile-frame.html
- [ ] 2) Find the localhost:8080 tab and lock it
- [ ] 3) Navigate to wrapper URL with target route + dimensions
- [ ] 4) Wait 3–5 s for the SPA to mount inside the iframe
- [ ] 5) (Optional) Verify with viewport probe
- [ ] 6) Take element-cropped screenshot using ref="#f"
- [ ] 7) Unlock the browser
```

### 1) Ensure wrapper file exists

Check that `public/__mobile-frame.html` exists. If not, write it from the canonical contents in `wrapper.md`. The file is `.gitignore`d under `public/__*` so it never reaches production.

Optionally also write `public/__viewport-probe.html` (used in step 5).

### 2) Find the localhost tab and lock it

```jsonc
// browser_tabs
{ "action": "list" }
```

Pick the entry whose URL starts with `http://localhost:8080/`, capture its `viewId`, then:

```jsonc
// browser_lock
{ "action": "lock", "viewId": "<viewId>" }
```

If no localhost tab is open, ask the user to open `http://localhost:8080/dashboard` in the Cursor MCP browser. Do not open a new tab proactively — new tabs sometimes render in a tiny side panel (~290 CSS px wide) that crops the iframe.

### 3) Navigate to the wrapper URL

```
http://localhost:8080/__mobile-frame.html?url=<ENCODED_ROUTE>&w=<WIDTH>&h=<HEIGHT>
```

- `<ENCODED_ROUTE>`: the path inside the app, including `/dashboard/` prefix when authenticated (e.g. `/dashboard`, `/dashboard/work-orders`). Routes without the prefix 404 with `No routes matched location "/work-orders"`.
- `<WIDTH>` × `<HEIGHT>`: CSS pixels. Default to `393 × 852` (iPhone 14 Pro).

```jsonc
// browser_navigate
{
  "url": "http://localhost:8080/__mobile-frame.html?url=/dashboard&w=393&h=852",
  "viewId": "<viewId>"
}
```

### 4) Wait for hydration

The iframe loads the SPA from scratch — React must boot, auth verifies, queries hydrate. Use `Await`:

- 2500–3500 ms for `/dashboard`
- 4000–5000 ms for `/dashboard/work-orders`, `/dashboard/equipment`

Do **not** use `browser_snapshot` to wait for readiness — it inspects the **parent** wrapper page (which is just the iframe element). Snapshot will look "empty" even when the iframe contents have loaded.

### 5) (Optional) Verify viewport with the probe

Before producing the final shot, navigate the wrapper to the probe page:

```jsonc
// browser_navigate
{
  "url": "http://localhost:8080/__mobile-frame.html?url=/__viewport-probe.html&w=393&h=852",
  "viewId": "<viewId>"
}
```

Then screenshot and confirm:

- `window.innerWidth` reads **393** (matches `w` param)
- `documentElement.clientWidth` reads **393**
- "CSS MEDIA BUCKET" reads `mobile (<768)`
- Background of the probe is **red** (`#7f1d1d`)

If you instead see `1407` or `desktop (>=1024)`, the wrapper file is stale or the URL is malformed — re-write `__mobile-frame.html` from `wrapper.md` and re-navigate.

### 6) Take the element-cropped screenshot

```jsonc
// browser_take_screenshot
{
  "viewId": "<viewId>",
  "filename": "mobile-<route-slug>.png",
  "element": "mobile iframe",
  "ref": "#f"
}
```

`ref: "#f"` is the wrapper's iframe `id`. This crops to exactly the iframe's bounds — a clean phone-shaped image.

**Do not** take a full-page screenshot for the mobile demo — it includes the wrapper's empty black background to the right of the iframe.

### 7) Unlock the browser

Always call when finished:

```jsonc
// browser_lock
{ "action": "unlock", "viewId": "<viewId>" }
```

## Limitations vs Method A

- **Cannot interact with iframe contents** — `browser_click`, `browser_fill`, `browser_type`, `browser_snapshot` of the iframe interior all fail. The Cursor MCP browser explicitly cannot reach into iframes.
- **DPR matches the host display** — no Retina override. Screenshot pixel density depends on the user's Windows display scale.
- **Mobile UA not set** — the iframe inherits the host browser's user agent (Cursor/Electron). Pages that gate behavior on UA-sniffing won't switch to mobile mode.
- **`pointer: coarse` / `hover: none` not emulated** — affects components that switch UI based on touch input (rare in EquipQR).

If any of these limitations matter for the user's task, recommend Method A.

## Why this works at all

Same-origin iframes get their own browsing context with their own viewport size. When the wrapper page is at `localhost:8080/__mobile-frame.html` and iframes `localhost:8080/dashboard` at `width=393`:

- The iframe's `window.innerWidth` is **393** (not the parent's 1407)
- `document.documentElement.clientWidth` is **393**
- `matchMedia('(max-width: 767px)')` matches inside the iframe
- React's `useIsMobile()` (which reads `window.innerWidth`) returns **true**
- Cookies for `localhost:8080` are shared, so auth Just Works

The wrapper itself is loaded into the Cursor browser pane (where `browser_resize` famously fails to truly emulate mobile), but that doesn't matter — we only screenshot the inner iframe.
