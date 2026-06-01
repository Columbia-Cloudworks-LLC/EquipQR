---
title: "Connect Google Workspace"
description: "Use your Google Workspace directory to sync users, groups, and admin controls into EquipQR."
lastReviewed: 2026-05-01
personas: ["admin","owner"]
requirement: "Must be a Google Workspace super-admin for your domain and an EquipQR Organization Owner or Admin."
---

**For:** Admin, Owner  
**Last reviewed:** 2026-05-01

::: info Requires
Must be a Google Workspace super-admin for your domain and an EquipQR Organization Owner or Admin.
:::

## 1. Open Workspace onboarding

Navigate to Dashboard → Onboarding → Workspace, or click the Google Workspace card from Organization → Integrations.

## 2. Sign in with Google

Authorize EquipQR with the scopes it needs to read your directory. EquipQR never modifies Workspace settings; it reads users and groups only.

## 3. Pick users and groups to sync

Check the groups and users you want to mirror into EquipQR. Selective sync avoids importing every mailbox from a large Workspace.

## 4. Run the sync

After the initial sync, Workspace users appear as pending EquipQR invites. Finish onboarding by assigning each imported user to a team.

::: tip Note
Workspace sync is optional — you can keep inviting users manually and the rest of EquipQR works identically.
:::
