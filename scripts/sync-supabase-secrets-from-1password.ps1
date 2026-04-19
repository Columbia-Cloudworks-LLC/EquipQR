#Requires -Version 5.1
<#
.SYNOPSIS
  Sync Supabase Edge Function secrets from the EquipQR Agents 1Password vault.

.DESCRIPTION
  Reads server-side env vars from 1Password and pushes them to Supabase via
  `supabase secrets set` for the production project (and optionally preview
  branches). The 1Password source-of-truth items:

    - edge-env-prod-secrets       -> production project ymxkzronkhwxzcdcbnwq
    - edge-env-preview-secrets    -> preview branch project (if branching enabled)

  Each item must contain individual fields per env var so each can be referenced
  via op://EquipQR Agents/{item}/{field}.

.PARAMETER Check
  Read-only mode: list drift between 1Password and Supabase.

.PARAMETER ProjectRef
  Supabase project ref to sync. Defaults to production (ymxkzronkhwxzcdcbnwq).

.EXAMPLE
  .\scripts\sync-supabase-secrets-from-1password.ps1 -Check
  .\scripts\sync-supabase-secrets-from-1password.ps1 -ProjectRef ymxkzronkhwxzcdcbnwq
#>
[CmdletBinding()]
param(
    [switch]$Check,
    [string]$ProjectRef = 'ymxkzronkhwxzcdcbnwq'
)

$ErrorActionPreference = 'Stop'

$EDGE_SECRETS_MAP = @{
    'ymxkzronkhwxzcdcbnwq' = @{
        OpItem = 'edge-env-prod-secrets'
        Vars = @(
            'RESEND_API_KEY',
            'HCAPTCHA_SECRET_KEY',
            'TOKEN_ENCRYPTION_KEY',
            'KDF_SALT',
            'INTUIT_CLIENT_ID',
            'INTUIT_CLIENT_SECRET',
            'GOOGLE_WORKSPACE_CLIENT_ID',
            'GOOGLE_WORKSPACE_CLIENT_SECRET',
            'GOOGLE_MAPS_SERVER_KEY',
            'GOOGLE_MAPS_BROWSER_KEY',
            'GOOGLE_MAPS_MAP_ID',
            'VAPID_PUBLIC_KEY',
            'VAPID_PRIVATE_KEY',
            'VAPID_SUBJECT',
            'PRODUCTION_URL'
        )
    }
    'olsdirkvvfegvclbpgrg' = @{
        OpItem = 'edge-env-preview-secrets'
        Vars = @(
            'RESEND_API_KEY',
            'HCAPTCHA_SECRET_KEY',
            'TOKEN_ENCRYPTION_KEY',
            'KDF_SALT',
            'INTUIT_CLIENT_ID',
            'INTUIT_CLIENT_SECRET',
            'GOOGLE_WORKSPACE_CLIENT_ID',
            'GOOGLE_WORKSPACE_CLIENT_SECRET',
            'GOOGLE_MAPS_SERVER_KEY',
            'GOOGLE_MAPS_BROWSER_KEY',
            'GOOGLE_MAPS_MAP_ID',
            'VAPID_PUBLIC_KEY',
            'VAPID_PRIVATE_KEY',
            'VAPID_SUBJECT',
            'PRODUCTION_URL'
        )
    }
}

function Write-Step { param([string]$M) Write-Host "  [sync-supabase] $M" }
function Write-Ok   { param([string]$M) Write-Host "  [sync-supabase] OK   $M" -ForegroundColor Green }
function Write-Warn { param([string]$M) Write-Host "  [sync-supabase] WARN $M" -ForegroundColor Yellow }
function Write-Fail { param([string]$M) Write-Host "  [sync-supabase] FAIL $M" -ForegroundColor Red }

Write-Step "Validating prerequisites..."

if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
    Write-Fail "1Password CLI 'op' not found on PATH."
    exit 1
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Fail "npx not found on PATH."
    exit 1
}

$OP_VAULT = 'tgo2m6qbct5otqeqirjocn3joa'  # EquipQR Agents
$saTokenItem = 'supabase-access-token'
$saToken = & op read "op://$OP_VAULT/$saTokenItem/credential" 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($saToken)) {
    Write-Warn "1Password item '$saTokenItem' not found. Falling back to existing supabase CLI session."
    Write-Warn "  To enable headless sync, create item: op://$OP_VAULT/$saTokenItem/credential (a Supabase Personal Access Token)"
} else {
    $env:SUPABASE_ACCESS_TOKEN = $saToken.Trim()
    Write-Ok "Supabase access token loaded from 1Password"
}

if (-not $EDGE_SECRETS_MAP.ContainsKey($ProjectRef)) {
    Write-Fail "No EDGE_SECRETS_MAP entry for project ref '$ProjectRef'. Add a mapping at the top of this script."
    exit 1
}

$cfg = $EDGE_SECRETS_MAP[$ProjectRef]
$opItem = $cfg.OpItem

$itemProbe = & op item get $opItem --vault $OP_VAULT --format json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "1Password item '$opItem' not found in EquipQR Agents vault."
    Write-Fail "  Create with fields: $($cfg.Vars -join ', ')"
    exit 1
}

Write-Step "Listing current Supabase secrets for project $ProjectRef..."
$currentSecretsRaw = & npx supabase secrets list --project-ref $ProjectRef 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "supabase secrets list failed: $currentSecretsRaw"
    exit 1
}

$currentSecretsSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($line in ($currentSecretsRaw -split "`r?`n")) {
    if ($line -match '^([A-Z][A-Z0-9_]+)\s+\|') {
        $null = $currentSecretsSet.Add($matches[1])
    }
}

$totalDrift = 0
$totalApplied = 0

foreach ($var in $cfg.Vars) {
    $opValue = & op read "op://$OP_VAULT/$opItem/$var" 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($opValue)) {
        Write-Warn "  $var: missing in 1Password"
        continue
    }
    $opValue = $opValue.Trim()
    $present = $currentSecretsSet.Contains($var)

    if ($Check) {
        $marker = if ($present) { 'PRESENT' } else { 'MISSING-IN-SUPABASE' }
        Write-Step "  CHECK: $var ($marker) would be set to a $($opValue.Length)-char value"
        if (-not $present) { $totalDrift++ }
    } else {
        Write-Step "  Setting $var..."
        $env:SUPABASE_SECRET_VALUE = $opValue
        & npx supabase secrets set "$var=$opValue" --project-ref $ProjectRef 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "    $var applied"
            $totalApplied++
        } else {
            Write-Fail "    $var failed"
        }
        Remove-Item env:SUPABASE_SECRET_VALUE -ErrorAction SilentlyContinue
    }
}

Write-Host ""
if ($Check) {
    Write-Step "Drift summary: $totalDrift secrets missing in Supabase (would be added)"
    if ($totalDrift -gt 0) { exit 1 } else { exit 0 }
} else {
    Write-Ok "$totalApplied secrets applied to Supabase project $ProjectRef"
    exit 0
}
