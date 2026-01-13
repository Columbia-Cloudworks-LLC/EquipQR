# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to EquipQR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-01-13

### Added

- **Comprehensive Audit Trail System**: New organization-wide audit logging for regulatory compliance (OSHA, DOT, ISO)
  - New `audit_log` table with database triggers for automatic change tracking
  - Tracks all changes to Equipment, Work Orders, Inventory, PM Checklists, Teams, and Members
  - Immutable append-only records that cannot be modified or deleted
  - New Audit Log page (`/audit-log`) with filtering, search, and statistics
  - `AuditLogTable` component with pagination and CSV export
  - `ChangesDiff` component showing before/after field changes
  - `HistoryTab` component for entity-specific audit history on detail pages
  - Actor (user) information preserved even after user deletion
  - Comprehensive type definitions in `src/types/audit.ts`

- **Organization Danger Zone**: New administrative operations for organization lifecycle management
  - **Transfer Ownership**: Owners can transfer ownership to admins with in-app confirmation workflow
    - `ownership_transfer_requests` table tracking pending/completed transfers
    - 7-day expiration on pending transfer requests
    - Email and in-app notifications for transfer requests
    - New owner chooses departing owner's role (admin, member, or remove)
  - **Leave Organization**: Non-owners can leave organizations with proper data denormalization
    - `user_departure_queue` table for batch processing departures
    - pg_cron job for background denormalization of user names in historical records
  - **Delete Organization**: Owners can permanently delete organizations
    - Cascading delete of all organization data (equipment, work orders, teams, inventory)
    - Confirmation dialog requiring organization name input
  - New components: `DangerZoneSection`, `TransferOwnershipDialog`, `LeaveOrganizationDialog`, `DeleteOrganizationDialog`, `PendingTransferCard`
  - New hooks: `useOwnershipTransfer`, `useLeaveOrganization`, `useDeleteOrganization`

- **Enhanced Report Export System**: Redesigned report export with customizable columns
  - New `ReportExportDialog` with column selection UI
  - `ColumnSelector` component with select all/none and reset to defaults
  - Persistent column preferences saved to localStorage per report type
  - Record count preview before export
  - Large dataset warning (>50,000 records)
  - Filter summary display in export dialog
  - New Edge Function `export-report` for server-side CSV generation with rate limiting
  - Report column definitions in `src/features/reports/constants/reportColumns.ts`

- **Work Order Excel Export**: New multi-worksheet Excel export for work orders
  - 6 worksheets: Summary, Labor Detail, Materials & Costs, PM Checklists, Timeline, Equipment
  - Client-side single work order export from detail page
  - Server-side bulk export via `export-work-orders-excel` Edge Function
  - `WorkOrderExcelExportDialog` for configuring bulk exports
  - Comprehensive type definitions in `src/features/work-orders/types/workOrderExcel.ts`
  - Labor hours aggregation across notes
  - Material cost rollups with inventory tracking
  - PM checklist items flattened to individual rows
  - Status change timeline for audit trail

- **Global Notifications**: Support for system-wide broadcast notifications
  - New notification types for ownership transfer (request, accepted, rejected, expired)
  - Updated notification bell with global notification support
  - New migrations for global notification infrastructure

- **Disaster Recovery Documentation**: Comprehensive disaster recovery guide
  - `docs/ops/disaster-recovery.md` with full PITR and daily backup procedures
  - Step-by-step recovery guides with PowerShell and Bash examples
  - Post-recovery verification checklist
  - RTO/RPO documentation
  - Quarterly DR testing procedures

- **Dashboard Stats Grid Component**: Extracted reusable stats grid
  - `DashboardStatsGrid` component in `src/features/dashboard/components/`
  - Unit tests for the component

- **Equipment Insights Hook**: Extracted equipment insights logic
  - `useEquipmentInsights` hook for reusable insights data fetching
  - Unit tests for the hook

### Changed

- **Reports Page**: Complete redesign with new export dialog and column customization
- **Equipment Details Tab**: Added History tab with audit trail
- **Inventory Item Detail**: Added History tab with audit trail
- **Work Order Details**: Added Excel export button to desktop and mobile headers
- **Dashboard Page**: Refactored to use new `DashboardStatsGrid` component
- **Equipment Sort Header**: Improved sorting controls and test coverage
- **Notification Settings**: Enhanced notification preferences handling
- **Organization Settings**: Added Danger Zone section for administrative operations
- **PM Template Seed Scripts**: Updated with improved error handling and logging

