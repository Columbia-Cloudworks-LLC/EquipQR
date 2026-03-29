# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to EquipQR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **CCPA/CPRA privacy policy (Section 10A)** — California-specific disclosures: categories of personal and sensitive information, sources, business purposes, retention summary, no-sale/no-share, consumer rights, submission via **`/privacy-request`** and **`privacy@equipqr.app`**, verification, authorized agents, and response timing. Policy **Last updated:** March 29, 2026.

- **DSR intake** — Public **`/privacy-request`** form; **`submit-privacy-request`** Edge Function; **`dsr_requests`** table with RLS (`20260329000000_add_dsr_requests_table.sql`). Footers (**Do Not Sell or Share**), Settings **Privacy Rights** card, and route coverage in app integration tests.

- **Limit use of sensitive personal information** — **`profiles.limit_sensitive_pi`** with Settings UI; equipment QR scan flow skips geolocation when limited; database trigger **`enforce_scan_location_privacy`** aligns with the flag.

- **Retention and anonymization** — SQL helpers and optional **pg_cron** jobs when the extension exists: notification/export log cleanup, expired invitations, stale Google Workspace directory users, expired GWS OAuth sessions, old departure queue rows, and **`anonymize_audit_log_for_user`** for audit entries. pgTAP: **`supabase/tests/06_dsr_requests_and_privacy.sql`**.

- **DSR abuse controls** — hCaptcha challenge on the privacy request form (when `HCAPTCHA_SECRET_KEY` / `VITE_HCAPTCHA_SITEKEY` are configured); per-email rate limiting (3 requests per 24 hours) and duplicate suppression (same email + type within 1 hour) in **`submit-privacy-request`**. Explicit **`[functions.submit-privacy-request]`** and **`[functions.verify-hcaptcha]`** entries in **`config.toml`**.

- **DSR evidence model** — `dsr_requests` extended with `verification_method`, `verified_by`, `completed_by`, `denial_reason`, `extension_reason`, `extended_due_at`. New **append-only** `dsr_request_events` table with trigger-enforced immutability (update/delete blocked). Auto-logged `intake_received` on insert and status-change events on update. Migration: **`20260329000004_dsr_evidence_model.sql`**.

- **DSR admin workflow** — **`manage-dsr-request`** Edge Function: verify identity, deny with lawful basis, invoke deadline extension (max 90 days per CPRA), record fulfillment steps, complete requests, add notes. Requires authenticated admin/owner.

- **DSR fulfillment engine** — **`fulfill_dsr_deletion(uuid, uuid)`** SQL function orchestrates deletion/anonymization across 7 product data domains (audit log, scans, export logs, notifications, push subscriptions, invitations, profiles) with per-step execution receipts in the event ledger. Migration: **`20260329000005_dsr_fulfillment_engine.sql`**.

- **Opt-out request type** — Added **Do Not Sell or Share My Personal Information** (`opt_out`) to the privacy request form, aligning the UI with the API/DB which already accepted it.

- **DSR compliance runbook** — **`docs/ops/dsr-compliance-runbook.md`**: intake triage, identity verification (authenticated match, email challenge, authorized agent, manual review), processing procedures per request type, extension/denial rules, SLA monitoring queries, evidence packet generation, subprocessor obligations, and evidence retention policy.

- **Integration test for `/landing` redirect** — `AppRoutes.test.tsx` asserts navigation from `/landing#pricing` to canonical `/#pricing` (mocked `Navigate` supports object `to`).

### Changed

- **Privacy policy SLA alignment** — Section 9 general response timing and Section 14 contact response timing updated from **30 days** to **45 calendar days** to match the California-specific Section 10A standard and avoid conflicting deadlines.

### Fixed

- **Marketing and app mobile nav sheet accessibility** — Radix `Dialog` (via shadcn `Sheet`) warned about missing title/description. `LandingHeader` mobile menu now includes `SheetTitle` / `SheetDescription` (screen-reader-only). The signed-in mobile sidebar sheet in `sidebar.tsx` adds matching sr-only `SheetTitle` / `SheetDescription`.

- **Dashboard Recharts console noise** — Addressed `ResponsiveContainer` width/height warnings: `StatsCard` sparkline uses an explicit pixel height and `min-w` on the wrapper; `CostTrendWidget` wraps the chart in a fixed-height container with `height="100%"` on the container; `PMComplianceWidget` and `EquipmentByStatusWidget` use fixed-size `PieChart` with numeric `cx`/`cy` instead of `ResponsiveContainer` + percentage centers.

### Changed

- **Canonical public marketing URL** — `/landing` now redirects to `/` while preserving `search` and `hash` (campaign and deep links stay valid). `SmartLanding` owns home-page `PageSEO` for `/` with the richer title/description previously used on `/landing`. Logo, header anchors, and feature-page links target `/` and `/#features` instead of `/landing`.

- **Landing first-load splitting** — `Landing` is lazy-loaded inside `SmartLanding` with a `Suspense` fallback. Below-the-fold sections on `Landing.tsx` (`WhyDifferent` through `CTA`) load via `React.lazy` inside a single `Suspense` boundary. Hero carousel images use `decoding="async"`, `fetchPriority` (high for first slide, low for others), and responsive `sizes`.

- **Auth sign-in feedback** — `SignInForm` validates trimmed email and required password with inline errors and `aria-*`; API failures show under the password field. `DevQuickLogin` accepts `onAuthFailure` so failures also surface the main card error path. `Auth` uses `useAppToast` for a destructive toast on `handleError` (including Google sign-in errors).

- **Marketing CTA hierarchy** — Hero primary CTA copy aligned to **Get Started Free**. `CTASection` keeps one primary button; demo is a secondary text link. `PricingSection` puts **Get Started Free** first and **Schedule a Demo** second; contact line shortened to **Email us**.

- **Landing mobile menu structure** — Sheet content groups **On this page** vs **Account**, with clearer spacing, focus rings, active section styling, and **Get Started Free** on the account button.

- **Dashboard stat cards and alert copy** — `DashboardStatsGrid` uses clearer sublabels for overdue work and renames the attention card to **Needs attention** with copy that mentions maintenance, inactive, and PM interval overdue. `Dashboard` alert banner counts equipment attention using the same PM-overdue inclusion as `StatsGridWidget` via `useOrgEquipmentPMStatuses`.

## [2.5.2] - 2026-03-27

### Added

- **Landing mobile UX regression tests** — `LandingMobileUX.test.tsx` covers hero carousel accessibility, secondary CTA touch target, why-different headings, how-it-works ordered list, reveal markers, social-proof metric list, About “The Win” chips, and mobile footer accordion triggers.

- **Inventory item detail manual mobile QA** — `docs/technical/inventory-detail-mobile-qa.md` checklist for tab rail overflow hints, adjust-quantity sheet, header/stock badge, change-history expansion, and empty inline fields.

### Changed

- **Mobile UI consistency (dashboard, lists, equipment / work orders / inventory detail)** — Shared `PageHeader` optional `backLink` (`←` + section label) and expanded mobile `TopBar` label suppression for `/dashboard/equipment/:id`, `/dashboard/work-orders/:id`, and `/dashboard/inventory/:id` so in-page titles and back affordances are not duplicated. **Inventory detail**: explicit `← Inventory` back on small viewports; mobile breadcrumbs for that row removed in favor of the back link; stock-health and action targets aligned with other detail pages (e.g. `min-h-[44px]` primary actions, QR icon sizing). **Equipment detail**: mobile header back labeled **Equipment** (ghost, 44px target), QR/delete icon buttons use outline/destructive with accessible names; delete removed from header/desktop `PageHeader` actions and moved to a bottom **Delete Equipment** danger card (admins). **Work orders (mobile)**: collapsible **Description** / **Equipment Details** triggers use icon + semibold title; equipment line uses equipment status badge presentation (e.g. **Under Maintenance**); optional bottom **Delete Work Order** danger card opens the existing mobile action sheet; `WorkOrderCard` shows **status** before **priority** with shared pill sizing. **Lists**: equipment, work-order, and inventory mobile cards use more consistent rounded pill badges where applicable. **Dashboard**: `StatsCard` KPI labels no longer force ALL CAPS (Title Case reads with existing label strings). **Empty values**: em dash (`—`) replaces mixed `Not recorded` / `Not set` in touched equipment and work-order equipment flows. **Custom attributes (equipment)**: read-only values humanize underscore/unit slugs via shared `humanizeAttributeValue` (non-URL values). Tests updated for `MobileEquipmentHeader`; added `WorkOrderDetailsMobileHeader.test.tsx`.

