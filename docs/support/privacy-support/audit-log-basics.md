---
title: "Use the audit log"
description: "Admins and Owners can see who did what and when — useful for investigations and compliance evidence."
lastReviewed: 2026-07-06
personas: ["admin","owner"]
requirement: "Must be Organization Owner or Admin."
---

**For:** Admin, Owner  
**Last reviewed:** 2026-07-06

::: info Requires
Must be Organization Owner or Admin. The audit log contains sensitive, high-privilege information and is not visible to any other role — not in the app, and not at the database level.
:::

## 1. Open the Audit Log under Organization settings

Go to **Organization → Audit Log**. The audit log intentionally lives inside organization settings rather than the main navigation: when you are viewing it, you are viewing exactly one organization's complete change record.

Old bookmarks to the previous sidebar location redirect automatically.

## 2. Filter the view

Filter by entity type, action, actor, or date range, and use the timeline histogram to zoom into a window of activity. Use filters to narrow down a specific incident or to build compliance evidence.

Detail pages (work orders, inventory items) link straight into the audit log pre-filtered to that record, so you never mix audit data with operational timelines.

## 3. Open an event for detail

Click any row to see the full event body, including who did it, what changed, and the related record.

## 4. Export audit evidence

Use the download menu to export the filtered view as CSV or JSON. Audit log exports are a dedicated path — audit entries are never included in work order, report, or other data exports. Every export notifies the organization's admins.

::: tip Note
Audit events are immutable once written. You cannot delete or edit an entry, which is what makes the log useful as evidence.
:::

## Related articles

- [DSR cockpit for privacy operators](./dsr-cockpit-overview)