### Fixed

- **RLS Cross-Tenant Vulnerabilities**: Major security fix preventing former employees from accessing organization data
  - Added organization membership checks to 7 tables: `work_order_costs`, `notes`, `scans`, `work_order_notes`, `work_order_images`, `equipment_notes`, `export_request_log`
  - Users immediately lose write access when leaving an organization
  - Prevents data leakage and unauthorized modifications

- **Export Rate Limiting**: Added rate limiting to export endpoints to prevent abuse

- **Billing Trigger**: Dropped unused billing trigger that was causing errors

### Removed

- **equipmentCSVService.ts**: Removed legacy CSV export service (replaced by new report export system)
- **ReportExport.tsx**: Removed legacy report export component (replaced by `ReportExportDialog`)

### Security

- **RLS Policy Hardening**: All user-ownership policies now require active organization membership
- **Audit Trail Immutability**: No UPDATE or DELETE policies on audit_log table
- **Rate Limiting**: Export endpoints now rate-limited to prevent abuse
- **Denormalized Name Columns**: User names preserved in records after departure for accountability

### Database Migrations

- `20260113100000_add_export_rate_limiting.sql`: Rate limiting for exports
- `20260113200000_drop_billing_trigger.sql`: Remove unused billing trigger
- `20260113210000_fix_rls_cross_tenant_vulnerabilities.sql`: Security fixes for 7 tables
- `20260115000001_add_organization_danger_zone.sql`: Ownership transfer and departure queue tables
- `20260115000002_add_denormalized_name_columns.sql`: Name columns for data preservation
- `20260115000003_ownership_transfer_functions.sql`: RPC functions for ownership transfer
- `20260115000004_departure_functions.sql`: RPC functions for user departure
- `20260115000005_delete_organization_function.sql`: Organization deletion function
- `20260115000006_pgcron_departure_job.sql`: Background job for departure processing
- `20260115000007_add_ownership_transfer_notification_types.sql`: New notification types
- `20260115000008_add_global_notifications.sql`: Global notification support
- `20260115000009_update_transfer_notifications_global.sql`: Transfer notifications as global
- `20260115100000_comprehensive_audit_trail.sql`: Complete audit trail system with triggers

## [1.8.1] - 2026-01-12

### Fixed

- **Equipment Form Dropdown Overflow**: Fixed autocomplete dropdowns overflowing dialog bounds on desktop and covering keyboard on mobile
  - Replaced native HTML `<datalist>` elements with new `AutocompleteInput` component
  - Desktop: Uses Radix UI Popover with collision detection to stay within viewport
  - Mobile: Uses Drawer component for better touch interaction without keyboard overlap
  - New reusable `AutocompleteInput` component in `src/components/ui/autocomplete-input.tsx`

## [1.8.0] - 2026-01-12

### Added

- **Part Alternate Groups System**: New feature for managing interchangeable/equivalent parts
  - Create groups of parts that can substitute for each other (OEM, aftermarket, cross-references)
  - Add multiple part identifiers (OEM, aftermarket, SKU, MPN, UPC, cross-reference)
  - Verification status tracking (unverified, verified, deprecated) per group
  - Link inventory items to groups and set preferred/primary parts
  - New `AlternateGroupsPage` for browsing and managing alternate groups
  - New `AlternateGroupDetail` page for managing group members and identifiers

- **Part Lookup Page**: New search interface for finding compatible parts
  - Search by part number to find alternates and compatible inventory items
  - Search by equipment make/model to find all compatible parts via rules and direct links
  - Displays stock status, location, and pricing for each result
  - Quick navigation to inventory item details

- **Organization-Level Parts Managers**: Simplified parts management permissions
  - New `PartsManagersSheet` component for managing who can edit inventory items
  - Organization-wide parts managers replace per-item manager assignments
  - Replaces `inventory_item_managers` table with `parts_managers` for better scalability
  - Admins can assign any organization member as a parts manager

- **Equipment Parts Tab**: New tab on equipment details showing compatible inventory parts
  - Displays all parts compatible with the equipment via rules or direct links
  - Shows stock status with low-stock and out-of-stock indicators
  - Quick navigation to inventory item details

