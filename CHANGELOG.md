# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to EquipQR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.25.30] - 2026-07-14

### Changed

- **Daily Check-Ins (#1263)** — Unused templates are purged on delete; templates with ledger data are archived, hidden by default behind a "Show deleted check-ins" toggle, and restorable for ongoing QR use.

## [3.25.29] - 2026-07-14

### Fixed

- **Equipment create navigation (#1255)** — After creating equipment from the list modal, reset team scope to All teams and open the new equipment details page so the record is immediately discoverable.

## [3.25.28] - 2026-07-14

### Fixed

- **Historical timeline editor (#1250)** — Block accidental dialog dismiss during date/time entry: outside-click and portaled picker interactions no longer close the editor; invalid timelines cannot be dismissed; unsaved valid edits prompt an in-app discard confirmation.

## [3.25.27] - 2026-07-14

### Changed

- **@vitejs/plugin-react (#1112)** — Bump `@vitejs/plugin-react` from 6.0.2 to 6.0.3 (Dependabot).

## [3.25.26] - 2026-07-14

### Changed

- **@radix-ui/react-separator (#1109)** — Bump `@radix-ui/react-separator` from 1.1.10 to 1.1.11 (Dependabot).

## [3.25.25] - 2026-07-13

### Changed

- **@radix-ui/react-label (#1108)** — Bump `@radix-ui/react-label` from 2.1.10 to 2.1.11 (Dependabot).

## [3.25.24] - 2026-07-13

### Changed

- **@tanstack/react-query (#1106)** — Bump `@tanstack/react-query` from 5.101.0 to 5.101.2 (Dependabot).

## [3.25.23] - 2026-07-13

### Changed

- **@supabase/supabase-js (#1105)** — Bump `@supabase/supabase-js` from 2.106.2 to 2.110.2 (Dependabot).

## [3.25.22] - 2026-07-13

### Changed

- **tailwindcss (#1110)** — Bump `tailwindcss` from 4.3.0 to 4.3.2 (Dependabot).

## [3.25.21] - 2026-07-13

### Changed

- **@radix-ui/react-progress (#1115)** — Bump `@radix-ui/react-progress` from 1.1.10 to 1.1.12 (Dependabot).

## [3.25.20] - 2026-07-13

### Changed

- **@radix-ui/react-label** — patch bump from 2.1.10 to 2.1.11 (Dependabot #1108); transitive `@radix-ui/react-primitive` 2.1.7.
- **@radix-ui/react-switch (#1117)** — Bump `@radix-ui/react-switch` from 1.2.6 to 1.3.3 (Dependabot).

## [3.25.19] - 2026-07-12

### Changed

- **Export report query layer (#1192)** — Consolidate Fleet Export Console data access into `_shared/reports/` with explicit column whitelists, early org scoping for scans, and unified equipment/work-order fetch for sync and async export paths.

## [3.25.18] - 2026-07-12

### Changed

- **typescript-eslint (#1114)** — Bump `typescript-eslint` from 8.59.3 to 8.63.0 (Dependabot).

## [3.25.17] - 2026-07-12

### Changed

- **@axe-core/playwright (#1102)** — Bump `@axe-core/playwright` from 4.11.3 to 4.12.1 (Dependabot).

## [3.25.16] - 2026-07-12

### Changed

- **Work orders ESLint cleanup (#1237)** — Removed dead hooks and service wrappers in `work-orders/services` and `work-orders/hooks` (−801 LOC); zero warnings in scoped paths.

## [3.25.15] - 2026-07-12

### Changed

- **actions/cache (#1103)** — Bump `actions/cache` from 5.0.5 to 6.1.0 across GitHub Actions workflows (Dependabot).

## [3.25.14] - 2026-07-12

### Changed

- **vitest-coverage-report-action (#1101)** — Bump `davelosert/vitest-coverage-report-action` from 2.12.0 to 2.12.1 (Dependabot).

## [3.25.13] - 2026-07-12

### Changed

- **actions/checkout (#1100)** — Bump `actions/checkout` from 6.0.3 to 7.0.0 across GitHub Actions workflows (Dependabot).

## [3.25.12] - 2026-07-12

### Changed

- **Unified work order PM template on create (#1162)** — Replaced the generic vs PM work order type split with a PM template dropdown directly below the title (None + clear control, equipment default). Collapsed equipment QR, card menu, details, and mobile quick-access entry points into one New Work Order flow.
- **Windows npm ci lock recovery** — Added `npm-ci-safe.bat` / `npm run ci:install` to stop dev tooling, delete stuck `node_modules` trees, and recover from EPERM/EBUSY on native binaries (`tailwindcss-oxide`, `lightningcss`) instead of leaving backup folders in the repo.

## [3.25.11] - 2026-07-12

### Changed

- **Supabase hot-path performance (#1203)** — Inventory list metadata now uses a single SQL aggregation RPC instead of scanning every SKU client-side; work-order team filters join equipment in one query; org background-sync channels use refcounted subscribe/unsubscribe cleanup and organization-scoped `equipment_notes` realtime filters.

## [3.25.10] - 2026-07-12

### Changed

- **markdownlint (#1232)** — Disable low-signal spacing/table rules (`MD060`, `MD022`, `MD032`, `MD031`); scope `lint:md` to `.cursor/**` and `AGENTS.md`; document enforced vs suppressed rules for agents.

## [3.25.9] - 2026-07-12

### Changed

- **vitest (#1116)** — Bump `vitest` from 4.1.8 to 4.1.10 and align `@vitest/coverage-v8` (Dependabot).

## [3.25.8] - 2026-07-12

### Changed

- **nanoid (#1104)** — Bump `nanoid` from 5.1.11 to 5.1.16 (Dependabot).

## [3.25.7] - 2026-07-11

### Fixed

- **Dark scrollbar theme (#1208)** — Global scrollbar styling uses subtle dark thumbs on transparent tracks so native light OS scrollbars no longer clash with the Mission Control palette in popovers, dialogs, sheets, and other overflow regions.

## [3.25.6] - 2026-07-11

### Changed

- **PM Templates assignment UX (#1209)** — Template card assignment triggers use outline styling so titles scan more easily, and the label shows **Assigned Equipment (count)** when equipment in the current team scope already uses the template as its default PM.

## [3.25.5] - 2026-07-11

### Changed

- **Help Center evidence quality gate (#1161)** — PR/docs capture now asserts frame quality at screenshot time (no horizontal overflow, controls fully in viewport via `evidence-frame-helpers.ts`) and requires a mandatory post-capture visual review (`visual-review-checklist.md` + `Complete-PrEvidenceVisualReview.ps1`) before upload/publish. `docs-demo-helpers.ts` shares the same frame assertions before spotlight choreography.


### Fixed

- **SEO crawl budget (#1220)** — Block authenticated app routes and sensitive paths in `robots.txt` so search engines concentrate crawl budget on public marketing pages instead of sign-in walls and soft 404s.

## [3.25.3] - 2026-07-11

### Fixed

- **Mobile inline image viewports (#1216)** — Disable touch panning on phones/tablets so page scroll is not blocked on note and equipment photos; always show download/copy controls on mobile; tap opens a pinch-zoom lightbox with export actions. Work order image carousels and galleries reuse the shared lightbox.

## [3.25.2] - 2026-07-11

### Changed

- **Testing infrastructure (#1214)** — Remove the `scripts/test-runner.mjs` log-watching wrapper; run Vitest natively with a forks pool. Add Vitest 4 `unit` (Node) and `component` (jsdom) projects for environment isolation. On Windows, `npm test` / `npm run test:component` shard the component suite into four sequential chunks with visible phase banners. Clear React Query caches in global teardown; document the testing-trophy strategy in `docs/technical/testing-guidelines.md`.

## [3.25.1] - 2026-07-11

### Changed

- **Equipment details desktop layout (#1212)** — Basic Information and Lifecycle & Warranty share a two-column row on desktop; Preventative Maintenance controls live on the Work Orders tab; Daily Operator Check-In assignment lives on the Check-Ins tab.

## [3.25.0] - 2026-07-09

### Added

- **Equipment media & artifacts library (#1129)** - Searchable/filterable media library with dedicated explorer, details-tab summary strip, create-time display image capture, and display-first chronological carousels (reusing DynamicImageViewport / NoteImageCarousel from #1185/#1200) on equipment and work order details.

## [3.24.0] - 2026-07-09

### Added

- **Async export jobs (#1193)** — Heavy equipment and work-order CSV exports enqueue via pgmq `exports`, process in `process-export-job`, store results in a private `export-results` bucket, and notify when ready. DB RPCs shape minimal columns to cut egress. Loading toasts cover Google Drive/Docs/Sheets and report exports until completion. Smaller report types remain synchronous.

### Fixed

- **Async export scope hardening (#1205)** — `enqueue_export_job` derives work-order `accessibleTeamIds` from DB memberships (non-admins cannot omit/forge org-wide scope); the worker re-checks admin vs scoped payload and rejects mismatched queue messages; client polling fails fast on `not_found` instead of timing out.

## [3.23.1] - 2026-07-09

### Changed

- **CI unit-test velocity (#1199)** — Slimmed the slowest equipment/inventory component tests to wiring smokes (filter/sort covered by existing/new hook and util unit tests; ~60% faster on profiled hotspots), enabled modest in-shard file parallelism (`maxWorkers: 2`) on Linux CI, and completed a happy-dom experiment (kept jsdom — full-suite regressions outweighed ~8–12% hotspot gains). Coverage ratchet remains on the merged PR report.

## [3.23.0] - 2026-07-08

### Added

- **Dynamic image viewports and notes card UI (#1185)** — Bespoke hover/touch panning viewports with download and copy-to-clipboard controls on equipment and work order images. Notes refactored into functional cards (carousel left, post-style content right) with role-based edit/delete/visibility controls, org-configurable author edit window, public/private filters, and audited note mutations via SECURITY DEFINER RPCs. Removed duplicate equipment images gallery from the Notes tab.

## [3.22.0] - 2026-07-08

### Changed

- **Edge function org-scoped helpers (#1194)** — Added `_shared/org-scoped-queries.ts` with reusable Zod request schemas, `parseJsonBody`, membership/admin guards, `withOrgScope` / `withOrgAdminScope`, and `applyOrganizationScope`. Refactored geocode-location, resolve-inventory-scan, export-report, get/set Google export destination, and manage-google-drive-destination-folder to use the shared patterns.

## [3.21.0] - 2026-07-08

### Added

- **Quick Forms (#1184)** — Standalone public data-collection forms, deliberately not tied to equipment or teams: time sheets, secure-area checks, assembly-line checklists, and other job-site capture. Org owners/admins build forms (short/long text, number, date, checkbox fields, optional GPS request) on the new **Operations → Quick Forms** page, share them via rotating non-enumerable QR tokens (`/qr/quick-form/{token}`), and read an append-only submission ledger with CSV/Excel/PDF exports. Unauthenticated submitters go through a new `quick-form` edge function (token auth, hCaptcha when configured, per-form rate limiting). All form definitions, raw QR tokens, and submissions are owner/admin-only via RLS — plain members have no access because collected data may be sensitive.
- **Production edge deploy** — **Production Release Readiness** runs `supabase functions deploy` after migrations, schema drift, and Vercel promote on every `main` push, so new Edge Functions (including `quick-form`) reach production automatically without a manual CLI step.

## [3.20.0] - 2026-07-07

### Changed

- **Audit Log page refactor (#1166)** — The audit log is now a customizable dashboard: the Key Metrics, Timeline, and Events sections are drag/drop widgets on a grid (drag by the header grip, resize from the edges, collapse sections you don't need), with the layout persisted per browser and a one-click "Reset layout" control. The events table shows in full width until entries are selected. Selecting a single entry opens the detail inspector with new "Copy Markdown" / "Copy JSON" clipboard actions; selecting multiple entries (row checkboxes, Ctrl/Cmd-click, or Shift-click ranges) swaps the detail pane for a bulk-actions pane that exports the selected entries as Markdown, Excel, or PDF. The list/detail resize handle got a clearer grab affordance with hover highlighting and a tighter hit area.

## [3.19.0] - 2026-07-07

### Fixed

- **Microphone voice input (#1170)** — Voice dictation buttons no longer fail: the `Permissions-Policy` header now allows microphone use on EquipQR's own pages (`microphone=(self)` in Vite dev, Vercel, and Netlify configs), and clicking a mic button explicitly requests browser microphone consent before starting speech recognition. If the user denies access, clicking the button again restarts the consent process with an actionable error message. Privacy policy copy updated to describe the browser-only dictation flow (audio is never recorded or stored by EquipQR).
- **Inventory item cost and threshold editing (#1165)** — Parts managers and org owners/admins can now change **Default Unit Cost** and **Low Stock Threshold** inline on the inventory item Overview tab using the same click-to-edit pattern as other fields (with numeric validation; clearing the cost removes it). Changes are recorded in the audit log by the existing inventory audit trigger.

### Changed

- **Voice input placement (#1170)** — All voice dictation buttons now use one consistent icon style anchored to the bottom-left corner of the text box they control (notes composers, equipment form description, work order description, PM general notes, working-hours notes, and QR quick-action dialogs).
- **PM template selector moved to Work Orders tab (#1169)** — The equipment PM template control moved from the Details tab to a prominent dropdown at the top of the Work Orders tab. The dropdown stays locked until the inline edit control is clicked, preventing accidental template changes; picking an option saves immediately and re-locks the control.

## [3.18.0] - 2026-07-07

### Added

- **QuickBooks help-center guides** — Rewrote the Connect QuickBooks, Map Teams to QuickBooks Customers, and Export Work Orders to QuickBooks guides on equipqr.info around a complete PM-work-order-to-invoice walkthrough, with real screenshots and demo videos hosted in the public `docs-media` bucket.
- **Unattended QuickBooks browser session tooling** — New agent scripts (`scripts/qbo/Connect-QboBrowserSession.ps1` + `scripts/qbo/qbo-browser-signin.mjs`) open a signed-in QuickBooks browser session for automation. Partial for now: Intuit's passkey chooser still blocks fully unattended sign-in.

### Changed

- **QuickBooks invoice Parts line** — Exported invoices now itemize the Parts line description from the work order's cost rows instead of a bare "Parts" label.
- **QuickBooks invoice billing email** — Invoice export (create and update) now seeds the invoice `BillEmail` from the QuickBooks customer's primary email — never overwriting an email already on the invoice — so "Review and send" in QuickBooks no longer requires manual email entry.

### Fixed

- **Work order Export menu flicker** — The QuickBooks entry in the Export menu stays visible (disabled) while the permission check loads instead of being omitted on first open; the submenu also migrated to the shared QuickBooks query-key factories.
- **Mobile QuickBooks invoice status** — Mobile work order details now shows the QuickBooks invoice status badge (draft/sent/paid with balance and invoice number) in the summary card, matching desktop.
- **Fleet Map API-key diagnostics** — The Fleet Map error boundary now recognizes Google Maps API-key authorization crashes (opaque `marker.js`/`main.js` TypeErrors) and renders the actionable HTTP-referrer-allowlist diagnostic card instead of the generic error card.

## [3.17.0] - 2026-07-07

### Fixed

- **Daily check-in QR link generation (#1179)** — Organization owners/admins can now generate a missing daily check-in QR link directly inside the QR code dialog (equipment list and equipment details, desktop and mobile). Previously the dialog only pointed at the equipment-details actions menu, leaving assignments minted before server-side token persistence (#1154) with no reachable "generate" action — the "QR link is not available" notice persisted no matter what the user tried.
- **preview.equipqr.app never updated (#1180)** — `preview-domain-alias.yml` now runs on push to `main` only: it fast-forwards the `preview` domain-anchor branch and fires the Vercel deploy hook (plain git pushes of a commit already built for `main` are deduplicated by Vercel and produce no deployment). The branch-bound domain auto-aliases to the new deployment, so the old `deployment_status`-triggered alias job and `scripts/vercel/Set-PreviewDomainAlias.ps1` were removed — the workflow no longer attaches skipped checks to every PR. The branch previously did not exist on the remote (stale since v3.9.2).

### Added

- **Schema reference dump guardrail (#1182)** — New `supabase/current_schema.sql` reference dump derived from the migration chain, documented in `docs/ops/migrations.md` (regeneration rule, commands, AI-generated migration guidance, data-only skip marker). A git-based CI check (`scripts/check-schema-reference.mjs`, wired into the Supabase Migration Validator workflow and `npm run verify:schema-reference`) fails PRs that change schema-affecting migrations without regenerating the dump; PRs without migration changes pass trivially and no database is required in CI.

## [3.16.1] - 2026-07-07

### Fixed

- **Team customer / QuickBooks linking (#1173)** — Customer account and QuickBooks invoice export now live on one card with explicit change, sync, and unlink controls; export gating resolves through the customer account chain (not legacy mapping only); changing a linked QuickBooks customer remaps in place instead of importing duplicates; refresh looks up customers by QuickBooks ID; team managers and requestors appear as automatic contacts; manual external contacts are manageable by team managers.
- **QuickBooks token refresh UX (#1177)** — Removed the TopBar QuickBooks status badge and the misleading manual “Refresh Now” control on Integrations; reconnect is shown only when authorization truly expires.
- **Team details map console hygiene (#1174)** — Team location preview skips the Google Map when no Map ID is configured, avoiding deprecated marker initialization paths.


### Fixed

- **Stale private image URLs (#1171)** — Expired Supabase signed URLs and orphaned storage references no longer pass through as `<img src>` fallbacks; missing objects resolve to null so the UI shows icon placeholders instead of flooding the console with 400s.
- **Equipment list lazy-load intervention (#1175)** — Above-the-fold equipment cards use `loading="eager"` (same pattern as work orders) to silence Edge/Chrome lazy-load intervention warnings on `/dashboard/equipment`.
- **Team details map deprecation (#1174)** — `TeamLocationCard` migrates from deprecated `google.maps.Marker` to `@vis.gl/react-google-maps` `AdvancedMarker` with vector map support.

### Changed

- **Local dev media seed (#1176)** — Replaced `scripts/seed-equipment-images.ps1` with `scripts/seed-dev-media.ps1`: uploads canonical paths to private buckets, supports `equipment/`, `drop/`, and `work-orders/` folders (JPEG/PNG/WebP/GIF), and wires equipment display images plus equipment-note and work-order note images after `dev-start.bat -Force`.
- **Dependency cleanup (#1174)** — Removed unused `@react-google-maps/api` after team and fleet maps fully migrated to `@vis.gl/react-google-maps`.

### Added

- **Generated volume seed pipeline (#1164)** — Replaces the committed `26_large_inventory.sql` bulk file with `scripts/seed-data/generate-seeds.ts`, emitting deterministic inventory, equipment, work orders (with consumed parts and costs), parts RBAC grants, and operator check-ins into gitignored `supabase/seeds/generated/`. Wired into `dev-start.bat -Force` (`-SeedScale`) and `dev-test.bat reset-db`; guardrail tests in `src/tests/scripts/generateSeeds.test.ts`.
- **Help Center docs media (#1161)** — Standardized Playwright demo choreography (`docs-demo-helpers.ts`: settle, scroll-into-view, dim/blur spotlight) for desktop and mobile. New PR evidence specs capture **Start Here** and **Technician Field Work** collections; screenshots and MP4 demos published to the public `docs-media` bucket and embedded in equipqr.info articles.

### Changed

- **Equipment critical E2E** — List assertions use search/detail routes instead of assuming seeded assets appear on page 1 after generated volume data.
- **Privacy/signup full E2E** — Auto-solve hCaptcha when the local test sitekey is configured.

## [3.14.0] - 2026-07-06

### Added

- **Dedicated team views (#1132)** — Team details gains a view switcher framing the same team data as an **Internal Team** (members and collaboration first), a **Department** (fleet metrics and maintenance posture first), or a **Customer** (external account, contacts, and service history first). Team managers can persist the active view as the team-wide default (`teams.preferred_view`); the Customer view prompts to link a customer account when none is attached.
- **Mobile quick access drawers (#1151)** — Equipment details gets a QR-first quick access button: the equipment scan QR, one shortcut per enabled daily check-in QR, PM/generic work order creation, and note capture in one bottom drawer. Work order details consolidates the next status transition, add note/photo, the work order QR code (previously list-only), and all exports (PDF, files, Google Drive, QuickBooks) behind a Quick actions entry in the field footer, with a floating button when the footer is hidden.
- **Parts Access panel (#1152)** — The Inventory page button now manages both inventory grants in one sheet: Parts Managers (create/edit/delete) and Parts Consumers (view + part lookup), using a shared searchable multi-select with select all/none/inverse. The mobile footer opens the same sheet instead of deep-linking to Members.

### Changed

- **Audit log buried and hardened (#1122)** — The audit log moved from main navigation to **Organization → Audit Log** (old path redirects), is now owner/admin-only at every layer (page guard, `audit_log` SELECT RLS, `get_audit_log_timeline` RPC), and embedded audit history was removed from work order and inventory detail pages in favor of admin-only deep links into the pre-filtered explorer. Audit entries remain excluded from all non-audit export paths.
- **PM template assignment (#1144)** — "Apply to Equipment" now uses the same team-scoped multi-select dropdown as daily check-ins (search, select all/none/inverse, TopBar team scoping, "Current default" markers) on both the template cards and template detail view, replacing the old full-screen assignment dialog. Built-in templates are explicitly branded **EquipQR Templates** with assign-directly-without-cloning messaging.

### Fixed

- **equipqr.info dead links (#1158)** — The sha256-hash CSP from #1147 drifted whenever any docs page changed (VitePress regenerates its inline hash-map bootstrap while Vercel serves headers from the committed `vercel.json`), silently re-breaking hydration so left-clicks did nothing. The docs build now externalizes all VitePress inline scripts to content-addressed `/assets/inline.*.js` files and ships a static `script-src 'self'` CSP that cannot drift; the build fails if any inline script or hash-based CSP reappears.

## [3.13.0] - 2026-07-06

### Added

- **Cross-device daily check-in QR links (#1154)** — Raw operator check-in QR tokens are now generated server-side and persisted in an admin-only `operator_checkin_token_secrets` table (RLS: organization owners/admins), so a QR link created on one device can be viewed and printed from any other device or browser. The previous in-memory browser cache is removed; assignments created before this release show a notice directing admins to rotate the QR link once.

### Fixed

- **Equipment Check-Ins tab crash (#1155)** — Opening the Check-Ins tab (and other Radix-composed surfaces) could crash with "Maximum update depth exceeded" under React 19 due to unstable composed-ref identities in Radix primitives. Upgraded `@radix-ui/react-select`, `react-popover`, `react-scroll-area`, `react-dropdown-menu`, `react-toast`, `react-tooltip`, `react-slot`, `react-tabs`, `react-dialog`, and `react-alert-dialog` to the patched releases; the dialog 1.1.15 pin (jsdom focus recursion workaround) is removed because the upstream fix landed in the same patch line.
- **Fleet Map console CSP errors (#1088)** — Production CSP now includes `'wasm-unsafe-eval'` (WASM-only compilation, not JS eval) in `script-src`, letting Google Maps' WebGL vector basemap compile its label worker without flooding the console with CompileError violations.
- **Work order list image 404s (#1086)** — Equipment thumbnails on work order cards now resolve signed URLs instead of emitting canonical storage paths into `<img src>` (which the browser resolved against `/dashboard/...` and 404'd). The thumbnail component also refuses to render non-URL paths as a guard.
- **Equipment list image 400s (#1156)** — Equipment display image signing derives the owning bucket from the known equipment id instead of probing the work-order bucket with individual sign calls, eliminating guaranteed 400 responses in the console; remaining lookups batch through `createSignedUrls`.
- **Invite Member modal and silent toasts (#1081)** — The app never mounted a Sonner `<Toaster />`, so every `sonner` toast (including "Invitation sent successfully") was invisible; one is now mounted above modal overlays. The Invite Member dialog also closes on failed sends so the outcome toast is visible instead of hidden behind the modal.
- **CI test stderr noise (#1148)** — Work order service and organization provider tests mock the app logger for expected error paths, the equipment form test uses a constructable service mock (Vitest 3 `new` support), and the resizable panel test mock no longer spreads library-only props onto DOM nodes.

## [3.12.12] - 2026-07-05

### Fixed

- **equipqr.info Help Center interactivity and branding (#1147)** — The docs site CSP (`script-src 'self'`) blocked the inline scripts VitePress needs to hydrate, leaving the front page with dead feature cards, a dead hero button, and a non-functional theme toggle. Post-build CSP hash generation (`scripts/docs/generate-docs-csp.mjs`) now allowlists the three VitePress inline bootstraps without `script-src 'unsafe-inline'`. The Help Center also gains EquipQR branding: navbar logo, homepage hero logo, and favicon (previously 404). Playwright evidence serves the built docs through the exact production CSP to guard hydration, navigation, and theming.

## [3.12.11] - 2026-07-05

### Security

- **Customer roles oblivious to parts & internal costing** — Team Requestor/Viewer roles and plain members can no longer read work order cost line items (parts, unit pricing, labor) at the database layer: `work_order_costs` RLS now requires org owner/admin, the work order assignee, or an operational team role (owner/manager/technician) on the work order's team, and the previous cross-tenant `created_by`-only INSERT/UPDATE/DELETE surface is closed. UI leaks fixed: cost subtotals on mobile work order cards, labor hours on public work order notes, estimated hours in the requestor status card, the Cost Trend dashboard widget/catalog entry, the equipment Parts tab, the dashboard "New Inventory Item" shortcut, and the work order "Add from Inventory" picker are all hidden from users without cost or inventory access.

### Fixed

- **Parts Consumer work order consumption** — Parts Consumers can now consume and restore parts through work orders they hold operational access to: `adjust_inventory_quantity` accepts work-order-scoped adjustments for consumers (validating the work order belongs to the item's organization) instead of requiring the Parts Manager grant, and cost delete/update inventory restore flows pass the work order id.

## [3.12.10] - 2026-07-05

### Changed

- **Daily Check-In mobile UX (#1128)** — Public operator check-in checklist rows support swipe right for Pass and swipe left for Fail, show answered Pass/Fail color states, keep accessible Pass/Fail buttons, and add a Reset form shortcut without re-scanning the QR code.

## [3.12.9] - 2026-07-05

### Added

- **PM checklist Not Applicable (#1094)** — Technicians can mark PM checklist items as Not Applicable instead of forcing OK plus notes. N/A counts toward checklist completion and renders with distinct grey styling in item rows and progress segments.

## [3.12.8] - 2026-07-05

### Fixed

- **Inventory list pagination (#1133)** — Inventory list fetches now use bounded Supabase range batches (500 rows per request) instead of loading all organization parts in one query, preserving existing list filters, sorting, exports, and quick filters.

## [3.12.7] - 2026-07-05

### Fixed

- **Database cron helper errors (#1141)** — SECURITY DEFINER pg_cron helpers no longer cast `current_user` to `oid`, eliminating recurring `invalid input syntax for type oid: "postgres"` errors during queue-worker, Stripe MV refresh, and QuickBooks token refresh jobs. QuickBooks manual refresh calls a dedicated internal helper so pg_cron-only guards do not block authenticated operators; RPC messaging clarifies org-scoped expiring counts vs global refresh job. Production `postgres` collation was refreshed after the dependent-object query returned no rows; the remaining `template1` collation warning is vendor-owned and tracked in #1143 after Supabase rejected agent-side refresh with `must be owner of database template1`.

## [3.12.6] - 2026-07-05

### Fixed

- **Daily Check-In template persistence (#1137)** — Assigned operator checklist templates no longer appear deleted after app updates when equipment assignments remain enabled; inconsistent inactive-template states are repaired and blocked at the database layer while explicit admin delete still archives templates and disables QR links.

## [3.12.5] - 2026-07-05

### Changed

- **Historical timeline editing (#1121)** — New timeline events copy the previous event timestamp, date/time pickers open on the selected month with shortcuts, and per-event reason fields are removed in favor of work order notes.
- **Historical note timestamps (#1121)** — Owner/admins can adjust note timestamps on historical work orders only; edits are audit-logged without mutating prior audit entries.

## [3.12.4] - 2026-07-05

### Changed

- **Historical timeline conversion density (#1099)** — Compact modal with numbered timeline steps, clearer add-event affordance, terminal-status guidance, and desktop two-column layout for notes alongside timeline and change history.

## [3.12.3] - 2026-07-04

### Added

- **PM template management on active work orders (#1130)** — Technicians and managers can add, change, or remove a PM checklist on an open work order before completion or cancellation. PM checklist data resets on template change; work order photos, notes, and costs are preserved. Help Center guide and PR evidence cover the full workflow.

### Fixed

- **Work order delete resilience (#1130)** — Owner/admin cascade delete no longer fails when storage object cleanup hits path mismatches; PM row deletion is allowed via scoped RLS for active work orders.

## [3.12.2] - 2026-07-04

### Added

- **Location maps documentation and evidence** — Replaces PR #1131 with expanded scope: shared structured location editors for inventory, teams, and organization defaults; mobile equipment location map parity; production Supabase `docs-media` bucket for public docs screenshots/videos; equipqr.info guides for location sources/maps and inventory storage locations with persistent media URLs; desktop and mobile PR evidence specs.

### Changed

- **Map location consistency (#1123)** — Equipment maps and location readouts use a shared source model with explicit selectors across Fleet Map, equipment details, work orders, and inventory; inline address editing and live-location capture on equipment and structured location dialogs.

## [3.12.1] - 2026-07-04

### Fixed

- **Map location consistency (#1123)** — Equipment maps and location readouts now use a shared source model (team location, equipment location, last known scan location, legacy coordinates) with explicit labels and selectors across Fleet Map, equipment details, work orders, and scan/location history. Equipment detail maps render via the vis.gl loader, expose a source dropdown on the location card, and let editors set an equipment address directly from the map card (which switches the asset off team inheritance). Scan GPS inserts now sync `last_known_location` so mini maps stay aligned with fleet scan fallback.

## [3.12.0] - 2026-07-03

### Added

- **Daily operator check-ins (#1091)** — Organization owners and administrators can define custom operator safety checklists, assign a separate public QR code per machine, and collect append-only unauthenticated operator submissions with optional GPS and required mileage when configured. Admins can review the daily ledger, export CSV evidence, and download a print/PDF-friendly daily report.

## [3.11.4] - 2026-07-04

### Fixed

- **Invitation signup onboarding (#1092)** — Users who sign up via organization invitation skip the getting-started wizard on their personal workspace and land on the invited organization dashboard after accepting the invitation.

## [3.11.3] - 2026-07-03

### Added

- **Scoped work order exports (#1096)** — Team requestors and viewers can export work orders they can view via customer-safe Service Report PDF and a scoped Work Order Exports console on Reports; private notes and costs remain excluded; org owners and administrators retain the full Fleet Export Console.

## [3.11.2] - 2026-07-03

### Added

- **Work order follow-up notes (#1118)** — Team requestors and work-order creators can add public notes (including after completion) for evidence such as purchase order numbers; managers and technicians retain full note functionality on completed work orders; cancelled work orders stay note-locked.

## [3.11.1] - 2026-07-03

### Added

- **Release metadata CI gate (#1119)** — Pull requests that touch release-relevant files must bump `package.json` above the base branch, keep `[Unreleased]` empty, and add a matching `CHANGELOG.md` version section.

## [3.11.0] - 2026-06-29

### Added

- **Historical work order conversion (#1093)** — Organization owners and administrators can convert an existing operational work order to a historical record, backdate its operational timeline, and re-export customer documentation with corrected created and completed dates.

## [3.10.0] - 2026-06-24

### Fixed

- **Equipment QR scan crash (#1074)** — Public `/qr/equipment/:equipmentId` routes no longer throw outside `SimpleOrganizationProvider`; unauthenticated users are redirected to sign-in with `pendingRedirect` preserved.
- **Dashboard team filter (#1075)** — Key Metrics, chart widgets, recent lists, and KPI sparklines respect the TopBar team scope (All / Unassigned / specific team) via client query filters and an updated `get_dashboard_trends` RPC.
- **Team details not-found crash (#1076)** — Missing teams render the existing "Team not found" card instead of crashing on an undefined `ArrowLeft` icon.

## [3.9.4] - 2026-06-22

### Added

- **Google Cross-Account Protection (RISC)** — New `google-risc-receiver` edge function validates Google Security Event Tokens and disconnects affected Google Workspace credentials on token/session revocation events.

### Changed

- **Incremental Google Workspace OAuth consent** — Initial Connect and onboarding request directory scopes only; export scopes (Drive, Docs, Sheets) are requested in context via Finish authorization or Grant Drive permissions.
- **Google Auth Platform branding** — Privacy Policy, Terms of Service, and developer contact verified in GCP console for OAuth app verification.

### Fixed

- **Google OAuth compliance (#1065)** — Addresses Project Checkup alerts for incremental authorization and Cross-Account Protection; legacy browser settings remain a console-side client configuration item pending Google re-scan.

## [3.9.3] - 2026-06-20

### Changed

- **Dependency refresh** — Consolidated June 2026 npm and GitHub Actions updates (React 19.2.7, Radix UI patches, TanStack Query 5.101, React Router 7.17, and CI workflow action pins) superseding Dependabot PRs #1046–#1064. Vitest held at **4.1.8** (Dependabot #1051 skipped) due to worker IPC stack overflow in 4.1.9 under forked CI shards. `@radix-ui/react-dialog` and `@radix-ui/react-alert-dialog` pinned to **1.1.15** (override) because 1.1.17 regresses jsdom focus under Radix Select/AlertDialog in unit tests.

## [3.9.2] - 2026-06-14

### Added

- **Dedicated organization Members page** — Member invites and Google Workspace import live at Organization → Members with a mobile-first action bar so Import and Invite stay on screen on phones.

### Changed

- **Organization admin layout** — Members, Settings, and Integrations are separate pages with a shared sub-navigation instead of tabs on a single settings screen.
- **Production release automation** — Production Release Readiness now runs `vercel promote` after migrations and schema drift pass, so equipqr.app updates without a manual Vercel dashboard promote.
- **Git and deploy workflow** — Development branches off `main` only; git branch **`preview`** kept as a Vercel domain anchor for optional **`preview.equipqr.app`**; default QA is each push’s **`*.vercel.app`** Preview URL.

### Fixed

- **Mobile organization settings** — Privacy toggles and save actions stack cleanly on narrow viewports instead of crowding controls off-screen.


## [3.9.1] - 2026-06-13

### Fixed

- **Preview Google Workspace and QuickBooks connect** — Connect and reconnect on preview.equipqr.app now return to Organization Integrations after OAuth instead of failing when the callback lands with query parameters.

### Changed

- **Preview environment** — Preview at preview.equipqr.app now shares the production data backend used by equipqr.app, so pull-request previews validate against real integration callbacks without maintaining a separate preview database.

## [3.9.0] - 2026-06-14

### Added

- **Getting Started onboarding wizard** — Organization owners and administrators who have not completed product onboarding are guided through creating their first team, adding equipment, and affixing a QR code before accessing the full dashboard.
- **Work order export menu** — Unified export dropdown on work order details with QuickBooks invoice export, Google Drive submenus (PDF, Docs, Sheets), and direct CSV/DOCX downloads on desktop and mobile.
- **Google Drive export folder management** — Organization administrators can create and delete the shared Google Drive export destination folder from Organization Integrations.
- **Mobile work order actions** — Inline assignee editing, a dedicated status sheet, and a mobile export section on work order details for field workflows.
- **Accessibility (WCAG 2.1 AA)** — Keyboard navigation helpers, screen-reader chart summaries, jsx-a11y structural fixes, and axe regression coverage across critical dashboard flows.

### Changed

- **Google Workspace disconnect** — Organization Integrations replaces the healthy-state Reconnect action with Disconnect (confirmation dialog) and contextual Grant permissions when scopes are incomplete; disconnect always clears OAuth credentials, the cached directory, and the workspace domain claim so onboarding can restart from scratch.
- **Work order assignment and status on mobile** — Improved inline assignment editing and status management on work order detail pages.

### Fixed

- **Product onboarding eligibility** — Established organizations that already have a team and equipment no longer get redirected to the Getting Started wizard.
- **Google Workspace OAuth scope storage** — Re-authorization merges incremental consent grants with stored scopes instead of overwriting them with a partial grant list.
- **Google Workspace connection health** — Permissions-needed state evaluates feature scopes only, so missing openid/email/profile no longer shows a false Permissions needed badge after a successful connect.
- **Google Workspace disconnect permissions** — Disconnect and manage-access actions are limited to organization owners and administrators.
- **QuickBooks customer search authentication** — Customer search surfaces clearer reconnect guidance when QuickBooks returns 401 or 403 authentication errors.
- **Work order PDF Save to Google Drive** — PDF exports save reliably to the organization Google Drive destination folder.

## [3.8.7] - 2026-06-13

### Fixed

- **Google Workspace OAuth reconnect after revoke** — Workspace connect now requests openid, email, and profile explicitly so the OAuth callback can load Google userinfo after a clean revoke at Google Account permissions (previously those scopes were inherited only via include_granted_scopes).
- **Google Workspace OAuth return handling on Integrations** — Connect and reconnect flows return to Organization Integrations with success and error toasts instead of silently failing when the callback redirects with query parameters.

### Added

- **Google Workspace access contract** — Claimed Workspace domains no longer auto-join on Google sign-in; administrators must import directory users or send standard invitations. Directory sync reconciles suspended/removed users and revokes only Workspace-derived access, and disconnect clears OAuth credentials and the directory cache while keeping the domain claimed.

## [3.8.6] - 2026-06-10

### Fixed

- **equipqr.info Help Center loads** — Returning visitors who still had the old EquipQR PWA service worker registered now receive a kill-switch worker that clears stranded caches and unregisters so equipqr.info serves the VitePress documentation site instead of the cached app shell.

## [3.8.5] - 2026-06-09

### Fixed

- **Help Center docs build** — Removed a broken internal link that blocked the equipqr.info VitePress deployment on Vercel.

## [3.8.4] - 2026-06-09

### Fixed

- **Equipment details mobile inline edit** — Edit buttons stay pinned to the card edge on narrow screens so controls remain reachable without overlapping field values; desktop hover-to-reveal editing is unchanged.

### Changed

- **Equipment details inline editing** — Shared edit-row and icon styling across basic info, identity, location, lifecycle, maintenance notes, custom attributes, and PM schedule fields for consistent layout on phones and tablets.

## [3.8.3] - 2026-06-08

### Added

- **PM interval policies** — Hierarchical preventive-maintenance schedules at equipment, team, and PM template levels, with inherit/custom/no-recurring controls, effective-policy readouts on equipment records, inline PM schedule editing, and team-level PM schedule configuration.
- **Voice dictation in field workflows** — Microphone input on note composers and other text fields so technicians can dictate instead of typing on mobile keyboards.
- **Equipment card grid and quick work orders** — Grid view cards show PM status readouts, last maintenance context, and a work-order menu for faster creation from the fleet list; QR code display is clearer on cards and detail surfaces.
- **Fleet Export Console** — Reports is reorganized into categorized export modules with live record counts, Google Workspace connection status, and an export protocol panel for owners and admins.
- **Inventory list desktop personalization** — Saved views (including built-in purchasing, low-stock, field technician, and accounting layouts), column manager, density toggle, quick-filter chips, stock-level bars, health summary, and bulk actions on the desktop table.

### Changed

- **Equipment PM panel** — Preventive Maintenance on equipment details links open PM work orders and shows progress toward the next due interval.
- **Work order creation entry points** — Equipment and QR quick-action menus use a consolidated dropdown with tooltips for common create paths.
- **Labor entry on notes** — New note entry no longer collects hours worked inline; labor belongs in work-order cost line items while legacy note data continues to display and export.

### Fixed

- **PM schedule inline edit** — Equipment PM schedule edits save reliably from the detail page readout.
- **Inventory desktop table** — Corrected table layout regressions and removed a broken list bulk-edit path that could confuse desktop users.
- **Local dev restart** — `dev-start.bat -Force` stops a running stack before restarting instead of failing with "already running".

## [3.8.2] - 2026-06-07

### Added

- **Playwright user regression coverage** — Expanded critical and full browser suites, run modes, coverage tracking, real-auth integration hooks, and demo action overlays so preview releases can be validated across desktop, mobile, auth, support, privacy, PM template, scan history, and work-order workflows.
- **Fallow codebase intelligence** — Repository scripts and configuration now cover static health, duplication, dead-code, PR risk analysis, and local verification cleanup helpers.

### Changed

- **Maintainability and verification tooling** — Decomposed large runtime components, route declarations, export builders, OAuth callbacks, demo recording helpers, and shared test fixtures while trimming unused packages and obsolete modules surfaced by Fallow.
- **Canonical URL and integration configuration** — OAuth callback URIs now derive from `VITE_SUPABASE_URL` / `SUPABASE_URL`, Edge redirects prefer `PUBLIC_SITE_URL` with legacy `PRODUCTION_URL` fallback, and deprecated QuickBooks/Google Workspace redirect-base environment variables were removed from sync scripts and docs.
- **QuickBooks integration posture** — QuickBooks behavior is scoped to production-connected environments, customer search avoids unsupported and non-queryable fields, and customer imports verify team linking.
- **Vite React plugin** — Switched from the SWC React plugin to the standard Vite React plugin to keep Vitest and production builds quiet under Vite 8/Rolldown.

### Removed

- Obsolete one-off PM seed/generator scripts, unused shadcn UI primitives with no import paths, duplicate work-order/organization/report components, and deprecated enhanced-organization hook layers superseded by current feature services.

### Fixed

- **Preventive maintenance query handling** — PM status lookups now return the first matching row and handle query errors gracefully.
- **Post-signup success view** — Auth no longer auto-redirects away from the check-your-email success screen before the user chooses return to sign-in.
- **Fleet map Google Maps key** — Session refresh and retry when the public maps key edge function returns unauthorized.
- **PM template and QuickBooks UI** — Stable selectors and test hooks for Playwright full-suite coverage.
- **E2E user regression** — Scoped the work order create-button locator to avoid ambiguous matches during creation flows.
- **E2E auth state stability** — Full-suite Playwright runs now always apply setup-generated owner storage state, and the logout lifecycle test restores shared owner auth so later direct dashboard routes stay signed in.
- **E2E creation and offline flows** — Equipment creation helpers now wait for the hydrated equipment search box before opening newly created records, and mobile offline note coverage now asserts the actual offline banner/footer feedback.
- **Verification noise cleanup** — The Vitest wrapper now starts Vitest without Node 24 `shell: true` deprecation warnings, and the PWA service-worker build uses an IIFE output to avoid Vite/Rolldown `inlineDynamicImports` warnings.

## [3.8.1] - 2026-06-01

### Changed

- **Dependency maintenance** — Routine updates to application, development, and CI dependencies (including TanStack Query, Supabase client, Vitest, ESLint, Lucide, date-fns, and GitHub Actions workflow pins) with no intended user-facing behavior changes.
- **React Fast Refresh compliance** — Internal module splits for page back navigation, equipment table columns, and checklist template editor utilities to resolve Fast Refresh lint warnings; no customer-visible workflow changes.

## [3.8.0] - 2026-06-01

### Added

- **Equipment Scan History timeline** — Equipment records now have a single "Scan History" tab that replaces the separate "Scans" and "History" tabs. It shows each QR scan — who scanned, when, and where — alongside the follow-up actions taken in that scan session: work orders created, working hours updated, notes and images added, and opening the full dashboard record. Legacy deep links to the old Scans and History tabs continue to work.
- **Organization Google Drive export destination** — Organization admins can browse Google Drive with a server-backed folder picker and choose one shared folder for work-order PDF, Google Docs, and Google Sheets exports so exports land in a consistent place instead of scattered personal drives.

### Changed

- **Google Workspace connection status** — Shows the connected admin email so organizations can see which account authorized Workspace and Drive access.
- **Google Workspace member import** — Directory sync now requires member email addresses from the synced Workspace directory, reducing incomplete or ambiguous imports.

### Fixed

- **Team invitation emails** — New invitations wait for the email send to finish before showing success, refresh the invite list when delivery fails so admins can resend, and surface Resend API errors instead of silently succeeding.

## [3.6.4] - 2026-05-24

### Changed

- **Internal ITIL workflow guidance** — Simplified agent-facing incident, problem, service request, change record, and issue resolver guidance so routine EquipQR work can move through lightweight triage and focused implementation without unnecessary process ceremony.

### Fixed

- **Signup database repair** — New account creation no longer fails when checking Google OAuth verification; the Supabase helper now reads provider identities from the supported auth identity table and keeps execution limited to authenticated and service-role callers.
- **Post-signup confirmation UX** — After signup succeeds, users now see a dedicated check-your-email page with the submitted email address, email-provider inbox shortcut when available, a return-to-sign-in action, and a longer success toast so the verification step is clear.

## [3.6.3] - 2026-05-24

### Fixed

- **Sign-up password breach check** ([#989](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/989), [#991](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/991)) — Content Security Policy now allows the Have I Been Pwned k-anonymity range API so sign-up can detect compromised passwords instead of failing silently behind CSP.

## [3.6.2] - 2026-05-23

### Added

- **Marketing mobile demo videos** ([#987](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/987)) — PM Templates and QuickBooks feature pages now show autoplaying, looping mobile screen demos above existing screenshots, served from Supabase storage as compact MP4/WebM with poster fallbacks, native controls, and `prefers-reduced-motion` respect.

### Changed

- **Content Security Policy** — Added `media-src` allowances for Supabase-hosted landing demo videos in production and local dev CSP headers.

## [3.6.1] - 2026-05-21

### Fixed

- **SPA route hard reload** ([#982](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/982)) — Hard reloads and deep links to authenticated app routes such as `/dashboard` and `/auth` no longer return Vercel's platform 404; routing fallback restored to the empty app shell after the v3.6.0 marketing prerender split.

- **equipqr-docs CI on preview PRs** — Scope `equipqr-docs` Vercel builds to `main` via `docs/vercel.json` `ignoreCommand`; add `docs/postcss.config.js` so production docs builds resolve Tailwind PostCSS under `docs/`; filter `deployment-status` workflow to ignore `equipqr-docs` deployment events.

### Changed

- Updated `.vscode/extensions.json` with improved extension recommendations.

### Removed

- Bridgemind tooling removed from the project.

## [3.6.0] - 2026-05-17

### Added

- **QuickBooks invoice payment visibility** ([#915](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/915)) — Work Orders now retain mirrored QuickBooks invoice identifiers, lifecycle status, sent/paid timestamps, balance, and due date so managers can see awaiting-payment, overdue, and paid work without leaving EquipQR. The Work Orders list and details surfaces show invoice status badges and add invoice filters for Paid, Unpaid, Overdue, and Not Exported states.

### Changed

- **QuickBooks invoice reliability** ([#600](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/600), [#624](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/624)) — Invoice exports now align with the CJ invoice template using QBO custom fields, customer-facing memo timelines, summarized Labor/Parts lines, fresh QBO tax-status confirmation with cache fallback controls, and safer export/update handling that preserves successful invoice creation even when mirror updates need attention.

- **Public marketing prerender HTML** ([#971](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/971)) — Build-time static HTML for each sitemap-listed marketing URL now returns route-specific headings, descriptive copy, and crawlable navigation inside `#root` for non-JS crawlers, with marketing routes shared by sitemap and prerender generation.

- **Public marketing SEO & accessibility** ([#934](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/934)) — Marketing pages now ship static JSON-LD, a noscript shell, centralized feature SEO copy, breadcrumbs, visible FAQs, matching FAQ/HowTo/BreadcrumbList structured data, SPA route announcements, and route-heading focus handling.

### Fixed

- **Cursor Cloud Agent environment bootstrap failures** — `.nvmrc` now matches the Node 24 runtime required by `package.json`; `scripts/cloud-agent-frontend-setup.sh` loads or installs Node 24 through `nvm` before `npm ci`; Linux `scripts/agent-bootstrap.sh` reads the populated `gcp-read/SERVICE_ACCOUNT_JSON` field before legacy credential fields and validates service-account JSON before writing the gcloud MCP key.

## [3.5.3] - 2026-05-17

### Fixed

- **QuickBooks invoice export** — Summarized **Parts** line includes every non-labor work-order cost (manual and inventory-backed rows; previously separate truck/fee-style amounts roll into Parts). Only cost items matching **Labor** / **Labor - …** (no inventory link) count as labor; customer-facing invoices are Labor and Parts lines only. Private memo still lists the full itemized breakdown.

## [3.5.2] - 2026-05-16

### Changed

- **QuickBooks invoice export** ([#913](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/913)) — Draft invoices use summarized Labor and non-inventory Parts lines, PM-aware customer-facing line descriptions, and optional Edge secrets for item names and income accounts; `QBO_INVOICE_PARTS_ITEM_PREFIX` is deprecated for invoice behavior. Private memo still includes the full itemized cost breakdown.

### Fixed

- **Local test runner** — `useSession` missing-provider coverage uses `renderHook` so React 18 does not leave the Vitest process wedged; raise the default `scripts/test-runner.mjs` hard wall-clock timeout (`8m` standard runs, `10m` with coverage cap) so full `npm test` can finish on Windows after lint/typecheck without false `⏰ Test runner timeout` exits.

## [3.5.1] - 2026-05-16

### Added

- **QuickBooks customer contact sync** ([#914](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/914), [#960](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/960)) — QuickBooks customer imports and refreshes now capture email, phone, mobile, and fax contacts, show their QuickBooks provenance, and surface tap-to-call / tap-to-email actions on linked work orders without adding write-back to QuickBooks.
- **Public documentation site bootstrap (VitePress)** ([#908](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/908), [#956](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/956)) — `docs/` builds as a standalone static site (VitePress) for deployment to `equipqr.info`; runbook updates in deployment and CI/CD docs; app footer links to published docs.
- **PR feedback PowerShell helpers** — `scripts/pr-feedback/` drivers for PR context preflight, GraphQL review threads/reviews, local verification gates, deferred-issue + thread-reply + summary publishing, and `gh pr checks`, with `scripts/pr-feedback/tests/Run-PrFeedbackSmoke.ps1` and skill doc references via `scripts/pr-feedback/README.md`.

### Changed

- **Public docs security** ([#956](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/956)) — Exclude `docs/ops/**` from the equipqr.info VitePress build; remove Operations from public nav; README ops links use GitHub `blob/main`; tighten `Content-Security-Policy` `script-src` to `'self'` only (no `unsafe-inline` / `unsafe-eval`); add public vs internal authoring guidance; fix PM/RCA README links for GitHub.

### Fixed

- **Mobile work order details UX** ([#829](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/829), [#958](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/958)) — Sticky footer owns primary actions with PM checklist completion gating; hides duplicate Next action when the footer is visible; trims duplicate compact-summary rows from mobile details; mobile admin delete requires typing DELETE.
- **Mobile work order cost editor** ([#903](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/903), [#957](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/957)) — Touch-friendly stacked actions for labor, inventory, and manual lines; duplicate Cost Items chrome suppressed on small screens; inline validation deferred until Save or row edits; overflow clamps on notes/timeline/image carousel regions.

## [3.5.0] - 2026-05-15

### Added

- **QR PM template picker for untemplated equipment** ([#916](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/916), [#941](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/941)) — QR work-order creation now surfaces a template chooser when scanned equipment has no default PM template, preserving the fast QR flow while preventing empty-template submissions.

### Changed

- **Dependabot update cadence** — GitHub dependency update runs are reduced to monthly to lower churn and keep supply-chain updates bundled into deliberate review windows.
- **ITIL workflow guidance for issue-tied implementation** — Internal skill/rule docs now require triage before Change Records and enforce PR-based delivery for issue-tracked implementation flows.

### Fixed

- **QR organization context handoff** — QR redirect and downstream flows keep organization switching synchronized across providers/contexts so QR users land in the expected org-scoped state.
- **Desktop sidebar layout regression** — Restored sidebar content offset behavior to prevent visual overlap/misalignment in desktop dashboard navigation.
- **QR PM template submit hardening** ([#941](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/941)) — Added validation and label-association guardrails to improve template selection reliability in QR PM work-order creation.

## [3.4.0] - 2026-05-14

### Added

- **Preview Edge secret sync (CI)** ([#906](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/906)) — `scripts/sync-supabase-secrets-from-1password.ps1` reads `ProjectRef` from each edge 1Password item, uses `supabase-write` / `SUPABASE_ACCESS_TOKEN`, validates placeholders and TOKEN_ENCRYPTION_KEY / KDF_SALT strength, compares SHA-256 digests in `-Check` mode (JSON list output trimmed for CLI banners), and applies via `supabase secrets set --env-file`. Non-prod **Secrets Fan-Out** Supabase job calls this script for `edge-env-preview-secrets`; auth probe loads the Supabase PAT from 1Password. Drift preflight helper simplified to `scope` + op item args. The `supabase-write` PAT is stored in 1Password as field `SUPABASE_ACCESS_TOKEN` (replacing legacy `credential`); `schema-drift-check` uses the same op:// reference. **Secrets Fan-Out (Non-Prod)** runs digest-only (`-Check`) on `push` to `preview` when this workflow or the sync script changes; the 6-hour UTC `schedule` applies preview Edge secrets (GitHub evaluates scheduled workflows from `main`, so the cron runs after this file exists on the default branch). Manual `workflow_dispatch` unchanged; production remains drift-check only until a future apply workflow.

- **QR scan feedback** ([#839](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/839)) — Live camera scans on `/dashboard/scan` prepare Web Audio on the Start camera gesture, set a short-lived session marker on successful decode, and play a synthesized ping plus vibration when `/qr/*` redirect access resolution completes. Upload-based decodes and direct QR opens stay silent. Development builds only: `/debug-scan-feedback` to audition the tone.

### Changed

- **Node.js 24 LTS runtime matrix** ([#931](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/931)) — `engines.node` is `24.x` (aligned with `@types/node` 24.x). GitHub Actions default to Node **24.x**; setup and CI docs describe the same supported line.

- **PageSEO / document metadata** — Removed the `react-helmet-async` dependency; `PageSEO` now updates `document.title` and head tags via a small scoped effect (tags marked `data-equipqr-page-seo` for cleanup). `HelmetProvider` was dropped from app and test providers.
- **GitHub Actions supply-chain hardening** ([#871](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/871)) — Third-party workflow actions and the shared 1Password composite action are pinned to full commit SHAs; the stale repository snapshot artifact workflow and Repomix configuration were removed.
- **Frontend platform dependency sweep** — Tailwind CSS now runs through `@tailwindcss/postcss` v4 with the new import/config entrypoint; `react-resizable-panels` v4 keeps the shadcn wrapper API stable; `react-window` v2 migrations update the virtualized audit and generic list paths; hCaptcha, Vitest, jsdom, Workbox, React Query, React Hook Form, lucide-react, and related build/test packages are refreshed.
- **Agent docs: local Windows 1Password** — Documented optional User-scope `OP_SERVICE_ACCOUNT_TOKEN` for read-only `op` access; aligned vault item names (`vercel-write`, `gcp-read`, `github-read` in doctor), `render-mcp-config.ps1` GCP JSON resolution, and workflow README `op://` examples with current `app-env-*-public` field labels.

### Fixed

- **QR redirect provider coverage** — Public `/qr/*` routes now include `SessionProvider` in the QR-specific provider chain, preserving organization-switch redirects while keeping the lightweight QR entry path; QR redirect completion consumes the scan-feedback marker only after access resolution succeeds.
- **CodeQL release gate reliability** ([#873](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/873)) — CI grants the Security Scan job `actions: read` so CodeQL can read workflow-run metadata instead of failing with `Resource not accessible by integration`.

- **Resizable panels shadcn wrapper** — `ResizablePanelGroup` and `ResizableHandle` wrap `react-resizable-panels` v4 `Group` and `Separator` (with `ResizablePanel` aliasing `Panel`), preserving the shadcn-style `direction` prop and ref forwarding via `Separator`'s `elementRef`. Audit log explorer layout persistence uses `useDefaultLayout` + stable panel `id`s (v4 replaces v2 `autoSaveId` on the group).

## [3.3.2] - 2026-05-10

### Fixed

- **Equipment QR scan hero image** — `/qr/equipment/:id` now resolves `equipment.image_url` the same way as dashboard equipment views (signed URLs for private `work-order-images` / `equipment-note-images` paths). Hero image uses `onError` fallback to the forklift placeholder when a signed URL fails.

## [3.3.1] - 2026-05-10

### Added

- **In-app QR scanner and PM summary on equipment QR landing** — Protected `/dashboard/scan` route (lazy `qr-scanner` chunk) decodes EquipQR equipment, inventory, and work-order links into existing `/qr/*` flows; mobile dashboard hero and bottom nav open the scanner. Equipment QR landing shows a non-blocking last completed PM card with checklist sections and a deep link to `/dashboard/work-orders/:id?action=pm`; work order details scrolls to the PM checklist and clears only the `action` query param.

- **Work order creation photos & primary image** ([#726](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/726)) — QR scan dialog and authenticated create/request forms accept up to five evidence photos (same MIME/size rules as notes). First uploaded image sets work_orders.primary_image_id and appears first with a Primary badge in the work order images carousel. Offline create with photos is blocked with the same messaging as inline notes.

### Changed

- **Mobile dashboard context** ([#836](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/836)) — Mobile `/dashboard` prioritizes Scan QR (in-app `/dashboard/scan` entry), non-truncating urgent alert card, open-work preview rows, and widget order skewed to actionable queues; bottom nav adds Scan QR; dashboard FAB hides on the dashboard home to avoid clashing with nav; stats cards drop vague insufficient-history trend notes; equipment status and PM widgets use compact mobile summaries (desktop donuts unchanged).

- **Mobile work order details UX** ([#829](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/829)) — Task-oriented technician layout on phones: compact job summary (status/due/overdue, equipment link, team, assignee); sticky footer for primary workflows (start/hold/resume/checklist gates/complete); PM checklist CTA; unified overflow (**Details**, **Exports**, **QuickBooks**, **Admin** with gated delete); mobile info sidebar hides status-change action buttons.

## [3.3.0] - 2026-05-09

### Added

- **Schema-drift CI gate** ([#735](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/735)) - New `.github/workflows/schema-drift-check.yml` + `.github/scripts/check-schema-drift.js` compare `supabase/migrations/*.sql` against the production `supabase_migrations.schema_migrations` table and fail any `preview -> main` PR whose local migrations include a NAME not yet on production. PRs targeting `preview` and pushes to `preview` warn instead of failing (drift is expected day-to-day; the gate only blocks the release boundary). Matching is by name not version so the documented timestamp-drift duplicates (e.g. `apply_pending_admin_grants_quiet_mismatch`, `remote_schema`) don't false-positive. Workflow mirrors `edge-functions-smoke-test.yml` for token loading and degrades gracefully when `OP_SERVICE_ACCOUNT_TOKEN` is absent (fork PRs / pre-token-plant). Closes the bug class behind #735.

- **Compliance hardening (storage, signup, privacy)** — Private Supabase buckets (`work-order-images`, `equipment-note-images`, `team-images`, `user-avatars`, `inventory-item-images`) with tightened `storage.objects` SELECT policies and short-lived **signed URLs** (default 900s TTL) for authorized reads; `organization-logos` remains public via `getPublicUrl`. Upload flows persist canonical object paths; `imageUploadService` resolves legacy public URLs for signing/deletion. SQL backfill converts matching legacy public URLs to canonical paths. New `terms_acceptances` table (RLS: users read own rows) and `record-terms-acceptance` edge function record IP, user-agent, and policy version hashes. Signup adds notice-at-collection copy, required terms/privacy checkbox, visible password policy with strength meter, and HIBP k-anonymity breach check before sign-up. Public `/do-not-sell-or-share` page and footer links; privacy policy `#notice-at-collection` anchor. Dependabot weekly updates for npm and GitHub Actions.

### Fixed

- **Production note creation restored** ([#735](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/735)) - Applied 27 pending Supabase migrations to the production project (`20260416120000_add_machine_hours_to_notes.sql` through `20260507120000_harden_queue_worker_and_stripe_mv_cron_functions.sql`, excluding the documented timestamp-drift duplicate `20260418120000_apply_pending_admin_grants_quiet_mismatch.sql`) to resolve a 21-day backlog between local and production `schema_migrations`. Production note creation was returning HTTP 400 since the PR #729 deployment promotion at `2026-05-08T04:00:17Z` because `work_order_notes.machine_hours` did not exist on production but the deployed client unconditionally sent `machine_hours: 0` for the form's default state. Tightens the inclusion guard in `workOrderNotesService.ts:80` and `equipmentNotesService.ts:124` from `machineHours !== undefined` to `Number.isFinite(Number(machineHours)) && Number(machineHours) > 0` so zero machine-hours are never sent on the wire — defense-in-depth that would have prevented the symptom even with the schema drift. Resolves #735.

- **PR #729 release feedback** — Production-visible `logger.error` when work-order delete cannot derive storage paths for image cleanup; orphaned work-order note images removed from storage when the DB insert fails after upload (parity with equipment notes); signup stores terms acceptance intent in Supabase `user_metadata` with a first-session flush that checks `terms_acceptances` before calling `record-terms-acceptance` (cross-device email verification); HIBP range fetch uses a 5s `AbortController` timeout so signup cannot hang indefinitely.

- **PR #729 image-upload cleanup-pattern sweep** — Standardizes the failure-rollback shape across all image upload paths to the canonical `equipmentNotesService.createEquipmentNoteWithImages` pattern (DB delete must succeed before storage delete; otherwise log and skip storage to preserve the "DB row points at existing storage" invariant). `WorkOrderService.uploadImage` gains storage cleanup on DB-insert failure and replaces the parallel `Promise.allSettled` rollback with sequential DB-first-then-storage; `equipmentNotesService.uploadEquipmentNoteImage` gains the same DB-insert-failure cleanup and DB-fail-stops-storage-delete guard; `inventoryService.uploadInventoryItemImage`'s multi-file rollback flips storage-then-DB to DB-then-storage. Audit confirms `workOrderService.createNoteWithImages`, `workOrderNotesService.createWorkOrderNoteWithImages`, `teamService.uploadTeamImage`, `profileService.uploadAvatar`, and `organizationService.uploadOrganizationLogo` already match the canonical shape.

- **Stripe FDW pilot migration failed when Vault secret present** — `stripe.subscriptions` from Supabase Wrappers has no top-level `status` column (status lives in `attrs` JSON). `20260503160000_add_stripe_fdw_pilot.sql` now selects and filters on `attrs->>'status'` so `org_active_stripe_subscriptions` creates cleanly on preview/production.

- **Equipment list page returned HTTP 400 for every load** ([#724](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/724)) — `EquipmentService.getFilteredList` selected a `qr_code` column that does not exist in `public.equipment` (no migration ever creates it; the column is not in `Database['public']['Tables']['equipment']['Row']`). PostgREST returned HTTP 400 with `code 42703 — undefined_column` on every `/dashboard/equipment` page load, so the page rendered the empty-state card for every signed-in user in every organization with equipment. Fix removes `qr_code` from the explicit select column list at `EquipmentService.ts:360`. New regression test asserts the select string never reintroduces a `qr_code` reference. Resolves #724.

## [3.2.0] - 2026-05-02

### Added

- **Bulk inventory edit grid** ([#628](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/628)) — Desktop-only `/dashboard/inventory/bulk` route with a TanStack Table-driven inline-edit grid for rapid in-place inventory management. Single-click selects rows; double-click mounts the cell editor; editing a multi-row selection prompts a **Bulk Apply** confirm dialog (Apply to All Selected / Apply to This Row Only). Quantity adjustments route through the existing `adjust_inventory_quantity` RPC so audit history, low-stock threshold checks, and RLS boundaries are fully preserved. The footer `BulkCommitToolbar` fires `Promise.allSettled` batch commits with per-row Zod validation and `sonner` toasts surfacing success, partial-failure, and full-failure outcomes. The Inventory list page's header gains a Bulk Edit split-action mirroring the Equipment bulk entry point. `react-window` virtualization activates above 100 rows. Adds 42 targeted tests across the bulk grid component, `useBulkEditInventory` hook, bulk inventory page, and inventory list page. Resolves #628.

- **Support & Documentation library overhaul** — Replaces the five hard-coded JSX tabs (Guide, Guides, FAQ, Roles, Tips) with a scalable, persona- and workflow-oriented support library at `/dashboard/support` and `/support`. 40 articles across 8 categories: Start Here, Technician Field Work, Work Orders, Equipment & QR Codes, Inventory & Parts, Teams & Roles, Admin & Integrations, and Privacy & Support. Each article has numbered steps, inline notes, screenshot placeholders with graceful fallback, related-article cross-links, a persona badge (Technician / Requestor / Manager / Admin / Owner), and a `lastReviewed` date. A role filter and full-text search surface the right articles for each user type. Dashboard-only articles (bug reporting, ticket tracking) are gated so the public `/support` page never exposes authenticated controls. Stale copy removed: billing/plan references (billing was removed in Jan 2025), `Premium Service` labeling on the Requestor role, and unverified marketing copy. `docs/guides/workflows.md` refactored to a technical reference; `docs/README.md` updated to point end users to the in-app library; `docs/guides/permissions.md` billing row removed. New screenshot capture conventions documented in `public/docs/support/README.md`.

- **Guided alternate-group creation workflow** — Part alternates now support a dedicated create wizard from the inventory and alternates surfaces, with service-layer creation helpers and tests covering entry points from the item detail, inventory list, alternate group list, and mobile inventory card.

### Changed

- **Repository line-ending normalization** — Adds `.gitattributes` so source, docs, SQL, and Linux shell scripts normalize to LF while Windows shell scripts stay CRLF, reducing phantom diffs and making agent-authored scripts safer to validate before CI.

### Fixed

- **Support library category navigation buttons overflowing their container** — `TabsList` base class imposes `h-10` (40 px); the eight icon/label/count tabs rendered taller and content below started behind the overflowing buttons. Fixed by replacing the inline `gridTemplateColumns` style with `!h-auto items-stretch grid-cols-4 xl:grid-cols-8` and giving each `TabsTrigger` a `min-h-[3.5rem]`; all eight categories fit in one row at desktop width and wrap cleanly into two rows of four on mobile.

- **Equipment list pagination jumping back to page 1** — `useEquipmentFiltering` now treats no-op `updateFilter` calls as inert and keeps `updateFilter` / `updateSort` callbacks stable, so the Equipment page’s team-scope mirror effect no longer resets the current page when paginating. Regression covered in `useEquipmentFiltering` tests.

- **Offline query persistence stalled organization loading** — The app no longer enables a global query persister by default, preventing cached organization state from blocking normal organization resolution while preserving the explicit offline-aware service paths.

## [3.1.1] - 2026-05-01

### Changed

- **Equipment creation permissions aligned across React, validation, docs, and Supabase RLS** ([#650](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/650)) — Resolves the four-source-of-truth drift on "who can create equipment" surfaced by the bulk-edit grid review on [#627](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/627). The new matrix grants org owners and admins create rights org-wide and team managers and technicians create rights only for teams where they hold that role; members without a team role and `requestor` / `viewer` team roles remain denied. `src/services/permissions/PermissionEngine.ts` adds a new `equipment.create` permission with two rules — `equipment-create-admin` (owner/admin org-wide) and `equipment-create-team-role` (manager or technician on the assigned team). `src/hooks/useUnifiedPermissions.ts` routes `equipment.canCreateForTeam(teamId)` and `equipment.getPermissions(teamId).canCreate` through the new permission and adds an `equipment.canCreateForAnyTeam` helper. `src/hooks/usePermissions.ts` adds team-aware siblings `canCreateEquipmentForTeam(teamId)` and `canCreateEquipmentForAnyTeam()` while preserving the existing org-wide `canCreateEquipment()` gate so inventory pages that intentionally check org-wide create rights are not silently broadened. `src/features/equipment/pages/Equipment.tsx`'s "Add Equipment" / "Bulk Edit" split-action now appears for users who can create org-wide OR for at least one team they belong to; `src/features/equipment/pages/BulkEquipment.tsx` uses the same gate and updates its denial copy. `src/features/equipment/components/form/TeamSelectionSection.tsx` now lists every team for owners/admins and only the user's create-capable teams for managers/technicians, with copy updated from "team you manage" to "team where you are a manager or technician". `src/features/equipment/types/equipment.ts`'s `createEquipmentValidationSchema` accepts `manager` and `technician` memberships for the selected `team_id` and updates the validation error message accordingly. New Supabase migration `20260501040800_tighten_equipment_create_rls.sql` drops the `equipment_member_access` (FOR ALL) policy from the consolidation migration and replaces it with split SELECT/UPDATE/DELETE policies preserving current member view/modify behavior, plus a new `team_members_create_equipment` `FOR INSERT WITH CHECK` policy mirroring the React rule (admin org-wide OR org member with a non-null `team_id` matching a `team_members` row where the user holds `manager` or `technician`). Two follow-up security migrations are also part of this release: `20260502000000_fix_equipment_delete_rls.sql` replaces the broad member DELETE policy with a team-manager-scoped `equipment_team_manager_delete` policy (operators promoting 3.1.1 must include all three migrations); `20260502000100_fix_equipment_manager_delete_team_scope.sql` corrects the `tm.team_id = team_id` tautological self-comparison in the EXISTS subquery (flagged by Cursor Bugbot) to `tm.team_id = "equipment"."team_id"` so DELETE is scoped to the equipment row's own assigned team rather than any team the user manages. Defense-in-depth: a non-admin user that bypasses the React UI and posts an `equipment` row to the Data API for a team they do not belong to is now rejected by Postgres; a team manager can only delete equipment on their own team, not across teams. Test coverage updated across `src/services/permissions/__tests__/PermissionEngine.test.ts`, `src/hooks/__tests__/useUnifiedPermissions.test.tsx`, `src/hooks/usePermissions.test.tsx`, `src/features/equipment/types/equipment.test.ts`, and `src/features/equipment/components/__tests__/TeamSelectionSection.test.tsx`. `docs/guides/permissions.md` matrix updated to reflect manager + technician create rights with the per-team scoping footnote. Resolves #650.

- **Public marketing refresh** — `FeaturesSection` restructured from 11 flat cards into three buyer-oriented product pillars (Field Operations, Back Office, Control & Trust) with nested feature links for a coherent homepage story without losing discoverability; "Get Started Free" CTA and friction reducer ("No credit card. First scan in 20 minutes.") added directly below the hero animation. `FleetVisualization` feature page copy corrected: "Real-Time Tracking" → "Last Confirmed Location", "Route Optimization" → "Location-Aware Planning", GPS-tracking language removed to accurately reflect EquipQR's hardware-free, scan-based model. `TeamCollaboration` page adds a complete two-tier roles/permissions matrix (Org: Owner / Admin / Member; Team: Manager / Technician / Requestor / Viewer). `RepairShops` solution page gains a 3-A Equipment testimonial, proof metrics strip, and QuickBooks workflow card plus a hero friction reducer. 16 fresh authenticated product screenshots uploaded to `landing-page-images` Supabase Storage and wired across `QRCodeIntegration`, `InventoryManagement`, `WorkOrderManagement`, `TeamCollaboration`, `CustomerCRM`, `PMTemplates`, `GoogleWorkspace`, `MobileFirstDesign`, `QuickBooks`, `FleetVisualization`, and `PartLookupAlternates`; first screenshot sections added to `QuickBooks`, `FleetVisualization`, and `PartLookupAlternates` (previously screenless).

### Fixed

- **Slow 4G P0/P1 performance bottlenecks** ([#708](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/708)) — `Dashboard` prefetches Equipment, Work Orders, and Inventory List chunks 1.5 s after mount so SPA navigation is instant on constrained links; lazy-route `<Suspense>` fallbacks replaced with `PageSkeleton` shimmer cards for perceived-progress feedback during chunk hydration; `SimpleOrganizationProvider` short-circuits a duplicate `organization_members` fetch when `SessionProvider` has already resolved org data (saves 2 Supabase round-trips per dashboard mount); `teamBasedWorkOrderService.getTeamBasedWorkOrders` skips `getAccessibleEquipmentIds` + `IN()` filter for org-admin sessions (eliminates 3 KB URL bloat and a redundant equipment table scan); `useWorkOrders` default stale time raised 30 s → 2 min and extended stale time 1 min → 5 min to prevent refetch on every SPA hop.

- **Requestor team role missing from `TeamCollaboration` marketing roles matrix** — Role now listed in canonical order (Manager / Technician / Requestor / Viewer) on the public feature page.

- **Duplicate QR scan log written on dashboard open** — `useEquipment` hook no longer fires a scan-log write when the QR page loads from the dashboard context.

- **Post-create work order CTA triggered a full page reload** — Button now uses React Router `<Link>` for SPA navigation to the new work order.

- **`GOOGLE_WORKSPACE_CLIENT_ID` unavailable as `VITE_` in cloud agent bootstrap** — `scripts/cloud-agent-frontend-setup.sh` now mirrors the server-side key to the `VITE_GOOGLE_WORKSPACE_CLIENT_ID` build-time variable.

- **Local Supabase startup on Windows broken by storage-api migration drift** — Pinned Supabase CLI bumped from 2.93.0 to 2.98.0 (selects `storage-api:v1.54.1`, which boots cleanly against fresh volumes); `dev-start.ps1` now passes `-x logflare -x vector` to `supabase start` to prevent the analytics `vector` container from restart-looping when Docker's unauthenticated TCP socket is not exposed; stale tracked `supabase/.temp/storage-version` file removed.

- **CodeQL "useless comparison" finding in QR scan flow** — `EquipmentQRScan` guard logic corrected to eliminate the redundant comparison that triggered the code-quality alert.

- **Migration validator CI failed to detect `DROP COLUMN` guarded by a safety comment on the preceding line** — `validate-migrations.js` now scans the line immediately before a `DROP COLUMN` statement so the safety-comment pattern is recognized when it does not share the same line.

- **QR scan experience regressions from PR #706 review** — QR provider routing corrected; `<Toaster />` added to the QR-specific `AppProviders` chain so toast notifications fire on the scan page; additional UX polish from multi-round review feedback applied.

## [3.1.0] - 2026-04-29

### Added

- **Permission-aware quick actions on equipment QR scan pages** ([#695](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/695)) — `/qr/equipment/:equipmentId` now renders the scanned equipment card first, then mounts a lean quick-action island for New PM Work Order, Create Generic Work Order, Update Hours, and Add Note / Upload Image. Each action performs a narrow click-time permission check and shows inline denial copy on the QR page instead of navigating away; action dialogs lazy-load only after selection and reuse existing work-order, PM, working-hours, and equipment-note service paths so audit/history, storage quota checks, and RLS remain authoritative.

## [3.0.1] - 2026-04-23

### Fixed

- **Public landing page rendered black screen for 13–60+s when auth refresh failed** ([#671](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/671)) — `SmartLanding`'s `if (isLoading) return null;` block was gating the public marketing page on `AuthProvider.isLoading`. When `supabase-js`'s GoTrueClient retried a stale `/auth/v1/token` refresh — failing with `TypeError: Failed to fetch` up to 14 times over an exponential-backoff sequence — the viewport was completely black until the retry budget exhausted (~13s on desktop, 60+s on mobile). The fix renders the v3 hero unconditionally for all cases except the confirmed `!isLoading && user` branch (where the redirect to `/dashboard` fires via the existing `useEffect`). Adds Vitest regression tests pinning the new contract.

## [3.0.0] - 2026-04-23

### Added

- **Animated landing-page hero — QR scan → US-state morph → PM checklist + export** ([#660](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/660)) - Replaces the static three-slide screenshot carousel and dense H1/subhead/dual-CTA hero on `/` with a self-running, hypnotically looping GSAP animation that communicates the entire EquipQR product story without the visitor reading a feature bullet. The cycle: (1) the brand QR-mark icon (extracted into a reusable `EquipQRIcon` and `public/eqr-logo/icon.svg`) gets scanned by a glowing primary-colored scanline, (2) flattens via `scaleX → 0` to a single vertical line, (3) MorphSVG morphs the line into a randomly chosen U.S. state outline, (4) ~14 asset dots scatter across the state (positions guaranteed inside the polygon via ray-casting rejection sampling so the chosen dot is always visible), (5) the map slides 50% to one side based on the chosen dot's position and a dashed connector line extends from the dot to a work-order panel, (6) the panel expands to show a real PM checklist sourced verbatim from `src/features/pm-templates/services/preventativeMaintenanceService.ts` (Visual Inspection: Oil/Coolant Leaks, Tire & Wheel Condition, Seat & Seat Belt Condition; Engine Compartment: Air Filter, Engine Oil & Filter), (7) items check off sequentially with the export button always visible but dimmed until the last check enables it, randomly displaying "Export to QuickBooks", "Export to Google Drive", or "Export to Excel" (deterministic per state via `cycleSeed`), and (8) the panel fades out before the cycle restarts with a different state. **Every 3rd cycle replaces the single-state morph with a national-map view**: the line expands via CSS `scaleX` to reveal a full continental US silhouette sourced from `public/us.svg` (Simplemaps, free for commercial use), all 50 state borders stagger fade-in over 1.5 s, ~30 dots scatter inside the US territory (clipped to the union of all state paths so none appear in the ocean), and a single themed feature-card set rotates A → B → C across consecutive national cycles - Set A "In the field" (Mobile-first, Scan to record, Offline-capable), Set B "Back office" (QuickBooks sync, PM templates, Multi-org & teams), Set C "Equipment lifecycle" (Asset history, Fleet map, Built for shops). The 50-state per-state path data ships in a generated `src/components/landing/stateVectors.ts` produced by `scripts/generate-state-vectors.mjs` (new npm script `generate:state-vectors`) which sources `STATE_VECTORS` (per-state normalized via d3-geo from `us-atlas` `states-albers-10m.json`) and `STATES_RELATIVE` (raw paths from `public/us.svg` for the national view). Reduced-motion users get a static composite (Texas outline + dots) with zero GSAP bundle cost via dynamic `import()` guards on all animated phase components. New deps: `gsap` (3.15, free under the post-Webflow Standard "No-Charge" License since April 30, 2025 - $0 commercial use), `@gsap/react`, `qrcode` (already present), plus dev-only `d3-geo`, `topojson-client`, `topojson-simplify`, `us-atlas`. Bundle impact: Landing chunk is 90.98 kB gzipped (lazy-loaded under `SmartLanding`); main `dist/assets/index-*.js` chunk holds at 59.26 kB brotlied, well under the 200 kB `size-limit` cap. New components: `HeroAnimation`, `QRScanPhase`, `StateMorphPhase`, `AssetDotsPhase`, `NationalMapPhase`, `PMChecklistPhase` plus shared `dotPositions.ts`, `pmChecklistData.ts`, `featureCardsData.ts`, and a new `usePrefersReducedMotion` hook (refactored from the inline pattern in `LandingReveal.tsx`). The `Logo.tsx` component is rewritten to inline-render `EquipQRIcon` instead of fetching PNG variants. Replaced files: `HeroSection.tsx` (deleted along with its embla carousel `useState` + `setApi` plumbing), `HeroSection.carousel-sync.regression.test.tsx` (deleted - asserts behavior that no longer exists). Updated: `Landing.tsx` (mounts `HeroAnimation` instead of `HeroSection`), `LandingMobileUX.test.tsx` (replaced carousel + secondary-CTA assertions with three new assertions: section aria-label, H1 tagline rendered, reduced-motion fallback shows the static composite). Test coverage: 35 tests across `HeroAnimation.test.tsx` (17), `PMChecklistPhase.test.tsx` (9), `LandingMobileUX.test.tsx` (9) covering reduced-motion behavior, slide-direction-from-dot-position determinism, `STATE_VECTORS`/`STATES_RELATIVE`/`PM_CHECKLIST_SECTIONS`/`EXPORT_TARGETS` data integrity, sequential checkmark + export-button activation, and the always-visible-but-dimmed button state machine. No backend changes (no migrations, no edge functions, no RLS, no env vars); the hero animation is fully unauthenticated-only (gated behind `SmartLanding`). Closes #660.
- **Real dashboard trends replace synthetic sparklines** ([#589](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/589)) — The four `StatsCard`s in `DashboardStatsGrid` (Total Equipment, Overdue Work, Total Work Orders, Needs Attention) now render real 7-day sparklines and 7-vs-prior-7 trend chips sourced from a new `public.get_dashboard_trends(p_org_id, p_team_ids, p_is_manager, p_days)` Supabase RPC (migration `20260421180000_add_dashboard_trends_rpc.sql`). The RPC is `SECURITY DEFINER` with `SET search_path = public, pg_temp`, tenant-gated via `public.is_org_member(auth.uid(), p_org_id)` (raises `42501` for non-members), and team-scoped the same way `getTeamBasedDashboardStats` is (managers see the whole org; non-managers see equipment whose `team_id` is in `p_team_ids`, and work orders filtered by accessible equipment). Work-order columns use `created_date` / `due_date` / `completed_date` (matching `public.work_orders` schema); equipment overdue/needs-attention uses `status IN ('maintenance','inactive')`. Series are generated server-side via `generate_series` over a 2N-day window so deltas and sparklines come from one round trip. New service function `fetchDashboardTrends` and TanStack Query hook `useDashboardTrends` (`staleTime: 5 min`, `gcTime: 30 min`) in `src/features/dashboard/services/dashboardWidgetService.ts` and `src/features/dashboard/hooks/useDashboardWidgets.ts`; `DashboardStatsGrid` gains an optional `trends` prop that propagates `sparkline` + `trend` into each `StatsCard`, preserving empty-state behavior (trend chip suppressed when prior window is zero, sparkline suppressed when series length < 2). `StatsGridWidget` composes the new hook alongside `useTeamMembership` + `useWorkOrderPermissionLevels` so the trend context matches the point-in-time stats on the same card. Test coverage: new pgTAP suite `supabase/tests/09_dashboard_trends_rpc.sql` (function exists, `SECURITY DEFINER`, pinned `search_path`, no EXECUTE to PUBLIC, EXECUTE granted to authenticated, `42501` for non-member, `p_days` clamped `[2,90]`, team-scoping contract, correct `work_orders.created_date` column) and new Vitest cases in `src/features/dashboard/components/__tests__/DashboardStatsGrid.test.tsx` under the `trends (issue #589)` block covering trend-chip rendering, `delta: null` suppression, backward compatibility with no `trends` prop, and empty sparkline handling. No new vendor cost, no new env vars, no third-party API dependency — data sourced entirely from existing `public.equipment` and `public.work_orders` tables, as scoped by the issue.
- **Quick-create team from the topbar team selector** — The persistent `Org > Team > Section` breadcrumb's team-switcher dropdown (`src/components/layout/ContextBreadcrumb.tsx`) now renders a compact green `+` icon button (`bg-success` / `text-success-foreground` semantic tokens, square 24x24) in its `Switch team` header row, gated behind `usePermissions().canCreateTeam()` so it only appears for org owners and admins. Clicking it opens the existing `CreateTeamDialog` from `src/features/teams/components/CreateTeamDialog.tsx`, reusing the same form flow (and existing `useTeamMutations.createTeamWithCreator` mutation, query invalidation, and access-snapshot refresh) that the `/dashboard/teams` page uses, so the topbar shortcut and the page button stay in lockstep. The team segment also now renders for org admins/owners with zero team memberships so they can reach the quick-create flow without first navigating to `/dashboard/teams`. Test coverage: `src/components/layout/__tests__/ContextBreadcrumb.test.tsx` adds four new cases (button hidden without permission, button rendered with `bg-success` for permitted users, click opens the dialog, segment surfaces with zero memberships when `canCreateTeam()` is true) and mocks `usePermissions` + `CreateTeamDialog` so the lightweight breadcrumb test does not pull in Google Maps loader, customer queries, or the full team mutation chain.
- **Bulk equipment edit grid (desktop power users)** ([#627](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/627)) — New desktop-only `/dashboard/equipment/bulk` route surfacing a TanStack Table-driven inline-edit grid for in-place modification of existing equipment rows. The "Add Equipment" button on `/dashboard/equipment` becomes a desktop `<DropdownMenu>` split-action exposing "Add Single Equipment" (existing modal) and "Bulk Edit (Grid)" (new route); mobile FAB is untouched per the Service Request. v1 is edit-only with the same static columns as the #633 dense table view: Name (read-only / link), Status, Manufacturer, Model, Serial #, Hours, Location, Team (display-only). Custom attributes and row insertion are deferred to follow-up issues. Single-click toggles row selection; double-click mounts the inline editor (`<Input>` for text/number, `<Select>` for status); editing on a multi-row selection prompts a `BulkApplyConfirmDialog` with Cancel / Apply to All Selected / Apply to This Row Only. The footer `BulkCommitToolbar` fires `EquipmentService.batchUpdate` with `Promise.allSettled` partial-tolerant semantics so a single bad row does not block the rest; per-row zod validation runs first via `equipmentFormSchema.partial()`; `sonner` toasts surface success / partial-failure / full-failure outcomes. Permission gate uses existing `canCreateEquipment`; offline gate (when `!navigator.onLine`) renders an empty-state with a back-link to `/dashboard/equipment`. New dependency `@tanstack/react-table` 8.21.3 (MIT, ~10–15 kB gzipped) lazy-loaded onto the new chunk; the existing `equipment_access_consolidated` RLS policy already gates per-row UPDATE on `organization_id` membership so no migration is required. Test coverage: 6 service tests for `EquipmentService.batchUpdate` (all-success / partial / all-failure / cross-org / unexpected-rejection / empty-input), 16 component tests for `BulkEditableCell` (hover / single-click / double-click / Enter / Escape / blur / dirty border / numeric coercion / null handling), 13 hook tests for `useBulkEditEquipment` (delta tracking / revert-clears / multi-row apply / clear / commit success / partial / full-failure / zod rejection), plus the page-level `Equipment.test.tsx` "opens form" smoke test was updated to traverse the new dropdown menu (click trigger → click "Add Single Equipment" menu item) since the desktop button is no longer a single-click affordance. Implements Service Request and Change Record on #627.
- **Qodo Merge per-repo configuration** ([#645](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/645)) — Activates per-repo tuning for the already-installed `qodo-code-review[bot]` GitHub App so its `/agentic_describe` + `/agentic_review` runs on every PR are scored against EquipQR-specific rules instead of vendor defaults. Adds three repo-root config files: `/.pr_agent.toml` (lean review-agent config: `pr_commands = ["/agentic_describe", "/agentic_review"]`, `handle_push_trigger = true` so re-pushes trigger a re-review, `inline_comments_severity_threshold = 3` to keep noise to action-required findings, `[auto_best_practices].enable_auto_best_practices = true` with `max_patterns = 5`, `[best_practices].organization_name = "Columbia Cloudworks"` so suggestions are labeled `Columbia Cloudworks best practice`, `[checks].enable_auto_checks_feedback = true` so Qodo can comment on CI failures from `.github/workflows/ci.yml`); `/best_practices.md` (175-line pattern-first guidance covering multi-tenant `organization_id` scoping, the service-layer boundary that keeps Supabase out of components, RBAC gating via `usePermissions()` before sensitive UI / actions, Edge Function auth-at-entrypoint via the shared `requireUser` / `requireSecret` helpers in `supabase/functions/_shared/`, and the no-`service_role`-outside-approved-Edge-Functions rule, each with before/after TypeScript examples; cross-references the longer-form versions in `.github/copilot-instructions.md`, `.github/instructions/code-review.instructions.md`, and `docs/guides/permissions.md`); `/pr_compliance_checklist.yaml` (Qodo custom-compliance checklist seeded from `qodo-ai/pr-compliance-templates` typescript + front-end groups for the TS / null-safety / interface-design / accessibility / front-end-perf / front-end-security baseline, plus 5 EquipQR-specific compliances — Multi-tenant Organization Scoping, Service Layer Boundary, RBAC Permission Gating, Edge Function Auth-at-Entrypoint, No `service_role` Outside Approved Edge Functions — each with `compliance_label = true` so violations attach a `Failed compliance check` label; CI does not block on the label today). The GitHub Wiki on `Columbia-Cloudworks-LLC/EquipQR` was enabled with a placeholder first page so Qodo can write `.pr_agent_accepted_suggestions` and (monthly) generate `.pr_agent_auto_best_practices`, closing the auto-learning loop. Documentation: appends one bullet to `AGENTS.md` under "Learned Workspace Facts" noting the three repo-root config files, the wiki dependency, and the wiki-page-`.pr_agent.toml` runtime-override escape hatch (per Qodo docs, wiki-page config takes effect immediately without a commit). No application code changed, no schema, no env, no Supabase secret, no Vercel config; subscription cost unchanged (zero marginal dollar — the Teams plan we already pay for covers every feature activated here, pricing re-verified at https://www.qodo.ai/pricing/ on 2026-04-20). Resolves #645.
- **Global TopBar team filter now drives Equipment, Work Orders, and Fleet Map** (follow-up to [#642](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/642), epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)) — Wires the persistent `Org > Team > Section` breadcrumb's team selector (`useSelectedTeam`) into the three list / map surfaces so that selecting `Team A` in the TopBar scopes `/dashboard/equipment`, `/dashboard/work-orders`, and `/dashboard/fleet-map` to that team without re-selecting on each page. Adds an `Unassigned` option to the global dropdown so equipment / work orders without a `team_id` can be filtered app-wide; the new `UNASSIGNED_TEAM_ID` sentinel exported from `src/contexts/selected-team-context.ts` is preserved through `SelectedTeamProvider`'s membership-validation effect (it does not correspond to any membership row, so the auto-clear no longer wipes it). The Equipment, Work Orders, and Fleet Map pages each gain a one-line `useEffect` that mirrors the global selection onto their existing client-side team filter (`null → 'all'`, `UNASSIGNED_TEAM_ID → 'unassigned'`, otherwise the team UUID). The redundant per-page Team `<Select>` is removed from `src/features/equipment/components/EquipmentFilterPopover.tsx`, `src/features/equipment/components/MobileEquipmentFilters.tsx`, `src/features/work-orders/components/WorkOrderFilterPopover.tsx`, the mobile sheet in `src/features/work-orders/components/WorkOrderFilters.tsx`, and the inline toolbar `<Select>` in `src/features/fleet-map/pages/FleetMap.tsx`; the matching active-filter chips and active-count contributions are also stripped so the page-local "active filters" badge no longer reflects the global scope. `useWorkOrderFilters` is extended to honor `teamFilter === 'unassigned'` (orders with no `teamId`); `useEquipmentFiltering` already supported the same sentinel from prior work. Deep links continue to work — `/dashboard/equipment?team=<uuid>` and `/dashboard/work-orders?team=<uuid>` now write to the global selection (which then propagates to every page) instead of a page-local filter. Test coverage: `SelectedTeamContext.test.tsx` gains two cases for the `UNASSIGNED_TEAM_ID` sentinel (preserved through membership refresh, hydrated from localStorage), `ContextBreadcrumb.test.tsx` covers the new `Unassigned` menu item and trigger label, new `src/features/work-orders/hooks/__tests__/useWorkOrderFilters.test.ts` covers `'all'` / `'unassigned'` / specific-team filtering plus the no-page-count contract, and `MobileEquipmentFilters.test.tsx` is updated to assert the Team field and `Team:` chip are no longer rendered. No DB migration, no env / secret additions, no service contract change.
- **Command Center navigation: persistent context breadcrumb + grouped sidebar + QuickBooks health pill** ([#634](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/634), epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)) - Restructures the global navigation chrome introduced by Epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630) to separate "where am I?" (org / team) from "what am I doing?" (page) and to surface integration health globally. New `src/components/layout/ContextBreadcrumb.tsx` renders a persistent `Org > Team > Section` breadcrumb in the TopBar left slot using the existing shadcn primitives from `src/components/ui/breadcrumb.tsx`. The Org segment delegates to `src/features/organization/components/OrganizationSwitcher.tsx`, which gains a new `variant?: 'sidebar' | 'topbar'` prop - the `topbar` variant renders a compact org-name + chevron trigger that flows inline with the breadcrumb (no logo box, no role subtitle); the default `sidebar` variant is preserved untouched for any future reuse. The Team segment is a `DropdownMenu` listing the user's `teamMemberships`, hidden entirely when the user belongs to zero teams or on mobile (cramped); selecting a team drives a new `useSelectedTeam` hook backed by `src/contexts/SelectedTeamContext.tsx` + `src/contexts/selected-team-context.ts`, which persists `selectedTeamId` to `localStorage` under `equipqr:selectedTeamId:<organizationId>` (one slot per org, mirroring `SimpleOrganizationProvider`), auto-rehydrates on org switch, and auto-clears when the selected team is no longer in the membership list. The Section segment is resolved through the new `src/components/layout/topBarRouteLabels.ts` helper (extracted out of `TopBar.tsx`) so `TopBar` and `ContextBreadcrumb` share one source of truth for `ROUTE_LABELS`, `ROUTES_WITH_PAGE_H1`, `getPageLabel`, and `shouldSuppressLabelOnMobile`; on mobile, pages with their own H1 swap the label for the brand mark instead of duplicating the title. `src/components/layout/AppSidebar.tsx` is regrouped into four operational `SidebarGroup`s in this order - **Fleet** (Equipment, Fleet Map, Inventory, Part Lookup, Part Alternates), **Operations** (Dashboard, Work Orders, PM Templates [admin], Reports), **Infrastructure** (Teams, Organization, new Integrations entry deep-linking to `/dashboard/organization#integrations`), **Audit** (Audit Log [admin], DSR Cockpit [admin + `DSR_COCKPIT_ENABLED`]) - and the redundant `OrganizationSwitcher` is removed from the sidebar header (header keeps only the EquipQR logo + wordmark). `adminOnly` and `featureEnabled` filtering is preserved exactly as before; a group renders nothing when every item filters out. New `src/components/layout/QuickBooksStatusIndicator.tsx` mounts in the TopBar right cluster (left of `NotificationBell`) and consumes `useQuickBooksConnection`: it returns `null` when `isQuickBooksEnabled()` is false, while the query is loading, on error, or when the org has no QuickBooks credentials row, so QB-disabled tenants see nothing; otherwise it renders a `Receipt` icon with a tooltip and a corner dot - `bg-success` (green) when `data.isAccessTokenValid === true`, `bg-destructive` (red) when the access token has expired - and links to `/dashboard/organization#integrations` for repair. `src/features/organization/components/OrganizationSettings.tsx` adds the `id="integrations"` anchor (with `scroll-mt-20`) so both the sidebar entry and the QB pill scroll cleanly. `src/App.tsx` mounts `<SelectedTeamProvider>` immediately inside the existing `<TeamProvider>` so the new context is available everywhere the dashboard layout renders. Test coverage: new `src/components/layout/__tests__/ContextBreadcrumb.test.tsx` (org name renders, team segment hidden when zero memberships, team dropdown calls `setSelectedTeamId`, "All teams" clears, section label resolves from route map), new `src/components/layout/__tests__/QuickBooksStatusIndicator.test.tsx` (renders nothing when flag off / loading / not-connected / errored, green when token valid, red when token expired), new `src/components/layout/__tests__/AppSidebar.test.tsx` (four group labels render for admin, admin-only items gated for non-admins, `OrganizationSwitcher` no longer mounted inside the sidebar), and a one-line passthrough mock added to `src/tests/integration/AppRoutes.test.tsx` so the integration suite picks up the new `SelectedTeamProvider`. No DB migration, no env / secret additions, no new vendor cost. Closes the third leaf of Epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)'s UI overhaul (after #631 dark-only tokens and #633 dense table view); the Service Request resolved the middle breadcrumb segment to reuse the existing Team entity (Option 1) - no new data model.
- **High-density asset table view mode** ([#633](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/633), epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)) - Surfaces a new opt-in `table` view on `/dashboard/equipment` alongside the existing card-based `grid` and `list` modes, optimized for power users managing hundreds of assets per organization. Roughly doubles the rows visible above the fold on a 1080p viewport without losing legibility, bringing EquipQR in line with the segment median (UpKeep, Limble, Maintainx, Fleetio). The shared `src/components/ui/data-table.tsx` primitive gains four opt-in props - `density: 'compact' | 'comfortable'` (default `'comfortable'` so every existing call site, notably `WorkingHoursTimelineModal`, is preserved), `stickyHeader`, `freezeFirstColumn`, and `maxBodyHeight` - plus `Column.mono` (applies `font-mono tabular-nums` to header + cell) and `Column.align` (`left | right | center`). Compact density emits `py-1.5 px-2` cells and an `h-9 px-2` header; sticky header pins via `sticky top-0` plus a 1-px box-shadow line standing in for the bottom border (which doesn't paint reliably on sticky `<thead>`); frozen first column pins via `sticky left-0` with the row hover background propagated to the pinned cell so the row reads as one unit. The base shadcn primitives in `src/components/ui/table.tsx` are intentionally left untouched - all overrides applied via the wrapper. New `src/components/ui/dot-status.tsx` renders compact colored-dot status indicators against the existing `success` / `warning` / `muted-foreground` semantic tokens with the human label always exposed to assistive tech (visible inline via `showLabel`, sr-only + native `title` tooltip otherwise). New `src/features/equipment/components/EquipmentTable.tsx` consumes the upgraded `DataTable` with columns Name (frozen + sortable + navigates to `/dashboard/equipment/:id`), Status (`DotStatus`), Manufacturer, Model, Serial # (mono), Location, Team, Last Maintenance (mono + right-aligned), and a QR-code action button enforcing the standard `min-h-11`/`min-w-11` invisible 44x44 tap target so row text can stay tight without losing accessibility. The shared empty-state card is extracted into `src/features/equipment/components/EquipmentEmptyState.tsx` so both the card grid and the dense table reuse it. Toolbar (`EquipmentToolbar.tsx`) and desktop sort header (`EquipmentSortHeader.tsx`) gain a third `Rows3` toggle between the existing grid and list controls; mobile sort header is intentionally untouched per Epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)'s desktop-only scope. `EquipmentViewMode` widens to `'grid' | 'list' | 'table'` and `Equipment.tsx`'s `localStorage` hydration accepts the new value, falling back to `'list'` for `'table'` on the initial mobile render so the desktop-only dense view doesn't ship horizontally scrolled to a phone. Test coverage: new `src/components/ui/__tests__/data-table.test.tsx` (13 tests pinning density / sticky / frozen / mono behavior), new `src/features/equipment/components/__tests__/EquipmentTable.test.tsx` (11 tests covering rendering, sticky header, frozen first column, mono serial column, QR-button 44x44 tap target, and detail navigation), expanded `EquipmentGrid.test.tsx` (3 new tests for the `viewMode === 'table'` branch), and 4 new hydration cases in `Equipment.test.tsx` covering grid / list / table / unknown values.

### Fixed

- **Audit Log explorer: default time window hid existing entries** ([#641](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/641) follow-up) — The Logflare-style `/audit-log` explorer defaulted to **Last 24h**, so orgs whose recent activity was older than a day saw an empty histogram and list (while summary stats still reflected lifetime totals). The default is now **Last 30d** via shared `DEFAULT_AUDIT_TIME_PRESET` in `src/types/audit.ts`; the toolbar's active time badge and reset action use the same default. An **All** preset loads the full org history (wide lower bound through now) for long-tail reviews. Preset toggle items use explicit `aria-label`s (including **All time**). New Vitest coverage asserts the ~30-day default query span and the All-time control wiring.

- **Audit Log timeline: dense bar grid across the full range** ([#641](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/641) follow-up) — The histogram now renders one bar per bucket across the active range — including empty bars for buckets with no activity — so `last_30d` shows 30 day-bars, `last_24h` shows 24 hour-bars, `last_7d` shows 7 day-bars, `last_1h` shows 60 minute-bars, and `last_15m` shows 15 minute-bars (the previous behavior only rendered buckets that had data, so a single active day on `last_30d` looked like a lone bar floating in empty space). `presetToRange` in `src/components/audit/explorer/AuditExplorer.tsx` is anchored to the start of the current bucket (UTC) and shifted back by exactly `count - 1` bucket spans, so each preset produces a deterministic bar count and the trailing bar covers the in-progress bucket. New `src/components/audit/explorer/aggregate-bucket.ts` extracts the bucket aggregation into a sibling helper module — pre-seeds zero buckets across the range, normalizes the RPC's `+00:00` timestamp keys to `Z` so overlays merge correctly, and falls back to data-only sparse aggregation when the range exceeds 366 buckets (so `'all'` still renders cleanly without 20,000+ daily bars). Histogram `XAxis` adopts `interval="preserveStartEnd"` + `minTickGap={20}` so the 60-minute / 30-day labels thin automatically. New Vitest coverage in `aggregate-bucket` (densification, `+00:00` key normalization, sparse fallback above the cap).

- **`dev-start.bat` auto-recovers from the recurring Docker Desktop wedge** - The previous in-script recovery in `dev-start.ps1` had three holes that together produced repeated "daemon hung" failures on Windows: (1) `docker ps -q` was invoked synchronously with no per-call timeout, so a half-dead `dockerDesktopLinuxEngine` pipe could block each readiness probe for ~30s and stall the whole script; (2) the kill list missed `docker-agent`, `docker-sandbox`, and orphaned `docker` CLI processes that hold the broken pipe open and prevent a clean re-init; (3) recovery only fired once, so a first-pass failure (common when Docker Desktop is mid-init from a Windows boot) produced an immediate FAIL instead of trying again. The surgical recovery is now extracted into `scripts/reset-docker-desktop.ps1` (callable standalone when only Docker is wedged) which kills the full orphan set, terminates only `docker-desktop` / `docker-desktop-data` WSL distros (Ubuntu and other user distros are explicitly preserved), best-effort starts `com.docker.service` (silently skipped when not elevated - Docker Desktop GUI starts it itself), launches Docker Desktop, and polls the daemon with a bounded budget. `dev-start.ps1`'s `Test-DockerDaemonReady` now runs `docker ps -q` inside a background job with a hard 8-second per-call timeout, so a wedged pipe cannot stall the parent. The inline recovery block is replaced with `Invoke-DockerRecovery` plus a 5-second-and-retry second-attempt pass. New `-ResetDocker` switch (and `--reset-docker` long form) on `dev-start.ps1` opts into the surgical reset before the daemon probe for cases where the wedge is already known.

### Changed

- **Audit Log rebuilt as a Logflare-style explorer** ([#641](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/641), epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)) — Hard-cuts `/audit-log` from the paginated 5-column table + bottom-drawer detail to a Logflare-style explorer modeled on Supabase Logs & Analytics: a top time-volume histogram (Recharts stacked bars colored by action severity — `INSERT`/success, `UPDATE`/info, `DELETE`/destructive), a dense severity-tagged scrollable list below it (virtualized via `react-window`'s `FixedSizeList` above 100 entries; non-virtualized listbox below for screen-reader friendliness), and a persistent right detail panel (Overview / Changes / JSON tabs in a `react-resizable-panels` two-pane split). New segmented time-range picker (15m / 1h / 24h / 7d / 30d / All / Custom; default **30d**) lives in the toolbar and emits ISO-precision timestamps so clicking a histogram bar can narrow the explorer to that exact bucket; the date-range inputs are removed from `AuditLogFilterPopover.tsx` (entity type + action stay). Backed by a new `public.get_audit_log_timeline` Supabase RPC (SECURITY DEFINER + explicit `organization_members.status = 'active'` guard mirroring the audit_log SELECT RLS, with a whitelisted `p_bucket` to prevent arbitrary `date_trunc` units) at `supabase/migrations/20260420120000_audit_log_timeline_aggregator.sql` and a pgTAP regression test at `supabase/tests/09_audit_log_timeline_security.sql` covering cross-org denial, member access, bucket validation, and action-filter passthrough. New types (`AuditLogTimelineBucket`, `AuditLogTimelineRow`, `AuditLogTimePreset`, `ACTION_SEVERITY_COLOR`), service method (`auditService.getAuditTimeline`), and React Query hook (`useAuditTimeline`) in `src/types/audit.ts`, `src/services/auditService.ts`, and `src/hooks/useAuditLog.ts`. The service's `dateTo` handling now detects ISO timestamps (`includes('T')`) and uses them as-is — date-only `YYYY-MM-DD` filters keep the legacy +1-day inclusive-end behavior. Five new components under `src/components/audit/explorer/`: `AuditTimelineHistogram`, `AuditLogTimeRangePicker`, `AuditLogList`, `AuditLogDetailPanel`, and the composing `AuditExplorer` shell. Legacy paginated table and bottom-drawer detail are deleted (`src/components/audit/AuditLogTable.tsx` and `src/components/audit/AuditEntryDetailSheet.tsx`); the orphaned `AuditLogTableProps` interface is pruned from `src/types/audit.ts`. `HistoryTab` on entity detail pages is unaffected (it has its own inline timeline render that never consumed the deleted Sheet). Compliance / export flow is untouched: `AuditLogDownloadMenu`, `useAuditExport`, and the CSV / JSON export paths continue to work unchanged through the rebuilt toolbar. No new vendors, no new env vars, no new feature flags — `recharts`, `react-resizable-panels`, `react-window`, `date-fns`, and `@radix-ui/react-toggle-group` were already in `package.json`. Test coverage: 33 audit specs total — 19 new tests under `src/components/audit/explorer/__tests__/` (timeline aggregation + bar-click callback + severity colors, list virtualization threshold + keyboard nav + row selection, detail-panel tab switching + clipboard copy, explorer composition + bar-click range narrowing), plus `src/services/__tests__/auditService.timeline.test.ts` (RPC param mapping + error pass-through + empty results), `src/hooks/__tests__/useAuditLog.timeline.test.ts` (bucket auto-derivation + query-key stability), and `src/pages/__tests__/AuditLog.test.tsx` (org-missing alert + explorer smoke + sentinel that legacy sidebar headings are gone). Fed by epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)'s UI overhaul (tokens #631, dense tables #633, navigation #634).
- **Mission Control dark-only design tokens** ([#631](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/631), epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)) — Foundation tokens layer for the "NASA-punk" UI overhaul. `src/index.css` collapses the dual light / dark palette into a single dark scheme on `#0a0a0a` (background) / `#121212` (card) / `#27272a` (border + input), with every accent token (`--primary` `#B79CFF`, `--success` `#5EEDA0`, `--warning` `#FFC857`, `--destructive` `#FF8585`, `--info` `#5EA8FF`, `--ring` `#B79CFF`) contrast-checked at >= 7:1 on the new ground to satisfy WCAG AAA for normal text. `--radius` is set to `0` so every `rounded-md` / `rounded-sm` / `rounded-lg` collapses to squared corners via the existing Tailwind extend. JetBrains Mono is added as the new monospace stack via `@fontsource/jetbrains-mono` (self-hosted; the npm wrapper and the embedded JetBrains Mono font files are both SIL OFL-1.1) and applied to `code` / `kbd` / `samp` / `pre` plus a new opt-in `.font-tabular` utility for currency / metrics. `src/components/providers/AppProviders.tsx` now passes `forcedTheme="dark"` to `next-themes`, and `index.html` sets `class="dark"` on `<html>` plus `theme-color="#0a0a0a"` to prevent FOUC and align the mobile address-bar color. The now-dead theme-switcher UI is removed in the same commit: the Theme `<Select>` from `src/components/settings/PersonalizationSettings.tsx`, the Light/Dark/System `DropdownMenuRadioGroup` from `src/components/layout/AppSidebar.tsx`, and the `useTheme()` call in `src/components/ui/sonner.tsx` (now pinned to `theme="dark"`). User-visible impact: the light / system theme preference is no longer available — confirmed by the issue owner as accepted technical-debt removal. Foundation for the downstream UI overhaul children (#632 dashboard, #633 tables, #634 navigation, #635 strict accessibility audit), which can now build on a settled token contract instead of re-litigating it.
- **Accessibility wave-1: primary `Button`, `Input`, and `Textarea` tap targets + focus rings** ([#635](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/635), epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)) — Aligns core shadcn primitives with the Mission Control keyboard and touch contract before the broader `src/components/ui/*` sweep. `src/components/ui/button.tsx` applies `min-h-[44px] min-w-[44px]` only when `variant` is the default primary (or omitted), and composes the shared `MC_FOCUS_VISIBLE_RING` export from `mission-control-focus.ts` (3px + offset on `--ring`) for high-contrast `:focus-visible` feedback on all variants. `src/components/ui/input.tsx` uses `h-11 min-h-[44px]` with the same shared fragment; `src/components/ui/textarea.tsx` keeps `min-h-[80px]` for multi-line usability and uses `MC_FOCUS_VISIBLE_RING`. Test coverage: `src/components/ui/button.test.tsx` asserts the 44px minimum on primary actions, absence of the expansion on non-primary variants, and the 3px focus ring class; new `src/components/ui/input.test.tsx` and `src/components/ui/textarea.test.tsx` cover minimum height / ring classes. Does not complete #635 — remaining primitives stay for the batch follow-up.

- **Accessibility wave-2: shared Mission Control focus tokens + 3px rings on remaining shadcn primitives** ([#635](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/635), epic [#630](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/630)) — Adds `src/components/ui/mission-control-focus.ts` exporting DRY `MC_FOCUS_VISIBLE_RING`, `MC_FOCUS_RING`, and `MC_FOCUS_VISIBLE_SIDEBAR` (3px rings with offset on `--ring` / `--sidebar-ring`). Wires the shared classes into `checkbox.tsx`, `radio-group.tsx`, `select.tsx` (`h-11` + `min-h-[44px]`), `toggle-variants.ts`, and `sidebar.tsx` (via `MC_FOCUS_VISIBLE_SIDEBAR` for `SidebarInput`); upgrades `switch`, `slider`, `tabs`, `dialog`/`sheet` close buttons, `toast` action/close, `menubar`/`dropdown-menu`/`context-menu`/`command` items, `resizable` handle, `data-table` sort header, `input-otp` active cell, and `badge-variants` from 1px/2px to `ring-[3px]`. `src/components/ui/button-variants.ts` is intentionally unchanged (B1-01 CVA / radius). Test coverage: `mission-control-focus.test.ts`, `checkbox.test.tsx`, `select.test.tsx`, plus full `src/components/ui` Vitest pass.

## [2.11.0] - 2026-04-19

### Added

- **Fleet Map runtime auth-failure diagnostic + real React error boundary** ([#617](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/617) follow-up) — Hardens the Fleet Map against the second, previously-masked failure mode on `preview.equipqr.app`: when the Google Cloud API key returned by `public-google-maps-key` is not in the upstream HTTP-referrer allowlist for the page URL, Google fires `RefererNotAllowedMapError` and the downstream `marker.js` `TypeError` no longer crashes the entire React tree to the global "Something went wrong" page. `src/features/fleet-map/components/FleetMapErrorBoundary.tsx` is now a real class-based React error boundary (with a presentational mode preserved for the existing pre-mount error states); `src/features/fleet-map/pages/FleetMap.tsx` wraps `<MapView>` in it. `src/features/fleet-map/components/MapView.tsx` installs (and cleanly tears down) Google's documented `window.gm_authFailure` hook and renders a new in-app `MapsAuthFailureCard` that surfaces the exact URL the operator must add to the API key's HTTP-referrer allowlist plus a link to the runbook. Toast copy in `src/hooks/useGoogleMapsKey.ts` now uses the canonical `GOOGLE_MAPS_BROWSER_KEY` name (legacy `VITE_*` mentioned only as parenthetical fallback). Documentation: new `## Google Maps API key — HTTP referrer allowlist` runbook section in `docs/ops/supabase-branch-secrets.md` with operator steps and the canonical referrer entries; cross-linked from `docs/ops/deployment.md` (next to the Vercel security-headers note) and `.cursor/rules/fleet-map.mdc`. `.env.example` lists `preview.equipqr.app` explicitly alongside the `*.equipqr.app` wildcard. Test coverage: 11 new Vitest cases across `__tests__/FleetMapErrorBoundary.test.tsx` (boundary catch, happy-path passthrough, Try Again resets state, `onReset` callback, presentational mode wiring) and `__tests__/MapView.gm_authFailure.test.tsx` (handler install/uninstall lifecycle, diagnostic-card render with the current URL, no-prior-handler safety, Try Again wired to `window.location.reload`).
- **Edge Function observability + FleetMap Preview restoration** ([#617](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/617)) — Restores the Fleet Map on `preview.equipqr.app` (operator action: provision the missing `GOOGLE_MAPS_BROWSER_KEY` and optional `GOOGLE_MAPS_MAP_ID` Edge Function secrets on the Preview Supabase project `olsdirkvvfegvclbpgrg`) and closes the systemic gaps that allowed the regression to go undetected. New shared helper `supabase/functions/_shared/require-secret.ts` exporting `requireSecret`, `optionalSecret`, and `MissingSecretError` — every required secret loaded by an Edge Function now emits a single structured `{"code":"MISSING_REQUIRED_SECRET",...}` log line on absence (greppable across functions), and the secret name is forced to the generic client message via `createErrorResponse` so it never leaks. New `withCorrelationId` wrapper in `_shared/supabase-clients.ts` mints a per-request UUID (or reuses an inbound `X-Correlation-Id` / `X-Request-Id`), sets `X-Correlation-Id` on every response, and injects `correlation_id` into JSON error bodies for in-app support flows. All 22 secret-bearing Edge Functions refactored across maps / QuickBooks / Google Workspace / email-captcha-push / admin-misc clusters. The `places-autocomplete` function's local `createCorsErrorResponse` (which bypassed the `error-message-allowlist` security guard) is removed in favor of the shared `createErrorResponse` with origin-validated CORS via the new `opts.req` parameter. Drift-check coverage expanded: `scripts/sync-supabase-secrets-from-1password.ps1` now maps the Preview project (`olsdirkvvfegvclbpgrg` -> `edge-env-preview-secrets` 1Password item) alongside production, and `.github/workflows/secrets-drift-check.yml` runs the check against both projects daily. New `.github/workflows/edge-functions-smoke-test.yml` runs on every push to `preview` / `main` that touches `supabase/functions/**`, asserting that `public-google-maps-key` returns HTTP 401 (function healthy past secret loading) rather than 500 (missing secret) — fails the deploy on 500. New Deno tests in `_shared/require-secret.deno.test.ts` (9) and `_shared/with-correlation-id.deno.test.ts` (7) cover the helpers including a sentinel-substring assertion that secret values never reach any log surface. Documentation: `docs/ops/supabase-branch-secrets.md` now leads with the canonical `GOOGLE_MAPS_BROWSER_KEY` name (legacy `VITE_*` listed as fallback) and adds the optional `GOOGLE_MAPS_MAP_ID` row; `docs/edge-functions/auth-patterns.md` documents the `requireSecret` and `withCorrelationId` patterns end-to-end.
- **Production-faithful Fleet Map seed data** ([#615](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/615)) — Refreshed equipment, team, scan-history, and geocoded-cache seeds to mirror production patterns: 6-decimal coordinate precision, `'United States'` country strings, sparse `assigned_location` data, and a 3-row jittered scan cluster on the CAT 320 Excavator so map clustering, normalization, and stale-GPS UI states are exercisable locally. Geocoded-cache fixtures now use the exact normalized form (with commas) produced by the `geocode-location` edge function so cache hits actually hit instead of falling through to a Google API call. Teams seed keeps two coordinate fixtures (one with `override_equipment_location = true`, one without) to cover both team-HQ rendering paths. Added `~120` equipment rows distributed across the 6 equipment-owning orgs to mirror prod density.
- **Vector Fleet Map with Advanced Markers** ([#616](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/616)) — Migrated `src/features/fleet-map/components/MapView.tsx` from the deprecated `@react-google-maps/api` to `@vis.gl/react-google-maps`, switching markers to `AdvancedMarker` with vector basemaps via a Cloud-bound `mapId`. New `GOOGLE_MAPS_MAP_ID` secret is plumbed through `supabase/functions/public-google-maps-key`, `useGoogleMapsKey`, and `useGoogleMapsLoader` (documented in `.env.example`); when missing, the map falls back gracefully to legacy markers with a single dev-only warning. Basemap `colorScheme` reactively follows the app theme via a `<html>`-class `MutationObserver`, and the auto-fit logic now refits when the visible marker identity set changes (e.g. switching team filter).
- **Maskable PWA icons** ([#616](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/616)) — `public/manifest.webmanifest` now declares correctly-sized icons plus a `purpose: "maskable"` entry, fixing PWA install warnings about icon size mismatches.

### Changed

- **AuthContext: defer admin-grants RPC behind `getSession()` confirmation** ([#616](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/616)) — `apply_pending_admin_grants_for_user` is now dispatched via `queueMicrotask` after re-confirming the live session (`getSession()`) so the supabase-js client has its JWT attached before the RPC fires. Eliminates the spurious `400` errors that surfaced on the dashboard when the SIGNED_IN payload raced the auth-header attachment. Both the deferred `getSession()` promise and the RPC promise are caught (DEV logs `logger.warn`; prod swallows silently and lets the next SIGNED_IN retry).
- **Above-the-fold work-order images load eagerly** ([#616](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/616)) — `WorkOrdersList` passes `isAboveTheFold` to the first 6 `WorkOrderCard` instances; those cards request their thumbnail with `loading="eager"` and `fetchPriority="high"`, silencing the lazy-image intervention warning Chrome emits for in-viewport content.
- **HorizontalChipRow scroll/resize measurements coalesced via rAF** ([#616](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/616)) — Dashboard chip strips no longer trigger forced-reflow violations; scroll and resize measurements are batched in a single `requestAnimationFrame` callback per frame.
- **Google Maps script loader uses `loading=async` + `crossOrigin=anonymous`** ([#616](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/616)) — `useGoogleMapsLoader` now appends the async loading params Google recommends, removing a console warning that surfaced on every Places autocomplete fallback path.
- **Reproducible `public/sitemap.xml` generation + artifact untracked** ([#619](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/619)) — `scripts/generate-sitemap.mjs` now sources `<lastmod>` from a deterministic chain (`SOURCE_DATE_EPOCH` env var → HEAD committer date via `git log -1 --format=%cI` → pinned `2026-01-01` fallback) instead of `new Date()`, so two consecutive builds on the same commit produce byte-identical output. `public/sitemap.xml` is removed from version control (`git rm --cached` + `.gitignore`) since Vite still copies `public/*` into `dist/` on every build (local + Vercel) and the file is a regenerated artifact, not source. Eliminates noisy PR diffs and restores the reproducible-builds contract.
- **Agent infrastructure: 1Password Service Account + MCP doctor + GHA secrets drift check** — Cursor agents (Windows IDE, Cloud Agents, GitHub Actions) now resolve every backend credential through a single `OP_SERVICE_ACCOUNT_TOKEN` against the EquipQR Agents 1Password vault. New scripts: `scripts/render-mcp-config.ps1` + `scripts/mcp.template.json` render `~/.cursor/mcp.json` via `op inject` (and auto-activate the GCP service account for the `gcloud` MCP); `scripts/op-mcp-doctor.ps1` runs a green/red health check across all 11 MCPs; `scripts/agent-bootstrap.sh` provisions Linux Cloud Agents (apt-installs `op`, renders `.env` files, writes the GCP key); `scripts/sync-vercel-from-1password.ps1` and `scripts/sync-supabase-secrets-from-1password.ps1` push secrets in either apply or `--check` drift mode. New `.github/actions/load-1p-secrets/action.yml` provides lazy GHA secret loading via `1password/load-secrets-action@v4`; new `.github/workflows/secrets-drift-check.yml` runs the drift check daily against both production and Preview Supabase projects. `.cursor/skills/secrets-rotation/SKILL.md` documents the 90-day rotation procedure. No production-runtime change — operator and agent tooling only.

### Fixed

- **Inventory item form: compatibility rule rows disappearing on parent re-render** ([#602](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/602)) — `InventoryItemForm` now gates its initialization effect to a closed→open transition via `lastInitKeyRef`, so unrelated parent re-renders no longer reset the form and collapse compatibility/equipment/manager sections mid-edit. The async editing-data loader's deps are stabilized to `(editingItem id/orgId, currentOrgId)` and reads RHF / toast through refs to stop spurious abort/restart cycles. `match_type`, `status`, and `notes` are now hydrated from existing rules and added to `compatibilityRuleSchema` (with defaults + empty-notes→null transform) so editor payloads are no longer silently stripped on submit. `CompatibilityRulesEditor` now exposes a single `createBlankRule()` factory as the source of truth for new rows. New regression tests cover rule persistence across re-renders, alternate-group interaction, and schema parity.
- **Dashboard `apply_pending_admin_grants_for_user` 400 spam** ([#613](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/613), [#616](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/616)) — Migration `20260418120000_apply_pending_admin_grants_quiet_mismatch.sql` converts the SQL self-only guard to `RAISE NOTICE` + quiet return instead of `RAISE EXCEPTION`. Combined with the AuthContext `getSession()` deferral (above), this removes the recurring 400 entries from the browser console on dashboard load.
- **`google.maps.Marker` deprecation warning on Fleet Map** ([#613](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/613), [#616](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/616)) — Resolved by the `AdvancedMarker` migration described above.

### Security

- **Vite bumped 5.4.21 → 6.4.2 to address CVE-2026-39365** ([#619](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/619)) — Direct `vite` devDependency and the matching `overrides.vite` entry now resolve to `^6.4.2`. `package-lock.json` regenerated; build, lint, type-check, and test gates verified on the upgrade. No application code changes required.

## [2.10.0] - 2026-04-18

### Added

- **Machine hours on work order and equipment notes** — Nullable `machine_hours` column on `work_order_notes` and `equipment_notes` (migration `20260416120000_add_machine_hours_to_notes.sql`). Create and list paths persist the value; work order and equipment note UIs show a machine-hours line when greater than zero. Offline queue create payloads and merge hooks carry `machineHours` through to sync.
- **QuickBooks customer tax-exempt sync** — New nullable `customers.is_tax_exempt` column (migration `20260417103000_add_customers_tax_exempt_flag.sql`) populated from QuickBooks `Customer.Taxable` on import and refresh. Customer Account card and the QuickBooks customer mapping picker now show an inline "Taxable" / "Tax Exempt" badge sourced from QBO so technicians see tax posture without leaving the team detail page.
- **Shared QuickBooks Edge Function config** — New `supabase/functions/_shared/quickbooks-config.ts` centralizes the QBO API base URLs, OAuth token endpoint, minor-version helper, sandbox/production resolution, custom field definition IDs, item names, and default labor / truck-supplies fee fallbacks so every QBO Edge Function reads the same source of truth via env overrides.
- **Playwright demo smoke infrastructure** — Added `playwright.config.ts` (single-worker, video-on defaults with `DEMO_BASE_URL` and optional `DEMO_STORAGE_STATE`) plus `e2e/demo-smoke.spec.ts` for resilient post-login dashboard interactions. ESLint ignore patterns now include `e2e/` and `playwright.config.ts` for this smoke harness.
- **Better Stack monitoring runbook** — Added `docs/ops/better-stack-monitoring.md` documenting web/deep-health uptime monitors, public status page behavior, and the MCP smoke-check sequence for operational verification.
- **Demo System v2 orchestration** — Added scenario-driven recording orchestration with multi-scene flows, suite selection, dry-run planning, reliability loops, strict production preflight enforcement, preflight/finalization helpers (`scripts/demo-record-preflight.mjs`, `scripts/demo-record-finalize.mjs`), repeat-run wrappers (`scripts/repeat-demo-smoke.mjs`, `scripts/repeat-demo-record-prod.mjs`), and canonical artifact finalization under `tmp/demos` via `scripts/demo-record-v2.mjs`.
- **Demo diagnostics and quality gates** — Added metadata and diagnostics sidecars (`.metadata.json`, `.diagnostics.json`, per-scene metadata) plus quality validation for minimum duration, activity heuristics, and required checkpoints with failure taxonomy.
- **Demo scenario engine and macro system** — Added `scripts/demo-scenarios.v2.json`, schema parsing/validation, macro expansion (`openNav`, `filterList`, `openDetails`, `returnDashboard`), Playwright preflight gating (`scripts/lib/playwrightPreflight.mjs`), and resilient action primitives with bounded retry/backoff and selector fallback telemetry.
- **Demo operator runbook and test coverage** — Added `scripts/DEMO-SYSTEM-V2.md` and script-level tests for scenario parsing, macro expansion, diagnostics structure, quality gate pass/fail behavior, and orchestrator dry-run planning.

### Changed

- **QuickBooks invoice export payload** — Rebuilt the `quickbooks-export-invoice` Edge Function to emit grouped invoice lines (Labor, Parts, Truck Supplies) using configured QBO item names and to set invoice-level custom fields (Make/Model, Serial, Machine Hours) by definition ID. The customer-facing memo now formats the work-order timeline with bracketed entries so QBO renders a consistent customer history. `quickbooks-search-customers` queries explicit columns (including `Taxable`) instead of `SELECT *` and surfaces `Taxable` to the mapping UI.
- **Status history and item-name query hardening** — Status history reads in `quickbooks-export-invoice` are now scoped by organization, and the item-name lookup query is sanitized to defend against QBO query-language injection. Explicit zero truck-supplies totals are preserved instead of being replaced by default fees.
- **npm dependencies (patch)** — Refreshed direct dependencies and devDependencies within patch semver via `npm-check-updates --target patch`; regenerated `package-lock.json` for a consistent install tree.
- **Supabase CLI and JS client pins** — `supabase` devDependency set to `~2.77.1` and `@supabase/supabase-js` to `~2.76.1` so lockfile upgrades stay on patch lines instead of drifting across minors.
- **Transitive `tar`** — Added npm `overrides` entry `tar@7.5.11` (addresses Dependabot-style bump from 7.5.10 under the Supabase CLI toolchain).
- **Vercel production deploy** — `deploy:vercel` now runs `npx --yes vercel@51.6.1 --prod` so the CLI version is explicit without pulling the full `vercel` package tree into `node_modules`.
- **Developer setup docs** — [README](README.md) prerequisites now point at `engines.node` and the setup guide; [Setup](docs/technical/setup.md), [Developer onboarding](docs/getting-started/developer-onboarding.md), [Local Supabase](docs/ops/local-supabase-development.md), and [Deployment](docs/ops/deployment.md) reference root `engines.node`, Docker Desktop, pinned Supabase CLI usage, and pinned `npx vercel` commands.
- **Demo recording docs surface** — Updated `scripts/DEMO-RECORDING.md` to point operators to Demo System v2 as the recommended scenario-driven path while preserving baseline v1 commands.

### Fixed

- **Work order detail not refreshing after Assign & Start** ([#598](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/598)) — `useWorkOrderAcceptance.onSuccess` now invalidates `workOrderKeys.detail(orgId, workOrderId)` (the exact key the detail page reads via `useWorkOrderById`) alongside lists and legacy keys, so the detail page reflects the new assignee/status without a manual refresh.
- **Work order acceptance modal closing on failure** — Both `handleAcceptanceComplete` paths in `WorkOrderPrimaryActionButton` now rethrow the underlying error instead of silently swallowing it, so `WorkOrderAcceptanceModal` stays open and surfaces the error toast on failed Assign & Start.
- **`scripts/test-runner.mjs` and coverage ratchet** — The runner now monitors child process output and honors child exit codes correctly; when running with `--coverage`, it also waits until `coverage/coverage-summary.json` exists before force-exiting, so `npm run test:ci` no longer kills Vitest before reporters finish writing output.
- **`src/integrations/supabase/types.ts` parse errors** — Removed stray non-TypeScript lines (CLI upgrade notices / accidental log text) that broke ESLint parsing at file boundaries.
- **Cursor type-sync hook (`.cursor/hooks/sync-types.ps1`)** — Hardened against Supabase CLI stdout pollution (connection logs, version-update banners) that recurringly corrupted `src/integrations/supabase/types.ts`. The hook now captures stdout+stderr to a temp file, extracts only the content between the first `^export type` declaration and the last `^} as const`, validates both anchors before writing, and atomically writes UTF-8+BOM (matching the existing file encoding) using the .NET API to avoid PS 5.1 vs PS 7+ encoding-default differences. It explicitly strips the `A new version of Supabase CLI is available` upgrade notice banner before validation/writes. On validation failure the existing `types.ts` is left untouched and the captured CLI output is echoed (truncated to 1000 chars) for inspection. Stdin parsing and the main work block are now wrapped in try/catch so unexpected terminating errors (malformed payloads, file I/O, etc.) log a WARNING and `exit 0` rather than abort Cursor's edit pipeline. Prettier's exit code is checked after formatting; non-zero exits log a WARNING with output excerpt instead of falsely reporting "validated".
- **Change Team Role dialog** — Opening the role dialog for a different member no longer leaves the role selector on the previous member’s selection (state resets from the current member when the dialog opens or the member identity changes). Failed role updates now show an error toast instead of failing silently.

## [2.9.0] - 2026-04-06

### Added

- **Customer account model behind Teams** — Extended the dormant `customers` table with CRM columns (email, phone, billing/shipping address as JSONB, account owner, notes, QuickBooks identifiers, sync timestamps) and linked it to Teams via a new `teams.customer_id` FK. Existing QuickBooks-mapped teams are backfilled automatically. A Postgres trigger propagates `teams.customer_id` changes to `equipment.customer_id`, keeping the work-order PDF customer-name resolution path intact without application-level sync code.

- **External customer contacts** — New `external_customer_contacts` table for contacts who are not registered EquipQR users (site managers, billing contacts, dispatchers). RLS grants org-member SELECT and org-admin mutate via join to the parent customer's organization. Full CRUD exposed through `ExternalContactsList` on the team detail page, gated by `canManageTeam`.

- **Customer Account card on team detail** — Team detail page now shows a Customer Account card (name, status badge, email, phone, QuickBooks sync metadata, notes) when a team is linked to a customer account. External contacts section appears below it.

- **QuickBooks Import, Refresh, and Link flows** — Reworked `QuickBooksCustomerMapping` component with three distinct actions: Import from QuickBooks (creates a local `customers` row from the QB payload and links it to the team), Refresh from QuickBooks (updates only QB-sourced fields without overwriting EquipQR-only edits like name, notes, or status), and Link Existing Account (attaches an existing local customer account). Legacy `quickbooks_team_customers` mapping is kept populated in parallel for rollback safety.

- **Customer account selector in team creation and editing** — `CreateTeamDialog` now includes an optional customer account field with a dropdown of existing accounts and a "Create new account" inline option. `TeamMetadataEditor` allows changing or unlinking the customer account.

- **Customer resolution chain for invoice export** — Updated the `quickbooks-export-invoice` edge function to resolve the QuickBooks customer ID through the new chain (team → customer account → `quickbooks_customer_id`) with automatic fallback to the legacy `quickbooks_team_customers` mapping table when `teams.customer_id` is NULL.

- **QuickBooks import and resolution tests** — Added unit tests covering QB payload → customer field mapping, refresh-only-QB-fields merge logic, and the `resolveQuickBooksCustomerId` chain with primary, fallback, and null paths.

### Changed

- **Teams list cards show CRM data** — Each team card now displays the linked customer account name (with Building2 icon), a dynamic lifecycle status badge (active/prospect/inactive) replacing the hardcoded "Active" badge, and a QuickBooks sync indicator tooltip showing the last sync date.

- **Consolidated team data hooks** — Merged the raw-Supabase `useTeams` hook into the repository-backed `useTeamManagement.ts` implementation. The canonical `useTeams` now includes access-snapshot filtering (members see only their teams, admins see all), `managedTeams`, and left-joined customer data (`customer_name`, `customer_status`, `quickbooks_synced_at`). The old `useTeams.ts` file is now a thin re-export shim.

- **Team service queries join customer data** — `getOrganizationTeamsOptimized` and `getTeamByIdOptimized` now left-join the `customers` table to return `customer_name`, `customer_status`, and `quickbooks_synced_at` alongside team fields. No additional queries needed for CRM data on list or detail pages.

- **RLS widened for customer visibility** — Added `customers_members_select` policy granting SELECT to `is_org_member` so all org members can see customer names on team cards and detail pages. INSERT/UPDATE remain admin-only.

- **Formalized PDF signature and re-entry sections** — Restructured the field worksheet signature block with a half-width signature line (no longer mistaken for a divider), Date Signed on the same row, printed name below, and a certification attestation statement. The office re-entry section now sits below a clear divider with wider fields and breathing room for legible handwriting. Footer disclaimer and generated-timestamp copy formalized across both the Field Worksheet and Service Report PDFs for consistent document tone.

## [2.8.0] - 2026-04-06

### Added

- **QR codes on work order PDF printouts** — Both the Service Report and Field Worksheet PDFs now include a repeating footer on every page with scannable Work Order and Equipment QR codes, plus a repeating page header with work order title, shortened ID, equipment identifier (when present), and page numbering. Separated pages are now self-identifying. QR code generation and route construction centralised in a shared `src/utils/qr.ts` utility.

- **Work order QR scan entry route** — New public route `/qr/work-order/:workOrderId` enables scanning printed work order QR codes with any QR reader. The flow mirrors the existing equipment and inventory scan paths: prompts for sign-in when needed, verifies org membership, supports org switching for multi-org users, and redirects to the work order detail page with `?qr=true`.

### Changed

- **Desktop work order header standardized** — Replaced the custom gradient hero header on the work order details page with the shared `PageHeader` component used by equipment, inventory, and team detail pages. Status badge and priority now render inline with the title in the meta slot. Edit remains a primary action; exports, QuickBooks, and delete are grouped into a single "Actions" dropdown with labeled sections (Exports, Integrations, Destructive) matching the mobile action sheet structure. Export visibility is now gated on `isManager` on both desktop and mobile, and the Google Docs destination permission check was aligned to use `permissionLevels.isManager` on both surfaces.

- **Work order card refresh** — Redesigned work order list cards with a reorganized action hierarchy: primary status actions (Accept, Start Work, Complete, Resume) now surface directly on active list cards, the quick-actions menu moved from the footer to the identity strip next to badges, the redundant "View Details" button was removed (entire card is clickable), and the 5-column metadata grid was replaced with a compact flex-wrap inline token strip that wraps gracefully on narrow screens. Equipment thumbnails enlarged to 96px on desktop with equipment-type-aware fallback icons (excavator, dozer, generator, light tower, loader, crane) and tinted backgrounds replacing the generic Cog placeholder. Active work orders now carry subtle status-tinted card backgrounds while completed and cancelled cards collapse to a shorter form with hidden PM progress bars. Terminal cards (completed/cancelled) use opacity reduction for clear visual weight differentiation.

- **Mobile work order card layout fix** — Restructured the mobile card identity strip so status and priority badges render on their own row below the title instead of competing for horizontal space beside it. Thumbnail reduced from 64px to 48px, title gets the full remaining width with 2-line clamp, and equipment name gets a dedicated line. Fixes severe title truncation on narrow phone screens (e.g. "250-Hour PM" rendering as "25( H...") that made cards unreadable in the field.

## [2.7.1] - 2026-04-05

### Changed

- **User Settings page redesign** — Reworked the user settings page to match the organization settings pattern: sticky sidebar navigation (vertical on desktop, horizontal scrollable chips on mobile) with IntersectionObserver-based active section tracking, `divide-y` section separators with 3-column grid layout (label + description in col-1, controls spanning cols 2-3) replacing stacked Card boxes, compact inline avatar uploader (`variant="avatar"` on `SingleImageUpload`), standardized `SettingsToggleRow` component for all privacy toggles, collapsible disclosure info boxes replacing dense bullet-point panels, user identity strip below the page heading, inline key/value stat rows in session/security status, tooltip-labeled refresh buttons, and a GitHub-style Danger Zone container for reset settings.

- **Organization Settings page redesign** — Reworked the Settings tab toward a GitHub/Linear-style admin aesthetic: two-column grid layout (label + description in col-1, controls in col-2), underline-style tab bar (local override, shared tabs primitive unchanged), per-section save with auto-saving Privacy toggle, compact inline color picker (swatch + hex input + picker in one row), and `divide-y` section separators instead of stacked cards.

- **Integration cards horizontal layout** — QuickBooks, Google Workspace, and Google Docs Export cards converted from vertical Card/CardHeader stacks to compact horizontal rows with inline status badges and right-aligned action buttons. Long body-copy paragraphs replaced with single-line descriptions.

- **Danger Zone red-border card** — Consolidated transfer ownership, leave organization, and delete organization into a single `border-destructive/50` card with a red-tinted header and horizontal action rows separated by dividers. Disabled transfer state uses a subtle inline hint instead of a large Alert block.

- **Members table tightened** — Row padding reduced to `py-3`, table headers styled as `text-xs font-semibold uppercase tracking-wide`, Import from Google button switched to ghost variant, and `aria-label="Member options"` added to the actions dropdown for accessibility.

- **Responsive mobile members list** — Members table now hides on small screens (`hidden sm:block`) in favor of a card list (`sm:hidden`) showing avatar, name, email, role badge, status, and actions per member.

- **Organization logo upload compact variant** — Added `variant="compact"` to `SingleImageUpload` for a `w-24 h-24` square thumbnail with hover-overlay replace button and destructive text-link remove, used in organization branding settings. Default variant unchanged for other consumers.

- **Page header reduced** — Organization Management heading reduced from `text-2xl/3xl font-bold` display style to `text-xl font-semibold` with a `border-b` divider, matching an administrative settings pattern.

- **Google Docs export destination display** — Destination folder shown as a breadcrumb-style path (`My Drive / folder-name`) with a monospace truncated parent ID and copy-to-clipboard button. Folder organization checkboxes wrapped in a proper `<fieldset>` with `role="group"` for accessibility.

## [2.7.0] - 2026-04-04

### Added

- **Export artifact lineage and replace-on-re-export** — New `record_export_artifacts` table (migration `20260405000000`) tracks the last-exported Google Doc per work order with a future-ready schema supporting any record type and export channel. Re-exporting the same work order creates a fresh Google Doc first, upserts the artifact row with the latest link, then best-effort deletes the previous Google Doc (if it still exists). The "Open Last Google Doc" action appears in the work order actions menu when a previous export exists.

- **Team/equipment subfolder routing for Google Docs exports** — Exports are now organized into readable subfolders under the configured destination using the pattern `TeamName/EquipmentName`. Folder names are human-readable (no IDs), sanitized for safe Drive usage, and reused on subsequent exports. New shared module `google-drive-folder-routing.ts` handles resolve-or-create logic with `supportsAllDrives=true` for Shared Drive compatibility.

- **Subfolder routing organization toggles** — Organization admins can independently enable or disable team and equipment subfolder routing via two checkboxes ("Organize by team", "Organize by equipment") in the Google Docs Export Destination card. Both default to enabled. Settings are stored as `folder_by_team` and `folder_by_equipment` columns on `organization_google_export_destinations` (migration `20260405010000`).

- **Google Docs export toast with Open action** — Docs export success toast now includes an "Open" action button linking directly to the newly created Google Doc (using sonner toast, matching the PDF-to-Drive pattern). Toast message distinguishes "Created" vs "Updated" when a previous export was replaced.

- **Drive file lifecycle helpers** — Added `deleteGoogleDriveFile()` (discriminated union result: deleted/not_found/permission_denied/error) and `getGoogleDriveFileMetadata()` to `google-docs-api.ts` for safe artifact cleanup and verification.

- **Export artifact query key factory and hook** — Added `exportArtifacts` query key factory to `queryKeys.ts` and `useLatestExportArtifact` hook for lightweight artifact fetching with automatic invalidation after each Docs export.

- **Google Docs executive packet composer** — Rewrote the Google Docs export path to build polished, branded documents using the Docs API `batchUpdate` directly instead of HTML upload. The executive packet includes a branded header band, quick-facts block, opening summary with equipment context, photo highlights, labor activity with per-note photo counts, materials & costs table, PM checklist, status timeline, and a consolidated photo-evidence appendix at the end (one page per photo with the related activity note for standalone evidence review).

- **Single work order Docs packet data builder** — Added `work-order-google-docs-single-data.ts` shared module that assembles all data needed for a single-work-order Google Doc packet from seven Supabase queries (work order, org, team, equipment/customer, notes, images, costs, timeline, PM checklist). Pure helper functions (`buildPhotoEvidenceFromNotesAndImages`, `buildQuickFacts`) are exported for unit testing.

- **Google Docs export scope enforcement** — The `export-work-orders-to-google-docs` Edge Function now requires both `drive.file` and `documents` scopes and returns a typed `insufficient_scopes` response instead of a generic 500 when the grant is stale. Frontend export surfaces (`WorkOrderDetailsDesktopHeader`, `WorkOrderDetails` mobile action sheet) use a shared `canExportWorkOrderGoogleDoc()` availability check that gates on connection status, destination presence, and full scope coverage.

- **Desktop header Google Doc export regression test** — Added `WorkOrderDetailsDesktopHeader.test.tsx` verifying the Google Doc export action is hidden when the org's Workspace grant is missing the Docs scope.

- **Google Docs packet request builder test** — Added `src/test/supabase/work-order-google-docs-packet.test.ts` covering the `buildExecutivePacketRequests` page-break request shape to prevent future Docs API field-name regressions.

- **Docs scope added to Deno edge function testables** — `hasRequiredDocsExportScopes` exported via `__testables` with a Deno test covering both the missing-scope and present-scope cases.

### Changed

- **Internal Work Order Packet policy description** — Updated `INTERNAL_WORK_ORDER_PACKET_POLICY` description and `includeByDefault` list to reflect the single-work-order executive packet layout (branded header, photo evidence appendix) instead of the prior multi-worksheet Excel framing.

- **Bulk Docs export removed from Reports dialog** — The Reports page `WorkOrderExcelExportDialog` no longer offers a Google Docs export button for bulk work orders, since the Docs packet is single-work-order only. Google Sheets remains available for bulk exports.

- **Reconnect guidance mentions Docs scope** — `GoogleWorkspaceExportDestinationCard` reconnect text now says "Google Docs and Drive permissions" instead of only "Drive permissions," and tests include a case where Drive scopes are present but the Docs scope is missing.

- **Google Workspace scope matrix includes `documents`** — `GOOGLE_WORKSPACE_REQUIRED_SCOPES` and `GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES` in `auth.ts` now include `https://www.googleapis.com/auth/documents`. Default OAuth consent requests the expanded set on new connections. Deployment docs and scope matrix table updated.

- **Edge function auth-patterns doc updated** — Added `export-work-orders-to-google-docs`, `export-work-orders-to-google-sheets`, `get-google-export-destination`, and `set-google-export-destination` to the user-scoped-client function list.

### Fixed

- **Google Docs API not enabled on GCP project** — The Google Docs API (`docs.googleapis.com`) was never enabled in Google Cloud Console, so `batchUpdate` calls from the Edge Function failed with a 403/500 after the empty doc was created via the Drive API. Enabled via `gcloud services enable docs.googleapis.com`.

- **Docs export Edge Function swallowed error details** — The inner catch block re-threw the Google API error into the outer generic catch, losing the specific message. Now logs the actual error via `console.error` for server-side debugging while returning a generic `{ error, code: "export_failed" }` 500 response to avoid leaking internal details. Also removed references to nonexistent `file_url` and `error_message` columns in `export_request_log` updates.

- **README version badge** — Updated from `2.5.2` to `2.7.0` to match the current release.

## [2.6.0] - 2026-04-04

### Added

- **Better Stack uptime monitoring and status page** — Added public `healthcheck` Supabase Edge Function (`supabase/functions/healthcheck/index.ts`) backed by a dedicated `public.monitoring_healthcheck()` SQL RPC (migration `20260404120000`). The endpoint returns a stable JSON health contract (`ok`, `service`, `environment`, `checked_at`, `checks.db`) with `200` when healthy and `503` on database failure or timeout. Registered as `verify_jwt = false` in `config.toml`. Deno tests cover healthy, unhealthy, and wrong-method paths. Ops runbook at `docs/ops/better-stack-monitoring.md` documents monitor configuration, alert policy, and DNS/CNAME steps for `status.equipqr.app`.

- **`scripts/bootstrap-worktree-env.ps1`** — One-shot copy (or optional hard link) of `.env`, `.env.local`, and `supabase/functions/.env` from a canonical checkout into a git/Cursor worktree; optional `npm ci`. Documented under **Git worktrees and Cursor** in `docs/technical/setup.md`.

- **Cursor stop hook for changelog hygiene** — Added project-level `stop` hook wiring in `.cursor/hooks.json` plus `.cursor/hooks/changelog-stop.ps1` so completed agent sessions that change product code without touching `CHANGELOG.md` automatically get a follow-up prompt to add or justify the missing changelog entry. `.cursor/hooks/README.md` documents the new hook.

- **Google Docs internal packet export (v1)** — Added `export-work-orders-to-google-docs` Edge Function to create editable Google Docs for the Internal Work Order Packet. The function reuses existing work-order export data builders, enforces owner/admin authorization, applies export rate limiting, logs to `export_request_log`, and creates Docs in Drive with Shared Drive compatibility (`supportsAllDrives=true`).

- **Org-managed Google Docs destination settings** — Added destination persistence for Google exports via `organization_google_export_destinations` (migration `20260402120000_add_google_export_destinations.sql`) plus new Edge Functions (`get-google-export-destination`, `set-google-export-destination`) and shared destination validation against Google Drive access.

- **Google Picker destination UI** — Added `GoogleWorkspaceExportDestinationCard` in Organization Settings so owners/admins can select and save a folder or Shared Drive destination for Google Docs exports. Added frontend service/hook support (`setGoogleExportDestination`, `getGoogleExportDestination`, `useGoogleWorkspaceExportDestination`) and query-key factories.

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

- **Windows dev scripts redesign** — `.bat` files are now thin launchers that delegate to **`dev-start.ps1`** / **`dev-stop.ps1`**. **`dev-start.ps1`** starts the full stack (Supabase, Edge Functions serve, Vite) with pre-flight checks, 1Password env sync, and a final health report; **`-Force`** additionally resets the local database, regenerates TypeScript types, and seeds equipment images. **`dev-stop.ps1`** tears down Vite, Edge Functions serve, and Supabase containers with a port sweep; **`-Force`** also stops Docker Desktop. Both scripts report partial failures and exit **`1`** when any step fails. Removed temporary debug logging to `debug-520e57.log`.

- **Unified work-order export model (Service Report + Internal Packet)** — Work-order exports now follow two first-class deliverables instead of mixed piecemeal actions. The single-work-order PDF flow is explicitly framed as a customer-safe **Service Report PDF** (including customer context when linked through equipment), while single-work-order Excel export now produces the same internal multi-sheet **Internal Work Order Packet** concept used by detailed work-order reporting. UI labels and export copy were updated across work-order detail actions, mobile action sheet, quick actions, and reports so users can clearly distinguish external-shareable vs internal-operational exports.

- **Internal packet export surfaces now include Google Docs** — Reports dialog and work-order detail actions now support creating Google Docs versions of the Internal Work Order Packet when Google Workspace is connected and a destination is configured.

- **Google integration environment/setup documentation hardened** — Added explicit Google Picker API key + App ID setup, scope matrix, deployment-surface ownership (Vercel/client vs Supabase secrets), and corrected Google Workspace secret naming drift in docs (`docs/ops/deployment.md`, `docs/ops/supabase-branch-secrets.md`, `docs/ops/local-supabase-development.md`, `docs/technical/setup.md`, `.env.example`, `README.md`).

- **Privacy policy SLA alignment** — Section 9 general response timing and Section 14 contact response timing updated from **30 days** to **45 calendar days** to match the California-specific Section 10A standard and avoid conflicting deadlines.

### Fixed

- **Google Docs export destination after folder pick (stale Workspace scopes)** — Organization Settings now **preflights** required Drive scopes (`drive.file`, `drive.readonly`) before opening the picker; when the stored org connection is missing them, **Choose/Change Destination** is disabled with an inline **reconnect** path instead of failing only after selection. Save errors from `set-google-export-destination` are mapped to distinct user guidance for **insufficient scopes**, **revoked/expired tokens**, and **not connected**. Returning from OAuth with **`gw_connected=true`** shows a success toast, refreshes Workspace queries, and strips the param from the URL. Added **Reconnect Google Workspace** on the integration card when already connected. Shared scope helpers live in `google-workspace` auth; regression tests cover reconnect, destination preflight, org return handling, and service error codes.

- **Google Docs destination picker blocked by CSP** — Updated app CSP headers to allow Google Picker and Google Identity script/origin requirements (`apis.google.com`, `accounts.google.com`) and Supabase Realtime websocket connections (`wss://*.supabase.co`) so **Organization -> Choose Destination** can load the picker flow in preview and local environments.

- **Supabase function search-path security warnings** — Added a forward-only migration to recreate `public.anonymize_audit_changes` and `public.prevent_dsr_event_mutation` with `SET search_path = ''`, clearing the advisor's `function_search_path_mutable` findings without changing function behavior. Added focused pgTAP regression checks in `supabase/tests/06_dsr_requests_and_privacy.sql` so the warnings do not silently return.

- **Supabase performance advisor WARN findings** — Eliminated all WARN-level findings for the targeted remediation pass on `equipqr-prod`: consolidated overlapping permissive RLS policies, replaced row-wise `auth.uid()` / `auth.role()` policy calls with `(select ...)` initPlan-safe forms across flagged policies, and removed the duplicate `work_orders` `(organization_id, status)` index. Added pgTAP coverage in `supabase/tests/08_advisor_warn_perf_remediation.sql`.

- **Supabase foreign-key advisor coverage for active tables** — Added covering indexes for the active-table foreign keys flagged by the advisor (including DSR, inventory, parts, QuickBooks OAuth, teams, dashboard preferences, and workspace domains) while keeping cleanup conservative for deprecated billing and legacy part-picker tables.

- **Supabase performance advisor INFO findings (deprecated schema cleanup)** — Removed deprecated billing tables and resurrected legacy global part-picker tables that were still generating advisor noise on `equipqr-prod`, including stale `slot_purchases` backreferences from `organization_invitations` and `organization_members`. Added forward-only cleanup migrations and baseline-squash guidance so future baselines do not recreate dropped schema.

- **Supabase performance advisor INFO findings (unused index reduction)** — Dropped non-FK unused indexes that had zero scans and no remaining structural purpose, while preserving FK-covering indexes that still appear as unused until production traffic exercises them. Added a follow-up `dsr_requests.organization_id` index after the advisor correctly flagged lost FK coverage when the old composite partial index was removed.

- **Retired legacy Stripe billing edge-function surface** — Removed deprecated Stripe billing endpoints and Supabase function config entries (`stripe-license-webhook`, `stripe-webhook`, `purchase-user-licenses`, `create-checkout`, `customer-portal`, and `manage-billing-exemptions`) so runtime behavior matches the dropped billing schema.

- **Retired billing slot compatibility listeners/hooks** — Removed deprecated `organization_slots` realtime subscription and obsolete slot compatibility hooks/query keys so clients no longer subscribe to dropped billing tables.

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

- **dev-start 1Password env sync** — `dev-start.bat` now runs one PowerShell script (`scripts/sync-1password-dev-envs.ps1`) to sync both root `.env` and `supabase/functions/.env` in a single session. `sync-1password-app-env.ps1` and `sync-1password-edge-env.ps1` are thin wrappers for standalone use.
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

[Unreleased]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.18.0...HEAD
[3.18.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.17.0...v3.18.0
[3.11.3]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.11.2...v3.11.3
[3.11.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.11.1...v3.11.2
[3.11.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.11.0...v3.11.1
[3.11.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.10.0...v3.11.0
[3.10.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.9.3...v3.10.0
[3.9.3]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.9.2...v3.9.3
[3.9.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.9.1...v3.9.2
[3.9.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.9.0...v3.9.1
[3.9.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.8.7...v3.9.0
[3.8.7]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.8.6...v3.8.7
[3.8.6]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.8.5...v3.8.6
[3.8.5]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.8.4...v3.8.5
[3.8.4]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.8.3...v3.8.4
[3.8.3]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.8.2...v3.8.3
[3.8.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.8.1...v3.8.2
[3.8.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.8.0...v3.8.1
[3.8.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.6.4...v3.8.0
[3.6.4]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.6.3...v3.6.4
[3.6.3]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.6.2...v3.6.3
[3.6.2]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v3.6.1...v3.6.2
[2.8.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.7.1...v2.8.0
[2.7.1]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.7.0...v2.7.1
[2.7.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.6.0...v2.7.0
[2.6.0]: https://github.com/Columbia-Cloudworks-LLC/EquipQR/compare/v2.5.2...v2.6.0
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
