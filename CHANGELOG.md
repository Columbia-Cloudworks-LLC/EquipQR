# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to EquipQR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.2] - 2026-02-10

### Added

- **Customizable dashboard grid system**: The dashboard is now a fully customizable widget grid powered by `react-grid-layout` v2. Users can drag, resize, add, and remove widgets in edit mode via a "Customize" toggle in the page header. Layouts are responsive across 5 breakpoints (lg/md/sm/xs/xxs) with vertical compaction
- **Widget catalog drawer**: A slide-in "Add Widgets" panel groups all available widgets by category (Overview, Equipment, Work Orders, Team, Inventory) with search filtering, active/inactive indicators, and one-click add/remove
- **Per-user, per-organization layout persistence**: Dashboard layouts are stored in localStorage for instant load and synced to a new `user_dashboard_preferences` Supabase table (with RLS) for cross-device durability. Switching organizations loads a completely independent layout — a user's dashboard for Org A is separate from Org B
- **Widget registry architecture**: All dashboard widgets are registered in a centralized registry (`widgetRegistry.ts`) with metadata (id, title, description, icon, component, defaultSize, minSize, maxSize, category). Widgets are lazy-loaded via `React.lazy()` for code splitting. Helper functions: `getWidget()`, `getAllWidgets()`, `getWidgetsByCategory()`, `generateDefaultLayout()`
- **Fleet Efficiency scatter plot overlap fix**: Implemented a deterministic spiral jitter algorithm that offsets overlapping points so every team is individually hoverable and clickable. For clusters of 3+ teams at the same coordinate, a count badge renders with a click-to-popover listing all teams. Added `ZAxis` bubble sizing based on equipment count and expanded chart height from `h-72` to `h-96` with axis labels
- **Mobile widget reorder sheet**: On small viewports, drag-and-drop is disabled in favor of a touch-friendly bottom sheet with up/down arrow buttons for reordering widgets
- **PM Compliance widget**: Donut chart showing preventive maintenance work order status breakdown (completed, in progress, pending, overdue) queried from PM-template-linked work orders
- **Equipment by Status widget**: Donut chart showing fleet breakdown by equipment status (active, maintenance, retired, inactive)
- **Cost Trend widget**: Line chart of work order costs aggregated weekly or monthly with a toggle, showing the last 12 periods
- **Quick Actions widget**: 2x2 grid of shortcut buttons (New Work Order, Scan QR, Add Equipment, All Work Orders) for rapid navigation
- **Self-contained widget wrappers**: Each existing dashboard card (StatsGrid, FleetEfficiency, RecentEquipment, RecentWorkOrders, HighPriorityWO) is now wrapped in a self-contained component that fetches its own data internally via hooks, enabling standalone use inside the grid without parent prop drilling
- **Dashboard preferences query key factory**: Added `dashboardPreferences.byUserOrg(userId, orgId)` to `queryKeys.ts` for consistent cache management
- **Unit tests for jitter algorithm** (13 tests): Determinism, spiral placement for N=2/3/5/10, no-op for single points, axis range scaling, cluster metadata, original data preservation
- **Unit tests for widget registry** (15 tests): `getWidget`, `getAllWidgets`, `getWidgetsByCategory`, `generateDefaultLayout` with custom/unknown IDs, breakpoint stacking, min/max constraints
- **Updated Dashboard integration tests** (18 tests): Persona-driven tests updated for new grid architecture with lazy-loaded widget mocks

### Security

- **CRITICAL: Fixed cross-tenant data leak in `refresh_quickbooks_tokens_manual`** — The function had no authorization check and was granted to `anon`, leaking the total number of expiring QuickBooks credentials across all organizations. Added `auth.role() = 'service_role'` guard and revoked `anon`/`authenticated` grants
- **Revoked overly broad `anon` grants on 9 QuickBooks database functions** — Functions that require `auth.uid()` internally were unnecessarily granted to `anon`, exposing function signatures and error messages. Restricted to `authenticated` and `service_role` only
- **Restricted `cleanup_expired_quickbooks_oauth_sessions` to `service_role`** — Added authorization check so unauthenticated callers cannot trigger DELETE operations on the OAuth sessions table

### Added