- **Inventory User Guides**: Comprehensive step-by-step guides added to Support page
  - Parts Managers guide: Assigning and managing parts managers
  - Adding Inventory Items guide: Creating and configuring inventory items
  - Compatibility Rules guide: Setting up equipment compatibility rules
  - Stock Management guide: Adjusting quantities and viewing transactions
  - QR Codes guide: Generating and using inventory QR codes
  - Part Alternate Groups guide: Managing interchangeable parts

- **New Database Migrations**:
  - `part_alternate_groups` table with verification status enum
  - `part_group_identifiers` table for storing part numbers per group
  - `part_group_members` table linking inventory items to groups
  - `parts_managers` table for organization-level parts management
  - RPC functions: `lookup_alternates_by_part_number`, `get_compatible_parts_for_make_model`

### Changed

- **Version Bump**: Updated to version 1.8.0 for major inventory system enhancements
- **Navigation**: Added Part Lookup and Part Alternates to main sidebar navigation
- **Support Page**: Added new "Guides" tab with inventory system tutorials
- **Inventory Types**: Extended type definitions for alternate groups, part identifiers, and parts managers
- **Compatibility Rules**: Enhanced editor with improved UI and validation
- **Test Coverage**: Extended inventory management journey tests for new features

### Fixed

- **Supabase Advisor Warnings**: Fixed schema issues identified by Supabase advisor
- **Bulk Compatibility Rules**: Fixed partial index for bulk set compatibility rules

## [1.7.13] - 2026-01-11

### Added

- **User Journey Testing Framework**: Migrated from component-oriented to user journey-oriented testing
  - New `src/tests/journeys/` directory with workflow-based tests organized by user story
  - Journey tests for: Equipment Management, Work Order Lifecycle, QR Scanning, CSV Import, PM Templates, Onboarding
  - Tests structured by user persona (Owner, Admin, Team Manager, Technician, Viewer)
  - Each journey test file documents covered user stories in header comments

- **Persona-Based Test Fixtures**: Role-based testing infrastructure in `src/test/fixtures/`
  - `personas.ts`: Pre-defined user personas (owner, admin, teamManager, technician, multiTeamTechnician, readOnlyMember, viewer)
  - `entities.ts`: Comprehensive test data for organizations, teams, equipment, work orders, and PM templates
  - Helper functions: `getWorkOrdersForTeam()`, `getEquipmentForTeam()`, `createCustomWorkOrder()`

- **Persona-Aware Render Utilities**: New test utilities in `src/test/utils/`
  - `renderAsPersona(ui, personaKey)`: Render components with persona context
  - `renderHookAsPersona(hook, personaKey)`: Test hooks with persona permissions
  - `TestProviders`: Unified provider wrapper with persona support
  - `createPersonaWrapper()`: Create custom wrappers for edge case testing

- **PM Template Compatibility Rules Management**: New UI for managing equipment compatibility rules on PM templates
  - `PMTemplateCompatibilityRulesEditor` component integrated into `PMTemplateView` for managing rules
  - New `PMTemplateRulesDialog` accessible from the PMTemplates page for configuring rules
  - Organization-scoped rules allowing each organization to set their own compatibility rules
  - Admins can now view and manage compatibility rules directly in template views

- **PM Template Auto-Matching**: Automatic template selection based on equipment compatibility
  - Integrated `useMatchingPMTemplates` hook in `useWorkOrderPMChecklist` for filtering templates by equipment
  - Auto-select matching templates when equipment is selected in work orders
  - Improved UX for selecting compatible PM templates in `WorkOrderPMSection`

- **Global PM Template Seeds**: Added seed data for common equipment PM checklists
  - Forklift, Pull Trailer, Compressor, Scissor Lift, Excavator, and Skid Steer templates
  - Documentation explaining template characteristics (global, protected)

### Changed

- **Vitest Configuration**: Optimized for CI reliability and to prevent hanging
  - Switched from `threads` to `forks` pool for better process isolation
  - Single worker in CI (`maxForks: 1`) to minimize memory usage and OOM errors
  - Sequential file execution in CI (`fileParallelism: false`)
  - Istanbul coverage provider in CI for stability (v8 can hang on large codebases)
  - Reduced reporters in CI to save memory (skip HTML report)
  - Increased timeouts: `testTimeout: 10000`, `hookTimeout: 30000`, `teardownTimeout: 10000`

