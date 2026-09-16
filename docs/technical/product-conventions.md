# Product conventions (agent)

Implementation notes for EquipQR product surfaces. Customer help lives
under `docs/support/` and `docs/guides/`. Update **this file** when
product behavior changes; add a pointer in `AGENTS.md` only if a new
topic needs discovery.

## Product onboarding

Active owners and admins only — members are never redirected. Wizard
route: `/dashboard/onboarding/getting-started` while
`get_product_onboarding_status` returns `needs_onboarding` (null
`product_onboarding_completed_at` and the org is missing a team **or**
equipment). Established orgs that already have both skip the wizard even
when the timestamp is null. Steps: team → equipment → QR. Equipment
`team_id` links QuickBooks customer invoicing.

## Dashboard, equipment, and public QR

Dashboard stat widgets and `get_dashboard_trends` respect TopBar
`useSelectedTeam` (including unassigned-only).

**Org realtime:** `backgroundSync.ts` refcounts org channels and
unsubscribes on unmount. `equipment_notes` realtime filters use
denormalized `organization_id`.

Public `/qr/equipment/:id` uses `useSimpleOrganizationSafe()` — not
`useOrganization()` outside `SimpleOrganizationProvider`. Duplicate org
equipment serials warn with a link but do not block create. Offline
creates queue in localStorage; persistent 409 sync failures usually mean
the record already exists.

**Equipment details desktop layout:** Details tab — Basic Information +
Lifecycle & Warranty share a two-column row. Work Orders tab —
Preventative Maintenance (`EquipmentPMInfo`) with PM Template nested
above PM Schedule (two-column, aligned control rows). Check-Ins tab —
operator check-in assignment + ledger.

## Operator daily check-ins and Quick Forms

Operator daily check-ins are a separate append-only domain from PM and
scans. Org admins define templates on **Operations → Daily Check-Ins**.
Equipment assignment lives on the equipment **Check-Ins** tab via
`EquipmentOperatorCheckinTemplateAssignmentMenu` (`MultiSelectActionMenu`).
Daily-check-in QR lives there (not bulk Equipment QR admin). Equipment QR
becomes a dropdown when any check-ins are assigned.

Captured fields are admin-defined (operator input, optional client
context, labeled equipment-record snapshots). There is no hard-coded
mileage/odometer and no auto-filled equipment assumptions. Starter
catalog presets are clone-only (client-side, collapsible). Template
delete/deactivate via `delete_operator_checklist_template` disables
assignments but preserves ledger submissions.

Public `/qr/operator-check-in/{token}` stores a SHA-256 hash in Postgres.
The raw token persists in `operator_checkin_token_secrets` (admin-only
RLS; written only by `create_operator_checkin_assignment` /
`rotate_operator_checkin_token`) so QR links print from any device.
Legacy assignments created before persistence (bulk/direct inserts with
`token_rotated_by` null and no secret row) show a missing-token notice;
owners/admins mint via **Generate QR link**
(`rotate_operator_checkin_token`).

`operator-check-in` edge: `requireOperatorCheckinAssignmentToken` + anon
RPC `resolve_operator_checkin_by_token` for load; service_role submit RPC
only after hCaptcha when configured. Daily Ledger is template-scoped with
equipment multi-select; PDF/Excel exports use that scope.

**Quick Forms** are standalone public QR data-collection (not
equipment/team-linked). Owners/admins on **Operations → Quick Forms**;
public `/qr/quick-form/{token}` via `quick-form` edge; tokens in
`quick_form_token_secrets` with anon `resolve_quick_form_by_token`;
append-only ledger + CSV/Excel/PDF exports.

Customer steps: [operator daily check-ins](../support/administration/operator-daily-check-ins.md).

## Work orders

**Create:** single flow — PM template `<Select>` directly below title
(None + clear control; defaults to the equipment-assigned template). No
generic vs PM type split. Equipment QR, card, details, and dialog entry
points all use `createWorkOrder=1`. Create-form equipment picker is
scrollable Radix Select + Search dialog — not a cmdk combobox.

