---
title: "Equipment location sources and maps"
description: "Understand effective location, team fallback, equipment overrides, scan GPS, Fleet Map filtering, inline address edits, and live-location capture."
lastReviewed: 2026-07-04
personas: ["admin","owner","manager","technician"]
---

**For:** Admin, Owner, Manager, Technician  
**Last reviewed:** 2026-07-04

EquipQR resolves an equipment pin from several sources. You can preview each source on the equipment detail map, Fleet Map, and work order detail pages without changing the underlying record until you save an override.

## Effective location order

1. **Last known scan GPS** — when QR scan location collection is enabled and a recent scan captured coordinates.
2. **Equipment assigned address** — street or map pin saved on the equipment record.
3. **Legacy location text** — older free-text location values with coordinates when present.
4. **Team location** — only when the team has **Override equipment location** enabled and the equipment still opts into team fallback.

The **Effective location** source shows the winner of that chain. Other sources in the header dropdown let you compare team HQ, equipment address, and last scan side by side.

## Fleet Map source filter

Use **Location Source** on Fleet Map to color and filter markers by the same source labels you see on equipment detail.

![Fleet Map location source filter](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/01-fleet-map-source-filter.png)

## Equipment detail map card

The location card header is a dropdown. Pick **Effective location**, **Team location**, **Equipment location**, or **Last known scan** to change what the mini map and address row display.

![Equipment detail location source dropdown](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/02-equipment-detail-location-source.png)

### Inline address actions

Hover the address row (always visible on mobile) to reveal:

- **Pencil** — type or search for a street address with Google Places.
- **Navigation icon** — open live-location capture from the device GPS.

![Inline equipment address actions](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/03-equipment-inline-address-actions.png)

### Live-location capture

Live capture opens a center-pin map. Pan to adjust, then confirm. Coordinate-only saves (no street address) still persist as the equipment assigned location and disable team fallback.

![Live location capture modal](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/04-live-location-modal.png)

### Team location fallback

When a team overrides equipment locations, switch the header dropdown to **Team location** to preview the team HQ pin without removing the equipment's own saved address.

![Team location fallback preview](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/05-equipment-team-location-fallback.png)

## Work order embedded map

Work orders with linked equipment show the same location source dropdown and mini map on desktop. On mobile, expand **Equipment Details** to reveal the map controls.

![Work order location map](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/09-work-order-location-map.png)

## Mobile field view

Mobile equipment detail now includes the same location card below the header. Technicians can change sources, edit inline, and capture live GPS from the field.

![Mobile equipment location source](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/mobile/01-equipment-detail-location-source.png)

![Mobile inline address actions](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/mobile/02-equipment-inline-address-actions.png)

## Desktop walkthrough video

https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/demo.mp4

## Mobile walkthrough video

https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/mobile/demo.mp4

## Related articles

- [Use the fleet map](./fleet-map-basics)
- [Add a piece of equipment](./add-equipment)
- [Common questions about teams and roles](../teams-roles/multi-team-questions)
- [Work order lifecycle reference](../work-orders/work-order-lifecycle)
- [Inventory storage locations](../inventory-parts/inventory-storage-locations)