- **Public landing page mobile UX pass** — Hero: stronger early-access banner contrast, heavier mobile subhead with left-aligned long copy (`sm+` centering preserved), secondary “See How Shops” CTA with ≥44px tap zone and clearer in-page jump affordance (down chevron, subdued styling vs primary), and a keyboard-accessible 3-slide product preview carousel (Embla/shadcn) with dot pickers, prev/next controls, and swipe cue. Why EquipQR / How It Works: larger icon treatment, h3+body bullet structure, combined step number + icon marker (no floating double-icon), ordered list semantics, and staggered scroll-reveal via shared `LandingReveal` (IntersectionObserver, `prefers-reduced-motion` respected). Social proof: `100%` / `50%` metrics in tinted accent cards with large purple numerals and labels. Who Is EquipQR For: “The Win” as bordered pill chips. Footer: Radix accordion on small screens with 44px link rows; desktop four-column layout unchanged.

- **Inventory item detail mobile polish** — Stock health (`Healthy` / `Low stock` / `Out of stock`) in `PageHeader` meta and overview stock row via shared `getStockHealthPresentation`. QR action demoted on small screens (ghost/icon, preserved accessible name). Mobile tab rail uses `HorizontalChipRow` fade hints; tab panels get a light opacity/directional transition with reduced-motion safety. **Adjust quantity**: `Drawer` bottom sheet on mobile (tuned handle + top radius in `drawer.tsx`), `Dialog` on desktop with screen-reader description; mobile layout uses full-width outline **Cancel** and stronger borders on secondary add/take actions. Overview: larger section titles, more vertical rhythm between field groups, clearer separation between **Images** and **Delete** (spacing, separator, destructive-tinted delete card). **InlineEditField** empty values use an em dash and muted body styling instead of “Not set”. **HistoryTab** uses animated expand/collapse for change details. Vitest coverage extended for stock badge, mobile sheet, and empty-field display.

## [2.5.1] - 2026-03-22

### Fixed

- **App sidebar horizontal scrollbar** — Active nav items use a left `border-l-2` accent chip; combined with `SidebarContent`’s `overflow-auto`, that slight width overflow showed a horizontal scrollbar whether or not the nav scrolled vertically. `AppSidebar` now passes `overflow-x-hidden` on `SidebarContent` so only vertical scrolling is allowed.

- **Work order form equipment dropdown invisible behind dialog** — Popover `z-index` used hardcoded `z-50` (50) while the Dialog overlay/content used the project's semantic `z-modal` scale (1040–1050), hiding the equipment selector dropdown behind the modal. Updated `PopoverContent` to use `z-popover` (1060) to match the project's z-index hierarchy.

- **Work order create: “With PM Checklist” stutter / freeze** — For equipment with an assigned PM template, `useWorkOrderPMChecklist`’s auto-set effect called `setValue('pmTemplateId', …)` every run even when the form already held that ID, retriggering validation and re-renders in a tight loop. The effect now only updates `pmTemplateId` when it differs from the assigned template.

- **Work order create: working-hours warning never visible** — The “Equipment Working Hours Not Updated” `AlertDialog` nested under the work order `Dialog` used hardcoded `z-50` while the dialog stack uses `z-modal-backdrop` / `z-modal` (~1040–1050), so the alert rendered behind the form modal and appeared to do nothing on submit. `AlertDialog` overlay and content now use the same semantic modal z-index tokens so the warning stacks above the form.

## [2.5.0] - 2026-03-22

### Added

- **Fleet Map: auto-fit viewport and Fit All** — On load the map fits a bounding box around all located equipment and team HQ markers (60px padding, dedicated single-marker zoom, max zoom 15 after multi-point fit). A floating **Fit All** control (maximize icon, bottom-left overlay) re-applies the same fit after the user pans or zooms away.

- **Dashboard mobile quick-actions FAB** — `DashboardFAB` on the dashboard route (mobile viewports only): bottom-right speed-dial above the tab bar opens **New Work Order** and **Scan QR** actions with backdrop dismiss and expanded-state affordance, aligned with the existing work-orders list FAB positioning.
- **Dashboard KPI sparklines** — `StatsCard` supports an optional 7-point Recharts area sparkline; `DashboardStatsGrid` wires synthetic directional series per metric (placeholder until real 7-day history is available).

### Fixed

- **Fleet Map: Google Maps InfoWindow** — Dark mode uses a card-matched bubble surface, dark design tokens inside the content, and a matching map tail; native inner overflow/scrollbar is suppressed so a white vertical strip no longer appears on the right edge of popups. Light mode keeps scoped light tokens on Google’s default white bubble for legibility.

- **Dashboard desktop horizontal overflow** — Widget grid cells use `min-w-0` so wide content cannot blow out the 12-column layout; high-priority work order rows no longer use negative horizontal margins that extended past card padding; dashboard alert chip text truncates within `max-w-full`.

- **Work orders list PM segment tooltips** — Removed `content-visibility: auto` row wrappers from the work orders list so Radix/Floating UI can measure PM segment triggers correctly; segment tooltips now show item details on the list the same way they do from equipment-linked work orders.
- **Dashboard widget layout and padding** — Removed the redundant outer `Card` + `CardContent p-0` wrapper from `DashboardGrid` so each widget’s own `Card` is the only chrome (eliminates double borders and content flush against the outer shell). Lazy-load skeleton uses matching rounded border/card background. `StatsCard` restores top padding when used without `CardHeader` (`pt-4 sm:pt-5` on `CardContent`).

### Changed

- **Fleet Map desktop polish** — Dark-themed basemap when the app is in dark mode; toolbar regrouped (panel toggle, team filter, located summary with separators); equipment list with clearer hover/selected states, Lucide icons for metadata, source badges aligned to semantic tokens and the **Location Source** legend (elevated frosted card, bottom-right); progress header shows **Updated … ago** from the newest `location_updated_at`, with an amber **Stale** chip when that timestamp is older than 24 hours; stronger typographic hierarchy (semibold equipment titles, softer model/team/address lines); notification bell unread badge slightly smaller; global `LegalFooter` uses lighter muted text for a quieter chrome strip.

- **Work order detail mobile UX refinement** — Mobile sticky header: **Work Orders** back affordance with ≥44px touch targets, **More** label (replacing unlabeled overflow), taller **Edit** / **Info** actions, priority shown as a semantic **Badge** next to status, and larger tap areas for address/team location links. Body: summary card uses **15px** metadata, **border-t** separation for equipment link, **Description** / **Equipment Details** at **17px semibold** with **150–200ms** collapsible motion (`pm-collapsible-animate` + reduced-motion respect); **PM Checklist** card uses animated progress (0→value on load via **700ms** eased `Progress` indicator). PM checklist: category headers use subtler **SegmentedProgress** overlay (**15%** opacity) to avoid per-section tint drift; item rows use **`bg-card`**, improved description/read-only notes contrast, **44px** assessment trigger + notes button, optional **vibrate(30)** on condition change; admin **Revert PM Completion** opens **AlertDialog** confirm with destructive primary action. **General Notes** textarea and **Notes & Updates** list body use higher-contrast foreground typography for dark-mode readability.

