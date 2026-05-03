# Workflows Reference

This document is the canonical technical reference for EquipQR's work-order
lifecycle, role capabilities, and status-transition rules. It is not the
step-by-step walkthrough for end users — those live in the in-app support
library at `/dashboard/support`.

## Where to find user-facing walkthroughs

- **In-app support library** (`/dashboard/support`) — the primary source of
  truth for step-by-step guides, organized by role (Technician, Requestor,
  Manager, Admin, Owner) and workflow (Work Orders, Equipment & QR Codes,
  Inventory & Parts, Admin & Integrations, Privacy & Support).
- **[Image upload quick reference](../how-to/image-upload/quick-reference-card.md)**
  — single-page cheat sheet for technicians in the field.
- **[Image upload technician guide](../how-to/image-upload/technician-image-upload-guide.md)**
  — numbered-step guide with screenshots for work order + photo flows.

The rest of this document is structured as a reference for developers, admins,
and support engineers who need the full lifecycle and permission map in one
place.

## Work Order Lifecycle

### Status Flow

Work orders progress through seven states:

1. **Submitted** — initial state on creation.
2. **Accepted** — reviewed and approved for scheduling.
3. **Assigned** — handed to a specific technician or team.
4. **In Progress** — work has started.
5. **On Hold** — paused (waiting on parts, customer, or access).
6. **Completed** — terminal state. `completed_date` and `completed_day` are
   set automatically on transition.
7. **Cancelled** — terminal state. `completed_day` remains `NULL`.

### Status Transitions

| Current | Next states | Allowed roles | Notes |
|---------|-------------|---------------|-------|
| Submitted | Accepted, Cancelled | Manager, Admin, Owner | Initial review |
| Accepted | Assigned, Cancelled | Manager, Admin, Owner | Ready for assignment |
| Assigned | In Progress, On Hold, Cancelled | Manager, Admin, Owner, Assigned Technician | Work can begin |
| In Progress | Completed, On Hold, Cancelled | Manager, Admin, Owner, Assigned Technician | Active work phase |
| On Hold | In Progress, Cancelled | Manager, Admin, Owner, Assigned Technician | Resume or terminate |
| Completed | (terminal) | — | Final |
| Cancelled | (terminal) | — | Final |

### Status Change Permissions (summary)

```
Submitted → Accepted:      Manager+
Accepted → Assigned:       Manager+
Assigned → In Progress:    Manager+ or Assigned Technician
In Progress → Completed:   Manager+ or Assigned Technician
Any → On Hold:             Manager+ or Assigned Technician
Any → Cancelled:           Manager+
```

## Roles and Permissions

This section summarizes the role capabilities that drive work order access.
For the full RBAC matrix (including equipment, inventory, and member
management) see [Permissions](./permissions.md).

### Organization-Level Roles

| Role | Scope | Work order capabilities |
|------|-------|-------------------------|
| Owner | Organization-wide | Create, view, edit, delete, assign, and status-change any work order. |
| Admin | Organization-wide | Same as Owner, minus organization deletion and ownership transfer. |
| Member | Organization (limited) | Create work orders; view ones they created or are assigned to; view team work orders. |

### Team-Level Roles

| Role | Scope | Work order capabilities |
|------|-------|-------------------------|
| Manager | Team | Create, assign, change status, manage team members, view all team work orders. |
| Technician | Team | Create, update status on assigned work orders, record completion. Cannot assign. |
| Requestor | Team | Create work orders (submissions). View team work orders read-only after submission. |
| Viewer | Team | View team work orders read-only. Cannot create or modify. |

## Work Order Creation Methods

### 1. Direct Creation
- **Access**: Work Orders page (`/dashboard/work-orders`).
- **Entry point**: "Create Work Order" button.
- **Form**: `WorkOrderForm` modal with title, description, equipment
  (required), plus optional priority, assignee, team, due date, and estimated
  hours.
- **Initial status**: Submitted.

### 2. Equipment-Specific Creation
- **Access**: Equipment Details page (`/dashboard/equipment/:equipmentId`).
- **Location**: Work Orders tab.
- **Behavior**: The form opens with the equipment pre-selected and locked.

### 3. QR Code Scanning
- **Access**: Native mobile camera scanning of an equipment QR code.
- **Flow**:
  1. User scans the QR code with their phone camera.
  2. URL opens as `/qr/equipment/{id}` (or `/qr/inventory/{id}`,
     `/qr/work-order/{id}`).
  3. `EquipmentQRScan` validates auth and organization context, then redirects
     to the target record.
  4. User can create a work order from equipment context.

## Work Order Assignment

### Individual Assignment
- Allowed roles: Owner, Admin, team Manager.
- Assignee appears in their "My Work Orders" view.
- Individual assignment takes precedence for status updates.

### Team Assignment
- Allowed roles: Owner, Admin, team Manager.
- All team members can see the work order.
- Managers can reassign within the team.

### Combined Assignment
- Both individual and team can be set. Individual assignment still takes
  precedence for status actions; team assignment broadens visibility.

## Image Upload

Image upload is documented step-by-step in the in-app Support library under
"Add notes and photos to a work order" (Technician Field Work category). The
technical contract for developers is:

- Images are attached to work order notes (or equipment notes).
- Supported formats: JPG, PNG, GIF, WebP.
- Maximum size: 10 MB per file.
- Maximum per note: 10 images.
- Uploads go to Supabase Storage and are referenced by
  `equipment_note_images.uploaded_by`, which links the uploading user.
- Images uploaded on a work order also surface in the equipment Images tab.

## Troubleshooting

### Common Work Order Issues
1. **Permission Denied** — verify the user's organization role and team
   membership. Team-scoped actions require the appropriate team role.
2. **Equipment Not Found** — confirm the equipment exists and the user has a
   membership on its team.
3. **Assignment Failures** — the assignee must belong to the organization and
   (for team assignment) the team.
4. **Status Transition Errors** — check the transition table above. The UI
   only exposes valid next statuses, but direct API calls must respect the
   same rules.

### Common Image Upload Issues
- **Image won't upload** — check file size (< 10 MB), format (JPG, PNG, GIF,
  WebP), and network.
- **Images not appearing in Gallery** — confirm the work order saved; the
  equipment Images tab aggregates work order and equipment notes and may take
  a few seconds after upload.
- **Poor image quality** — ensure adequate lighting and a clean lens; hold
  the device steady.

For user-facing troubleshooting that the support team can send to customers,
point them to the in-app Support library (`/dashboard/support`) or the status
page (`status.equipqr.app`).

## Related Documentation

- [Permissions](./permissions.md) — full RBAC matrix and RLS policy guidance.
- [Architecture](../technical/architecture.md) — database schema and system
  architecture.
- [Image Upload Technician Guide](../how-to/image-upload/technician-image-upload-guide.md)
  — numbered-step guide with screenshots.
- [QuickBooks Integration](../integrations/quickbooks.md) — integration
  reference for developers setting up or debugging QuickBooks.

---

*Last reviewed: 2026-05-01. This document is technical reference. Step-by-step
user-facing walkthroughs live in the in-app Support library.*
