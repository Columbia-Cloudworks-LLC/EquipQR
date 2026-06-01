---
title: "Export a work order to QuickBooks"
description: "Send a completed work order to QuickBooks Online as a draft invoice with line items, notes, and a customer memo."
lastReviewed: 2026-05-01
personas: ["admin","owner"]
requirement: "Only Owners and Admins can export. The equipment must be on a team that is mapped to a QuickBooks customer."
---

**For:** Admin, Owner  
**Last reviewed:** 2026-05-01

::: info Requires
Only Owners and Admins can export. The equipment must be on a team that is mapped to a QuickBooks customer.
:::

## 1. Open the work order

From Work Orders, open the job you are invoicing. All costs should be finalised before exporting.

## 2. Click Take Action → Export to QuickBooks

The Take Action dropdown appears in the work order header. Pick Export to QuickBooks.


## 3. Review the draft invoice in QuickBooks

EquipQR creates a **draft invoice** with the total as an "EquipQR Services" line item, the work order description, public notes in the invoice description, and cost breakdown in the private note.

## 4. Re-export if the work order changes

Updating the work order and exporting again updates the same draft invoice in QuickBooks. Once you mark the invoice as sent in QuickBooks, a subsequent re-export creates a new invoice rather than editing the sent one.

Troubleshooting tip: if the Export option is disabled, confirm QuickBooks is connected, the equipment is on a team, that team has a QuickBooks customer mapping, and you are an Admin or Owner.

## Related articles

- [Connect QuickBooks](./connect-quickbooks)
- [Map teams to QuickBooks customers](./map-teams-to-qb-customers)