- **Mobile TopBar: EquipQR mark instead of duplicate section titles** — On viewports below `md`, routes that already render a primary page heading (including `/dashboard`, `/dashboard/equipment`, work orders, inventory, fleet map, teams, reports, PM templates, audit log, settings, support, and organization) show the compact EquipQR icon in `TopBar` instead of repeating the same section label, so the dashboard and equipment screens no longer show e.g. "Dashboard" or "Equipment" twice. Desktop breadcrumb-style labels are unchanged.

- **Equipment list mobile UX polish** — Sort row groups the result count in a pill with a full-width sort control (44px minimum height); horizontal quick-filter chips use stronger left/right scroll fade gradients in `HorizontalChipRow`; mobile list rows use 13px higher-contrast metadata, improved vertical rhythm, and a bordered actions rail separating the QR control from the chevron affordance; `LegalFooter` is hidden on mobile for the dashboard shell (`md+` only); `EquipmentLoadingState` uses mobile list-shaped skeleton rows and desktop grid skeletons; filtered empty state adds a primary **Clear Filters** action wired to `clearFilters`.

- **Dashboard mobile UX polish** — Overdue/attention alert uses a pill shape, semibold text, and a slightly larger warning icon. Stat cards gain extra bottom padding, 13px minimum for KPI labels/sublabels, and a short count-up animation for numeric values (skipped when `prefers-reduced-motion: reduce`). Equipment-by-status and PM Compliance donuts use a larger chart footprint, thicker segment strokes, and taller legend row tap targets. Recent equipment and work orders: `View all` links meet a 44px minimum touch height, rows show a subtle active press state, and card subtitles use reduced opacity so they read below list metadata. High-priority work order **View** controls are taller for reliable taps. Mobile bottom navigation renames the overflow tab label from **More** to **Menu**.

- **Dashboard desktop polish (density, overflow, and CTAs)** — **Dashboard** header: explicit **Refresh** (refetches team-based stats with spin affordance) and **Settings** (gear) dropdown for **Customize widgets** / **Reset layout**, replacing the ambiguous **⋯** menu; alert chip supports long copy via truncation. **KPI `StatsCard`**: consistent sublabel vertical slot (`min-height`), optional sparkline bottom padding, truncated metric labels. **Equipment by Status** / **PM Compliance**: chart + legend grouped and **horizontally centered** in the card with a fixed legend width; PM donut **center label** typography aligned with equipment (matching font sizes). **Recent Work Orders / Recent Equipment**: **View all …** footers use **primary** color, **font-medium**, and **hover underline** for clearer CTAs; work-order **assigned** row rail uses semantic **`bg-info`** instead of raw blue. **High Priority Work Orders**: single item renders as a **compact alert strip**; multiple items use **full-row `Link`** rows with hover/focus and no negative horizontal margins; card uses **`overflow-hidden`**. **Equipment status badges** (`equipmentHelpers`): outline badge tint aligned to work-order scale (**`/20` background, `/30` border**). **Recent Equipment** list: removed fragile **`includes('green')`** hover-border logic.

- **Dashboard premium polish (dense “power tool” UI)** — Aligned the in-app dashboard with a Supabase-style information-dense layout: dark theme **surface stack** (`--background` vs `--card` vs new `--card-elevated` in `index.css`, `card.elevated` in Tailwind) so cards read as distinct from the page; **Card** defaults tightened (`p-4 sm:p-5`, `CardTitle` `text-lg`, `CardDescription` `text-xs`, `border-border/60` + `dark:border-white/[0.08]`). **PageHeader** page titles reduced to `text-xl sm:text-2xl font-semibold` with smaller description text. **Dashboard** page: overdue/attention summary as a destructive-styled **alert chip**; page-level actions evolved to **Refresh** + **Settings** (see *Dashboard desktop polish* above); “Updated … ago” retained. **KPI `StatsCard`s**: colored **left border** by variant, **icon left of label**, **hero `text-3xl`** value, Lucide trend icons when `trend` is set. **App sidebar**: **uppercase tracked** section labels, **separator** between Navigation and Management, **active** items use **`border-l-2` + sidebar accent**. **Equipment by Status** and **PM Compliance** widgets: **donut center labels** (total / compliance %), **smaller ring**, **table-style legend** beside the chart, tooltips preserved. **Recent Equipment / Recent Work Orders** cards: **status-colored row rail**, **chevron** affordance, stronger hover, **text “View all …”** footers instead of full-width outline buttons; recent equipment no longer shows noisy “Added … ago” lines. **High Priority Work Orders** card: **destructive-tinted** shell, **overdue as `Badge`**, row navigation (see *Dashboard desktop polish* for single vs multi layout). **TopBar** shows the **current section label** from the route (breadcrumb-style). **Dashboard tests** updated for the new header/actions copy and structure.

- **dev-start 1Password env sync** — `dev-start.bat` now runs one PowerShell script (`scripts/sync-1password-dev-envs.ps1`) to sync both root `.env` and `supabase/functions/.env` in a single session (two `op environment read` invocations for the separate app and edge environment IDs). `sync-1password-app-env.ps1` and `sync-1password-edge-env.ps1` are thin wrappers for standalone use.
- **Work orders list PM risk and completion cues** — PM bar segments always use per-condition colors (unsafe / immediate repair remain clearly visible even when the checklist is complete). Completion is indicated only by a right-side icon with tooltip (green checkmark when complete, dashed circle when incomplete); removed the redundant PM Complete/Required badge and the previous all-green segment styling for completed checklists.
- **PM checklist section segment tooltips** — `createSegmentsForSection` now passes section, title, and notes into segment tooltips on work order PM checklist headers for consistent detail with list cards.
- **Equipment list desktop toolbar redesign** — Replaced the multi-row Card-based filter area and separate sort header with a single compact toolbar row on desktop. Filters are now accessed via a popover (with an active-count badge), sort options via a keyboard-navigable Command popover, and view mode via a ToggleGroup — matching the dense, professional toolbar pattern common in data-forward apps. An active-filter badge row appears conditionally below the toolbar when filters are set. Mobile experience (Sheet-based filters and sort header) is unchanged.
- **Work orders desktop toolbar redesign** — Replaced the Card-based filter section (search + 5 inline Selects + quick filter buttons) and separate standalone sort row with a single compact toolbar row. Filter popover contains the 5 filter Selects (status, assignee, priority, due date, team) and 4 quick filter presets (My Work, Urgent, Overdue, Unassigned) with tooltips. Sort popover lists all 8 sort options via keyboard-navigable Command list. Active filter badge row appears conditionally below. Mobile Sheet-based experience is unchanged.
- **Inventory list desktop toolbar redesign** — Replaced the Card-wrapped filter section (search + location Select + low-stock Switch) with a single compact toolbar row. Filter popover contains the location Select and low-stock toggle. Active filter badge row shows search term, location, and low-stock badges with individual clear buttons. Mobile Sheet experience is unchanged; table column-header sorting is preserved.
- **Inventory list mobile UX pass** — Mobile **Add** moves to a bottom-right **FAB** above the tab bar (header Add remains on `sm+`); list area gains bottom padding so rows clear the FAB. Row **overflow (⋮)** uses a **44×44** minimum touch target; **SKU + location** render once in a single meta line (no duplicate pin row). **Quantity** uses two urgency tiers: **out of stock (0)** in destructive red vs **low but nonzero** in semantic **warning** (desktop quantity column aligned). Cards use subtle **border + shadow** surface separation with hover/active feedback; filter button shows an **active-count badge** for **search + low stock** with clearer `aria-label`; **Clear filters** in the sheet preserves sort order. A compact **results summary** (`N items · M low stock`, filtered hint) appears above the mobile search row; badges distinguish **Out of stock** vs **Low stock**.
- **Notifications desktop toolbar redesign** — Replaced the dedicated "Filters" Card (with title, search input, type Select, and read-status Select) with a compact single-row toolbar. The 18-option type Select and read-status Select are grouped in a filter popover with active-count badge. Active filter badge row appears conditionally. Result count is shown inline in the toolbar.
- **Audit log desktop overhaul** — Replaced the inline flex-wrap FilterBar with a compact single-row toolbar (search, filter popover with entity type/action/date range, multi-format Download dropdown menu). Table columns condensed from 7 to 5 (Type and Action merged into one column); padding tightened for desktop density. Hovering the Date column shows relative time, the Name column shows full entity name and entity ID, the Changed By column shows the email, and the Summary column previews all field changes in a tooltip. Clicking any row opens a right-side Sheet panel showing every property of the entry (all IDs, actor details, full field-level diff, and raw metadata). Added JSON export alongside the existing CSV export. Removed the Card wrapper around the table and collapsed the regulatory compliance banner into an inline tooltip to maximize vertical space for data.
- **Equipment toolbar import/export actions** — Moved the "Import CSV" button from the PageHeader into the equipment toolbar as an "Actions" dropdown menu (owners/admins only). The same menu adds CSV and JSON export of the current filtered equipment list. Adds `exportUtils.ts` shared utility for CSV generation and Blob downloads.
- **Inventory toolbar export** — Added a "Download" dropdown to the inventory toolbar with CSV and JSON export of the current filtered inventory list. Accessible to parts managers, owners, and admins.
- **Alternate Part Groups toolbar redesign** — Replaced the inline search row, sort Select, horizontal status filter chips, active filter badge, and result count text with a single compact toolbar row. Status filter and sort options are now accessed via popovers. A "Download" menu exports the current filtered groups as CSV or JSON (owners/admins only).

