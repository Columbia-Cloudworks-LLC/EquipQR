---
title: "DSR cockpit for privacy operators"
description: "Where Admins and Owners process data subject requests through verification, extension, completion, or denial."
lastReviewed: 2026-07-19
personas: ["admin","owner"]
requirement: "DSR Cockpit is restricted to Organization Owners and Admins."
---

**For:** Admin, Owner  
**Last reviewed:** 2026-07-19

::: info Requires
DSR Cockpit is restricted to Organization Owners and Admins.
:::

## 1. Open DSR Cockpit

Open **Legal** in the footer and choose **DSR Cockpit**, or go to **Settings → Privacy** and click **DSR Cockpit**. The queue shows every open request that needs action.

## 2. Open a case

Click a row to open its case. The timeline shows every state change, evidence export attempt, and consumer notice that went out.

## 3. Take the next action

- **Verify** — confirm the requester owns the data.
- **Extend** — extend the deadline up to the statutory maximum.
- **Deny** — close with a documented reason.
- **Complete** — mark fulfilled after the data has been provided, corrected, or deleted.
- **Request Export / Retry Export** — generate the evidence package.
- **Resend Notice** — re-deliver the consumer notice.

## 4. Non-admins get 404 or 403

Members never see the DSR cockpit route. Cross-org requests 404 to avoid leaking that another organization even received a request.

## Related articles

- [Submit a privacy request](./submit-privacy-request)
- [Use the audit log](./audit-log-basics)