- **Work Order detail page — equipment image and location map**: The Equipment Information section on desktop and the Equipment Details collapsible on mobile now display the equipment's display image (or a forklift icon placeholder) and an interactive Google Maps embed showing the equipment's effective location. On desktop the image and map appear side-by-side above the text metadata; on mobile they stack vertically inside the collapsed-by-default card
- **Shared QuickBooks retry utility** (`supabase/functions/_shared/quickbooks-retry.ts`) — Implements exponential backoff with jitter for 429/5xx errors, automatic 401 refresh-and-retry, and Fault-in-200 detection per QBO API best practices
- **Shared QuickBooks configuration** (`supabase/functions/_shared/quickbooks-config.ts`) — Centralizes QBO API base URLs, token endpoint, minor version constant, environment detection, `getIntuitTid()`, and `withMinorVersion()` helpers. Eliminates hardcoded URL duplication across 4 edge functions
- **QuickBooksCustomerMapping component tests** — 8 new tests covering feature flag gating, permission checks, connection status gating, mapping display, and customer search dialog
- **QuickBooks auth utility tests** (`quickbooksAuth.test.ts`) — 13 new tests for `decodeOAuthState` (valid/invalid/expired states), `isQuickBooksConfigured`, and `getQuickBooksAppCenterUrl`
- **`manualTokenRefresh` tests** — 4 new tests covering success, RPC error, and empty/null data paths
- **Error-path tests for `searchCustomers` and `exportInvoice`** — 4 new tests covering non-200 HTTP responses and missing error messages

### Changed

- **Fault-in-200 detection for QBO API responses** — All QuickBooks edge functions now check for `Fault` objects in HTTP 200 JSON responses (a known QBO API behavior). Previously, validation errors returned as 200 OK with a Fault body were silently treated as success
- **`minorversion=70` on all QBO Data API calls** — Previously only used for PDF uploads (`minorversion=65`). Now applied to all invoice create/update, customer query, item query, and account query endpoints via the shared `withMinorVersion()` helper
- **All 4 QuickBooks edge functions now use `_shared/cors.ts`** — Replaced inline wildcard `corsHeaders` objects with `getCorsHeaders(req)` for origin-validated CORS responses in `quickbooks-export-invoice`, `quickbooks-oauth-callback`, and `quickbooks-refresh-tokens` (search-customers already used it)
- **Token refresh concurrency control** — `quickbooks-refresh-tokens` now processes credentials in batches of 5 with 500ms inter-batch delays instead of unbounded `Promise.allSettled` parallelism, preventing Intuit rate limit hits when many organizations are connected
- **Consistent `intuit_tid` capture** — Now captured and logged in `quickbooks-oauth-callback` (token exchange) and `quickbooks-refresh-tokens` (per-credential refresh). Previously only captured in `quickbooks-export-invoice` and `quickbooks-search-customers`
- **Deprecated server-only types in client bundle** — `QuickBooksCredentials` and `QuickBooksTokenResponse` interfaces in `src/services/quickbooks/types.ts` marked as `@deprecated` with server-side-only documentation

### Changed

- **Test suite — persona-driven conversion**: Rewrote 6 generic/boilerplate test files as persona-driven tests using named personas (Alice Owner, Bob Admin, Carol Manager, Dave Technician, Frank read-only member, Grace Viewer) and entity fixtures from `src/test/fixtures/`. Converted tests: `Dashboard.test.tsx`, `Teams.test.tsx`, `WorkOrders.test.tsx`, `EquipmentDetailsTab.test.tsx`, `WorkOrderCostsSection.test.tsx`, and `PMTemplates.test.tsx`. Each test file now uses describe blocks per persona that narrate real user workflows (e.g. "as Alice Owner reviewing the daily fleet overview") instead of anonymous mock data. Net +15 tests (2,147 → 2,162), coverage 68.73% → 69.07%

### Fixed

- Removed unused `Clock` import from `WorkOrderDetailsInfo.tsx` (lint warning)

### Changed

