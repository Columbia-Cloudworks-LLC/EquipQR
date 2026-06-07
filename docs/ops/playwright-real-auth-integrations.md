# Playwright real-auth integrations (Google + QuickBooks)

Opt-in Playwright project for validating connected vendor integrations on **preview** using a real Google Workspace account and production QuickBooks Online cookies. This path is **not** part of default `critical`, `full`, or `local-full` regression runs.

## Account contract

| Role | Value |
|------|--------|
| EquipQR sign-in | `nicholas.king@columbiacloudworks.com` (Google OAuth) |
| Target app | `https://preview.equipqr.app` |
| QuickBooks | Production QBO company (`app.qbo.intuit.com`) |
| Storage file | `tmp/playwright/auth/nicholas-google-qbo.json` (gitignored) |

## Capture storage state (one-time / refresh)

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
   - Open `https://app.qbo.intuit.com/app/homepage` in the **same** browser tab/window and sign into the production QuickBooks company
   - Close codegen (file is saved automatically)

Never commit `tmp/playwright/auth/nicholas-google-qbo.json`. It contains live session cookies.

## Required environment variables

| Variable | Required for | Description |
|----------|----------------|-------------|
| `E2E_REAL_AUTH_STORAGE_STATE` | All `@real-auth` tests | Path to captured storage JSON |
| `E2E_REAL_AUTH_BASE_URL` | Optional | Defaults to `https://preview.equipqr.app` |
| `E2E_QBO_WORK_ORDER_ID` | Export test only | Known-safe **completed** preview work order UUID (`1660137f-a803-4510-9a0a-96c7048d0eb4`) |
| `E2E_ALLOW_QBO_PRODUCTION_DRAFTS` | Export test only | Must be `true` to opt in to production draft invoice create/update |

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

### Full real-auth suite (includes production QBO export)

```powershell
$env:E2E_REAL_AUTH_STORAGE_STATE = "tmp\playwright\auth\nicholas-google-qbo.json"
$env:E2E_REAL_AUTH_BASE_URL = "https://preview.equipqr.app"
$env:E2E_QBO_WORK_ORDER_ID = "1660137f-a803-4510-9a0a-96c7048d0eb4"
$env:E2E_ALLOW_QBO_PRODUCTION_DRAFTS = "true"
npx playwright test --config=playwright.user.config.ts --project=real-auth-integrations --headed
```

## What the tests do

| Test | Tag | Side effects |
|------|-----|----------------|
| Connected integrations preflight | `@real-auth` | Read-only |
| Export work order + open QBO invoice | `@real-auth` | Creates or updates a **draft** invoice in production QBO |

Spec file: `e2e/user/full/real-auth-integrations.spec.ts`

## Failure modes

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Redirect to `/auth` | Expired EquipQR session | Re-capture storage state |
| Intuit sign-in page when opening invoice | Expired QBO cookies | Re-capture storage state with QBO login in same context |
| `Export to QuickBooks` menu item missing | WO not completed, no team mapping, or QB not connected | Fix data/preconditions on preview |
| `Export failed:` toast | Intuit API / mapping / tax errors | Check edge function response in Playwright trace |
| `QuickBooks Setup Required` | Team customer mapping missing | Map team in Team Settings |
| Tests skipped | Missing env vars | Set variables per table above |
| `VITE_ENABLE_QUICKBOOKS` false on preview | Feature flag off | QuickBooks UI hidden; fix preview public env |
| QBO OAuth sends the browser to `supabase.preview.equipqr.app` | Stale Vercel build or retired hostname in vendor console | Ensure `VITE_SUPABASE_URL` is `https://olsdirkvvfegvclbpgrg.supabase.co` and Intuit redirect URI matches the derived callback URL |

## Safety rails

- No Google or Intuit passwords in repo config, env files, or test code
- No automated Google/Intuit login in test bodies
- Export test requires explicit `E2E_ALLOW_QBO_PRODUCTION_DRAFTS=true`
- Project `real-auth-integrations` is excluded from default `dev-test.bat` / `run-user-regression.ps1` suites
