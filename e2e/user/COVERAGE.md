# EquipQR Playwright User Regression Coverage

Local command matrix:

| Command | Scope |
|---------|--------|
| `npm run test:e2e` / VS Code task "EquipQR: E2E Critical (headless)" | `@critical` smoke (fast) |
| `npm run test:e2e:full` | `@full` workflows (auto `db reset`) |
| `npm run test:e2e:local-full` | `setup` + `critical` + `full` with `db reset` |
| `npm run test:e2e:mobile-critical` | `@critical` smoke in the mobile viewport |
| `npm run test:e2e:both-critical` | `@critical` smoke in desktop and mobile viewports |
| `npm run test:e2e:demo` | 1080p desktop demo recording with step pacing and target highlights |
| VS Code task "EquipQR: E2E Mobile Watch + Record (demo, resets local DB)" | Mobile demo recording (`full` suite) with touch viewport and target highlights |

Out of scope for default regression: live Google Workspace OAuth/sync, QuickBooks OAuth/connect/export success.

Opt-in real-auth project (`real-auth-integrations`, tag `@real-auth`): preview + captured storage state for connected Google Workspace and production QuickBooks export. See [docs/ops/playwright-real-auth-integrations.md](../../docs/ops/playwright-real-auth-integrations.md).

## Coverage map

| Workflow | Tier | Spec | Viewports |
|----------|------|------|-----------|
| Marketing routes | critical | `critical/public-routes.spec.ts` | desktop + mobile critical |
| Auth quick login storage | critical | `critical/auth.spec.ts`, `setup/auth.setup.ts` | desktop + mobile critical |
| Auth lifecycle (sign-in, logout, guards) | critical | `critical/auth-lifecycle.spec.ts` | desktop + mobile critical |
| Signup success UX | full | `full/signup-success.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Public/legal/support routes | critical | `critical/public-routes.spec.ts` | desktop + mobile critical |
| Privacy request intake | full | `full/privacy-request.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Invitation preview | full | `full/invitation-accept.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Dashboard sidebar/navigation shell | critical | `critical/dashboard-nav.spec.ts` | desktop + mobile critical via responsive helper |
| RBAC sidebar / teams | critical | `critical/rbac.spec.ts` | desktop + mobile critical via responsive helper |
| Org switching | full | `full/org-switching.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Team roles (technician cannot create teams) | full | `full/team-roles.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Equipment list/detail/search | critical | `critical/equipment.spec.ts` | desktop + mobile critical |
| Equipment detail tabs | full | `full/equipment-detail-tabs.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Scan history tab | full | `full/equipment-scan-history.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Dashboard scanner | critical | `critical/scan-page.spec.ts` | desktop + mobile critical |
| QR redirects | full | `full/qr-redirects.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Work orders read paths | critical | `critical/work-orders.spec.ts` | desktop + mobile critical |
| Work order lifecycle statuses | full | `full/work-order-lifecycle.spec.ts` | desktop full; mobile gap covered partially by mobile WO QA |
| PM checklist on WO | full | `full/work-order-pm-checklist.spec.ts` | desktop full; mobile gap covered partially by mobile WO QA |
| WO notes/costs | full | `full/work-order-notes-costs-images.spec.ts` | desktop full; mobile gap covered partially by mobile WO QA |
| Mobile WO field QA | full | `full/mobile-work-order-details-qa.spec.ts` | mobile dedicated |
| Equipment + WO creation | full | `full/equipment-work-order-creation.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Inventory + alternates creation | full | `full/inventory-alternate-groups-creation.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Inventory read | critical | `critical/inventory.spec.ts` | desktop + mobile critical |
| Bulk grids / part lookup | full | `full/bulk-and-parts.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| PM templates list | full | `full/pm-templates.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| PM template editor/view | full | `full/pm-template-editor.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Organization / integrations UI | full | `full/org-integrations.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Real-auth integrations + QBO export | real-auth (opt-in) | `full/real-auth-integrations.spec.ts` | desktop only; manual storage state |
| Teams list/detail | full | `full/org-integrations.spec.ts`, `full/team-detail-management.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Fleet map | full | `full/fleet-map.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Notifications page shell | full | `full/notifications-settings.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Reports export download | full | `full/reports-downloads.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Settings profile + Privacy → DSR cockpit link | full | `full/settings-profile.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Support / audit / DSR cockpit | full | `full/support-audit-dsr.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| DSR case detail | full | `full/dsr-case.spec.ts` | desktop full; mobile by explicit `full mobile` run |
| Mobile bottom nav | full | `full/mobile-navigation.spec.ts` | mobile dedicated |
| PWA offline (preview build) | full | `full/pwa-offline.spec.ts` (needs `E2E_PWA_PREVIEW_URL`) | desktop full; mobile by explicit `full mobile` run |

## Mobile policy

CI runs only `critical/auth.spec.ts`, from `.github/workflows/linux-development.yml` (path-filtered); `ci.yml` runs no Playwright. Every other row above runs locally only: `npm run test:e2e` (critical), `npm run test:e2e:full` (full, desktop), `npm run test:e2e:mobile-critical` / `npm run test:e2e:both-critical`, or `bash dev/linux/user-regression.sh --suite full --viewport mobile|both` for full mobile journeys. Treat the “mobile by explicit full mobile run” rows above as required for release/demo review when the touched workflow is technician-facing or layout-sensitive.

## Vitest-only (not duplicated in Playwright)

| Workflow | Notes |
|----------|--------|
| QuickBooks export button disconnected state | `src/features/work-orders/components/QuickBooksExportButton.test.tsx` |
| Google Workspace integration panels | `OrganizationIntegrations.test.tsx` |
| DSR cockpit API flows | `src/features/dsr/api/dsrApi.spec.ts` |

## Seed fixtures

Playwright-specific rows: `supabase/seeds/29_e2e_playwright_fixtures.sql` (requestor role, pending invitation, DSR case).