## [2.4.0] - 2026-03-16

### Added

- **SOC-2 session lifecycle controls** — Added inactivity-based session protection with a new `useIdleTimeout` hook and `IdleSessionTimeoutGuard` dialog flow: after 30 minutes idle, users are warned that the session will expire in 2 minutes, then are automatically signed out and redirected to `/auth` if inactivity continues.
- **Security event notifications for detective controls** — Added DB-level security notifications and trigger plumbing via `20260316102000_add_security_event_notifications.sql` for `member_added`, `member_role_changed`, `team_member_added`, `team_member_role_changed`, and `audit_export`, with owner/admin fan-out and UI rendering support in Notifications surfaces.
- **Security trust page** — Added a public `/security` page (`src/pages/Security.tsx`) with summary content for authentication/access controls, tenant isolation/audit posture, monitoring controls, and responsible disclosure contact.
- **Global session revocation control in settings** — Added `Sign out all sessions` action in `SessionStatus` using Supabase global sign-out (`signOut({ scope: 'global' })`) with confirmation dialog and post-action redirect.
- **Seed equipment images pipeline** — New script `scripts/seed-equipment-images.ps1` uploads stock equipment photos from `supabase/seed-images/equipment/` to local Supabase Storage and sets `equipment.image_url` for all 35 seed equipment records. Runs automatically as step 5b in `dev-start.bat` after `--reset-db`, giving the demo environment real equipment imagery instead of placeholder icons.
- **1Password Edge env sync** — New script `scripts/sync-1password-edge-env.ps1` syncs 1Password environment secrets into `supabase/functions/.env` for local Edge Functions, with local redirect URLs. Optional run from `dev-start.bat` when 1Password CLI is on PATH.
- **1Password app env sync** — New script `scripts/sync-1password-app-env.ps1` syncs 1Password environment secrets into root `.env` for local development. `dev-start.bat` can run this automatically when 1Password CLI is available.
- **Equipment location history seed** — New seed file `supabase/seeds/28_equipment_location_history.sql` populates manual and team_sync `equipment_location_history` records for location hierarchy and map testing.
- **Landing page "How It Works" section** — Added `src/components/landing/HowItWorksSection.tsx` and integrated it into `src/pages/Landing.tsx` to show a 3-step QR workflow from label setup through QuickBooks draft invoice export.

### Changed

- **Audit export no longer capped at 10,000 rows** — Replaced fixed-limit CSV export with batched full-history export (`5000` row batches) in `auditService`, added live progress feedback in `AuditLogTable`, and removed capped-export sidebar messaging. Full export access is now restricted to Owner/Admin roles.
- **Notification retention extended from 7 to 30 days** — Updated cleanup function in migration `20260316101000_extend_notification_retention_to_30_days.sql` and refreshed user-facing retention copy in settings/notifications pages.
- **QR scan location privacy default now opt-in** — Added migration `20260316100000_default_scan_location_collection_off.sql` to default `organizations.scan_location_collection_enabled` to `false` for new orgs; updated organization settings copy to reflect privacy-by-default behavior.
- **Audit summary clarity improvements** — Updated `ChangesSummary` in `ChangesDiff` to show clearer inline change context (single-field old→new detail, explicit 2-3 field labels, condensed multi-field summaries) to better reflect captured before/after diffs.
- **Footer hardening and trust links** — Removed public GitHub changelog/version link exposure from `LegalFooter`, kept plain version display, and added footer links for `Security` and external `Status`.
- **Security & status context enhancements** — Session status card now displays `last_sign_in_at` relative time to improve user awareness of account activity.
- **Dashboard refinement pass for theme parity and triage clarity** — Improved dark-mode alert visibility on KPI warning/danger cards, strengthened critical overdue visual urgency (>30 days) in High Priority Work Orders, added relative timestamps to Recent Equipment/Work Orders, upgraded dashboard subtitle context with actionable counts, softened `View all` actions to outline buttons, and increased donut-legend tap targets for better mobile accessibility.
- **QR access flow simplified (removed in-app scanner page)** — Removed the in-app `/dashboard/scanner` experience and all scanner navigation entry points (sidebar, bottom nav, dashboard quick actions, and fleet-map empty-state action) so QR usage aligns with native mobile camera behavior. Users now scan physical QR labels with their phone camera and land on existing `/qr/equipment/:id` or `/qr/inventory/:id` routes. Redirect fallbacks in `QRRedirectHandler` and `useQRRedirectWithOrgSwitch` now return users to `/dashboard` instead of a removed scanner page. Mobile bottom navigation now includes `Inventory` as a primary tab.
- **Dashboard interaction and filtering UX** — Enhanced dashboard widgets and navigation for faster technician triage: donut charts now show styled hover tooltips with counts + percentages, include legend count labels, and support click-through filtering into Equipment/Work Orders. Dashboard stat cards now use clearer hover/press affordances, and the `Out of Service` card now links to a pre-applied out-of-service equipment filter (`maintenance` + `inactive`) for consistency with `Overdue Work`.
- **Dashboard control clarity and context** — Renamed dashboard `Reset` to `Reset Layout`, added tooltip guidance, and added toast confirmation after reset. PM Compliance now includes interval-tracking help text and a date-based-tracking count note when applicable.
- **Work order and equipment list context from dashboard routes** — Equipment and Work Orders pages now read dashboard-provided URL filter params (`status`, `date`, and existing `team`) on initial load so chart/card navigation preserves user intent.
- **Sidebar persistence behavior** — Sidebar provider now restores saved open/collapsed state from the existing `sidebar:state` cookie on initialization, reducing confusion when toggling between sessions.

