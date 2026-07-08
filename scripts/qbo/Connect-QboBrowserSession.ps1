#Requires -Version 5.1
<#
.SYNOPSIS
  Establish (or reuse) an unattended QuickBooks Online browser session for agent automation.

.DESCRIPTION
  Loads the quickbooks-developer credentials from the EquipQR Agents 1Password vault
  into process env (never printed), then runs scripts/qbo/qbo-browser-signin.mjs which
  signs into app.qbo.intuit.com handling the password + TOTP challenges. The session is
  persisted in tmp/qbo-automation/profile so follow-up Playwright scripts (invoice
  capture, QBO verification) reuse it without re-authenticating.

  TOTP codes are read fresh from 1Password at challenge time, so no manual 2FA input
  is required. If Intuit escalates to an email/SMS challenge (rare), the script exits 1
  and the maintainer should complete that challenge once — afterwards the persisted
  profile keeps working.

.PARAMETER TargetUrl
  Page to land on after sign-in. Defaults to the QBO homepage.

.EXAMPLE
  .\scripts\qbo\Connect-QboBrowserSession.ps1

.EXAMPLE
  .\scripts\qbo\Connect-QboBrowserSession.ps1 -TargetUrl "https://app.qbo.intuit.com/app/invoice?txnId=1843"
#>
[CmdletBinding()]
param(
    [string]$TargetUrl = 'https://qbo.intuit.com/app/homepage'
)

$ErrorActionPreference = 'Stop'

if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
    $env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
}

$env:QBO_USERNAME = (op read 'op://EquipQR Agents/quickbooks-developer/username').Trim()
$env:QBO_PASSWORD = (op read 'op://EquipQR Agents/quickbooks-developer/password').Trim()
$env:QBO_TARGET_URL = $TargetUrl

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $repoRoot
try {
    node scripts/qbo/qbo-browser-signin.mjs
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
    Remove-Item Env:QBO_PASSWORD -ErrorAction SilentlyContinue
}

if ($exitCode -ne 0) {
    throw "QuickBooks browser sign-in failed (exit $exitCode). Check tmp/qbo-automation/shots/signin-*.png"
}

Write-Host 'QuickBooks browser session ready (profile: tmp/qbo-automation/profile)'
