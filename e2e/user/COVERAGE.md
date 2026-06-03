# EquipQR Playwright User Regression Coverage

Local command matrix:

| Command | Scope |
|---------|--------|
| `npm run test:e2e` / `dev-test.bat` | `@critical` smoke (fast) |
| `npm run test:e2e:full` | `@full` workflows (auto `db reset`) |
| `npm run test:e2e:local-full` | `setup` + `critical` + `full` with `db reset` |

Out of scope (deferred external): live Google Workspace OAuth/sync, QuickBooks OAuth/connect/export success.

## Coverage map

| Workflow | Tier | Spec |
|----------|------|------|
| Marketing routes | critical | `critical/public-routes.spec.ts` |
| Auth quick login storage | critical | `critical/auth.spec.ts`, `setup/auth.setup.ts` |
| Auth lifecycle (sign-in, logout, guards) | critical | `critical/auth-lifecycle.spec.ts` |
| Signup success UX | full | `full/signup-success.spec.ts` |
| Public/legal/support routes | critical | `critical/public-routes.spec.ts` |
| Privacy request intake | full | `full/privacy-request.spec.ts` |
| Invitation preview | full | `full/invitation-accept.spec.ts` |
| Dashboard sidebar navigation | critical | `critical/dashboard-nav.spec.ts` |
| RBAC sidebar / teams | critical | `critical/rbac.spec.ts` |
| Org switching | full | `full/org-switching.spec.ts` |
| Team roles / QR requestor | full | `full/team-roles.spec.ts` |
| Equipment list/detail/search | critical | `critical/equipment.spec.ts` |
| Equipment detail tabs | full | `full/equipment-detail-tabs.spec.ts` |
| Scan history tab | full | `full/equipment-scan-history.spec.ts` |
| Dashboard scanner | critical | `critical/scan-page.spec.ts` |
| QR redirects | full | `full/qr-redirects.spec.ts` |
| Work orders read paths | critical | `critical/work-orders.spec.ts` |
| Work order lifecycle statuses | full | `full/work-order-lifecycle.spec.ts` |
| PM checklist on WO | full | `full/work-order-pm-checklist.spec.ts` |
| WO notes/costs | full | `full/work-order-notes-costs-images.spec.ts` |
| Mobile WO field QA | full | `full/mobile-work-order-details-qa.spec.ts` |
| Equipment + WO creation | full | `full/equipment-work-order-creation.spec.ts` |
| Inventory + alternates creation | full | `full/inventory-alternate-groups-creation.spec.ts` |
| Inventory read | critical | `critical/inventory.spec.ts` |
| Bulk grids / part lookup | full | `full/bulk-and-parts.spec.ts` |
| PM templates list | full | `full/pm-templates.spec.ts` |
| PM template editor/view | full | `full/pm-template-editor.spec.ts` |
| Organization / integrations UI | full | `full/org-integrations.spec.ts` |
| Teams list/detail | full | `full/org-integrations.spec.ts`, `full/team-detail-management.spec.ts` |
| Fleet map | full | `full/fleet-map.spec.ts` |
| Notifications/settings/reports shell | full | `full/notifications-settings.spec.ts` |
| Reports export download | full | `full/reports-downloads.spec.ts` |
| Settings profile | full | `full/settings-profile.spec.ts` |
| Support / audit / DSR cockpit | full | `full/support-audit-dsr.spec.ts` |
| DSR case detail | full | `full/dsr-case.spec.ts` |
| Mobile bottom nav | full | `full/mobile-navigation.spec.ts` |
| PWA offline (preview build) | full | `full/pwa-offline.spec.ts` (needs `E2E_PWA_PREVIEW_URL`) |

## Vitest-only (not duplicated in Playwright)

| Workflow | Notes |
|----------|--------|
| QuickBooks export button disconnected state | `src/tests/quickbooks/` |
| Google Workspace integration panels | `OrganizationIntegrations.test.tsx` |
| DSR cockpit API flows | `src/tests/e2e/dsr-cockpit.spec.ts` |

## Seed fixtures

Playwright-specific rows: `supabase/seeds/29_e2e_playwright_fixtures.sql` (requestor role, pending invitation, DSR case).