- **Work Order detail page — sidebar consolidation**: Merged the redundant "Assignment", "Status Management", and "Quick Info" sidebar cards into a single card per role. Managers see one unified status card with dates, estimated hours, PM status, equipment link, and team details; non-managers see one consolidated status card with the same context. Eliminates triple-display of assignee, team, and status data
- **Work Order detail page — team info enrichment**: Team display now shows name (linked to team detail page), description, and address (as a Google Maps link via `ClickableAddress`). Applies to both mobile header and desktop sidebar. Fetches team `description` from the equipment join query
- **Work Order detail page — breadcrumb navigation**: Replaced the small "Back to Work Orders" ghost button in the desktop header with a standard breadcrumb trail (`Work Orders > WO-XXXXXXXX`) positioned above the title for clearer page hierarchy
- **Work Order detail page — slimmed warning banner**: Replaced the heavy `Card`+`CardContent` status lock banner with a lightweight inline `div` using reduced padding (`py-2 px-3`), cutting vertical space by ~50%. Added dark mode support
- **Work Order detail page — flattened equipment card**: Removed the inner `bg-muted/50` background from the Equipment Information section, eliminating the card-within-a-card visual. De-emphasized the Working Hours KPI from a prominent blue highlighted box to a standard data-label row matching Manufacturer/Model/Serial
- **Work Order detail page — tighter description spacing**: Reduced `space-y-6` to `space-y-4` in the Work Order Details card and removed the redundant "Description" heading since the card title already provides context
- **Work Order detail page — compact empty costs state**: Replaced the large `h-12` DollarSign icon + multi-line empty state with a compact single-line inline banner for both editable and read-only modes
- **Work Order detail page — Delete moved to header dropdowns**: Moved the "Delete Work Order" action from the sidebar Quick Info card into the desktop header's "More Actions" dropdown and the mobile action sheet's new "Danger Zone" section, with full confirmation dialog including image count
- **Work Order mobile — reduced data redundancy**: Stripped duplicated fields (location, equipment name+status, priority badge, team) from the `WorkOrderDetailsMobile` summary card since they already appear in the sticky mobile header. Added due date and estimated hours as first-class data rows
- **Work Order mobile — de-emphasized working hours**: Replaced the prominent blue `bg-blue-50 border-blue-200` Working Hours box with a standard text row in both the mobile summary card and equipment details collapsible
- **Work Order mobile — added Itemized Costs section**: The mobile layout now renders `WorkOrderCostsSection` between PM Checklist and Notes (same permission guard as desktop), fixing the gap where mobile users couldn't view or manage costs
- **Work Order detail page — equipment custom attributes**: Custom attributes (`custom_attributes` JSONB) now display in the Equipment Details/Information collapsible sections on both mobile and desktop, rendered as key-value pairs below a separator after the standard fields
- **Google Maps Edge Function env var naming**: Renamed `VITE_GOOGLE_MAPS_BROWSER_KEY` → `GOOGLE_MAPS_BROWSER_KEY` and `VITE_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_API_KEY` → `GOOGLE_MAPS_SERVER_KEY` in Edge Functions (`public-google-maps-key`, `places-autocomplete`, `geocode-location`). Old names are still supported as fallbacks for backward compatibility. The `VITE_` prefix was misleading because these are Supabase Edge Function runtime secrets, not Vite build-time variables
- **`GooglePlacesAutocomplete` runtime 403 fallback**: The component now detects when the `PlaceAutocompleteElement` web component's internal API calls fail at runtime (e.g., Places API New not enabled for the browser key) and automatically falls back to the edge function proxy. Previously, the fallback only triggered if the web component failed to construct — runtime 403 errors from the Google Maps JS API left the component in a broken state with no autocomplete results

### Fixed

- **Mobile "Created: N/A" bug**: Fixed the mobile summary card showing "Created: N/A" by correcting the property mapping from `workOrder.createdAt` (undefined) to `workOrder.created_date || workOrder.createdDate` in `WorkOrderDetails.tsx`

### Documentation

- **Dual-environment secrets guide**: Added new "Dual-environment deployment" section to `AGENTS.md` explaining which secrets live in Vercel vs Supabase and how to update each. Prevents the common mistake of setting a Supabase Edge Function secret in Vercel (or vice versa)
- **Secrets Checklist**: Added comprehensive secrets checklist to `docs/ops/deployment.md` mapping every secret to its platform (Vercel or Supabase Dashboard) and the Edge Function that uses it
- **Edge Function `.env` header**: Added clarifying header to `supabase/functions/.env` reminding developers that these are Supabase runtime secrets, not Vite build-time vars, and that redeploying Vercel does not update them
- **`env.example` Google Maps section**: Rewrote the Google Maps key documentation with clear warnings about the browser key being served by a Supabase Edge Function at runtime, the need for two separate keys, and legacy name support

## [2.3.1] - 2026-02-09

### Added

- **Production Content Security Policy**: Added full CSP header to `vercel.json` for production deployments, matching the existing dev CSP from `vite.config.ts` (script-src, style-src, connect-src, frame-src, img-src, font-src, worker-src directives)
- **Skip navigation link**: Added an accessible "Skip to main content" link as the first focusable element in the app, with `id="main-content"` on all `<main>` landmarks across dashboard, landing page, feature pages, and solution pages
- **PageSEO on legal pages**: Added `<PageSEO>` component with per-page title, description, and canonical URL to Privacy Policy and Terms of Service pages
- **JSON-LD date signals**: Added `datePublished` and `dateModified` fields to the SoftwareApplication structured data in `index.html`
- **Query key factories for notes, images, and notifications**: Added `workOrders.notes()`, `workOrders.notesWithImages()`, `workOrders.images()`, `equipment.notesWithImages()`, `equipment.images()`, and `notifications` factories to `src/lib/queryKeys.ts`
- **CSS content-visibility utility classes**: Added `.cv-auto`, `.cv-auto-lg`, and `.cv-auto-sm` classes to `index.css` for deferred off-screen rendering of list items

