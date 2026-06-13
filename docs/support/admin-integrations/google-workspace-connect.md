---
title: "Connect Google Workspace"
description: "Use your Google Workspace directory to sync users, groups, and admin controls into EquipQR."
lastReviewed: 2026-06-13
personas: ["admin","owner"]
requirement: "Must be a Google Workspace super-admin for your domain and an EquipQR Organization Owner or Admin."
---

**For:** Admin, Owner  
**Last reviewed:** 2026-06-13

::: info Requires
Must be a Google Workspace super-admin for your domain and an EquipQR Organization Owner or Admin.
:::

## Connect Google Workspace

1. Open **Dashboard → Organization → Integrations** (or **Dashboard → Onboarding → Workspace** for first-time setup).
2. Click **Connect Google Workspace** and sign in with a Google Workspace administrator account.
3. Approve the requested scopes on the Google consent screen. EquipQR requests directory access plus Drive, Docs, and Sheets permissions in a single flow so exports and member sync work immediately after onboarding.

## Finish authorization (legacy connections only)

If Google Workspace shows **Permissions needed**, the organization connected before export scopes were added or Google returned a partial scope list. Click **Finish authorization** to run the same full-scope consent flow used during onboarding.

## Sync and import members

After connecting, use **Sync Directory** on Integrations or Workspace onboarding, then select users to import into EquipQR.

## Disconnect Google Workspace

Organization owners and admins can **Disconnect** Google Workspace from Integrations or Workspace onboarding. Disconnect:

- Revokes EquipQR's Google OAuth access
- Clears the cached Workspace directory snapshot
- **Releases the workspace domain claim** so onboarding can start again from the beginning

Organization members and EquipQR data are kept. After disconnecting, return to **Workspace onboarding** and connect again when you are ready.

::: tip Note
Workspace sync is optional — you can keep inviting users manually and the rest of EquipQR works identically.
:::
