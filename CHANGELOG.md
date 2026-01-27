# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to EquipQR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **HorizontalChipRow Component**: New reusable component for horizontally scrollable chip/button rows
  - Automatic scroll hint gradients on left/right edges when content overflows
  - Configurable gap spacing and custom aria-labels for accessibility
  - Used across Work Orders, Equipment, and Inventory filter UIs for consistent scroll affordances

### Changed

- **PageHeader Component**: Enhanced mobile responsiveness and meta content support
  - Actions now stack below title on small screens to prevent clipping
  - New optional `meta` prop for badges/labels (e.g., "Admin" access badge) separate from description
  - Improved responsive typography and spacing

- **Inventory Page UI Improvements**:
  - Header actions: "Parts Managers" moved to overflow dropdown menu on mobile for cleaner layout
  - Filters: Replaced "Low Stock Only" button with Switch control (inline on desktop, in filter sheet on mobile)
  - Active filter summary: Added clearable filter badges with "Clear all" button
  - Mobile cards: Replaced emoji location marker with `MapPin` icon, improved metadata ordering (location → quantity) for better scanability

- **Work Orders Page UI Improvements**:
  - Admin access badge: Moved "(organization admin access)" from subtitle to separate badge using PageHeader `meta` prop
  - Quick filters: Now use `HorizontalChipRow` with scroll hint gradients
  - Active filter summary: Enhanced with "Clear all" button and improved accessibility labels

- **Equipment Page UI Improvements**:
  - Quick filters: Now use `HorizontalChipRow` with scroll hint gradients
  - Active filter summary: Enhanced with "Clear all" button
  - Sort controls: Improved clarity with "Sort:" prefix and direction labels (A-Z/Z-A) on mobile

### Fixed

- **Organization persistence on refresh**: Selected organization no longer switches when users with multiple orgs refresh the page
  - Session/session storage is no longer cleared during auth boot (e.g. on reload); clear only on explicit sign-out
  - `useSessionManager` now waits for auth to finish (`waitForAuth`) before initializing; avoids clearing org preference and session cache while `user` is temporarily `null`
  - Removed 24-hour expiry for organization preference in `sessionPersistence`; selection persists until the user explicitly switches or signs out
  - Organization stays persistent unless the user switches via the org switcher or the app auto-switches when accessing another org’s data (e.g. QR redirect)

- **Mobile Modal Scrolling**: Prevented input modals from exceeding the viewport height on mobile devices
  - Standardized dialogs/sheets to use dynamic viewport height (`dvh`) and internal scrolling
  - Fixes being unable to scroll to complete longer forms (e.g., inventory item create/edit)

## [2.2.1] - 2026-01-26

### Added

- **Online Status Hook**: New `useOnlineStatus` hook for tracking browser online/offline status
  - Useful for showing offline indicators and managing offline-first UX
  - Includes syncing state and manual sync trigger

- **QuickBooks Developer Skill**: New `.cursor/skills/intuit-qbo-dev/SKILL.md` guide for QuickBooks Online API development
  - Covers OAuth2 authentication, query language, and common operations
  - Debugging guide for common errors (Business Validation, Stale Object, etc.)

### Changed

- **QuickBooks Permission Model**: Migrated from role-based to permission-based access control
  - Now uses `useQuickBooksAccess` hook checking `can_manage_quickbooks` permission
  - Updated `QuickBooksIntegration`, `QuickBooksCustomerMapping`, and `WorkOrderQuickActions` components
  - Admins must have explicit billing permissions to access QuickBooks features

- **Mobile Work Order Header**: Refactored to use action sheet pattern
  - Replaced individual PDF/Excel buttons with unified "More actions" menu
  - Cleaner mobile UX with consolidated export options

- **Bottom Navigation**: Added short label "Orders" for Work Orders on small screens
  - Prevents text overflow on narrow mobile displays

- **Dropdown Menu Z-Index**: Changed from `z-50` to `z-popover` semantic token for consistent layering

- **Mobile Sidebar Menu**: Added `modal={!isMobile}` to prevent viewport scroll issues on touch devices

