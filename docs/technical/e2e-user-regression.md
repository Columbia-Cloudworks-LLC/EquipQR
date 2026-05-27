# Playwright User Regression (Local)

Browser end-to-end tests exercise the real local dev stack (Vite + Supabase seeds + Dev Quick Login). They complement Vitest journey tests in `src/tests/journeys/`.

## Quick start

```powershell
# Default: headed critical suite, starts dev stack if needed
.\dev-test.bat

# Full regression (headed)
.\dev-test.bat full

# Headless (CI-style)
.\dev-test.bat headless

# Reset DB then run
.\dev-test.bat reset-db

# Playwright inspector (passes -PlaywrightDebug to the runner)
.\dev-test.bat debug

# npm equivalents (headless, stack auto-start)
npm run test:e2e:critical
npm run test:e2e:full
npm run test:e2e:headed
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
| `dev-test.bat` | One-click wrapper (headed critical by default) |

Demo recording still uses `playwright.config.ts` and `e2e/demo-smoke.spec.ts`.

## Reports

On failure, open `tmp/playwright/report/index.html`. Traces and videos are retained under `tmp/playwright/test-results/`.

## Tags

- `@critical` — auth, nav, equipment, work orders, inventory, RBAC
- `@full` — PM templates, bulk routes, QR, fleet map, org/integrations, notifications/settings/reports, support/audit/DSR