- **Test Runner Scripts**: New wrapper scripts to prevent Vitest hanging on Windows
  - `scripts/test-runner.mjs`: Monitors test output for completion patterns and forces exit
  - `scripts/test-ci.mjs`: CI-specific execution with 5-minute hard timeout and coverage ratchet
  - Both scripts handle Windows process tree termination via `taskkill`

- **Test Setup**: Enhanced global mocks in `src/test/setup.ts`
  - Mock Supabase client globally to prevent real client initialization and timer leaks
  - Proper cleanup: `afterAll` clears timers and restores real timers
  - Suppress expected error messages to reduce test output noise
  - Mock IntersectionObserver, ResizeObserver, matchMedia, clipboard for browser API compatibility

- **CI Workflow**: Updated `.github/workflows/ci.yml` for test reliability
  - Test Suite job timeout increased to 15 minutes
  - Tests run via `node scripts/test-ci.mjs` instead of direct `npm test`
  - Coverage baseline set to 70%

- **Build Performance**: Enhanced Vite configuration for improved loading
  - Implemented manual chunking for better code splitting
  - Organized vendor libraries into logical groups (React, UI, utilities)
  - Reduced bundled asset size limit from 600 kB to 200 kB
- **Node.js Version**: Updated from Node.js 20 to 22 in `.nvmrc` and `package.json`
- Added `node-domexception` dependency for DOM exception handling
- Renamed `organization_id` to `template_organization_id` in `MatchingPMTemplateResult` to prevent variable conflicts

### Fixed

- **GitHub Actions Timeouts**: Resolved CI hanging issues caused by Vitest workers not exiting cleanly
  - Open handles from jsdom, React Query cache, and Supabase WebSocket connections prevented process exit
  - Test runner now detects completion patterns and forces exit after 3 seconds of inactivity
  - Hard timeout of 5 minutes (8 minutes with coverage) ensures CI never hangs indefinitely

- **Test Suite ESLint Compliance**: Cleaned up ESLint errors and warnings across 8 journey test files
  - Fixed invalid assertion in `qr-scanning-workflow.test.tsx`
  - Removed 52 unused import warnings
  - Refactored test assertions to use fixture data directly

- Added SQL migrations with performance indexes for organization-specific compatibility rules

## [1.7.12] - 2026-01-10

### Added

- **Part Compatibility Rules**: New rule-based matching system for inventory parts to equipment
  - Define compatibility by manufacturer/model patterns (e.g., "fits all Caterpillar D6T equipment")
  - "Any Model" option to match all equipment from a manufacturer
  - Rules work alongside direct equipment links for flexible compatibility management
  - New `CompatibilityRulesEditor` component in inventory item forms
  - Combined matching via new `get_compatible_parts_for_equipment` RPC function

### Fixed

- **Inventory Item Form (Race Condition)**: Fixed issue where submitting the form before async data loads could delete existing compatibility rules, equipment links, and managers
  - Form now displays "Loading..." and blocks submission until data is fully loaded
  - Failed data loads now block submission with "Load Failed" state and error toast
- **PostgreSQL NULL Unique Constraint**: Fixed duplicate "any model" rules being allowed in `part_compatibility_rules` table
  - Replaced ineffective UNIQUE constraint with partial unique indexes that properly handle NULL values

### Security

- **Organization Isolation**: Added explicit `organization_id` filtering to compatibility data queries in `InventoryItemForm`
  - Equipment compatibility links now filter via `inventory_items.organization_id`
  - Manager assignments now filter via `inventory_items.organization_id`
  - Compatibility rules now filter via `inventory_items.organization_id`
  - Follows security-critical pattern of explicit org filtering even with RLS enabled

## [1.7.11] - 2026-01-08

### Changed

- **PM Checklist Notes (Work Order Details)**: Enhanced notes functionality in the Preventative Maintenance checklist
  - Notes now auto-expand when selecting negative conditions (Adjusted, Recommend Repairs, Requires Immediate Repairs, Unsafe Condition)
  - Added toggle button to show/hide notes per checklist item with visual indicator when notes exist
  - Improved responsive layout for the maintenance assessment section
  - Notes input uses smooth animated expand/collapse transitions
  - Better accessibility with proper ARIA labels on notes toggle buttons

