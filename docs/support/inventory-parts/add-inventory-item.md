---
title: "Add an inventory item"
description: "Create a new part with stock levels, compatibility rules, and a QR code so technicians can scan it from a bin."
lastReviewed: 2026-07-04
personas: ["admin","owner","manager"]
requirement: "Must be Owner, Admin, or an assigned Parts Manager."
---

**For:** Admin, Owner, Manager  
**Last reviewed:** 2026-07-04

::: info Requires
Must be Owner, Admin, or an assigned Parts Manager.
:::

## 1. Open Inventory

Pick Inventory from the sidebar. The list shows everything across your organization, filterable by team.

## 2. Click Add Item

The form opens with required and optional fields. For importing dozens or hundreds of parts at once, use Bulk Inventory.


## 3. Fill in basic information

- **Name** — descriptive, e.g. "Oil Filter - CAT 320".
- **SKU** — your internal part number.
- **External ID** — manufacturer barcode or UPC for scanning.
- **Description** — optional details that help field staff identify the part.

## 4. Set stock levels

- **Quantity on Hand** — current stock count.
- **Low Stock Threshold** — EquipQR alerts Parts Managers when stock drops to or below this number.
- **Default Unit Cost** — used to populate work order costs.
- **Location** — optional **Location Name** nickname (for example "Shelf A-3"). This label does not place a map pin. Set the structured **storage address** on the item detail page or inherit the [organization inventory default](../admin-integrations/organization-settings).

## 5. Save and print the QR code

Save the item. From its detail page, tap the QR icon to print a label for the bin so technicians can scan it on the way to the job.

## Related articles

- [Adjust inventory quantity](./adjust-inventory-quantity)
- [Inventory storage locations](./inventory-storage-locations)
- [Delegate inventory with Parts Access](./parts-managers-setup)
