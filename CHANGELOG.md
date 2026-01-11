# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to EquipQR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.13] - 2026-01-11

### Added

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

- **Build Performance**: Enhanced Vite configuration for improved loading
  - Implemented manual chunking for better code splitting
  - Organized vendor libraries into logical groups (React, UI, utilities)
  - Reduced bundled asset size limit from 600 kB to 200 kB
- **Node.js Version**: Updated from Node.js 20 to 22 in `.nvmrc` and `package.json`
- Added `node-domexception` dependency for DOM exception handling
- Renamed `organization_id` to `template_organization_id` in `MatchingPMTemplateResult` to prevent variable conflicts

### Fixed

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

[Unreleased]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v1.7.13...HEAD
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
