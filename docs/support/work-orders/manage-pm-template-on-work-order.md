---
title: "Manage a PM template on an active work order"
description: "Add, change, or remove a preventative maintenance checklist on an open work order before it is completed or cancelled."
lastReviewed: 2026-07-04
personas: ["technician","manager","admin","owner"]
requirement: "The work order must still be active (not completed or cancelled)."
---

**For:** Technician, Manager, Owner, Admin  
**Last reviewed:** 2026-07-04

::: info Requires
The work order must still be active — not **Completed** or **Cancelled**.
:::

Technicians and managers can fix a wrong PM template without deleting the work order and re-capturing photos or notes. Work order photos, notes, costs, and status history stay attached when you change or remove the PM checklist.

## 1. Open the work order

From **Work Orders**, open the active job you need to update.

## 2. Start PM management

On the work order details page, choose:

- **Add PM Checklist** when the work order was created without PM, or
- **Manage PM Template** when a PM checklist is already attached.

![Manage PM checklist dialog](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/work-order-pm/desktop/01-add-pm-dialog.png)

## 3. Add a PM checklist

1. Pick the correct template from the **PM template** dropdown. If the equipment has a default template but this job needs a different one, you can override it here.
2. Select **Save PM Changes**.

EquipQR creates the PM checklist and sets the work order to PM-enabled.

![PM checklist section after attaching a template](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/work-order-pm/desktop/02-pm-checklist-after-add.png)

## 4. Change the PM template

1. Open **Manage PM Template**.
2. Select a different checklist template.
3. Select **Save PM Changes**.

If the current checklist already has completed items or PM notes, EquipQR warns you before resetting the PM data. Only the PM checklist is replaced — work order photos and notes remain.

::: tip Before you change templates
Download the PM checklist PDF from the work order if you need a record of completed inspection items.
:::

## 5. Remove the PM checklist

1. Open **Manage PM Template**.
2. Set **PM template** to **None** (or use the clear control next to the dropdown).
3. Select **Save PM Changes**.

The PM section disappears from the work order. Notes, photos, and costs stay on the work order.

## Who can manage PM templates

| Role | Add / change / remove PM on active work orders |
| --- | --- |
| Owner / Admin | Yes |
| Manager / Technician (team member) | Yes |
| Requestor / Viewer | No |

## Related articles

- [Complete a PM checklist](../technician-field-work/pm-checklist)
- [Create a work order from equipment](../technician-field-work/create-work-order-from-equipment)
- [Work order lifecycle](./work-order-lifecycle)
