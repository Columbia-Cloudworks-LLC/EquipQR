# Playwright User Regression (Local)

Browser end-to-end tests exercise the real local dev stack (Vite + Supabase seeds + Dev Quick Login). They complement Vitest journey tests in `src/tests/journeys/`.

## Quick start

```powershell
# Default: headless critical suite, starts dev stack if needed
.\dev-test.bat

# Full regression (headless)
.\dev-test.bat full

# Watch the browser without interacting
.\dev-test.bat watch
.\dev-test.bat full watch

# Record reusable support-documentation videos
.\dev-test.bat record
.\dev-test.bat full record
.\dev-test.bat full watch record

# Plain headed, normal speed
.\dev-test.bat headed

# Reset DB then run
.\dev-test.bat reset-db

# Playwright inspector (passes -PlaywrightDebug to the runner)
.\dev-test.bat debug

# npm equivalents (headless, stack auto-start)
npm run test:e2e:critical
npm run test:e2e:full
npm run test:e2e:headed
npm run test:e2e:watch
npm run test:e2e:record
```

## Prerequisites

- Node 24.x and `npm ci`
- Playwright Chromium: `npx playwright install chromium`
- Local secrets via 1Password (`OP_SERVICE_ACCOUNT_TOKEN` or interactive `op`) so `dev-start.bat` can render `.env`
- Seeded users from `supabase/seeds/` (password `password123` unless `VITE_DEV_TEST_PASSWORD` overrides)

## Layout

| Path | Role |
|------|------|
| `playwright.user.config.ts` | User regression config (`setup`, `critical`, `full` projects) |
| `e2e/user/setup/auth.setup.ts` | Saves storage state per persona under `tmp/playwright/auth/` |
| `e2e/user/critical/*.spec.ts` | Fast suite (`@critical`) — run after most changes |
| `e2e/user/full/*.spec.ts` | Broader suite (`@full`) — before push/release |
| `scripts/run-user-regression.ps1` | Stack probe, optional `dev-start`, Playwright runner |
| `dev-test.bat` | One-click wrapper (headless critical by default; `watch` and `record` modes available) |

Demo recording still uses `playwright.config.ts` and `e2e/demo-smoke.spec.ts`.

## Watch And Recording Modes

`watch` mode is non-interactive. It opens Chromium, slows actions down with Playwright `slowMo`, and injects a small EquipQR E2E status overlay into pages. It is for observing the regression flow, not for clicking around manually.

`record` mode saves video for every test under `tmp/playwright/test-results/`. Videos include Playwright action/test annotations when supported, so they are easier to reuse for support documentation. Use `full record` when you want broad product footage, or `full watch record` when you want slower footage with the in-page EquipQR E2E overlay visible in the recording.

You can tune watch speed without editing files:

```powershell
$env:E2E_SLOW_MO_MS = "800"
$env:E2E_WATCH_PAUSE_MS = "1000"
.\dev-test.bat watch
```

## Reports

On failure, open `tmp/playwright/report/index.html`. Traces and failure videos are retained under `tmp/playwright/test-results/`; `record` keeps videos for successful tests too.

## Tags

- `@critical` — auth, nav, equipment, work orders, inventory, RBAC
- `@full` — PM templates, bulk routes, QR, fleet map, org/integrations, notifications/settings/reports, support/audit/DSR
