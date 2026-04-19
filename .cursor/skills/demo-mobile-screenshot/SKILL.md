---
name: demo-mobile-screenshot
description: Reliably simulate a phone interface against the local EquipQR dev app and capture pixel-accurate mobile screenshots. Prefers the Playwright MCP for true device emulation (viewport, DPR, touch, mobile UA) and falls back to a same-origin iframe wrapper served by the Cursor MCP browser when Playwright is unavailable or the user wants to reuse their already-authenticated session. Use when the user asks to take a mobile screenshot, preview the mobile layout, demo a phone view, verify a responsive design, or test how a route renders on a mobile viewport.
---

# Demo Mobile Screenshot

## Two methods, one decision

| | **Playwright MCP** (primary) | **Cursor MCP browser + iframe** (fallback) |
|---|---|---|
| Real `window.innerWidth` | ✅ 393 | ✅ 393 (inside iframe) |
| `useIsMobile()` returns `true` | ✅ | ✅ |
| Retina DPR (3x) | ✅ via CDP | ❌ uses host DPR |
| Touch / `pointer: coarse` | ✅ via CDP | ❌ host pointer |
| Mobile user agent | ✅ via CDP | ❌ desktop UA |
| Survives navigation | ✅ viewport persists | ✅ wrapper re-iframes |
| Reuses user's existing auth/theme | ❌ fresh browser, must Quick-Login | ✅ shares cookies/localStorage |
| Can interact (click, type) on the page | ✅ full Playwright API | ❌ MCP can't reach inside iframes |
| Can run arbitrary JS on the page | ✅ `browser_evaluate` | ❌ |
| Setup cost | none | one-time write of two `.gitignore`d files into `public/` |

**Default to Playwright** for any mobile-screenshot task. Switch to the iframe fallback only when:

1. The user explicitly says "use the same browser I'm logged into" or refuses to Quick-Login.
2. The Playwright MCP (`user-playwright-recording`) is unavailable or returning errors.
3. The screenshot must capture the user's exact authenticated state (e.g. a specific toast, a feature-flag overlay, a specific theme set in localStorage from their manual session).

Both methods have been verified end-to-end against `http://localhost:8080/dashboard` and `http://localhost:8080/dashboard/work-orders` on 2026-04-19.

## Hard truth about `browser_resize` in the Cursor MCP browser

`cursor-ide-browser` `browser_resize` does **not** emulate mobile — it only crops the visible panel. After `browser_resize(393, 852)`, `window.innerWidth` is still 1407, CSS `@media (max-width: 767px)` does not match, and `useIsMobile()` keeps returning `false`. Page renders desktop, then gets visually clipped. Verified empirically with a viewport probe page.

The Playwright MCP's `browser_resize` is different: it calls `page.setViewportSize()` and **truly** resizes the viewport. Don't confuse the two.

## Common preconditions (both methods)

1. EquipQR dev server running on `http://localhost:8080`. **Do not start it yourself** — if it's down, ask the user to run `npm run dev` (per `.cursor/rules/local-dev-troubleshoot.mdc`).
2. Routes inside the app must include the `/dashboard/` prefix when authenticated (e.g. `/dashboard/work-orders`, not `/work-orders` — the latter 404s with `No routes matched`).
3. Default to **iPhone 14 Pro** dimensions: `393 × 852`. Other presets in [Device presets](#device-presets).

## Procedure overview

Pick a method, then follow its detailed reference:

- **Method A — Playwright MCP (primary)**: see [`playwright.md`](playwright.md). Boils down to: navigate → resize via `browser_resize` → optional CDP enhance for DPR/touch/UA → Quick-Login if redirected to `/auth` → navigate to target route → screenshot.
- **Method B — iframe fallback**: see [`iframe-fallback.md`](iframe-fallback.md). Boils down to: ensure `public/__mobile-frame.html` exists → reuse the `localhost:8080` Cursor browser tab → navigate to `?url=/dashboard&w=393&h=852` → wait → element-cropped screenshot with `ref="#f"`.

Wrapper file canonical contents live in [`wrapper.md`](wrapper.md) (only needed for Method B).

## Device presets

| Device | Width | Height | DPR (CDP) |
|---|---:|---:|---:|
| iPhone 14 Pro (default) | 393 | 852 | 3 |
| iPhone SE / 8 | 375 | 667 | 2 |
| iPhone 12/13 mini | 375 | 812 | 3 |
| iPhone 14 Pro Max | 430 | 932 | 3 |
| Pixel 7 | 412 | 915 | 2.625 |
| Galaxy S22 | 360 | 780 | 3 |
| iPad Mini portrait | 744 | 1133 | 2 |
| iPad portrait | 820 | 1180 | 2 |

DPR only applies to Method A (Playwright). Method B inherits the host display's DPR.

## Anti-patterns (do not do these)

- **`cursor-ide-browser` `browser_resize` for mobile simulation** — only crops; layout stays desktop. Verified to produce wrong layout.
- **Hardcoding routes without `/dashboard/` prefix** for authenticated views — they 404.
- **Using `browser_snapshot` to wait for an iframe to be ready** (Method B) — it inspects the parent wrapper, not the iframe contents. Will appear "empty" even when iframe has loaded; rely on `Await` instead.
- **Using `browser_click` / `browser_fill` on iframe contents** (Method B) — Cursor MCP cannot reach inside iframes (per its own docs). Use Method A if you need to interact.
- **Opening a new Cursor browser tab** (Method B) — new tabs sometimes render in a tiny side panel that crops the iframe. Reuse the existing `localhost:8080` tab.
- **Skipping the Quick-Login step** in Method A — Playwright runs in a fresh browser context with no cookies, so authenticated routes will redirect to `/auth`.
- **Forgetting to unlock** the Cursor browser (Method B) — leaves the user unable to interact when you're done.

## Verification examples (both methods produce these)

- `/dashboard` at 393×852 → hamburger menu top-left, 2-column metric cards, mobile bottom-nav (Dashboard / Equipment / Inventory / Orders / Menu), purple FAB.
- `/dashboard/work-orders` at 393×852 → mobile filter chips (My Work / Urgent / Overdue / Unassigned), single-column work-order cards, "Orders" tab highlighted in bottom-nav.

If you see the desktop sidebar on the left at 393px width, the simulation is broken — your method is failing. Re-check the `useIsMobile` hook reads `window.innerWidth = 393` via `browser_evaluate` (Method A) or by loading `/__viewport-probe.html` inside the iframe (Method B).

## Reference files

- [`playwright.md`](playwright.md) — full Playwright MCP procedure (primary method).
- [`iframe-fallback.md`](iframe-fallback.md) — full iframe wrapper procedure (fallback method).
- [`wrapper.md`](wrapper.md) — canonical contents of `public/__mobile-frame.html` and `public/__viewport-probe.html` (both `.gitignore`d under `public/__*`).
