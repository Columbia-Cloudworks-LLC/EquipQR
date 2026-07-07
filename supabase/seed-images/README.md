# Local dev seed images

Drop photos here to exercise **equipment display images**, **equipment note images**, and **work order note images** on the local stack. Files are uploaded automatically when you run:

```powershell
.\dev-stop.bat
.\dev-start.bat -Force
```

Step **5b** runs `scripts/seed-dev-media.ps1` after `supabase db reset`.

## Folder layout

| Folder | Naming | Effect |
| ------ | ------ | ------ |
| `equipment/` | `{equipment-uuid}.jpg` (or `.png`, `.webp`, `.gif`) | Sets `equipment.image_url` on that exact equipment row |
| `equipment/` | Any other filename (e.g. `CAT-320.jpg`) | Treated as **backfill** photos — assigned to equipment missing display images, then cycled across the rest |
| `drop/` | Any filename | Same backfill behavior; also round-robins into equipment note images and work order images |
| `work-orders/` | `{work-order-uuid}.jpg` | Creates a seed note + `work_order_images` row on that work order |

The committed UUID JPEGs map to durable-core equipment (`aa0e8400-…`). Add human-readable filenames directly in `equipment/` or `drop/` — no SQL edits required.

## Storage contract

- Uploads use private buckets (`equipment-note-images`, `work-order-images`).
- Postgres stores **canonical object paths** only (never public or signed URLs).
- Paths follow production layout: `{uploaderUserId}/{entityId}/{noteOrSegment}/{filename}` so the app signs them with the correct bucket at read time.

## Tips

- Sign in as seed user `owner@apex.test` to view Apex equipment with photos (local dev credentials are documented in [`supabase/seeds/README.md`](../seeds/README.md)).
- After adding images, run `-Force` so storage and DB stay in sync.
- Orphaned or expired signed URLs in production are ignored client-side (#1171); local seeds avoid that by storing paths only.