- **Work Orders mobile triage and filtering UX** — Updated mobile Work Orders interactions for faster field use: quick-filter chips are now mutually exclusive with tap-again clear behavior, sort selection persists via URL query params across detail-page navigation, the top mobile create action was replaced with a bottom-right FAB to recover list space, chip sizing/spacing was tuned for narrow screens, cards now surface priority as a visible badge in list view, and Create Work Order equipment selection now uses a searchable combobox for large fleets.
- **1Password-first local startup workflow** — `dev-start.bat` now syncs both app `.env` and edge `supabase/functions/.env` from 1Password early in startup (after pre-flight checks), so developers complete 1Password auth up front instead of being interrupted later during migration/startup wait time.
- **Teams list + detail workflow polish** — Refined team management UX across `Teams` and `TeamDetails`: moved card quick actions to an icon-only kebab in the card header, added list-card status + operational stats (members, equipment, active WOs, overdue), merged search/create into a unified toolbar, and added list sorting (A-Z, Z-A, member count, newest). On details, renamed the top work-order stat to `Active WOs`, removed redundant Quick Actions card, made `Completed` activity stat clickable, reduced map vertical footprint, clarified "team location overrides equipment" copy with tooltip help, moved delete into secondary overflow actions with an `AlertDialog` confirmation flow, improved clickable-link signaling on stat tiles, and strengthened Team Members actions with more prominent Add Member and inline clickable role badges.
- **Team forms validation and clarity** — Replaced native browser required-tooltip validation in Create Team with inline app-styled field errors, added description counters (`0 / 500`) to create/edit team dialogs, and clarified Team Image helper copy to "Upload a logo or photo to identify this team."

- **Work orders page UX overhaul** — Dynamic subtitle now reflects active filter state and result counts instead of always showing "Showing all work orders". Quick-filter chips (My Work, Urgent, Overdue, Unassigned) are now independent toggles that stack, show clear active states with brand-colored fill and checkmark icons, auto-deactivate on conflicts, and include tooltips. Added sort controls (Created, Due Date, Priority, Status) and inline result count between filters and list. Consolidated the Status dropdown into the main filter grid alongside other dropdowns. Clear Filters button only appears when filters are active and shows a count badge. Overdue warning icons now include tooltips and increased size for visibility. Removed non-actionable "QuickBooks Setup Required" from card context menus. Replaced the buried PM checkbox in the create modal with prominent card-style selector tiles for Standard vs PM Checklist work orders. Added a read-only Team display field in the create modal showing the team inherited from selected equipment. Shortened card location display to city/state with full address in tooltip. Detail page title now wraps instead of truncating. Disambiguated the two revert buttons with clearer labels ("Revert to Accepted" vs "Revert PM Completion").
- **dev-start.bat** — Before starting Edge Functions: optional sync of edge env from 1Password (configurable environment ID), validation of edge env file (existence, size, max line length), and use of `--no-verify-jwt` for local serve.
- **dev-start/dev-stop startup flow** — `dev-start.bat` now supports `-Force`/`--force` for a full fresh reset (app-stack hard stop aligned to `dev-stop`, plus DB reset and type regeneration) before startup while keeping Docker Desktop running, and `--gen-types` no longer short-circuits runtime startup. Reset + type generation now complete as part of one atomic flow that still starts Edge Functions and Vite.
- **Seed data for location hierarchy** — Teams seed (`05_teams.sql`) adds location columns (address, city, state, country, lat/lng, override_equipment_location). Equipment seed (`07_equipment.sql`) adds assigned/team location data and `use_team_location` for map hierarchy scenarios. Scans seed (`14_scans.sql`) adds GPS-format scans for 4-tier location testing.
- **sync-local-supabase-env.ps1** — Removed `SUPABASE_URL` from managed edge env block (handled by 1Password sync or elsewhere).
- **Onboarding and setup documentation** — Updated onboarding/setup docs to strongly prefer 1Password CLI + `dev-start.bat` for env configuration, while keeping manual `.env` / `.env.local` setup as fallback.
- **Landing and feature-page messaging refresh** — Updated hero/CTA/social-proof/value-prop copy, revised feature-page SEO titles to cleaner product-name-free variants, added stronger onboarding and trust language, and improved feature-page back navigation behavior in `FeatureHero`.
- **Inventory and PM workflow clarity** — Added inventory location filtering and filter chips, introduced part-lookup empty-state guidance with quick example searches, switched PM template primary action to `Apply Template`, and moved the fleet map legend to the top-right for better overlap safety.
- **Work order usability and status visibility** — Enabled keyboard/click card navigation states, normalized overdue/due-soon logic to respect completed statuses, made work-order descriptions optional in schema/UI, set document titles on work-order details, improved PM indicator labeling, and surfaced equipment manufacturer/model/serial metadata from equipment details into equipment-linked work-order cards.
- **Navigation and UI polish updates** — Promoted `QR Scanner` into main sidebar navigation, added an out-of-service warning variant in dashboard stats, strengthened active tab visual treatment, and added completed-state coloring support for segmented progress bars.
- **Alternate part groups list clarity and control** — Added explicit `Unverified` status badges, stronger warning styling for `Deprecated`, full-name title tooltips, status filter chips, sort controls, inline result counts, and one-tap search clear actions to improve technician scanning and triage speed in dense group lists.
- **Mobile-first alternate group actions** — Adapted list/card and form interactions for touch workflows by using bottom-sheet drawers for mobile create/edit/action flows, reducing hidden affordances and improving one-handed field usability.
- **Alternate group detail workflow visibility** — Improved detail-page wayfinding and action confidence with simplified breadcrumbs, stronger selected-row states in add-item flows, and clearer verification guidance while creating new groups.
- **Inventory list triage UX** — Added sortable inventory columns (including Quantity and Status), inline result counts, reduced External ID visual weight on constrained desktop widths, and stronger duplicate-name disambiguation by showing secondary SKU/location context under item names.
- **Inventory list quick actions** — Added row/card overflow actions for fast workflows (`View Details`, `Add 1`, `Take 1`, `QR Code`, `Edit`) so technicians and parts managers can act from list view without repeated page hops.
- **Inventory detail mobile clarity** — Replaced the mobile vertical tab stack with a horizontal scrollable tabs rail, changed the QR control to a labeled action with tooltip/title, and simplified mobile breadcrumb density to prioritize a clearer back path.
- **Inventory audit readability** — Transaction timestamps now render as localized absolute date/time with timezone abbreviation, and change-history entries now show absolute timestamps as primary with relative time as secondary context.

### Fixed

- **Dashboard information density and accessibility gaps** — High-priority work order rows now surface equipment name context inline, dashboard chart sections now include screen-reader summaries/ARIA labeling, and chart segments include non-color stroke differentiation to improve colorblind readability.
- **Dashboard empty-state clarity** — Updated high-priority, equipment-status, and PM compliance empty-state copy to be more informative and action-oriented for low-data orgs.

- **Work Orders mobile filter dropdown blocker** — Resolved a layering bug where `Select` option menus inside the mobile Filters sheet rendered in the DOM but were visually hidden behind modal layers. Select popover stacking now renders above sheet content so Status/Assignee/Priority/Due Date/Team options are visible and usable on mobile.
- **Work Orders filter result correctness and empty-state clarity** — Overdue filtering now excludes terminal statuses (`completed`, `cancelled`) by using shared overdue logic, and the empty state is now context-aware for `My Work` with clear copy when no assignments are found.
- **Fleet map pin popup text contrast** — Overrode Google Maps InfoWindow CSS cascade that was rendering all popup text as near-invisible light grey on the white bubble. Scoped light-mode design tokens inside the InfoWindow container so text, badges, and links render legibly in both light and dark mode.
- **Signup form validation feedback timing and accessibility** — Added touched-field behavior with blur-triggered required-field errors, ARIA invalid/description wiring, and submit-attempt fallback messaging so users get clear, field-level validation guidance without premature error noise.
- **Mobile drawer layering over bottom navigation** — Raised shared drawer overlay/content layering so create/edit alternate-group sheets consistently render above persistent bottom nav and block background interaction as expected.
- **Add-item modal scalability in large inventories** — Changed default add-item behavior to require search before listing inventory choices and added explicit empty-state guidance to prevent unfiltered long-list overload.
- **Touch-target safety for destructive actions** — Increased mobile remove-action hit areas and labels on alternate-group member rows to reduce accidental destructive taps in field conditions.
- **Mobile add/edit inventory form action reachability** — Updated the inventory item form dialog to use safe-area-aware spacing with a sticky footer action row so `Cancel` and submit actions remain visible above bottom navigation.
- **Adjust Quantity modal overflow and layering** — Hardened dialog overlay/content z-index tokens and mobile content bounds so the adjust-quantity flow remains fully contained, scroll-safe, and blocks background interaction while open.

