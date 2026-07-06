---
title: "Daily Operator Check-Ins"
description: "Configure operator safety checklists, assign them to equipment, print QR links, and review daily audit ledgers."
lastReviewed: 2026-07-06
personas: ["owner", "admin"]
---

**For:** Organization Owner, Admin  
**Last reviewed:** 2026-07-06

Organization owners and administrators configure **Daily Operator Check-Ins** under **Operations → Daily Check-Ins** in the EquipQR dashboard. Operators complete assigned checklists through a **separate public QR link** — no EquipQR login required.

## What Daily Operator Check-Ins do

- Define custom operator checklist templates (sections, required items, and captured data fields)
- Clone starter templates (for example **Odometer Log**) and customize them for your fleet
- Assign **one checklist to many machines** or **multiple checklists to one machine**
- Generate a **token-based public QR link** per assignment (not guessable from equipment ID)
- Let unauthenticated operators scan, complete admin-configured fields, and submit
- Review an append-only **Daily Ledger** and export PDF or Excel for audit documentation

## Who can manage check-ins

| Role | Access |
| --- | --- |
| Owner / Admin | Create templates, assign checklists, generate and rotate QR links, review ledger, export |
| Manager / Technician | Cannot manage templates or assignments; may view equipment records they already access |

Technicians and managers do **not** see the Daily Check-Ins console unless they hold an organization Owner or Admin role.

## Step 1 — Choose or build a template

1. Go to **Operations → Daily Check-Ins**.
2. Expand **Starter catalog** and clone a preset (for example **Odometer Log** or **Daily Safety Walkaround**), **or** click **New template** to build from scratch.
3. Edit the template before assigning:
   - **Data fields** — operator-entered values (name, odometer, notes), optional client context (timestamp, GPS), and equipment record snapshots with checklist-specific labels
   - **Checklist items** — sections and required pass/fail or checkbox items

Starter templates are **clone-only** — cloning copies fields and items into your organization; editing the starter catalog itself is not supported.

## Step 2 — Assign checklists to equipment

You can assign from either surface:

- **Daily Check-Ins console** — open **Assign to equipment** on a template card and select one or more machines.
- **Equipment details** — scroll to **Daily Operator Check-In**, pick a template, and add the assignment inline.

Each assignment gets its own QR link. Assigning the same template to ten trucks creates ten independent links tied to the correct equipment record.

## Step 3 — Generate and print QR codes

1. Open the equipment record.
2. In **Daily Operator Check-In**, use **View QR code** (or the equipment header **QR Code** button).
3. In the QR dialog, choose **QR code type**:
   - **Equipment scan (authenticated)** — opens the signed-in equipment record (technician workflow).
   - **Daily check-in: {template name}** — opens the public operator form at `/qr/operator-check-in/{token}`.

QR links are generated automatically when a checklist is assigned and stay available to organization
owners and admins **from any device** — you can assign on one computer and print from another.

If the dialog shows a missing-link notice (for example, an assignment created before cross-device
QR links shipped), an owner or admin can use **Rotate QR link** in the Daily Operator Check-In
actions menu to generate a fresh link. Rotation replaces any previously printed QR codes.

### Where to place daily check-in QR codes

The daily check-in QR **does not have to be physically affixed to the machine**. Common placements include:

- A sticker in a **service truck cab**
- A **laminated sheet** in a shop binder keyed by unit number
- A **counter copy** at the office for end-of-day paperwork
- A printed slip included with **daily route packets**

What matters is that operators scan the **correct QR for the assigned equipment and checklist**. If you keep central office copies:

- Label each printout clearly with **equipment name or unit number** and **checklist name**
- Reprint after **token rotation** or assignment changes
- Retire old copies when a template is deleted (existing QR links stop working)

Authenticated equipment scan QR codes are still best placed on or near the machine for technician field access.

## Step 4 — Operator submission (no login)

When an operator scans a daily check-in QR:

1. The public page loads the assigned template and equipment context.
2. The operator completes required data fields and checklist items.
3. hCaptcha (when configured) and server-side rate limits protect abuse.
4. Submission is **insert-only** — operators cannot edit prior ledger rows.

If **scan location collection** is enabled for your organization, GPS is captured only when the template includes a **GPS location** client context field. Submission still succeeds if the operator denies location permission.

## Step 5 — Review the Daily Ledger

1. Return to **Operations → Daily Check-Ins**.
2. Open the **Daily Ledger** tab.
3. Filter by date range, equipment, and template (including retired templates marked **(deleted)**).
4. Export **PDF** or **Excel** for the filtered view.

Deleting or deactivating a template **disables assignments and stops QR links** but **preserves collected submissions** in the ledger.

## Real-world scenario — service truck mileage log

Use this pattern when you only need **operator name + odometer reading** at day end across a fleet of service trucks.

1. **Clone Odometer Log** from the starter catalog on **Daily Check-Ins**.
2. Rename the clone to something fleet-specific, for example **Daily Service Truck Mileage**.
3. Confirm the template captures **Operator name** and **Odometer reading** (adjust labels if needed).
4. **Assign** the template to every service truck in **Assign to equipment** (multi-select).
5. For each truck, open equipment details → **View QR code** → select **Daily check-in: Daily Service Truck Mileage** → print or download.
6. Place QR codes per your workflow (cab sticker, office binder, or end-of-day packet — see placement guidance above).
7. Each evening, operators scan their truck's QR, enter name and odometer, and submit.
8. At month end, open **Daily Ledger**, filter by date range and equipment, then **export Excel** for mileage records.

This workflow supports **audit documentation**; it does not replace DOT, FMCSA, or other regulated logbook requirements unless your compliance team confirms otherwise.

## Real-world scenario — one machine, multiple checklists

A single excavator might need:

- A **pre-shift safety walkaround** checklist
- A **weekly grease / fluid check** checklist

Assign both templates on the same equipment record. Each assignment exposes its own entry in the QR dialog dropdown. Operators scan the QR that matches the checklist they are completing.

## Compliance wording

EquipQR records support **safety and audit documentation**. They **do not** certify OSHA, DOT, FMCSA, or other legal or regulatory compliance. Use exports as supplemental evidence alongside your organization's official compliance program.

## Public route reference

| QR type | Route |
| --- | --- |
| Daily operator check-in | `/qr/operator-check-in/{token}` |
| Authenticated equipment scan | `/qr/equipment/{id}` |

These routes are separate by design — daily check-in tokens are not derived from equipment IDs.

## Related articles

- [Generate and print an equipment QR code](../equipment-qr/print-equipment-qr)
- [Add equipment](../equipment-qr/add-equipment)
- [Organization roles](../teams-roles/organization-roles)
