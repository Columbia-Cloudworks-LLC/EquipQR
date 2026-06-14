#Requires -Version 5.1
<#
.SYNOPSIS
  Configure env vars for local QuickBooks integration Playwright replay.

.DESCRIPTION
  After npm run e2e:quickbooks-auth:capture, replays the saved EquipQR session and
  documents where OAuth tokens live (quickbooks_credentials in local Supabase).

.EXAMPLE
  . .\scripts\e2e\Load-QuickBooksLocalAuthEnv.ps1
  npx playwright test e2e/user/full/quickbooks-local.integration.spec.ts `
    --config playwright.user.config.ts --project quickbooks-local --reporter=line
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$StorageState = 'tmp/playwright/auth/quickbooks-local.json',
    [string]$OrganizationId = '057f571c-0107-4ef2-b095-ac4fb21a7288',
    [string]$WorkOrderId = 'f3720510-beeb-4787-9e81-480e6439ac69'
)

$ErrorActionPreference = 'Stop'

$env:E2E_REAL_AUTH_BASE_URL = $BaseUrl
$env:E2E_QB_LOCAL_AUTH_STORAGE_STATE = $StorageState
$env:E2E_QB_ORG_ID = $OrganizationId
$env:E2E_QBO_WORK_ORDER_ID = $WorkOrderId

Write-Host "Local QuickBooks E2E base URL: $BaseUrl"
Write-Host "Storage state: $StorageState"
Write-Host "Organization ID: $OrganizationId"
Write-Host "Work order ID: $WorkOrderId"
if (-not (Test-Path $StorageState)) {
    Write-Host "Storage state file missing. Run: npm run e2e:quickbooks-auth:capture"
}
Write-Host "API probe: .\scripts\qbo\Invoke-QboQuery.ps1 -StatusOnly"
