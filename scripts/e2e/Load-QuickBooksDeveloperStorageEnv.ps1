#Requires -Version 5.1
<#
.SYNOPSIS
  Configure env vars for Intuit Developer Portal Playwright storage replay.

.DESCRIPTION
  After npm run e2e:quickbooks-developer-auth:capture, agents load this path before
  browser automation against developer.intuit.com (redirect URIs, keys, sandboxes).

.EXAMPLE
  . .\scripts\e2e\Load-QuickBooksDeveloperStorageEnv.ps1
  # Use E2E_QB_DEVELOPER_AUTH_STORAGE_STATE with Playwright or browser MCP load-storage flows
#>
[CmdletBinding()]
param(
    [string]$StorageState = 'tmp/playwright/auth/quickbooks-developer-local.json'
)

$ErrorActionPreference = 'Stop'

$env:E2E_QB_DEVELOPER_AUTH_STORAGE_STATE = $StorageState

Write-Host "Intuit Developer Portal storage state: $StorageState"
if (-not (Test-Path $StorageState)) {
    Write-Host "Storage state file missing. Run: npm run e2e:quickbooks-developer-auth:capture"
}
Write-Host "Vault credentials (manual sign-in fallback): . .\scripts\e2e\Load-QuickBooksDeveloperEnv.ps1"
