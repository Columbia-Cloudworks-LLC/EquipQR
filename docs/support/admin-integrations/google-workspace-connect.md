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
3. Approve the **directory** scopes on the Google consent screen. EquipQR requests identity plus `admin.directory.user.readonly` first so member import and directory sync can start immediately after onboarding.
4. When you configure Google Drive export destinations or click **Finish authorization** on Integrations, EquipQR requests Drive, Docs, and Sheets scopes **in context** using incremental authorization (`include_granted_scopes=true`).

## Finish authorization (export scopes)

If Google Workspace shows **Permissions needed**, directory sync is connected but export scopes are still missing. Click **Finish authorization** to grant Drive, Docs, and Sheets permissions without repeating the directory consent step.

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
