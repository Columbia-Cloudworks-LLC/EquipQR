# Playwright real-auth integrations (Google + QuickBooks)

Opt-in Playwright project for validating connected vendor integrations on **preview** using a real Google Workspace account and **sandbox** QuickBooks Online cookies. This path is **not** part of default `critical`, `full`, or `local-full` regression runs.

## Account contract

| Role | Value |
|------|--------|
| EquipQR sign-in | `nicholas.king@columbiacloudworks.com` (Google OAuth) |
| Target app | `https://preview.equipqr.app` |
| QuickBooks | Sandbox QBO company (`app.sandbox.qbo.intuit.com`) — preview edge sets `QBO_USE_SANDBOX=true` |
| Storage file | `tmp/playwright/auth/nicholas-google-qbo.json` (gitignored) |

## Capture storage state (one-time / refresh)

### Preview (Google sign-in + QuickBooks)

1. Install Chromium if needed: `npx playwright install chromium`
2. Capture auth in a headed browser:

```powershell
New-Item -ItemType Directory -Force -Path "tmp\playwright\auth" | Out-Null

npx playwright codegen "https://preview.equipqr.app/auth?tab=signin" `
  --save-storage="tmp/playwright/auth/nicholas-google-qbo.json"
```

3. In the codegen browser:
   - Click **Continue with Google** and sign in as `nicholas.king@columbiacloudworks.com`
   - Wait until `/dashboard` loads
   - Open `https://app.sandbox.qbo.intuit.com/app/homepage` in the **same** browser tab/window and sign into a **sandbox** QuickBooks company
   - Close codegen (file is saved automatically)

Never commit `tmp/playwright/auth/nicholas-google-qbo.json`. It contains live session cookies.

### Local dev (Google sign-in + Google Workspace)

Quick-login personas cannot complete Google Workspace OAuth. Capture storage state once in a headed browser:

```powershell
# Local stack must be running (.\dev-start.bat)
npm run e2e:google-auth:capture
```

In the opened browser:

1. Click **Continue with Google** and sign in as `nicholas.king@columbiacloudworks.com`.
2. If Google Workspace is not connected on Integrations, click **Connect Google Workspace** and finish consent (one-time setup).
3. Wait for the setup script to save `tmp/playwright/auth/google-workspace-local.json`.

### Local dev (EquipQR ↔ QuickBooks integration)

OAuth tokens are stored in local Supabase (`quickbooks_credentials`) after Intuit redirects to the edge callback. A Playwright storage file replays the EquipQR session only.

```powershell
# Local stack must be running (.\dev-start.bat)
npm run e2e:quickbooks-auth:capture
```

In the opened browser:

1. Sign in to EquipQR if redirected to `/auth` (reuses `google-workspace-local.json` when present).
2. On **Organization → Integrations**, click **Connect** on the QuickBooks Online card.
3. Complete Intuit sign-in and authorize your company.
4. Wait until the script sees **Connected** and saves `tmp/playwright/auth/quickbooks-local.json`.

Verify API access without the UI:

```powershell
.\scripts\qbo\Invoke-QboQuery.ps1 -StatusOnly
.\scripts\qbo\Invoke-QboQuery.ps1 -Query "select Id, DisplayName from Customer maxresults 5"
```

Run local QuickBooks preflight (headless replay):

```powershell
. .\scripts\e2e\Load-QuickBooksLocalAuthEnv.ps1
npx playwright test e2e/user/full/quickbooks-local.integration.spec.ts `
  --config playwright.user.config.ts --project quickbooks-local --reporter=line
```

### Local dev (Intuit Developer Portal)

There is no CLI for developer portal settings (redirect URIs, keys). Capture browser storage once:

```powershell
npm run e2e:quickbooks-developer-auth:capture
```

Sign in at `developer.intuit.com` (SMS/email verification as required). Output: `tmp/playwright/auth/quickbooks-developer-local.json`.

```powershell
. .\scripts\e2e\Load-QuickBooksDeveloperStorageEnv.ps1
# Agents replay E2E_QB_DEVELOPER_AUTH_STORAGE_STATE in Playwright / browser MCP
```

Vault password fallback (when storage expires): `. .\scripts\e2e\Load-QuickBooksDeveloperEnv.ps1`

### Run local Google Docs export test (headless replay)

```powershell
. .\scripts\e2e\Load-GoogleLocalAuthEnv.ps1
npx playwright test e2e/user/full/google-workspace-local.integration.spec.ts `
  --config playwright.user.config.ts --project google-oauth-local --reporter=line
```

Optional: set `E2E_GOOGLE_DOCS_WORK_ORDER_ID` to a **completed** work order UUID in your org; otherwise the spec picks the first completed row from the work orders list.

The test exports a work order to Google Docs and opens the returned `document_url` on `docs.google.com` to confirm the session is authenticated. It does **not** exercise connect/disconnect flows.

## Required environment variables

