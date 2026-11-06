# Mobile screen catalog

A deterministic catalog of every catalogued screen in every flow, rendered at a
mobile viewport against the **local dev stack**. Each screen is captured as
viewport-sized slices, one per scroll position, and comes with the context needed to act on it:
the route, how to reach it, the source files, the rendered text, the
accessibility tree, and the console errors and failed requests seen during capture.

Use it to review the mobile UI without driving a browser by hand, to file UI
issues, or to hand a screen straight to Claude for a fix.

## Run it

```bash
npm run screens:capture                       # reset local DB, capture everything (Pixel 7), build gallery
npm run screens:serve                         # http://127.0.0.1:4178 (enables "Copy image")
```

Options (pass after `--`, for example `npm run screens:capture -- --flow work-orders --no-reset`):

| Option | Default | Meaning |
|--------|---------|---------|
| `--device "<name>"` | `Pixel 7` | Any [Playwright device](https://playwright.dev/docs/emulation#devices) name, e.g. `"iPhone 14"`, `"iPhone SE"`, `"Galaxy S9+"`. Always rendered in Chromium. |
| `--flow id[,id]` | all | Only these flows (ids from `e2e/screen-catalog/flows/`). Updates the existing gallery in place. |
| `--persona owner\|technician\|anonymous` | all | Only this persona. |
| `--no-reset` | reset | Skip `dev.sh reset`. Faster, but leftover data from other test runs will show up. |
| `--workers N` | `2` | Parallel browser workers. |
| `--scale N` | `2` | Device pixel ratio of the PNGs. |
| `--clock ISO\|real` | `2026-05-15T15:00:00Z` | Browser clock. `real` uses the wall clock. |
| `--live-maps` | off | Show live Google Maps tiles instead of masking them. |
| `--headed` | off | Watch the capture. |
| `--serve` | off | Serve the gallery when done. |

`npm run screens:gallery [dir]` rebuilds the gallery from existing captures without re-running the browser.

Output lives in `tmp/screen-catalog/<device>/` (gitignored):

```text
index.html            gallery (flows as boards, personas as lanes, screens as frames)
INDEX.md              every screen with a link to its context.md
manifest.json         gallery data
screens/<flow>/<persona>/<NN>-<screen>/
  slice-01.png …      viewport slices, top to bottom
  screen.json         capture record
  context.md          Markdown context for this screen
```

## Using the gallery

- Click a frame to open its details. **Copy context for Claude** puts Markdown on the
  clipboard with absolute PNG paths, the steps, source files, text and accessibility tree.
  Paste it into Claude Code and it can open the screenshots directly.
- **Copy as GitHub issue** copies a shorter Markdown body. Attach the slice PNGs yourself.
- **Copy image** copies a slice to the clipboard. Browsers block this on `file://`; use `npm run screens:serve`.
- Use the persona filter, search (`/`), **Issues only** (failed captures, warnings, console errors),
  zoom, `←`/`→` to step through screens and `Esc` to close. `#flow/persona/screen` links open a screen directly.
- You can point Claude at a whole run: `tmp/screen-catalog/pixel-7/INDEX.md`.

## What makes it deterministic

- The local DB is reset to `supabase/seeds` before each full run, and no screen submits a form.
- Every screen starts from a fresh navigation and replays its own steps. Screens never depend on each other.
- The browser clock is pinned (`--clock`), along with the timezone (`America/Chicago`), the locale (`en-US`) and the PRNG behind `Math.random`.
  Animations and transitions are disabled, toasts are hidden, the caret is hidden and reduced motion is on.
- A capture waits for fonts, images and the absence of loading indicators (`aria-busy`, skeleton
  `animate-pulse`, spinners), and for the DOM to stay unchanged across two checks.
- Chromium runs with software rasterization and fixed text rendering (`--disable-gpu`,
  `--disable-lcd-text`, `--font-render-hinting=none` and so on), so the same DOM gives the same pixels.
- **Run-time timestamps are masked.** Rows written during the reset carry the real wall-clock time
  (PM template "Created", notification times, DSR events and similar). The browser clock is pinned, so the app
  never shows the real date by itself. Any date equal to the run's date, and any time of day between the
  reset and the capture, is replaced on the page with `‹run time›` before the screenshot, and in the text
  context. A fixed string keeps the layout identical between runs. The screen gets a note saying how many were replaced.
- Every Latin web font face is loaded before capture, so no text renders in a fallback font that swaps later.
- Google Maps tiles (`.gm-style`) are live third-party content and are painted grey unless `--live-maps` is passed.

Known sources of drift:

- Seeds that use `NOW() - INTERVAL …` (mostly Metro org data) shift with the real date, as do
  server-computed values such as overdue counts. They are stable within a day.
- With `--no-reset`, only run-time dates (not bare times) are masked, because the reset time is unknown.

## Slicing

The engine finds the element that actually scrolls: the document, an inner scroll area, or the open
dialog/sheet. It measures fixed or sticky chrome touching the top and bottom of that element (top
bar, bottom nav, dialog header and footer). Each next slice starts one viewport minus that chrome
further down, so no content is hidden behind chrome between slices. The last slice is clamped to the
bottom, so it can overlap the previous one more than the others do. Pages taller than 80 slices are cut
off with a warning.

Capture modes (set per screen with `capture`, otherwise auto-detected after the steps):

- `page` slices the page's scroll container.
- `overlay` slices the topmost open dialog, sheet or drawer. It is used automatically when a dialog is open.
- `viewport` takes one shot without scrolling. It is used automatically for open menus, listboxes and popovers.

## Adding or changing screens

Flows live in `e2e/screen-catalog/flows/*.ts` and are listed in `flows/index.ts`. A screen is:

```ts
{
  id: 'add-cost',                       // stable slug, used in paths
  title: 'Add cost',
  description: 'Cost entry on a work order.',
  route: `/dashboard/work-orders/${seedWorkOrders.oilChange.id}`,
  steps: [{ action: 'click', target: { role: 'button', name: /^add cost$/i } }],
  personas: ['owner'],                  // optional subset of the flow's personas
  sources: ['src/features/work-orders/pages/WorkOrderDetails.tsx'],
}
```

- Use seeded IDs from `e2e/user/shared/seed-data.ts`. Never create data in a step.
- Prefer role + accessible-name targets. Steps support `click`, `fill`, `press`, `waitFor` and `scrollIntoView`.
- `sources` paths are validated before the run starts, so a stale path fails fast.
- `ready` waits for a specific element and `mask` paints over non-deterministic regions.

Not catalogued on purpose: the bulk grids (which redirect to their lists on mobile), DFY operator provisioning,
onboarding routes (which only render for orgs that have not finished onboarding) and `/debug-*` routes.