### Changed

- **SEO: Improved base HTML metadata**: Updated `index.html` title from "EquipQR" (7 chars) to "EquipQR - Fleet Equipment Management & QR Code Tracking Platform" (64 chars) for better search engine visibility; trimmed meta description from 188 to 159 characters to stay under the 160-char limit; updated matching `og:title` and `twitter:title` tags; removed leading blank line before `<!DOCTYPE html>`
- **Google Places Autocomplete — migrated to `PlaceAutocompleteElement` web component**: Replaced the legacy `@react-google-maps/api` `Autocomplete` wrapper with Google's native `PlaceAutocompleteElement` web component (new Places API). The component now listens for both `gmp-placeselect` (legacy) and `gmp-select` (current API) events, with robust place extraction that handles minified event properties across Google Maps JS API versions
- **Server-side Places Autocomplete fallback**: Added `places-autocomplete` Supabase Edge Function that proxies Google's Place Autocomplete and Place Details REST APIs server-side. When the web component is unavailable (e.g. API key referrer restrictions), the frontend falls back to a custom autocomplete dropdown powered by this edge function — with debounced predictions, keyboard navigation (Arrow keys, Enter, Escape), click-outside-to-close, session token billing, and accessible ARIA attributes (`role="combobox"`, `role="listbox"`)
- **`GooglePlacesAutocomplete` multi-strategy architecture**: The component now initializes with a 3-tier fallback chain: (1) `PlaceAutocompleteElement` web component, (2) edge function proxy with custom dropdown, (3) plain text input. The web component container renders during the `pending` init phase so the mount effect can find it immediately
- **`useGoogleMapsLoader` cleanup**: Removed debug instrumentation from the shared Google Maps loader hook
- **Dynamic imports for heavy libraries**: Converted `xlsx` (~200KB), `jspdf` (~150KB), and `qrcode` (~100KB) from static imports to on-demand `import()` calls, reducing the initial JS bundle by ~450KB. Libraries now load only when users trigger Excel exports, PDF generation, or QR code display
- **`WorkOrderReportPDFGenerator` factory pattern**: Replaced direct constructor with `static async create()` to support dynamic jsPDF loading
- **`generateTemplatePreviewPDF` now async**: Updated to `async function` with dynamic jsPDF import; caller in `PMTemplateView` updated accordingly
- **Derived state in `SimpleOrganizationProvider`**: Wrapped `currentOrganization` derivation in `useMemo` to avoid redundant lookups on unrelated re-renders
- **Memoized object props in `WorkOrderDetails`**: Replaced inline `{ name: workOrder.teamName }` and `{ name: workOrder.assigneeName }` object literals with `useMemo`-backed values to prevent breaking child `React.memo` comparisons
- **Extracted `PMChecklistItemRow` sub-component**: Pulled the ~100-line checklist item JSX out of `PMChecklistComponent` into a `React.memo`-wrapped component; hoisted `getConditionColor`, `getConditionText`, `isItemComplete`, and `CONDITION_RATINGS` to module scope
- **Combined checklist `useMemo` calls**: Merged 4 separate `useMemo` calls (sections, completedItems, unratedRequiredItems, unsafeItems) into a single-pass iteration over the checklist array
- **Centralized inline query keys**: Migrated 15+ inline string-array query keys in `useWorkOrderData`, `WorkOrderNotesSection`, and `EquipmentNotesTab` to the `queryKeys` factory pattern
- **Content-visibility on list items**: Applied `cv-auto` / `cv-auto-lg` wrappers to `WorkOrdersList` and `EquipmentGrid` for deferred off-screen rendering
- **Hoisted `formatCurrency` and `Intl.NumberFormat`**: Moved out of `MobileCostItem` and `DesktopCostItem` component bodies to module scope, avoiding expensive formatter recreation on every render
- **Functional `setState` in `ChecklistTemplateEditor`**: Converted `addItem`, `updateItem`, `deleteItem`, `moveItem`, `duplicateItem`, and `moveItemToSection` from direct `checklistItems` reads to `setChecklistItems(prev => ...)` pattern to prevent stale closures

## [2.3.0] - 2026-02-09

### Added

