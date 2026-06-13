#Requires -Version 5.1
<#
.SYNOPSIS
  Configure env vars for local Google sign-in Playwright tests (storage-state replay).

.DESCRIPTION
  Local Google E2E reuses a captured Playwright storage state for nicholas.king@columbiacloudworks.com.
  Capture once (headed, while at the machine):

    npm run e2e:google-auth:capture

  That writes tmp/playwright/auth/google-workspace-local.json. Subsequent runs replay cookies
  without repeating Google login or 2-Step Verification.

.EXAMPLE
  . .\scripts\e2e\Load-GoogleLocalAuthEnv.ps1
  npx playwright test e2e/user/full/google-workspace-local.integration.spec.ts `
    --config playwright.user.config.ts --project google-oauth-local --reporter=line
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$StorageState = 'tmp/playwright/auth/google-workspace-local.json'
)

$ErrorActionPreference = 'Stop'

$env:E2E_REAL_AUTH_BASE_URL = $BaseUrl
$env:E2E_REAL_AUTH_STORAGE_STATE = $StorageState

# Completed work order in nicholas.king local org ("My Organization"); override when needed.
if (-not $env:E2E_GOOGLE_DOCS_WORK_ORDER_ID) {
    $env:E2E_GOOGLE_DOCS_WORK_ORDER_ID = 'd00e8400-e29b-41d4-a716-446655440002'
}

Write-Host "Local Google E2E base URL: $BaseUrl"
Write-Host "Storage state: $StorageState"
Write-Host "Work order ID: $env:E2E_GOOGLE_DOCS_WORK_ORDER_ID"
if (-not (Test-Path $StorageState)) {
    Write-Host "Storage state file missing. Run: npm run e2e:google-auth:capture"
}
