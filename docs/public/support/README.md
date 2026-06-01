# Support library screenshot assets

This directory is served under `/support/*` on the EquipQR Help Center (`equipqr.info`).
Step-by-step screenshots use paths like:

```
/support/<category>/<article-id>/step-01-<shortslug>.png
```

If an image is missing, the article still reads correctly without the screenshot.

## Capture conventions

- **Source:** the running local dev app at `http://localhost:8080` with seeded
  demo data, or the preview environment at `https://preview.equipqr.app`.
- **Output:** save committed screenshots here under the matching
  `<category>/<article-id>/step-XX-*.png` path.
- **Mobile captures:** use a 390×844 viewport (iPhone 14 Pro) for field workflows.
- **Desktop captures:** use a 1280×960 viewport for admin and organization flows.
- **Filename pattern:** `step-<NN>-<short-slug>.png` — zero-padded step number,
  kebab-case slug describing the step.
- **Privacy:** scrub any real customer data before committing. Prefer seeded
  fixtures or obvious placeholder names.

## Adding a new screenshot

1. Capture from a healthy local stack (`dev-start.bat`).
2. Save the PNG under the path referenced in the article markdown.
3. Verify on `npm run docs:dev` at `http://localhost:5174`.
4. Commit the PNG with the article change.
