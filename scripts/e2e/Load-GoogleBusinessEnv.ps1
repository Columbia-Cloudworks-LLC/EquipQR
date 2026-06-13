#Requires -Version 5.1
<#
.SYNOPSIS
  Load Google Workspace admin / GCP Console sign-in env vars for agent browser automation.

.DESCRIPTION
  Sources nicholas.king@columbiacloudworks.com (Google Business) credentials from the
  Columbia Cloudworks Agents vault. Use with browser MCP when blocked on admin.google.com
  or console.cloud.google.com and gcloud MCP impersonation is insufficient.

  Playwright E2E for local Google sign-in uses captured storage state for
  nicholas.king@columbiacloudworks.com via scripts/e2e/Load-GoogleLocalAuthEnv.ps1
  and npm run e2e:google-auth:capture — not password/backup-code automation.

.EXAMPLE
  . .\scripts\e2e\Load-GoogleBusinessEnv.ps1
  # Then sign in at https://admin.google.com or https://console.cloud.google.com
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '..\op\columbia-cloudworks-agents-vault.ps1')

$env:GOOGLE_BUSINESS_EMAIL = Read-ColumbiaCloudworksOpField -ItemId $GoogleBusinessItemId -Field 'username'
$env:GOOGLE_BUSINESS_PASSWORD = Read-ColumbiaCloudworksOpField -ItemId $GoogleBusinessItemId -Field 'password'

try {
    $totp = (Read-ColumbiaCloudworksOpField -ItemId $GoogleBusinessItemId -Field 'totp' 2>$null)
    if ($totp) {
        $env:GOOGLE_BUSINESS_TOTP_SECRET = $totp
    }
} catch {
    # Optional when the business account uses backup codes instead of TOTP.
}

try {
    $backupCodes = (Read-ColumbiaCloudworksOpField -ItemId $GoogleBusinessItemId -Field 'backup_codes' 2>$null)
    if ($backupCodes) {
        $env:GOOGLE_BUSINESS_BACKUP_CODES = $backupCodes
    }
} catch {
    # Optional until backup codes are stored on the business login item.
}

Write-Host "Loaded Google Business admin env for $($env:GOOGLE_BUSINESS_EMAIL)"
