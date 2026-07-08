---
title: "Connect QuickBooks"
description: "Authorize EquipQR to create draft invoices in your QuickBooks Online company."
lastReviewed: 2026-07-07
personas: ["admin","owner"]
requirement: "Must be Organization Owner or Admin."
---

**For:** Admin, Owner  
**Last reviewed:** 2026-07-07

::: info Requires
Must be Organization Owner or Admin.
:::

The QuickBooks integration pushes completed work orders to QuickBooks Online as **draft invoices**. You still review and send every invoice from QuickBooks, so you keep full control over customer billing.

## 1. Open Organization → Integrations

From the sidebar, open **Integrations** (or Organization → Integrations tab). The QuickBooks Online card is at the top of the list.

## 2. Click Connect to QuickBooks Online

EquipQR redirects you to QuickBooks to authorize the connection. Sign in to the QuickBooks company you want to connect.

## 3. Approve access

Grant the requested scopes. EquipQR only reads customers and writes invoices — it does not touch payroll, banking, or transactions.

## 4. Return to EquipQR

You land back on the Integrations tab with a **Connected** badge on the QuickBooks Online card. The card offers **Disconnect** and a shortcut to manage the connection inside QuickBooks.

![Integrations page with QuickBooks Online connected](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/desktop/qb-01-integrations-connected.png)

The same card is available on mobile:

![Mobile Integrations page with QuickBooks connected](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/admin-integrations/mobile/qb-01-integrations-connected.png)

Next, map your teams to QuickBooks customers so invoice export knows where to post.

::: tip Note
QuickBooks access tokens expire every 100 days. EquipQR auto-refreshes the connection in the background, so you rarely need to reconnect manually. If the connection health indicator in the top bar turns red, reconnect from this page.
:::

## Related articles

- [Map teams to QuickBooks customers](./map-teams-to-qb-customers)
- [Export a work order to QuickBooks](./export-work-order-to-qb)
