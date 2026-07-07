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
| `equipment/` | `{equipment-uuid}.jpg` (or `.png`, `.webp`, `.gif`) | Sets `equipment.image_url` to a canonical `equipment-note-images` path |
| `drop/` | Any filename | Round-robin: display photos for equipment missing images, then `equipment_note_images`, then `work_order_images` on active work orders |
| `work-orders/` | `{work-order-uuid}.jpg` | Creates a seed note + `work_order_images` row on that work order |

The committed `equipment/` JPEGs map to durable-core equipment UUIDs (`aa0e8400-…`). You can add more files or drop arbitrary photos into `drop/` without editing SQL.

## Storage contract

- Uploads use private buckets (`equipment-note-images`, `work-order-images`).
- Postgres stores **canonical object paths** only (never public or signed URLs).
- Paths follow production layout: `{uploaderUserId}/{entityId}/{noteOrSegment}/{filename}` so the app signs them with the correct bucket at read time.

## Tips

- Use seed user `owner@apex.test` / `password123` to view Apex equipment with photos.
- After adding images, run `-Force` so storage and DB stay in sync.
- Orphaned or expired signed URLs in production are ignored client-side (#1171); local seeds avoid that by storing paths only.
