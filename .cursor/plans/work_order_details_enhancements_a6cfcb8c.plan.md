---
name: Work Order Details Enhancements
overview: Implement the mobile-first work order detail UX improvements (action sheet, sticky work state, quick-info reframe, field-tech affordances) and enforce QuickBooks admin gating using the existing can_manage_quickbooks permission.
todos:
  - id: qb-gating
    content: Align QuickBooks UI to can_manage_quickbooks permission
    status: completed
  - id: mobile-actions
    content: Build mobile action sheet + sticky work tray
    status: completed
  - id: mobile-info
    content: Reorder mobile layout around task flow
    status: completed
  - id: field-tech
    content: Add offline/timer/navigation affordances
    status: completed
  - id: tests
    content: Update QuickBooks permission tests
    status: completed
isProject: false
---

# Work Order Details Enhancements Plan

## Scope notes

- QuickBooks admin role already exists as `organization_members.can_manage_quickbooks` and is exposed via RPC `get_user_quickbooks_permission` (used by `useQuickBooksAccess`). We will use this for **all** QuickBooks UI gating, not raw role checks.

## Files to touch

- Work order UI: [c:\Users\viral\EquipQR\src\features\work-orders\pages\WorkOrderDetails.tsx](c:\Users\viral\EquipQR\src\features\work-orders\pages\WorkOrderDetails.tsx), [c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderDetailsMobileHeader.tsx](c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderDetailsMobileHeader.tsx), [c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderDetailsMobile.tsx](c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderDetailsMobile.tsx), [c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderDetailsSidebar.tsx](c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderDetailsSidebar.tsx), [c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderQuickActions.tsx](c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderQuickActions.tsx), [c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderNotesMobile.tsx](c:\Users\viral\EquipQR\src\features\work-orders\components\WorkOrderNotesMobile.tsx)
- QuickBooks gating: [c:\Users\viral\EquipQR\src\hooks\useQuickBooksAccess.ts](c:\Users\viral\EquipQR\src\hooks\useQuickBooksAccess.ts), [c:\Users\viral\EquipQR\src\features\organization\components\QuickBooksIntegration.tsx](c:\Users\viral\EquipQR\src\features\organization\components\QuickBooksIntegration.tsx), [c:\Users\viral\EquipQR\src\features\teams\components\QuickBooksCustomerMapping.tsx](c:\Users\viral\EquipQR\src\features\teams\components\QuickBooksCustomerMapping.tsx)
- Tests: [c:\Users\viral\EquipQR\src\tests\quickbooks\QuickBooksExportButton.test.tsx](c:\Users\viral\EquipQR\src\tests\quickbooks\QuickBooksExportButton.test.tsx), [c:\Users\viral\EquipQR\src\tests\quickbooks\useQuickBooksAccess.test.ts](c:\Users\viral\EquipQR\src\tests\quickbooks\useQuickBooksAccess.test.ts)

## Implementation plan

### 1) QuickBooks admin gating (billing admins)

- Replace role-only checks with `useQuickBooksAccess` in:
- `QuickBooksIntegration` (connect/disconnect UI)
- `QuickBooksCustomerMapping` (team-customer mapping UI)
- Ensure **QuickBooks export** visibility is restricted to users who can manage QuickBooks (owners + admins with `can_manage_quickbooks`). This is already enforced inside `QuickBooksExportButton`, but we will:
- Hide surrounding menu separators when QuickBooks entry is not rendered.
- Use `useQuickBooksAccess` in mobile action sheets to show/hide QuickBooks entries.
- Update/extend tests to cover permission-based rendering (owner, admin with permission, admin without permission, member).

### 2) Mobile header + action sheet consolidation

- Replace multiple icon buttons in `WorkOrderDetailsMobileHeader` with a single **Actions** button that opens a bottom sheet (shadcn `Sheet` or `DropdownMenu` tailored for touch).
- Action sheet sections:
- **Work**: Add note, Add photo, Add time (timer), Start/Pause/Complete
- **Office tools**: Download PDF, Export Excel (visible to managers/admins)
- **QuickBooks**: Export + status (visible only if `useQuickBooksAccess` is true)
- Keep header limited to: Back, Title/Status, Primary action.

### 3) Sticky “On the job” tray + timer

- Introduce a sticky bottom tray when status is `in_progress` or when a timer is running:
- Controls: Pause/Resume, Add note, Add photo, Complete
- Compact timer display with elapsed time
- Implement a lightweight timer hook (local state + persistence in `localStorage`) and a stop action that converts elapsed time into a **note with hours worked** via existing note flow (no DB schema change).
- Show offline indicator (e.g., banner or dot) using `navigator.onLine` and expose “Saved locally / Syncing…” states for note submission.

### 4) Mobile information architecture refresh

- Reorder and refactor `WorkOrderDetailsMobile` to be task-first:
- **Top summary card**: Location with “Navigate”, Equipment with “Open equipment”, Due date/priority, Assignee/team.
- **Progress card**: PM checklist progress + quick jump.
- **Notes/Photos/Costs**: show counts and “Add” affordances before the full lists.
- Pull the desktop “Quick Info” model into mobile main content (not the sidebar overlay) so it’s above the fold.

### 5) Field-tech affordances

- Add navigation shortcut if `equipment.location` is present (maps URL).
- Add contact shortcuts if requester/assignee contact data is available (discover via `WorkOrderDetailsInfo` and work order types; hide if missing).
- Expand tap targets and ensure all actions are reachable via the bottom tray/action sheet.

### 6) Verification and regression checks

- Validate role gating across work order header, action sheet, and QuickBooks settings.
- Smoke-check mobile layout at small widths and tablet breakpoints.
- Run relevant unit tests for QuickBooks permission gating.

## Testing plan

- Update/extend tests in `src/tests/quickbooks/*` to assert gating by `can_manage_quickbooks`.
- Add lightweight component tests for action sheet rendering if existing test patterns allow.
- Manual QA checklist: mobile actions, timer persistence, offline indicator, export visibility by role.