## [1.7.10] - 2026-01-08

### Changed

- **Work Order Card (Mobile UX)**: Simplified mobile work order card for faster scanning and navigation
  - Cards are now fully tappable for quick navigation to work order details
  - Removed inline status and assignment editing in favor of detail page actions
  - Streamlined layout showing equipment, assignee avatar, and due date at a glance
  - Reduced component complexity by ~60% for improved maintainability

## [1.7.9] - 2026-01-08

### Changed

- **Equipment List (Mobile UX)**: Improved mobile layout and interactions on the equipment list
  - Equipment cards use a compact list-style layout on mobile for faster scanning
  - Mobile search + filters are condensed into a single row with an icon-only filters button and count badge
  - Mobile sort controls are simplified while keeping full controls on desktop
  - Reduced spacing in the equipment grid for better information density on small screens

### Fixed

- **Accessibility**: Improved accessible labeling and test reliability for equipment filters and actions

## [1.7.8] - 2026-01-07

### Changed

- **Work Order Card Consolidation**: Refactored legacy `DesktopWorkOrderCard` and `MobileWorkOrderCard` components to use the unified `WorkOrderCard` component
  - Reduced code duplication by routing both legacy wrappers through a single implementation
  - Maintains backward compatibility while eliminating hundreds of lines of duplicated code
  - Improved maintainability and consistency across desktop and mobile views

### Fixed

- Fixed ESLint unused variable warnings across multiple components
- Added `.cursor/` directory to `.gitignore` to prevent committing local development artifacts

## [1.7.7] - 2026-01-07

_Changes for this version were not documented in the changelog._

## [1.7.4] - 2026-01-02

### Removed

- **PrintExportDropdown Component**: Removed PrintExportDropdown and related PDF generation functionality (pdfGenerator utility)
- **PDFGenerator Test Files**: Cleaned up PDFGenerator and PrintExportDropdown test files

### Security

- **esbuild Vulnerability Fix**: Updated esbuild to fix moderate security vulnerability

### Changed

- **Documentation**: Updated create-pr command documentation for improved clarity

## [1.7.3] - 2026-01-02

### Removed

- **Deprecated Multi-Equipment Support**: Removed `WorkOrderMultiEquipmentSelector` component and related documentation. Single equipment per work order is now the standard.
- **Debug Artifacts**: Removed development-only debug navigation section from sidebar, mock organization data, and placeholder cost component.
- **Automated Versioning Workflow**: Removed disabled versioning GitHub Action to allow fresh start with manual versioning.

## [1.7.2] - 2026-01-01

### Added

- **Work Order PDF Export Dialog**: New dialog for exporting work orders as customer-facing PDF documents
  - Option to include or exclude cost items (excluded by default for customer-facing documents)
  - PDFs now show only public notes; private notes are always excluded
  - Available from both desktop and mobile work order detail views

- **QuickBooks Integration**: Capture `intuit_tid` from API response headers for improved troubleshooting support
  - Added `intuit_tid` column to `quickbooks_export_logs` table
  - Updated `quickbooks-export-invoice` Edge Function to capture and log `intuit_tid`
  - Updated `quickbooks-search-customers` Edge Function to capture and log `intuit_tid`

### Changed

- Enhanced QuickBooks API error logging to include `intuit_tid` for Intuit support troubleshooting
- Refactored QuickBooks export logic to derive team ID from equipment for more reliable exports

### Fixed

- **Work Order Editing**: Preserve assignee when editing work orders (previously assignee could be cleared on edit)

### Security

- Added `organization_id` filtering to equipment queries in database trigger for improved multi-tenancy enforcement

## [1.7.1] - Previous Release

_Changelog entries prior to 1.7.2 were not tracked in this file._

---

[Unreleased]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.8.1...v2.0.0
[1.8.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.13...v1.8.0
[1.7.13]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.12...v1.7.13
[1.7.12]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.11...v1.7.12
[1.7.11]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.10...v1.7.11
[1.7.10]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.9...v1.7.10
[1.7.9]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.8...v1.7.9
[1.7.8]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.7...v1.7.8
[1.7.7]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.4...v1.7.7
[1.7.4]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/releases/tag/v1.7.1