**Details:** read `workOrderKeys.detail` (`useWorkOrderById`). Mutation
hooks call `invalidateWorkOrderCaches` in `invalidateWorkOrderQueries.ts`,
not list-only invalidation. Inline edit on the details page (assignment,
priority, due date, description) — not a separate edit dialog.
Owner/admin delete via `delete_work_order_cascade` (list + details;
storage cleanup inside the RPC).

**List and calendar:** the list is paginated; search/sort stay on list
only. Calendar is Month/Week/Day with Today and jump increments (year /
4 weeks / 7 days). Event chips grow to show the full title. Canceling
create-from-slot must not leave a ghost event.

**Mobile:** contextual FAB + bottom sheet on work order details
(`MobileWorkOrderActionFooter` / `MobileWorkOrderActionSheet`). Reserve
bottom padding so content clears the fixed FAB.

**Notes:** requestors and work-order creators add public-only notes on
viewable WOs including completed. Managers/technicians/team owners keep
full notes (including private) and may note after completion. Cancelled
WOs stay note-locked. RLS enforces requestor public-only on insert.

**Exports:** work-order/report exports are org owner/admin today
(`verifyOrgAdmin` on edge; UI `permissionLevels.isManager`). Team
visibility is application-layer. Opening requestor/viewer export needs
server-side team scope, customer-safe formats, and no private notes or
costs. Bulk fetch already filters `is_private = false` on notes.

**Historical:** create/edit/convert is owner/admin-only via org-scoped
RPCs (`create_historical_work_order_with_pm`,
`replace_historical_work_order_timeline` with explicit
`p_organization_id`, `convert_work_order_to_historical`).
`HistoricalTimelineEditorDialog` seeds from frozen `editorSeedEvents` on
open. Edit mode waits for `historyReady`; save disabled when incomplete
rows are visible. PDF/Docs exports read `created_date`, `completed_date`,
and status history. Operational timeline (`WorkOrderTimeline`) stays
separate from the audit log. Chained lifecycle in `historicalTimeline.ts`
— an upstream status change clears downstream rows.

Customer lifecycle: [docs/guides/workflows.md](../guides/workflows.md).

## Equipment location and maps

Canonical resolver: `effectiveLocation.ts`. Effective order is last-known
scan GPS → assigned equipment address → legacy `equipment.location`
coordinates → team fallback when `team.override_equipment_location` is
enabled (no per-equipment `use_team_location` opt-in).

Asset maps use a shared source dropdown (Effective / team / equipment /
last scan) and `LocationSourceBadge`. Fleet Map aligns source labels.
`ClickableAddress` and map pins open Google Maps directions.
One-time GPS saves use `LiveLocationCaptureDialog` + center-pin
`CenterPinMapPicker` (fixed pin, pan map to adjust, pin lifts with ground
shadow while dragging). `equipment_location_history` is authoritative for
scan movement; assigned-address and live-capture saves log manual history
via `logEquipmentLocationChange`.

## Audit logs and team views

Audit log: `/dashboard/organization/audit-log` (owner/admin only,
Organization subnav — not the main sidebar). Dedicated CSV/JSON export
via `AuditExplorer`. Legacy `/audit-log` redirects. Do not surface audit
timelines on operational or historical work-order pages as primary UX.

Team details use `teams.preferred_view` (`internal` | `department` |
`customer`) with `TeamViewSwitcher` — session override on TeamDetails,
persisted team default via `updateTeam`.

PM templates list separates EquipQR bundled vs org templates (both
collapsible; EquipQR starts collapsed when the org has at least one
custom template). Team-scoped equipment assignment via
`PMTemplateEquipmentAssignmentMenu` + `MultiSelectActionMenu`.

Visibility rules: [docs/guides/permissions.md](../guides/permissions.md).
