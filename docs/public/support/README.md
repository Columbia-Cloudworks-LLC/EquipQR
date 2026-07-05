# Support library screenshot assets

This directory is served under `/support/*` on the EquipQR Help Center (`equipqr.info`).

## Preferred workflow (2026+)

Documentation screenshots and demo videos are **not committed as PNGs/MP4s** in this repo. Instead:

1. Capture deterministic states from the local dev stack with Playwright PR evidence specs under `e2e/pr-evidence/`.
2. Upload artifacts to the public Supabase **`docs-media`** bucket via `.\scripts\docs-media\Publish-DocsMedia.ps1`.
3. Reference the returned public URLs in equipqr.info markdown articles.

Stable storage paths follow:

```
support/{collection}/{desktop|mobile}/{label}.png
support/{collection}/{desktop|mobile}/demo.mp4
```

Example:

```
https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/01-fleet-map-source-filter.png
```

The **`docs-media`** bucket is created by Supabase migration (`supabase/migrations/20260704180000_create_docs_media_bucket.sql`) during normal deploy.

Optionally verify public access after deploy (requires `SUPABASE_URL` in the shell — see `AGENTS.md`):

```powershell
.\scripts\docs-media\Bootstrap-DocsMediaBucket.ps1 -SupabaseUrl $env:SUPABASE_URL
```

## Legacy committed assets

Older articles may still reference committed PNGs under `docs/public/support/` or co-located `screenshots/` folders. Migrate them to `docs-media` when updating those articles.

## Capture conventions

- **Source:** local dev app at `http://localhost:8080` with seeded demo data.
- **Desktop captures:** PR evidence default viewport (1920×1080) via `location-maps-desktop.spec.ts`.
- **Mobile captures:** `-MobileViewport` (390×844) via `location-maps-mobile.spec.ts`.
- **Filename pattern in storage:** `{NN}-{short-slug}.png` — zero-padded step number, kebab-case slug.
- **Privacy:** use seeded fixtures only; scrub real customer data before upload.

## Adding documentation media

1. Add or extend `e2e/pr-evidence/location-maps-*.spec.ts` (or a feature-specific spec).
2. Capture: `.\scripts\pr-evidence\Invoke-PrEvidenceCapture.ps1 -Flow location-maps-desktop -Spec e2e/pr-evidence/location-maps-desktop.spec.ts`
3. Publish to docs-media: `.\scripts\docs-media\Publish-DocsMedia.ps1 -ManifestPath tmp\pr-evidence\location-maps-desktop\manifest.json -Collection location-maps -Variant desktop -MarkdownOut tmp\docs-media\location-maps\desktop.md`
4. Paste URLs from `tmp/docs-media/location-maps/desktop.md` into the target article.
5. Verify on `npm run docs:dev` at `http://localhost:5174`.