- **Excel Export Toasts**: Changed variant from `'destructive'` to `'error'` for consistency with design system

### Fixed

- **Service Worker Push Resubscription**: Added error handling for `pushsubscriptionchange` event
  - Logs subscription failures for debugging
  - Re-throws errors to ensure proper event handling

- **Excel Export Simplification**: Simplified work order Excel export to focus on cost items
  - Changed from multi-worksheet export (Summary, Labor Detail, Materials & Costs, PM Checklists, Timeline, Equipment) to single "Cost Items" worksheet
  - Export now includes work order, equipment, and team context columns along with detailed cost item information
  - This change improves export performance and focuses on the most commonly needed data

- **Excel Export Error Handling**: Improved logging and user-facing error messages
  - Added organization ID validation with helpful error message
  - Enhanced debug logging for troubleshooting export failures

- **Work Order Excel Export Button**: Added tooltip explaining when organization ID is required for export

### Database Migrations

- `20260126050000_move_pg_net_to_extensions_schema.sql`: Moved pg_net extension to extensions schema for proper organization

## [2.2.0] - 2026-01-26

### Added

- **Web Push Notifications**: Complete push notification system for PWA users
  - Service worker registration for receiving push notifications in background
  - `usePushNotifications` hook for subscribing/unsubscribing from push notifications
  - `useNotificationSettings` hook for managing notification preferences
  - VAPID key generation script (`npm run generate:vapid-keys`)
  - New Edge Function `send-push-notification` for delivering push notifications
  - Database trigger automatically sends push notifications when notifications are inserted
  - Push notification preferences in user settings (can disable push notifications)
  - Support for multiple device subscriptions per user
  - Automatic cleanup of expired push subscriptions
  - New `push_subscriptions` table for storing Web Push subscription endpoints
  - Notification broadcast infrastructure using Supabase Realtime Broadcast
  - Service worker handles notification clicks and navigation to relevant pages
  - Environment variables: `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

- **Team Stats and Activity**: Enhanced team details page with comprehensive statistics
  - New `TeamQuickActions` component for quick navigation to team resources
  - `TeamActivitySummary` component showing team overview statistics
  - `TeamRecentEquipment` component displaying recently updated equipment
  - `TeamRecentWorkOrders` component showing recent work orders
  - New `useTeamStats` hook for fetching team statistics
  - New `teamStatsService` for team data aggregation
  - Team stats query keys added to `queryKeys.ts`

- **Mobile Bottom Navigation**: New bottom navigation bar for mobile devices
  - `BottomNav` component with quick access to main sections
  - Only visible on mobile devices (hidden on desktop)
  - Improved mobile navigation UX

- **Design System Enhancements**:
  - New shadow elevation system (`shadow-elevation-2`) for consistent card shadows
  - Status-based border colors for equipment cards (`getEquipmentStatusBorderClass`)
  - Enhanced empty states with gradient backgrounds and improved styling
  - Improved button variants with touch manipulation and active scale effects
  - Card component updates with `touch-manipulation` for better mobile interaction
  - Sheet overlay improvements with backdrop blur and proper z-index layering
  - Skeleton loading components updated to use shimmer animations instead of pulse

- **Work Order UI Improvements**:
  - Enhanced work order detail headers with gradient backgrounds on desktop
  - Improved work order card styling with elevation shadows
  - Work order status manager component updates
  - Work order costs section with improved loading states
  - Work order notes section with better card styling
  - PM checklist component with animated collapsible sections
  - Improved back button styling with hover underline effects

- **Part Lookup Performance**: Optimized part alternates search query
  - Disabled retries for search queries (user will type more and trigger new query)
  - Added stale time caching (30 seconds) for search results
  - Added AbortSignal support for request cancellation
  - Improved error handling for cancelled requests

- **QuickBooks Integration**: Enhanced invoice export with audit logging
  - New `intuit_tid` capture for improved troubleshooting support
  - Audit logging migration for invoice export operations

### Changed

- **Card Component**: Updated default styling with `shadow-card` and `touch-manipulation` classes
- **Card Title**: Updated to use `font-display` for improved typography
- **Button Variants**: Enhanced with `transition-all duration-fast` and `active:scale-[0.98]` for better touch feedback
- **Empty State Component**: Redesigned with gradient backgrounds, improved icon styling, and better typography
- **Sheet Component**: Enhanced overlay with backdrop blur and improved z-index management
- **Work Order Primary Action Button**: Changed button variants from `default` to `secondary` for better visual hierarchy
- **Equipment Card**: Added status-based border colors for visual status indication
- **Work Order Details Desktop Header**: Redesigned with gradient background and improved layout
- **Work Order Details Mobile Header**: Enhanced back button with hover underline effect
- **Part Lookup Page**: Improved query configuration for better performance and user experience
- **Service Worker**: Automatic registration in production builds with periodic update checks
- **Content Security Policy**: Updated to allow WebSocket connections and Google Fonts
- **ESLint Configuration**: Added `tmp` directory to ignore patterns

### Fixed

- **Part Lookup Search Path**: Fixed database search path issue in part lookup functionality
- **Test Skeleton Selectors**: Updated all test files to use new skeleton loading selectors (`animate-shimmer`, `bg-muted.rounded-md`) instead of deprecated `animate-pulse`
- **Invoice Export Audit Logging**: Added comprehensive audit trail for QuickBooks invoice exports

### Security

- **Push Notification Security**:
  - RLS policies on `push_subscriptions` table ensuring users can only manage their own subscriptions
  - Service role access restricted to Edge Function for sending push notifications
  - VAPID keys stored securely in environment variables
  - User notification preferences respected before sending push notifications
- **Notification Broadcast**: RLS policy on `realtime.messages` ensuring users only receive broadcasts on their own private channels
- **Error Message Allowlist**: Added push notification error patterns to safe error allowlist

### Database Migrations

- `20260125220500_fix_part_lookup_search_path.sql`: Fixed search path for part lookup queries
- `20260126000000_add_invoice_export_audit_logging.sql`: Added audit logging for QuickBooks invoice exports
- `20260126040526_add_notification_broadcast.sql`: Added notification broadcast infrastructure with Realtime Broadcast and push notification triggers
- `20260126040527_add_push_subscriptions.sql`: Added `push_subscriptions` table with RLS policies for Web Push notification subscriptions

## [2.1.3] - 2026-01-24

### Fixed

- **Google Workspace Member Management Navigation**: Fixed "Manage Members" button on organization settings redirecting to onboarding page instead of the organization members tab
  - Changed navigation from `/dashboard/onboarding/workspace` to `/dashboard/organization`
  - Renamed button to "View Members" for clarity

### Added

- **Import from Google Workspace Button**: Added ability to import members directly from the Organization Members tab when Google Workspace is connected
  - New "Import from Google" button appears next to "Invite Member" when GWS is connected
  - Opens a sheet with directory sync, search filtering, and bulk member selection
  - Filters out users already in the organization or with pending claims
  - Supports marking selected users as admins during import
  - New `GoogleWorkspaceMemberImportSheet` component with full import workflow
  - New `useGoogleWorkspaceConnectionStatus` hook for checking GWS connection state

## [2.1.2] - 2026-01-24

### Added

- **Automatic Schema Export**: New GitHub Actions workflow that exports the database schema from the preview Supabase project whenever code is pushed to `main`
  - Schema saved to `supabase/schema.sql` for easy reference
  - Eliminates need to mentally reconstruct schema from 160+ migration files
  - Useful for onboarding, documentation, and quick schema review

### Fixed

- **Google Workspace Organization Reuse**: Fixed `auto_provision_workspace_organization` being too restrictive when connecting Google Workspace (#519)
  - Previously only reused orgs with "Organization" in the name
  - If a user manually created an org with a custom name (e.g., "Columbia Cloud Works"), connecting Google Workspace would create a NEW org instead of reusing their existing one
  - Now reuses ANY non-personal org the user owns, regardless of its name

## [2.1.1] - 2026-01-24

### Fixed

- **Google Workspace Members Not Appearing** (#515): Users selected from Google Workspace directory who hadn't signed up yet were not appearing in the organization members list, causing admins to think they needed to send email invites
  - Added `useGoogleWorkspaceMemberClaims` hook to fetch pending GWS member claims
  - Updated `UnifiedMembersList` to display pending GWS members with "Awaiting Sign-up" status
  - Added tooltip explaining that users will be automatically added when they sign up with their Google account
  - Added ability for admins to revoke pending GWS member claims
  - Smart filtering to avoid duplicates if user already exists as member or has email invite

## [2.1.0] - 2026-01-14

### Added

- **Google Workspace Integration**: Allow organization owners to import users from their Google Workspace directory
  - Self-service domain verification via Google Admin SDK - Workspace admins can instantly connect
  - OAuth integration using Google Admin SDK for directory user synchronization
  - Selective member import - admins can browse directory and choose which users to import
  - Automatic membership provisioning for new sign-ups matching claimed domains
  - Email verification gating for admin role grants (members don't require verification)
  - New onboarding flow for Google Workspace users during first sign-up
  - New `WorkspaceOnboardingGuard` component for routing new users to onboarding
  - New `GoogleWorkspaceIntegration` component in organization settings
  - New `WorkspaceOnboarding` page for first-time Workspace connection and organization setup
  - New `src/services/google-workspace/` service layer for OAuth flow and API calls
  - New `src/utils/google-workspace.ts` utility functions
  - New shared `_shared/crypto.ts` for secure token encryption/decryption
  - New database tables: `workspace_domains`, `google_workspace_oauth_sessions`, `google_workspace_credentials`, `google_workspace_directory_users`, `organization_member_claims`, `organization_role_grants_pending`, `personal_organizations`
  - New Edge Functions: `google-workspace-oauth-callback`, `google-workspace-sync-users`
  - New RPCs: `get_workspace_onboarding_state`, `create_workspace_organization_for_domain`, `auto_provision_workspace_organization`, `create_google_workspace_oauth_session`, `validate_google_workspace_oauth_session`, `get_google_workspace_connection_status`, `select_google_workspace_members`, `apply_pending_admin_grants_for_user`, `is_user_google_oauth_verified`
  - Helper functions: `normalize_email`, `normalize_domain` for consistent email/domain handling
  - Updated `handle_new_user` trigger to create personal organizations and apply pending workspace memberships and role grants
  - New `TOKEN_ENCRYPTION_KEY` environment variable for OAuth token encryption

- **Migration Baseline**: New baseline migration for faster fresh environment setup
  - Generated `supabase/migrations/20260114000000_baseline.sql` (13,000+ lines) containing complete schema snapshot
  - New `docs/database/migration-squashing.md` with validation checklist and regeneration instructions
  - All historical migrations remain in `supabase/migrations/` for compatibility with existing databases

- **Edge Function Shared Auth Utilities**: Standardized authentication patterns for Edge Functions
  - New `supabase/functions/_shared/supabase-clients.ts` with client creation helpers
  - `createUserSupabaseClient(req)` - Uses anon key + forwards JWT (RLS enforced)
  - `createAdminSupabaseClient()` - Service role for system operations only
  - `requireUser()`, `verifyOrgMembership()`, `verifyOrgAdmin()` helper functions
  - `createErrorResponse()`, `createJsonResponse()`, `handleCorsPreflightIfNeeded()` response helpers

- **Edge Function RLS Documentation**: Comprehensive security documentation
  - New `docs/edge-functions/auth-patterns.md` documenting authorized service role usage
  - New `docs/edge-functions/rls-audit-checklist.md` with pre-deployment and testing checklists
  - Grep commands for quick security audits

- `src/tests/journeys/README.md` with guidance for writing journey tests
- `src/tests/journeys/example.test.tsx` demonstrating correct journey test patterns
- Exported Supabase scenario mock utilities: `resetSupabaseMock()`, `seedSupabaseMock()`, `setSupabaseError()`
- Exported entity fixtures from journey harness for convenient test data access

### Changed

- **AuthContext**: Updated Google OAuth to request offline access with consent prompt for refresh tokens
- **SmartLanding**: Enhanced onboarding logic and error handling for workspace users
- **Journey-First Testing Strategy**: Shifted testing approach to prioritize integration/E2E-style journey tests over implementation-detail unit tests
  - New `docs/technical/testing-guidelines.md` documenting the journey-first testing philosophy
  - Updated `CONTRIBUTING.md` testing section with journey test template
  - New `src/test/journey/` harness module with `renderJourney()` helper for standardized persona + route rendering
  - New `src/test/mocks/supabase-scenario.ts` providing scenario-driven Supabase mock with per-test seeding
  - Added `test:journeys` npm script to run only journey tests
  - ESLint guardrails for `src/tests/journeys/**` to discourage hook-mocking anti-patterns

### Security

- **Google Workspace Credentials**: OAuth refresh tokens are encrypted at the application layer before storage
- **RLS Policies**: All new tables have Row Level Security policies restricting access appropriately
- **OAuth Sessions**: Short-lived CSRF tokens with 1-hour expiration; clients cannot read/update/delete directly
- **Edge Function RLS Hardening**: Refactored user-facing Edge Functions to use JWT-scoped clients instead of service role
  - `geocode-location` - Now validates org membership and uses user-scoped client
  - `send-invitation-email` - Now validates caller has admin access before sending
  - `import-equipment-csv` - Uses user-scoped client with RLS enforcement
  - `export-report` - Uses user-scoped client with RLS enforcement
  - `export-work-orders-excel` - Uses user-scoped client with RLS enforcement
  - `resolve-inventory-scan` - Uses user-scoped client with RLS enforcement
  - `check-subscription` - Hybrid: user auth + admin for self-referential writes only
  - `purchase-user-licenses` - Uses user-scoped client with RLS enforcement

- **Locked Down Previously Public Endpoints**: Updated `supabase/config.toml` to require JWT authentication
  - `parts-search` - Now requires JWT (already deprecated, returns 410 Gone)

- **Improved Admin Validation Typing**: Updated `supabase/functions/_shared/admin-validation.ts` with proper SupabaseClient typing

### Removed

- Removed 7 low-value journey tests that were mocking hooks instead of testing real UI flows:
  - `work-order-lifecycle.test.tsx`
  - `equipment-management.test.tsx`
  - `onboarding.test.tsx`
  - `qr-scanning-workflow.test.tsx`
  - `inventory-management.test.tsx`
  - `pm-template.test.tsx`
  - `equipment-csv-import.test.tsx`

- **Part Picker Feature**: Removed deprecated Part Picker feature (replaced by comprehensive inventory with Part Alternate Groups)
  - Deleted `src/features/part-picker/` (11 files: pages, components, hooks, services, types)
  - Removed `/part-picker` and `/dashboard/part-picker` routes from `src/App.tsx`
  - Deleted `src/services/__tests__/partsService.test.ts`

- **Part Picker Edge Functions**: Removed deprecated Supabase Edge Functions
  - Deleted `supabase/functions/parts-search/` (was already returning 410 Gone)
  - Deleted `supabase/functions/part-detail/`
  - Removed function entries from `supabase/config.toml`

- **Typesense Infrastructure**: Removed unused Typesense search infrastructure
  - Deleted scripts: `typesense-ensure-collections.ts`, `index-parts.ts`, `seed-parts.ts`, `test-typesense.mjs`
  - Deleted `search/typesense/` folder (schema definitions)
  - Deleted `docker/typesense/` folder (Docker Compose config)
  - Removed npm scripts: `typesense:up`, `typesense:ensure`, `seed:parts`, `index:parts`
  - Removed `typesense` devDependency from `package.json`
  - Removed `TYPESENSE_*` environment variables from `env.example`

### Database Migrations

- `20260118090000_google_workspace_onboarding.sql`: Domain claims, OAuth sessions, credentials, directory cache, member claims, pending role grants
- `20260118090500_update_handle_new_user_for_workspace.sql`: Updated trigger for personal org creation and workspace claim processing
- `20260119000000_google_workspace_improvements.sql`: NULL handling for normalize functions, improved documentation

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

[Unreleased]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.2.1...HEAD
[2.2.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.1.3...v2.2.0
[2.1.3]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.0.0...v2.1.0
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
