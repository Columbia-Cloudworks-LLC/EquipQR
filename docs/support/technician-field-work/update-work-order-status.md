---
title: "Update work order status"
description: "Move a work order through Submitted → Accepted → Assigned → In Progress → Completed with the right permission checks."
lastReviewed: 2026-07-06
personas: ["technician","manager"]
---

**For:** Technician, Manager  
**Last reviewed:** 2026-07-06
Work orders follow a predictable lifecycle so everyone can see what is actually happening in the shop. Only valid next statuses are shown on the action buttons, so you cannot accidentally skip a state.

![Work order accepted and assigned to a technician](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/technician-field-work/desktop/04-status-accepted-assigned.png)

![Work order in In Progress status](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/technician-field-work/desktop/05-status-in-progress.png)

![Mobile work order summary](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/technician-field-work/mobile/02-mobile-work-order-summary.png)

![Mobile Change Status sheet](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/technician-field-work/mobile/03-mobile-status-sheet.png)

## 1. Open the work order details page

Tap a work order from the list, from equipment, or from your dashboard to get to the detail view.

## 2. Use the status action button

The top-right status card shows the current status plus only the valid next actions — e.g. **Accept**, **Assign**, **Start Work**, **Put On Hold**, **Complete**, or **Cancel**.


## 3. Who can change what

- **Managers, Admins, and Owners** can change status on any team work order.
- **Technicians** can move their own assigned work orders between In Progress, On Hold, and Completed.
- **Requestors** cannot change status after submission.

## 4. Mark it Complete when the work is done

Completion captures the close-out date automatically. If you are waiting on parts, use "Put On Hold" instead so the job does not register as overdue.

## Related articles

- [Work order lifecycle reference](../work-orders/work-order-lifecycle)
- [Add notes and photos to a work order](./add-notes-and-photos)