## [2.3.10] - 2026-03-15

### Added

- **PM interval tracking foundation** — Added PM interval schema support and validation, PM completion working-hours snapshots, and new Supabase RPCs (`get_equipment_pm_status`, `get_org_equipment_pm_statuses`) to compute per-equipment and org-wide PM status.
- **PM operational seed data** — Added `supabase/seeds/27_pm_operational_data.sql` to populate realistic PM/work order history and overdue/due-soon/current scenarios for local validation and demos.
- **Equipment PM status UX components** — Added PM status indicator and PM status hooks, plus mobile action affordances for PM-priority actions in equipment workflows.

### Changed

- **Equipment and work-order UX refresh** — Updated equipment list/details, filtering/sorting, dashboard widgets/cards, and work-order detail/mobile surfaces for improved technician scanning, action speed, and PM visibility.
- **PM templates and checklist editing flows** — Enhanced PM template data flow and checklist editor behavior to align with interval-aware PM operations.
- **Landing page messaging and sitemap content** — Updated landing section content and generated sitemap output for the current product positioning.

## [2.3.9] - 2026-03-13

### Added

- **Landing page: Pricing, Roadmap, Footer** — New `PricingSection` (simple transparent pricing, CTA to Calendly/contact), `RoadmapSection` ("What's Next" with placeholder roadmap items), and `LandingFooter` (product/company links, contact, copyright). Landing page now includes these sections and scroll-to-hash for in-page anchors.
- **Supabase local port preparation script** — `scripts/prepare-supabase-ports.ps1` reads ports from `supabase/config.toml` and writes env vars for `dev-start.bat`, so the local stack can use configurable ports and avoid Windows excluded ranges.

### Changed

- **Local Supabase ports configurable** — Supabase local stack now uses configurable ports from `supabase/config.toml` (current defaults: API 54321, DB 54322, Studio 54323). `dev-start.bat` runs the port-prep script and uses the configured API port for health checks; `dev-stop.bat` updated accordingly.
- **Supabase "already running" check** — Replaced port-listener check with `supabase status` so Docker Desktop on Windows (where container ports do not appear in `Get-NetTCPConnection`) is detected correctly.
- **Landing page** — About, CTA, Features, Hero, header, and social proof sections updated (copy/layout/styling). Page order: Hero, Features, About, Social Proof, Pricing, CTA, Footer.
- **Docs** — `docs/ops/local-supabase-development.md` updated for configurable ports and conflict resolution (rerun `dev-start.bat`).

## [2.3.8] - 2026-03-12

### Changed

- Rolled up the current set of in-progress repository updates into the 2.3.8 release version so package metadata and project documentation stay aligned for the next release cycle.

## [2.3.7] - 2026-03-06

### Fixed