| Variable | Required for | Description |
|----------|----------------|-------------|
| `E2E_REAL_AUTH_STORAGE_STATE` | All `@real-auth` tests | Path to captured storage JSON |
| `E2E_REAL_AUTH_BASE_URL` | Optional | Defaults to `https://preview.equipqr.app` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Protected preview runs | Vercel Deployment Protection bypass secret from `op://EquipQR Agents/vercel-automation-bypass/VERCEL_AUTOMATION_BYPASS_SECRET` |
| `E2E_QBO_WORK_ORDER_ID` | Export test only | Known-safe **completed** preview work order UUID (`1660137f-a803-4510-9a0a-96c7048d0eb4`) |
| `E2E_ALLOW_QBO_DRAFTS` | QBO export test only | Must be `true` to opt in to **sandbox** draft invoice create/update on preview |
| `E2E_ALLOW_QBO_PRODUCTION_DRAFTS` | Rare prod QBO export test | When `true`, export test expects production QBO and opens `app.qbo.intuit.com` |
| `E2E_GOOGLE_DOCS_WORK_ORDER_ID` | Local Google Docs export | Optional completed work order UUID for `google-workspace-local.integration.spec.ts` |
| `E2E_QB_LOCAL_AUTH_STORAGE_STATE` | Local QB integration replay | Defaults to `tmp/playwright/auth/quickbooks-local.json` |
| `E2E_QB_DEVELOPER_AUTH_STORAGE_STATE` | Developer portal replay | Defaults to `tmp/playwright/auth/quickbooks-developer-local.json` |
| `E2E_QB_ORG_ID` | `Invoke-QboQuery.ps1` | Organization UUID for credential lookup (defaults to first row) |

Load the Vercel bypass secret before running tests against protected preview:

```powershell
$env:VERCEL_AUTOMATION_BYPASS_SECRET = op read "op://EquipQR Agents/vercel-automation-bypass/VERCEL_AUTOMATION_BYPASS_SECRET"
```

To reuse a Google-only storage state as a starting point for the combined EquipQR + QBO state:

```powershell
npx playwright codegen "https://preview.equipqr.app/auth?tab=signin" `
  --load-storage="tmp/playwright/auth/google-business.json" `
  --save-storage="tmp/playwright/auth/nicholas-google-qbo.json"
```

### Work order preconditions

The export test work order must:

- Have `status = completed`
- Belong to equipment assigned to a team
- Have that team/customer mapped to QuickBooks
- Live in the same organization the Nicholas account can manage QuickBooks for

## Run commands

### Preflight only (integrations connected)

```powershell
$env:E2E_REAL_AUTH_STORAGE_STATE = "tmp\playwright\auth\nicholas-google-qbo.json"
$env:E2E_REAL_AUTH_BASE_URL = "https://preview.equipqr.app"
npx playwright test --config=playwright.user.config.ts --project=real-auth-integrations --headed -g "preflight"
```

### Full real-auth suite (includes sandbox QBO export)

```powershell
$env:E2E_REAL_AUTH_STORAGE_STATE = "tmp\playwright\auth\nicholas-google-qbo.json"
$env:E2E_REAL_AUTH_BASE_URL = "https://preview.equipqr.app"
$env:E2E_QBO_WORK_ORDER_ID = "1660137f-a803-4510-9a0a-96c7048d0eb4"
$env:E2E_ALLOW_QBO_DRAFTS = "true"
npx playwright test --config=playwright.user.config.ts --project=real-auth-integrations --headed
```

## What the tests do

| Test | Tag | Side effects |
|------|-----|----------------|
| Connected integrations preflight | `@real-auth` | Read-only |
| Export work order + open QBO invoice | `@real-auth` | Creates or updates a **draft** invoice in **sandbox** QBO (preview) |

Spec file: `e2e/user/full/real-auth-integrations.spec.ts`

## Failure modes

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Redirect to `/auth` | Expired EquipQR session | Re-capture storage state |
| Intuit sign-in page when opening invoice | Expired QBO cookies | Re-capture storage state with sandbox QBO login in same context |
| `Export to QuickBooks` menu item missing | WO not completed, no team mapping, or QB not connected | Fix data/preconditions on preview |
| `Export failed:` toast | Intuit API / mapping / tax errors | Check edge function response in Playwright trace |
| `QuickBooks Setup Required` | Team customer mapping missing | Map team in Team Settings |
| Tests skipped | Missing env vars | Set variables per table above |
| QBO OAuth sends the browser to `supabase.preview.equipqr.app` | Stale Vercel build or retired hostname in vendor console | Ensure `VITE_SUPABASE_URL` is `https://olsdirkvvfegvclbpgrg.supabase.co` and Intuit redirect URI matches the derived callback URL |

## Safety rails

- No Google or Intuit passwords in repo config, env files, or test code
- No automated Google/Intuit login in test bodies
- Export test requires explicit `E2E_ALLOW_QBO_DRAFTS=true` (sandbox on preview). Use `E2E_ALLOW_QBO_PRODUCTION_DRAFTS=true` only when intentionally testing live QBO.
- Project `real-auth-integrations` is excluded from default `dev-test.bat` / `run-user-regression.ps1` suites
