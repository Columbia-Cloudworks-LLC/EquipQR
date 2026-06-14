#Requires -Version 5.1
<#
.SYNOPSIS
  Load Intuit Developer / QuickBooks sandbox sign-in env vars for agent browser automation.

.DESCRIPTION
  Sources credentials from the EquipQR Agents vault item `quickbooks-developer`.
  Prefer captured developer portal storage when available:
    npm run e2e:quickbooks-developer-auth:capture
    . .\scripts\e2e\Load-QuickBooksDeveloperStorageEnv.ps1

  Use vault credentials only when storage replay fails (SMS/password during capture).

.EXAMPLE
  . .\scripts\e2e\Load-QuickBooksDeveloperEnv.ps1
  # Manual sign-in at https://developer.intuit.com
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
    $userScopeToken = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    if ($userScopeToken) {
        $env:OP_SERVICE_ACCOUNT_TOKEN = $userScopeToken
    }
}

$vault = 'EquipQR Agents'
$itemId = '62ng22yntivrjdt25gmsjqrin4'

$env:QUICKBOOKS_DEVELOPER_EMAIL = (op read "op://$vault/$itemId/username").Trim()
$env:QUICKBOOKS_DEVELOPER_PASSWORD = (op read "op://$vault/$itemId/password").Trim()

try {
    $otp = (op read "op://$vault/$itemId/one-time password" 2>$null)
    if ($otp) {
        $env:QUICKBOOKS_DEVELOPER_OTP = $otp.Trim()
    }
} catch {
    # Optional when Intuit uses email-only or backup codes.
}

Write-Host "Loaded QuickBooks developer env for $($env:QUICKBOOKS_DEVELOPER_EMAIL)"