- Implemented the fix for [Issue #575](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/575) in the shared image viewer so full-size images are no longer constrained by the old clipped container.
  - Updated `src/components/common/ImageGallery.tsx` modal image area:
    - Replaced fixed/clipped wrapper (`max-h-96 overflow-hidden`) with a viewport-bounded, centered container:
      - `min-h-[12rem] max-h-[72dvh] overflow-auto ...`
    - Updated image sizing to true contain behavior in both dimensions:
      - `max-w-full w-auto max-h-[68dvh] object-contain`
  - This applies to all current `ImageGallery` consumers automatically (`EquipmentImagesTab`, `EquipmentNotesTab`, `WorkOrderImagesSection`).

- Implemented Issue #576 work-order card enrichment from the attached plan, including data plumbing + UI updates for desktop/mobile cards and offline compatibility.
  - Updated team-based work order fetch to include full equipment metadata and location inputs, then compute `effectiveLocation`:
    - `src/features/teams/services/teamBasedWorkOrderService.ts`
  - Extended shared work order types with equipment display fields:
    - `src/features/work-orders/types/workOrder.ts`
  - Enriched Work Order cards (desktop + mobile) with:
    - equipment image (with safe fallback),
    - manufacturer, model, serial, machine hours,
    - existing clickable location behavior preserved via `ClickableAddress` (external Google Maps):
    - `src/features/work-orders/components/WorkOrderCard.tsx`
  - Added offline-safe defaults for new equipment fields in pending-sync items:
    - `src/features/work-orders/hooks/useOfflineMergedWorkOrders.ts`
  - Applied consistency pass to primary `WorkOrderService` so non-team-based work order paths expose the same equipment metadata:
    - `src/features/work-orders/services/workOrderService.ts`

### Chore

Update package dependencies and versions

- Updated `jspdf` from 4.0.0 to 4.2.0.
- Updated `supabase` from 2.72.9 to 2.77.0.
- Updated `@babel/runtime` from 7.28.4 to 7.28.6.
- Updated `dompurify` from 3.3.0 to 3.3.2.
- Updated `tar` from 7.5.7 to 7.5.10.
- Ran `npm audit --json` and confirmed the 5 reported issues:
  - `ajv` (moderate), `bn.js` (moderate), `minimatch` (high), `rollup` (high) as transitive
  - `xlsx` (high) as direct dependency
- Applied `npm audit fix` to resolve the transitive vulnerabilities.
- Replaced vulnerable `xlsx@0.18.5` with patched SheetJS tarball:
  - Updated `package.json` dependency to  
    `xlsx: "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`
  - Lockfile updated accordingly in `package-lock.json`.
- Verified final state:
  - `npm audit` → `found 0 vulnerabilities`
  - `npm ls xlsx` → `xlsx@0.20.3`

## [2.3.6] - 2026-03-06

### Fixed

- **Dashboard hover effect causes scrollbars** — Hovering over stats cards on the dashboard sometimes caused scrollbars to appear because the cards used `hover:scale-105`, which increased their rendered size and triggered overflow. Removed the scale effect and kept the shadow (`hover:shadow-lg`) so hover feedback remains without affecting layout. Fixes [#574](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/574).

## [2.3.5] - 2026-02-26

### Fixed

- **Dashboard stuck in edit mode on mobile** — On mobile viewports, the dashboard could appear in drag-and-drop edit mode and become unusable. Root cause: `useIsMobile()` returned `false` on the first render (state initialized as `undefined` and updated only in `useEffect`), so mobile users briefly saw the desktop "Customize" button that toggles grid edit mode; one tap enabled edit mode and the grid stayed draggable with no easy way to exit. Fixed by (1) rewriting `useIsMobile` with `useSyncExternalStore` so the viewport check runs synchronously and the correct value is available on first client render, and (2) hardening the Dashboard so the grid is never in edit mode on mobile (`isEditMode` forced false when `isMobile` is true) and any stray edit state is cleared when the hook resolves to mobile.
- **Dashboard widgets now scroll correctly on mobile** — Removed `react-grid-layout` from the dashboard entirely. The library attached touch event listeners even when drag-and-drop was disabled, making it impossible to scroll the dashboard on mobile devices (every tap was intercepted as a drag). Replaced with a static CSS 12-column grid; widget order is determined solely by the `activeWidgets` array in user preferences.

### Changed

- **Unified dashboard customization across all screen sizes** — Previously the dashboard had two separate customization flows: a drag-and-resize grid on desktop (enabled via a "Customize" toggle) and an up/down reorder sheet on mobile. Both are now replaced by a single "Customize" button that opens the **Widget Manager** sheet on every device. The sheet supports reordering (up/down buttons), inline widget removal (X button per row), and a link to the Widget Catalog for adding new widgets.
- **`MobileWidgetReorder` renamed to `WidgetManager`** — The component is no longer mobile-specific and now includes inline remove buttons and an "Add Widgets" shortcut to the catalog.
- **Dashboard layout persistence simplified** — Stored preferences no longer include per-breakpoint position/size data (`layouts` key). Only the ordered `activeWidgets` array is persisted to localStorage and Supabase. Old saved preferences are handled gracefully — `activeWidgets` is extracted and `layouts` is ignored.
- **Removed `AGENTS.md`** — Consolidated agent-facing project context into `.cursor/rules/` where it is more effective and maintainable.

### Removed

- **`react-grid-layout` dependency removed** — Along with its peer `react-resizable`. This eliminates ~60 KB from the production bundle and removes the source of the mobile scroll regression.

## [2.3.4] - 2026-02-10

### Fixed

- **Storage bucket creation missing from migrations** — Production was missing 4 storage buckets (`organization-logos`, `user-avatars`, `team-images`, `inventory-item-images`) because the image upload feature (v2.3.3) created buckets manually via the Supabase Dashboard instead of through migrations. Added `20260210220000_create_missing_storage_buckets.sql` to create all 4 buckets idempotently with `ON CONFLICT DO NOTHING`. This fixes "Bucket not found" errors when uploading organization logos, user avatars, team images, and inventory item images on production
- **Duplicate storage policy migration** — `20260210211000_add_storage_select_policies.sql` duplicated all 6 SELECT policies already created by `20260210210000_add_storage_object_policies.sql`, which would cause "policy already exists" errors on fresh deployments. Converted to a no-op with explanatory comment
- **Non-idempotent storage migrations** — Added `DROP POLICY IF EXISTS` guards to all 24 `CREATE POLICY` statements in `20260210210000_add_storage_object_policies.sql` and 3 policies + 1 trigger in `20260210180000_image_upload_feature.sql` so migrations can be safely re-run during `supabase db reset`

### Security

- **Storage RLS policies now enforce tenant scoping** — Previously, `storage.objects` policies for `organization-logos`, `team-images`, `inventory-item-images`, `equipment-note-images`, and `work-order-images` only checked `bucket_id`, allowing any authenticated user to read/write/delete objects across organizations. Added `20260210230000_improve_storage_security_and_buckets.sql` with path-based scoping: org-prefixed buckets (`organization-logos`, `team-images`, `inventory-item-images`) verify `is_org_member()` against the org ID in the storage path; user-prefixed buckets (`equipment-note-images`, `work-order-images`) verify `auth.uid()` matches the user ID in the storage path. SELECT on public-display buckets (logos, team images) remains open to all authenticated users; metadata-table RLS provides defense-in-depth for user-prefixed buckets
- **Missing storage buckets added to migration pipeline** — `equipment-note-images` and `work-order-images` buckets were not included in any migration, meaning fresh/self-hosted deployments would fail with "Bucket not found" for equipment note and work order image uploads. The new migration creates all 6 buckets idempotently
- **Bucket configuration now enforced on existing environments** — Changed from `ON CONFLICT (id) DO NOTHING` to `ON CONFLICT (id) DO UPDATE SET` so that bucket settings (public flag, file size limits, allowed MIME types) are enforced even on environments where buckets were previously created manually with potentially different settings

## [2.3.3] - 2026-02-10

### Added

- **Image Upload Feature** — Replaced vulnerable external-URL-based image inputs with Supabase Storage uploads for organizations, users, teams, and inventory items. Eliminates cross-site image vulnerabilities where arbitrary external URLs could be swapped to malicious content. Four new public storage buckets (`organization-logos`, `user-avatars`, `team-images`, `inventory-item-images`) with MIME type validation and file size limits ([#559](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/559))
  - **Organization logo upload** — Replaced the URL text input in Organization Settings with a drag-and-drop file upload (`SingleImageUpload` component). Logos are stored in the `organization-logos` bucket (5 MB limit) with upsert semantics. Existing external-URL logos continue to render for backward compatibility. The `send-invitation-email` edge function works as-is since the column still stores a URL (now a Supabase public URL)
  - **User avatar upload** — New `avatar_url` column on `profiles` table. Users can upload a profile photo in Profile Settings. Avatars display via `AvatarImage` (Radix) in 5 member list components (`UnifiedMembersList`, `MembersList`, `TeamMembersList`, `RoleChangeDialog`, `AddTeamMemberDialog`), falling back to initial-based `AvatarFallback` when no avatar is set. `UserContext` now fetches `avatar_url` on auth, and `useOrganizationMembers` includes it in the profiles join
  - **Team image upload** — New `image_url` column on `teams` table. Team images can be uploaded/replaced via the Team Metadata Editor dialog (`SingleImageUpload`). Team details page displays the image in place of the default Users icon when set
  - **Inventory item multi-image upload** — New `inventory_item_images` table (up to 5 images per item) with RLS policies scoped by `organization_id`. Replaced the single `image_url` URL input in `InventoryItemForm` with the multi-image `ImageUploadWithNote` component on the item detail page. Image gallery with per-image delete on `InventoryItemDetail`. Legacy `image_url` values display for backward compatibility. Storage files are cleaned up when items are deleted
  - **Shared image upload service** (`src/services/imageUploadService.ts`) — DRY abstraction over the upload-to-bucket + get-public-URL pattern previously duplicated in work order and equipment note services. Provides `uploadImageToStorage()`, `deleteImageFromStorage()`, `deleteImagesFromStorage()`, `extractStoragePath()`, `generateFilePath()`, `generateSingleFilePath()`, and `validateImageFile()`
  - **SingleImageUpload component** (`src/components/common/SingleImageUpload.tsx`) — Reusable single-image upload with drag-and-drop, current image preview, replace/delete buttons, file validation, and loading states. Used by org logo, user avatar, and team image uploads. Distinct from the existing multi-image `ImageUploadWithNote`
  - **Storage quota update** — `get_organization_storage_mb()` and `update_organization_storage()` database functions updated to include `inventory_item_images` in quota calculations. New `inventory_item_images_storage_trigger` fires on INSERT/DELETE/UPDATE
  - **15 unit tests** for `imageUploadService` (path generation, storage path extraction, file validation) and **pgTAP RLS test** for cross-tenant isolation on `inventory_item_images`
- **Multi-Factor Authentication (MFA)** — Full TOTP-based two-factor authentication using Supabase Auth MFA APIs (`supabase.auth.mfa.*`). TOTP is mandatory for Owner/Admin roles and optional for Member/Viewer. Feature is gated behind `VITE_ENABLE_MFA` environment variable for safe rollout. No database migration required — Supabase manages factor storage internally in `auth.mfa_factors` ([#499](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/499))
  - **MFA Context & Hook** (`src/contexts/MFAContext.tsx`, `src/hooks/useMFA.ts`) — Global MFA state management with parallel `Promise.all` status refresh, derived `isEnrolled`/`isVerified`/`needsVerification` state, and `useCallback`-wrapped methods. Provides no-op defaults when feature flag is disabled
  - **MFA Verification** (`src/components/auth/MFAVerification.tsx`) — 6-digit OTP input using existing `InputOTP` shadcn component with auto-submit on completion, accessible ARIA labels, and error display with retry
  - **MFA Enrollment** (`src/components/auth/MFAEnrollment.tsx`) — Multi-step wizard: QR code display with manual secret copy fallback (step 1), then code verification (step 2). Supports `isRequired` prop for forced admin enrollment
  - **MFA Enforcement Guard** (`src/components/auth/MFAEnforcementGuard.tsx`) — Route-level guard placed after `SimpleOrganizationProvider` that forces enrollment for unenrolled Owner/Admin users and TOTP verification for enrolled-but-AAL1 sessions. Member/Viewer roles pass through unaffected
  - **MFA Settings** (`src/components/settings/MFASettings.tsx`) — Settings page section showing status badge, enrolled factor list with dates, setup/remove buttons, admin removal prevention, and role-based "Required for your role" notice
  - **Sign-in flow integration** — Updated `SignInForm` and `Auth` page to detect MFA requirement after both password and Google OAuth sign-in, showing inline TOTP verification before redirecting to dashboard
  - **41 unit tests** across 5 test files covering MFAContext state derivation, MFAVerification UI, MFAEnrollment multi-step flow, MFASettings role-based behavior, and MFAEnforcementGuard role enforcement
- **One-click dev environment scripts** (`dev-start.bat`, `dev-stop.bat`) — Windows batch files for managing the full local development stack with Docker zombie-container resilience. Both scripts are safe to run at any time regardless of current state. Updated `AGENTS.md`, `docs/technical/setup.md`, and `docs/ops/local-supabase-development.md` with usage instructions
  - **`dev-start.bat`** — Idempotent startup: pre-flight checks (Node, npm, npx, Docker CLI, Docker daemon with auto-start), `npm ci` if `node_modules` missing, Supabase start with health-check polling, Vite dev server launch in a separate window with HTTP readiness poll. Skips any service that is already running and healthy. Prints a final status report with `[OK]`/`[FAILED]` per service and exits code 0 when all services are ready (suitable as a Playwright/E2E pre-test step). Includes automatic retry with container cleanup if `supabase start` fails due to Docker name conflicts
  - **`dev-stop.bat`** — Graceful 4-step shutdown: kills Vite (port 8080), detects and kills any `supabase functions serve` process, runs `npx supabase stop`, then sweeps orphan processes on dev ports (8080, 54321, 54322). Leaves Docker Desktop running by default; pass `-Force` flag to also shut down Docker Desktop (`dev-stop.bat -Force`)
  - **Docker Desktop for Windows workaround** — Both scripts include `docker rm -f` cleanup of stopped Supabase containers after every `supabase stop` and before every `supabase start`. This works around a Supabase CLI issue on Docker Desktop where the `supabase_vector` (and occasionally other) containers persist in `Exited` state after `supabase stop`, causing the next `supabase start` to fail with "container name already in use"
- **Shared Google API retry utility** (`supabase/functions/_shared/google-api-retry.ts`) — `googleApiFetch()` wraps `fetch()` with exponential backoff and jitter for transient Google API failures (429 rate limited, 503 service unavailable, network errors). Respects `Retry-After` headers, defaults to 3 attempts, and uses structured JSON logging consistent with `quickbooks-retry.ts`. Applied to all Google Workspace edge functions: Sheets export (3 call sites), Drive upload (1), and Directory sync (1)
- **`invalid_grant` detection on token refresh** — Added `"token_revoked"` error code to `GoogleWorkspaceTokenErrorCode` in `_shared/google-workspace-token.ts`. When Google returns `invalid_grant` (refresh token revoked due to password change, admin revocation, or 6 months of inactivity), the error now provides a distinct code and clear user-facing message instead of a generic "token refresh failed"

### Changed

- **`dev-start.bat` now regenerates Supabase TypeScript types** — Added step 4/5 between Supabase start and Vite start that runs `supabase gen types typescript --local` to keep `src/integrations/supabase/types.ts` in sync with the local database schema. Uses a temp-file write strategy (write to `.tmp`, move on success) so a generation failure never corrupts the existing types file. Idempotent: produces identical output when schema is unchanged
- **Privacy Policy comprehensive overhaul** — Rewrote the privacy policy (`src/pages/PrivacyPolicy.tsx`) from a generic template into a detailed, audit-ready document with 14 numbered sections. Replaced the dynamic `new Date().toLocaleDateString()` date with a static "February 10, 2026". Added itemized tables for individual-level data collection (9 categories) and organization-level data collection (11 categories). Transparently disclosed all 10 external service providers (Supabase, Google Maps, hCaptcha, Resend, Vercel, Stripe, QuickBooks Online, Google Workspace, GitHub, Web Push) with bidirectional data flows (data sent, received, and stored). Added explicit sections for cookies/local storage/session data, data security controls, children's privacy, international data transfers, and user/organization-level privacy controls
- **Privacy Policy tests rewritten** — Updated all 37 tests in `PrivacyPolicy.test.tsx` to match the rewritten component: numbered section headings (e.g., "1. Introduction"), written date format ("February 10, 2026"), table-based data categories, restructured content assertions, and new test coverage for the 10 external service providers (subprocessors) and optional integrations (QuickBooks, Google Workspace)
- **Refactored `google-workspace-sync-users` to use shared token helper** — Replaced ~50 lines of duplicated token refresh, decryption, and credential update logic with a single call to `getGoogleWorkspaceAccessToken()` from `_shared/google-workspace-token.ts`, matching the pattern already used by `export-work-orders-to-google-sheets` and `upload-to-google-drive`
- **OAuth callback CORS now uses shared module** — Replaced inline `corsHeaders` object in `google-workspace-oauth-callback` with an import from `_shared/cors.ts` (extended with GET method support for browser redirects), consistent with all other edge functions
- **Cleaned up debug logging in OAuth callback** — Removed 11 verbose `DEBUG:` prefixed log statements from `google-workspace-oauth-callback` that leaked implementation details (encryption key length, credential record IDs). Kept error-handling logs with descriptive operation names

### Security

- **Eliminated cross-site image vulnerability** — Organization logos and inventory item images previously accepted arbitrary external URLs, which could be swapped to malicious/phishing content after initial review, break without notice, and were rendered in invitation emails. All image inputs now require file uploads to Supabase Storage with MIME type validation (JPEG, PNG, GIF, WebP only) and file size limits. External URL inputs have been removed entirely from the organization settings form and inventory item form ([#559](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/559))
- **Upgraded jspdf from 4.0.0 to 4.1.0** — Fixes four vulnerabilities: DoS via unvalidated BMP dimensions in BMPDecoder (CVE-2026-24133, High), PDF Injection in AcroFormChoiceField allowing arbitrary JavaScript execution (CVE-2026-24737, High), Stored XMP Metadata Injection enabling spoofing and integrity violation (CVE-2026-24043, Moderate), and Shared State Race Condition in addJS plugin (CVE-2026-24040, Moderate) ([#30](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/30), [#31](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/31), [#32](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/32), [#33](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/33))
- **Upgraded xlsx (SheetJS) from 0.18.5 to 0.20.3** — Fixes Prototype Pollution (CVE-2023-30533, High) and Regular Expression Denial of Service / ReDoS (CVE-2024-22363, High). Installed from SheetJS CDN tarball since the package is no longer published to the npm registry ([#24](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/24), [#25](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/25))

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

[Unreleased]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.5.2...HEAD
[2.5.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.5.1...v2.5.2
[2.5.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.10...v2.4.0
[2.3.10]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.9...v2.3.10
[2.3.9]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.8...v2.3.9
[2.3.8]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.7...v2.3.8
[2.3.7]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.6...v2.3.7
[2.3.6]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.5...v2.3.6
[2.3.5]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.4...v2.3.5
[2.3.4]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.3...v2.3.4
[2.3.3]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.3.2...v2.3.3
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
