---
title: "Consume inventory parts on a work order"
description: "Record the parts you used on a repair so stock drops automatically and the cost flows into the invoice."
lastReviewed: 2026-07-06
personas: ["technician","manager"]
requirement: "Must be Manager, Technician, or an assigned Parts Manager."
---

**For:** Technician, Manager  
**Last reviewed:** 2026-07-06

::: info Requires
Must be Manager, Technician, or an assigned Parts Manager.
:::

## 1. Open the work order's Parts & Costs section

Scroll to the Costs section in the work order details and tap Add Item.

## 2. Search for the part

Type the part name, SKU, or a cross-reference number. Alternate groups surface equivalent parts in the same search.

![Add part from inventory dialog](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/technician-field-work/desktop/09-inventory-part-selector.png)

## 3. Enter the quantity used

EquipQR deducts that quantity from stock on hand and records the unit cost in the work order's total.

::: tip Note
If the part drops below its low-stock threshold, Parts Managers and Admins receive a low-stock alert.
:::

## 4. Save

The item appears on the work order cost line. The inventory item's transaction history now has an entry tied to this work order.

![Part consumed on the work order cost lines](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/technician-field-work/desktop/10-part-consumed-on-work-order.png)

![Mobile field costs card](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/technician-field-work/mobile/05-mobile-field-costs-card.png)

## Related articles

- [Add an inventory item](../inventory-parts/add-inventory-item)
- [Find a part using part lookup](../inventory-parts/part-lookup-search)
