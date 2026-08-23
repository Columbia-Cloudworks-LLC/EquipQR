# Roles and permissions

EquipQR has two role layers: organization roles (Owner, Admin, Member) and team roles (Manager, Technician, Requestor, Viewer). For who should hold each role, see [Teams & Roles](/support/teams-roles/) in the Help Center.

## Permission matrix

### Organization management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Create Organization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update Organization Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete Organization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Organization Details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Switch Organizations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> Billing capabilities were removed from EquipQR in Jan 2025; there is no
> billing surface to permission against. Historical billing tables
> (`billing_events`, `organization_subscriptions`, etc.) are kept for
> auditability only and are not exposed in the UI.

### Member management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Invite Members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change Member Roles | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Member List | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resend Invitations | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Admin cannot change owner role or promote to owner

### Team management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Create Teams | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete Teams | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |
| Update Team Settings | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |
| Add Team Members | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |
| Remove Team Members | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |
| View Teams | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign Work Orders | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |

**Only for teams where user has Manager role**

### Equipment management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Create Equipment | ✅ | ✅ | ❌ | ✅† | ✅† | ❌ | ❌ |
| Update Equipment | ✅ | ✅ | ❌ | ✅ | ✅‡ | ❌ | ❌ |
| Delete Equipment | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Equipment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Generate QR Codes | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Scan QR Codes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update Custom Attributes | ✅ | ✅ | ❌ | ✅ | ✅‡ | ❌ | ❌ |

† Org-wide for owners/admins; team-scoped (manager or technician role on the assigned team) for team members. Equipment created without a team assignment is restricted to owners/admins (issue #650).

‡ Limited to status updates and maintenance records

### Work order management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Create Work Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update Work Order Status | ✅ | ✅ | ❌ | ✅ | ✅**** | ❌ | ❌ |
| Assign Work Orders | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Delete Work Orders | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Work Orders | ✅ | ✅ | ✅***** | ✅ | ✅***** | ✅***** | ✅***** |
| Complete Work Orders | ✅ | ✅ | ❌ | ✅ | ✅**** | ❌ | ❌ |
| Cancel Work Orders | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Revert Work Order to Accepted (completed/cancelled) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Revert PM Completion | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

****Only assigned work orders
*****Limited to relevant work orders (assigned, created by user, or team-related)

**Admin revert notes.** **Revert PM Completion** (completed PM checklist) and **Revert to Accepted** (completed/cancelled work order) are org owner/admin only (`is_org_admin`). On a completed work order with a completed PM, **Revert PM Completion** also reopens the work order to `accepted` in the same action so the checklist becomes editable again. **Revert to Accepted** remains available for work-order-only reopen without changing the PM.

### Inventory and internal costing visibility

Inventory/parts access is granted through two explicit grants (not
`organization_members.role` values): **Parts Manager** and **Parts
Consumer**. Owners and admins get access by default. Work order **cost
line items** (parts, unit pricing, labor hours/rates) are internal data:
customer-facing roles (team Requestor and Viewer) and plain members must
see **zero evidence** of parts, stock levels, pricing, or labor anywhere
in the application. Internal costing and final pricing are handled later
in the QuickBooks invoicing phase.

| Data / Action | Owner | Admin | Parts Manager | Parts Consumer | Manager* | Technician* | Requestor | Viewer | Plain Member |
| ------------- | ----- | ----- | ------------- | -------------- | -------- | ----------- | --------- | ------ | ------------ |
| View inventory, part lookup, alternates | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage inventory (create/edit/adjust) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Equipment "Parts" tab | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Consume parts on work orders ("Add from Inventory") | ✅ | ✅ | ✅ | ✅† | ❌ | ❌ | ❌ | ❌ | ❌ |
| View work order cost line items (parts, pricing, labor) | ✅ | ✅ | ❌‡ | ❌‡ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cost subtotals on work order cards / dashboard cost widgets | ✅ | ✅ | ❌‡ | ❌‡ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Labor hours on work order notes / estimated hours | ✅ | ✅ | ❌‡ | ❌‡ | ✅ | ✅ | ❌ | ❌ | ❌ |

\* Team-level roles on the work order's team. `Manager`/`Technician` here refer to team roles, not inventory grants.

† Parts Consumers can consume/restore inventory only through work orders they hold operational cost access to (team owner/manager/technician on the work order's team, or work order assignee). The `adjust_inventory_quantity` RPC enforces this server-side.

‡ Unless the same user also holds an operational team role (or org owner/admin). Inventory grants never expand work order cost visibility on their own.

**Enforcement layers:**

- **RLS.** `work_order_costs` policies use `can_access_work_order_costs(work_order_id, user_id)`. That includes org owner/admin, work order assignee, or team owner/manager/technician on the work order's team. Inventory tables use `can_access_inventory` / `can_manage_inventory`.
- **Application.** `useCanViewWorkOrderCosts()` gates every cost-surfacing UI (costs section, card subtotals, cost dashboard widgets, labor hours on notes). `useInventoryAccess()` gates every inventory surface (routes, sidebar, equipment Parts tab, work order part picker, dashboard FAB).
- **Exports.** Customer-safe Service Report PDF never includes costs/labor for non-admin audiences. Bulk exports are org-admin only (edge `verifyOrgAdmin`).

Both grants are managed from the **Parts Access** panel on the Inventory page (or per member on Organization → Members). Only owners/admins can grant or revoke either role.

### Audit log visibility (#1122)

The organization audit log is restricted to **owners and admins** at every layer: the page lives under **Organization → Audit Log** with an in-page role guard, `audit_log` SELECT RLS requires an active owner/admin membership, and the `get_audit_log_timeline` RPC re-checks `is_org_admin`. Audit entries never appear on operational pages (work order or inventory detail) and are never included in data exports outside the dedicated audit CSV/JSON export path, which notifies admins on every export.

## DSR cockpit permissions (Phase one)

### Route and action policy

| Capability | Owner | Admin | Member |
|------------|-------|-------|--------|
| View DSR queue (`/dashboard/dsr`) | ✅ | ✅ | ❌ |
| Open DSR case (`/dashboard/dsr/:requestId`) | ✅ | ✅ | ❌ |
| Apply lifecycle actions (`verify`, `deny`, `extend`, `complete`) | ✅ | ✅ | ❌ |
| Trigger evidence export (`request_export`, `retry_export`) | ✅ | ✅ | ❌ |
| Resend consumer notices (`resend_notice`) | ✅ | ✅ | ❌ |

### Tenant isolation rules

- DSR cases are scoped by `dsr_requests.organization_id`.
- Access checks are enforced at both edge-function and database-policy boundaries.
- Requests outside actor org are returned as `404` (masked cross-org semantics).
- Role denial inside the same org is returned as `403`.

### Explicit defaults

- Members are denied by default in phase one.
- No non-admin operator role is enabled in this release.
- Any future role expansion must update this document and corresponding RLS + edge-function checks in the same PR.
