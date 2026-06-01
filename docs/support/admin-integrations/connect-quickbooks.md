---
title: "Connect QuickBooks"
description: "Authorize EquipQR to create draft invoices in your QuickBooks Online company."
lastReviewed: 2026-05-01
personas: ["admin","owner"]
requirement: "Must be Organization Owner or Admin."
---

**For:** Admin, Owner  
**Last reviewed:** 2026-05-01

::: info Requires
Must be Organization Owner or Admin.
:::

The QuickBooks integration pushes work order details to QuickBooks Online as **draft invoices**. You still review and send from QuickBooks, so you keep full control over customer billing.

## 1. Open Organization → Integrations

From the sidebar, open Organization, then click the Integrations tab.

## 2. Click Connect to QuickBooks Online

EquipQR redirects you to QuickBooks to authorize the connection. Sign in to the QuickBooks company you want to connect.

## 3. Approve access

Grant the requested scopes. EquipQR only reads customers and writes invoices — it does not touch payroll, banking, or transactions.

## 4. Return to EquipQR

You land back on the Integrations tab with a Connected status. Next, map your teams to QuickBooks customers.

::: tip Note
QuickBooks access tokens expire every 100 days. EquipQR auto-refreshes the connection every 15 minutes, so you rarely need to reconnect manually.
:::

## Related articles

- [Map teams to QuickBooks customers](./map-teams-to-qb-customers)
- [Export a work order to QuickBooks](./export-work-order-to-qb)
