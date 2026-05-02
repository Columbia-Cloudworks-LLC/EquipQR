# Support library screenshot assets

This directory is served under `/docs/support/*` at runtime. The in-app
Support library (`src/components/support/content/articles/*.tsx`) references
step-by-step screenshots using paths like:

```
/docs/support/<category>/<article-id>/step-01-<shortslug>.png
```

The `SupportScreenshot` component gracefully falls back to a "Screenshot
coming soon" placeholder when an image is missing, so articles render fine
even before the capture pass is complete.

## Capture conventions

- **Source:** the running local dev app at `http://localhost:8080` with seeded
  demo data, or the preview environment at `https://preview.equipqr.app`.
- **Output:** save committed screenshots here under the matching
  `<category>/<article-id>/step-XX-*.png` path.
- **Mobile captures:** use a 390×844 viewport (iPhone 14 Pro) for articles
  tagged "viewport: mobile" in the content model. Examples: scan QR, create
  work order from equipment, update work order status, add notes/photos, PM
  checklist, submit request as a Requestor.
- **Desktop captures:** use a 1280×960 viewport for articles tagged "viewport:
  desktop". Examples: invite team members, add equipment, fleet map,
  organization integrations, export to QuickBooks, audit log.
- **Filename pattern:** `step-<NN>-<short-slug>.png` — zero-padded step number,
  kebab-case slug describing the step, e.g. `step-01-members-tab.png`.
- **Privacy:** scrub any real customer data before committing. Prefer the
  `Apex Repair Services` / `ABC Construction` seeded fixtures, or obvious
  placeholder names (`Excavator #42`, `Oil Filter - CAT 320`).

## Reference captures

High-level support library screenshots used in the plan follow-up comment are
kept in `tmp/screenshots/support/` and are not served from the app. They
include the library overview, a persona-filtered view, and a mobile capture
of the Technician Field Work category.

## Adding a new screenshot

1. Capture the screenshot from the running app (`dev-start.bat` must report
   healthy before you capture).
2. Save the PNG under the path matching the article's `screenshot.src`.
3. Verify by opening `/dashboard/support` or `/support` in the local app — the
   "Screenshot coming soon" placeholder should be replaced by your capture.
4. Commit the PNG as part of the docs changeset.