- **AGENTS.md**: Added root-level `AGENTS.md` following the [open standard](https://agents.md) to guide AI coding agents (Qodo, Cursor, Codex, etc.) with project context — setup commands, code style, testing instructions, PR conventions, multi-tenancy rules, RBAC overview, database conventions, Edge Function patterns, security considerations, and performance guidelines

- **Geolocation Hierarchy & Google Maps Integration**: Comprehensive equipment location system with strict hierarchy, Google Places Autocomplete, team overrides, and privacy controls

  #### Location Hierarchy Engine
  - **3-tier location priority**: Team Override > Manual Assignment > Last Known Scan. New `resolveEffectiveLocation()` utility (`src/utils/effectiveLocation.ts`) resolves the display location for any equipment asset
  - **Team location override**: Teams can set `override_equipment_location` to force all assigned equipment to use the team's address on the Fleet Map
  - **Effective location** shown consistently across Equipment Details header, Details tab, and Fleet Map

  #### Google Places Autocomplete
  - **Shared `GooglePlacesAutocomplete` component** (`src/components/ui/GooglePlacesAutocomplete.tsx`): Single-input address picker powered by Google Places API. User types, selects from dropdown, and structured address fields (street, city, state, country, lat/lng) are parsed automatically from `address_components`
  - **Shared `useGoogleMapsLoader` hook** (`src/hooks/useGoogleMapsLoader.ts`): Module-level singleton script loader that avoids duplicate Google Maps API loads across MapView, autocomplete inputs, and team/equipment maps
  - **Identical UX everywhere**: Same autocomplete component used in Equipment form, Team Create dialog, and Team Edit dialog

  #### Equipment Details Page Redesign
  - **3-column header layout**: Equipment Image | Team Info Card | Location Map -- replaces the old 2-card Location + Last Maintenance layout
  - **Team Info Card**: Shows assigned team name (linked to team detail page), description, and team address as a `ClickableAddress`
  - **Location Map Card**: Compact Google Map with marker at the effective location, address link below, and "via [Team Name]" indicator when team override is active
  - **Consolidated location field** in Details tab: Single location display following the hierarchy. When team overrides, shows non-editable team address with tooltip ("This location is set by the team") and link to the team page. Otherwise, editable via inline Google Places Autocomplete with Save/Cancel
  - **Last Maintenance** moved from header into Basic Information section of the Details tab
  - **`ClickableAddress` component** (`src/components/ui/ClickableAddress.tsx`): Renders any address as a clickable link that opens Google Maps directions

  #### Team Location Features
  - **Team Create/Edit dialogs** now include Google Places Autocomplete location field and "Override Equipment Location" checkbox with tooltip
  - **`TeamLocationCard` component** on Team Details page: Shows Google Map centered on team coordinates, clickable address, override badge, and edit button. Three states: map with address, address-only placeholder, or empty "Set Location" CTA
  - **`CreateTeamDialog`** and **`TeamMetadataEditor`** updated with location fields (previously only `TeamForm.tsx` had them, but that component was unused)
  - **Deleted unused `TeamForm.tsx`** that was never imported anywhere

  #### Database Schema (5 migrations)
  - `organizations.scan_location_collection_enabled` (boolean, default true): Org-level toggle to disable GPS capture during QR scans
  - `teams`: Added `location_address`, `location_city`, `location_state`, `location_country`, `location_lat`, `location_lng`, `override_equipment_location`
  - `equipment`: Added `assigned_location_street`, `assigned_location_city`, `assigned_location_state`, `assigned_location_country`, `assigned_location_lat`, `assigned_location_lng`, `use_team_location`
  - `equipment_location_history` table: Tracks every location change with source attribution (`scan`, `manual`, `team_sync`, `quickbooks`), RLS policies, and composite indexes
  - **Triggers**: `enforce_scan_location_privacy` (strips GPS from scans when org disables collection), `log_scan_location_history` (auto-logs scan locations to history)
  - **RPC**: `log_equipment_location_change` for frontend to log manual/team_sync/quickbooks location changes

  #### Data Privacy & Compliance
  - **Organization privacy toggle**: "QR Scan Location Collection" switch in Organization Settings > Privacy & Location section
  - **Client-side check**: `EquipmentDetails.tsx` skips `navigator.geolocation.getCurrentPosition()` when collection is disabled
  - **Server-side safety net**: Database trigger nullifies scan location if org has disabled collection

  #### Fleet Map Hierarchy
  - `teamFleetService.ts` updated to resolve equipment locations using the 3-tier hierarchy: team override coordinates, then equipment assigned coordinates, then legacy location/scan fallback
  - `MapView.tsx` now uses the shared `useGoogleMapsLoader` hook instead of an inline `useJsApiLoader` call
  - **Team HQ markers on Fleet Map**: Teams with a location address now appear as distinct star-shaped markers (amber/gold) on the Fleet Map, representing the team's headquarters or customer site
    - Star markers use a custom SVG pin with a 5-point star center, visually distinct from equipment's round-center pins
    - Clicking a star marker opens an info window with the team name, "Team HQ" badge, clickable address, "View Team" and "Directions" buttons
    - Map legend includes a "Team HQ" entry with star icon, separated from equipment source types
    - Team HQ markers filter with the team dropdown: selecting a specific team shows only that team's HQ; "All Teams" shows all HQs
    - Map center and zoom calculations include HQ locations alongside equipment markers
    - `TeamFleetOption` type extended with team location fields; `getAccessibleTeams` query now selects location columns
    - Map displays even when only team HQs have location data (no equipment locations required)

  #### QuickBooks Integration Enhancement
  - `quickbooks-search-customers` Edge Function now returns `BillAddr` and `ShipAddr` fields from QBO API responses, enabling future address auto-population from mapped customers

  #### Feature Flag
  - `GEOLOCATION_HIERARCHY_ENABLED` flag in `src/lib/flags.ts` (gated by `VITE_ENABLE_GEOLOCATION_HIERARCHY` env var) for controlled rollout

  #### Work Order Location Display
  - **Work Order Details page** now shows the effective location (resolved via the 3-tier hierarchy) as a clickable Google Maps link instead of plain text, across desktop (`WorkOrderDetailsInfo`), mobile body (`WorkOrderDetailsMobile`), and mobile header (`WorkOrderDetailsMobileHeader`)
  - **Work Order List cards** now display the effective location in all three card variants (desktop, mobile, compact) using the `ClickableAddress` component with `MapPin` icon
  - **Service layer**: `WORK_ORDER_SELECT` query expanded to join equipment assigned-location fields and team location/override fields; `mapWorkOrderRow()` calls `resolveEffectiveLocation()` to compute `effectiveLocation` on every work order
  - **`WorkOrder` type** extended with `effectiveLocation?: EffectiveLocation | null` computed field
  - Falls back gracefully to the legacy `equipment.location` text when no structured location data is available

### Changed

- **Global Bug Report Dialog**: Moved the bug report dialog from the Support page to the authenticated layout level so it can be invoked from any page
  - New `BugReportProvider` context (`src/features/tickets/context/BugReportContext.tsx`) manages dialog state globally and registers a `Ctrl+Shift+B` / `Cmd+Shift+B` keyboard shortcut
  - Added "Report an Issue" menu item with keyboard shortcut hint to the sidebar user dropdown (`AppSidebar.tsx`)
  - Support page "Report an Issue" button now uses the global context instead of local state
  - Session diagnostics (including `window.location.pathname`) now capture the actual page the user was on when reporting, instead of always reporting `/dashboard/support`

### Fixed

- **Test Suite Alignment with v2.3.0 Geolocation Hierarchy**: Fixed 12 failing tests across 4 files that were out of sync with the geolocation hierarchy refactoring shipped in v2.3.0
  - `MapView.test.tsx` (5 tests): Component now receives `isMapsLoaded` as a prop (default `false`) instead of calling `useJsApiLoader` internally; updated all renders to pass `isMapsLoaded={true}`
  - `teamFleetService.test.ts` (5 tests): Source changed from `.in('team_id', teamIds)` to `.or()` for filtering equipment by team + unassigned; added `.or()` and `.is()` methods to mock query builders
  - `EquipmentDetailsTab.test.tsx` (1 test): Location display now reads `assigned_location_*` structured fields instead of legacy `equipment.location`; added `assigned_location_street` to mock data and mocked `useGoogleMapsLoader`
  - `EquipmentStatusLocationSection.test.tsx` (1 test): Form label changed from "Location \*" to "Location Description \*" and placeholder updated; added mocks for `useGoogleMapsLoader` and `GooglePlacesAutocomplete`

## [2.2.4] - 2026-02-08

### Added

- **In-App Bug Reporting with GitHub Integration** (#529): Full-featured bug reporting system with transparent ticket tracking, session diagnostics, and real-time GitHub sync
  - **Report Issue dialog** on the Support page captures title, description, and comprehensive anonymized session diagnostics (app version, browser, route, screen size, org plan/role, recent errors, failed queries, performance metrics)
  - **My Reported Issues** section on the Support page displays all user-submitted tickets with status badges (Open/In Progress/Closed), expandable details with description, session info, and team response timeline
  - **`create-ticket` Edge Function** validates payload, enforces rate limits (3/hour), creates a GitHub Issue with diagnostics in a collapsible `<details>` section, and inserts a `tickets` record
  - **`github-issue-webhook` Edge Function** receives GitHub webhook events (issue status changes, new comments), verifies HMAC-SHA256 signatures, and syncs status/comments to the database in real time
  - **`ticket_comments` table** stores GitHub issue comments synced via webhook, with `is_from_team` flag and `github_comment_id` UNIQUE constraint for idempotency
  - **Realtime updates** via Supabase broadcast triggers -- ticket status changes and new comments push to the user's browser instantly
  - **Console error ring buffer** (`consoleErrorBuffer.ts`) captures last 10 console errors (message only, no stack traces) for inclusion in bug reports
  - **Session diagnostics collector** (`sessionDiagnostics.ts`) gathers anonymized context at submission time (no PII)
  - **Privacy-first**: GitHub issue body contains only the user's UUID -- no PII/email is exposed
  - **Security hardening**: Markdown injection prevention, @mention neutralization, metadata whitelisting, rate limiting, webhook signature verification
  - **New secrets required**: `GITHUB_PAT` (Issues Read/Write PAT) and `GITHUB_WEBHOOK_SECRET` (webhook HMAC secret). See `docs/features/bug-reporting.md` for setup instructions

## [2.2.3] - 2026-02-01

### Added

- **Voice-to-Text for Technician Notes** (#531): Native browser speech-to-text for hands-free note entry, designed for technicians with dirty hands or gloves
  - Mic button appears next to "Description/Notes" label in Equipment form and "Description" field in Work Order Request form
  - Uses browser's native Web Speech API (100% client-side, no external API costs)
  - Real-time interim transcript overlay while speaking; final transcript appended to existing text
  - Toggle button shows "Voice" / "Stop" with `Mic` / `MicOff` icons
  - Graceful degradation: button hidden in unsupported browsers (Firefox)
  - Clear error messages for permission denied, no microphone, etc.
  - New `useSpeechToText` hook encapsulates feature detection, start/stop controls, and cleanup
  - TypeScript declarations added for Web Speech API (`src/types/speech-recognition.d.ts`)

- **Clipboard Image Paste for Notes**: InlineNoteComposer now supports pasting images directly from the clipboard (GitHub-style), enabling technicians to paste screenshots or mixed content from PDFs and Word documents into Equipment Records and Work Order notes
  - Intercept paste event on the notes textarea; extract image files from `clipboardData.items`
  - Reuse existing file validation (type, size, max images) and thumbnail display
  - Mixed content: append pasted text alongside images when both are present
  - Fallback message when pasting images only: `"{n} image(s) uploaded on {timestamp} by {user}"`
  - Works in Equipment Notes, Work Order Notes (desktop and mobile)

- **Google Workspace Export Integration**: Work order exports can now be sent directly to Google Workspace when the organization has Google Workspace connected
  - **Export to Google Sheets**: New `export-work-orders-to-google-sheets` Edge Function creates a multi-worksheet spreadsheet (Summary, Labor Detail, Materials & Costs, PM Checklists, Timeline, Equipment) in Google Sheets
  - **Save PDF to Google Drive**: New `upload-to-google-drive` Edge Function uploads work order PDFs to the user's Google Drive
  - Work Order Excel Export Dialog: Added "Export to Google Sheets" button when Google Workspace is connected
  - Work Order PDF Export Dialog: Added "Save to Google Drive" button when Google Workspace is connected
  - Reports page: Work Orders Excel export supports Google Sheets export
  - Shared `_shared/google-workspace-token.ts` for Edge Functions to obtain Google Workspace access tokens
  - Shared `_shared/work-orders-export-data.ts` for data fetching and row building reused by Excel and Google Sheets exports

- **README Prerequisites**: New "Prerequisites (Accounts & Services)" section documenting required and optional external services (Supabase, Resend, Google, QuickBooks, Maps, hCaptcha, Web Push) with links to `env.example` and setup guide
- **LegalFooter Changelog Link**: Version number in footer is now a clickable link to the release-specific CHANGELOG on GitHub; `getChangelogHref` resolves the correct ref for tagged releases vs dev builds
- **SUPPORT.md**: New support documentation covering how to get help, where to report issues, and links to troubleshooting and docs
- **Centralized Date Formats**: New `src/config/date-formats.ts` with `DATE_DISPLAY_FORMAT` and `DATE_TIME_DISPLAY_FORMAT` constants for consistent date formatting

### Changed

- **Google Workspace OAuth Scopes**: Expanded default OAuth scopes to include `spreadsheets` and `drive.file` for work order export features
  - Organizations that connected before these scopes were added must reconnect Google Workspace in Organization Settings to use Export to Google Sheets and Save to Google Drive

- **Work Order Form**: Migrated `useWorkOrderForm` from `useFormValidation` to `react-hook-form` with `zodResolver`; backward-compatible adapter preserves existing API; added error toast on form submission failure
- **Equipment CSV Import**: Refactored `import-equipment-csv` Edge Function to a phased approach—map/validate, separate inserts vs updates, bulk insert for new equipment, parallel updates for merges—improving import performance
- **Fleet Map Date Formatting**: Replaced `basicDateFormatter` usage with `date-fns` (`format`, `formatDistanceToNow`, `parseISO`) and `DATE_DISPLAY_FORMAT` from config

### Removed

- **basicDateFormatter**: Removed `src/utils/basicDateFormatter.ts` and its test file; date formatting consolidated into `date-fns` usage and `src/config/date-formats.ts`

### Fixed

- **Assign & Start Work Orders** (#537): Resolved assignment and start flow issues on work order details
  - **Accept flow**: Work Order Details sidebar now uses `useWorkOrderAcceptance` so the assignee selected in the Accept modal is persisted (previously ignored)
  - **Assign & Start**: Replaced single "Assign & Start" button with inline assignee dropdown and "Start Work" button; assignment is required before starting (Start disabled until assignee selected)
  - **Status update with assignee**: `useUpdateWorkOrderStatus` and `WorkOrderService.updateStatus` now accept optional `assigneeId` so assign + start updates both in one call
  - **Equipment with no team**: `useWorkOrderContextualAssignment` now returns organization admins when equipment has no team (previously showed only "Unassign"), matching WorkOrderAcceptanceModal behavior
  - **Equipment context**: Work Order Details sidebar passes `equipmentTeamId` to WorkOrderStatusManager for contextual assignment

## [2.2.2] - 2026-01-27

### Added

- **SEO Improvements**: Comprehensive SEO enhancements for better search engine visibility
  - XML sitemap generation script (`scripts/generate-sitemap.mjs`) automatically creates sitemap.xml during build
  - Sitemap includes all public marketing routes with proper priorities and change frequencies
  - `PageSEO` component for per-route metadata management using `react-helmet-async`
  - Unique title, description, canonical URL, and Open Graph tags for each marketing page
  - Per-route SEO metadata added to all feature pages (`/features/*`), solution pages (`/solutions/*`), and landing pages
  - `X-Robots-Tag: noindex, nofollow` headers for protected routes (`/dashboard/*`, `/auth*`, `/invitation/*`, `/qr/*`, `/debug-*`) to prevent indexing of authenticated/dynamic content
  - Updated `robots.txt` to reference sitemap location

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

### Documentation

- **Node.js Version References**: Updated from "v18.x or v20.x" to "v22.x recommended, v20.x supported" across all setup docs
  - `docs/getting-started/developer-onboarding.md`
  - `docs/technical/setup.md`
  - `docs/ops/local-supabase-development.md`

- **Test Coverage Baseline**: Corrected coverage threshold from 51% to 70% to match CI configuration
  - `.github/copilot-instructions.md`
  - `docs/ops/ci-cd-pipeline.md`

- **Versioning Workflow**: Updated `CONTRIBUTING.md` to accurately document automatic version tagging
  - Replaced "Manual Version Bump workflow" references with correct `version-tag.yml` behavior
  - Fixed broken link to non-existent `docs/deployment/versioning-system.md` (now points to `docs/ops/ci-cd-pipeline.md`)

- **Documentation Hierarchy**: Added source-of-truth table to `docs/README.md`
  - Clarifies which docs are canonical for each topic (setup, migrations, troubleshooting, etc.)
  - Added Getting Started section to documentation structure
  - Updated quick navigation to prioritize `developer-onboarding.md` for new developers

- **Cross-References**: Added links from `.github/instructions/*.md` to full documentation
  - `supabase-migrations.instructions.md` → `docs/ops/migrations.md`
  - `typescript-react.instructions.md` → `docs/technical/standards.md`
  - `edge-functions.instructions.md` → `docs/edge-functions/auth-patterns.md`
  - `code-review.instructions.md` → `docs/guides/permissions.md`
  - `.github/copilot-instructions.md` → Added testing, CI/CD, and permissions links
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

[Unreleased]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.2...HEAD
[2.3.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.1...v2.3.2
[2.3.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.2.4...v2.3.0
[2.2.4]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.2.3...v2.2.4
[2.2.3]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.2.2...v2.2.3
[2.2.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.2.1...v2.2.2
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
