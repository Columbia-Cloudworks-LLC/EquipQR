# Product conventions

Durable product behavior for EquipQR. Customer how-tos live in the Help
Center (`docs/support/` and `docs/guides/`). Update **this file** when
product behavior changes. Do not inventory current files, symbols, or
line numbers here — look those up in the checkout when a task needs them.
Add a pointer in `AGENTS.md` only if a new topic needs discovery.

## Product onboarding

Only active owners and admins enter product onboarding. Members are never
redirected into the wizard. The wizard runs while the organization still
needs a team **or** equipment and onboarding is incomplete. Organizations
that already have both skip the wizard even if the completion timestamp is
empty. Steps: team → equipment → QR. Equipment team assignment is what
links QuickBooks customer invoicing.

## Dashboard, equipment, and public QR

Dashboard stats follow the selected team in the top bar, including
unassigned-only. Organization realtime subscriptions are refcounted and
must unsubscribe on unmount.

Public equipment QR pages work without the signed-in organization
provider. Duplicate organization serials warn with a link but do not
block create. Offline creates queue locally; a persistent conflict on
sync usually means the record already exists.

On desktop equipment details: Basic Information and Lifecycle & Warranty
share a two-column row. The Work Orders tab nests PM Template above PM
Schedule. The Check-Ins tab holds operator check-in assignment and the
ledger.

## Operator daily check-ins and Quick Forms

Daily check-ins are a separate append-only domain from preventative
maintenance and scans. Org admins define templates under **Operations →
Daily Check-Ins**. Assignment lives on the equipment **Check-Ins** tab
(searchable multi-select). Daily-check-in QR lives there, not on bulk
Equipment QR admin. Equipment QR becomes a dropdown when any check-ins
are assigned.

Captured fields are admin-defined: operator input, optional client
context, labeled equipment-record snapshots. There is no hard-coded
mileage or odometer and no auto-filled equipment assumptions. Starter
catalog presets are clone-only. Deleting or deactivating a template
disables assignments but preserves ledger submissions.

Public check-in links store a hash; the raw token is kept so QR links
print from any device. Legacy assignments created before token
persistence show a missing-token notice; owners and admins mint a link
with **Generate QR link**. Public load uses the assignment token; submit
uses the service role only after hCaptcha when configured. The Daily
Ledger is template-scoped with equipment multi-select; PDF and Excel
exports use that scope.

**Quick Forms** are standalone public QR data collection (not linked to
equipment or teams). Owners and admins manage them under **Operations →
Quick Forms**. Public submit is append-only; exports cover the ledger
(CSV, Excel, PDF).

Customer steps: [operator daily check-ins](../support/administration/operator-daily-check-ins.md).

## Work orders

**Create:** one flow. The PM template control sits directly below the
title (None plus a clear control; default is the equipment-assigned
template). There is no generic vs PM type split. Equipment QR, card,
details, and dialog entry points all open the same create intent. The
equipment picker is a scrollable select plus a search dialog, not a
command palette combobox.

**Details:** mutations must refresh the work-order detail cache, not
list-only caches. Inline edit covers assignment, priority, due date, and
description — not a separate edit dialog. Owners and admins delete with
cascade cleanup (list and details).

**List and calendar:** the list is paginated; search and sort stay on
the list. Calendar is Month / Week / Day with Today and jump increments
(year / 4 weeks / 7 days). Event chips grow to show the full title.
Canceling create-from-slot must not leave a ghost event.

**Mobile:** contextual FAB plus bottom sheet on work-order details.
Reserve bottom padding so content clears the fixed FAB.

**Notes:** requestors and work-order creators add public-only notes on
viewable work orders, including completed. Managers, technicians, and
team owners keep full notes (including private) and may note after
completion. Cancelled work orders stay note-locked. The database
enforces requestor public-only on insert.

**Exports:** work-order and report exports are org owner/admin today.
Team visibility is application-layer. Opening requestor/viewer export
needs server-side team scope, customer-safe formats, and no private
notes or costs. Bulk fetch already omits private notes.

**Historical:** create, edit, and convert are owner/admin-only and
org-scoped. The historical editor seeds from a frozen snapshot on open;
save stays disabled while incomplete rows are visible. PDF and Docs
exports read created, completed, and status-history dates. The
operational timeline stays separate from the audit log. An upstream
status change clears downstream historical rows.

Customer lifecycle: [work order workflows](../guides/workflows.md).

## Equipment location and maps

Effective location order is last-known scan GPS → assigned equipment
address → legacy stored coordinates → team fallback when the team
overrides equipment location. There is no per-equipment opt-in to team
location.

Asset maps share a source dropdown (Effective / team / equipment / last
scan) and a source badge. Fleet Map uses the same labels. Addresses and
map pins open Google Maps directions. One-time GPS saves use a
center-pin picker (fixed pin, pan the map to adjust, pin lifts while
dragging). Scan movement history is authoritative; assigned-address and
live-capture saves log a manual history row.

## Audit logs and team views

The audit log lives under Organization (owner/admin only), not the main
sidebar. Export is dedicated CSV/JSON from that explorer. The legacy
audit-log path redirects. Do not surface audit timelines on operational
or historical work-order pages as primary UX.

Team details have a preferred view (internal, department, or customer)
with a session override on the team page and a persisted team default.

PM templates list separates EquipQR bundled templates from organization
templates (both collapsible; EquipQR starts collapsed when the org has
at least one custom template). Equipment assignment is team-scoped
multi-select.

Visibility rules: [permissions](../guides/permissions.md).
