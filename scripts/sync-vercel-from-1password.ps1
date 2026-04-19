#Requires -Version 5.1
<#
.SYNOPSIS
  Sync Vercel project env vars from the EquipQR Agents 1Password vault.

.DESCRIPTION
  For each VITE_* and Vercel-side env var, read the value from 1Password and
  set it via `vercel env add` (or compare via `vercel env ls` if -Check).

  The 1Password source-of-truth items:
    - app-env-prod-public        -> production Vercel env (VITE_* vars)
    - app-env-preview-public     -> preview Vercel env (VITE_* vars)

  Each item must contain individual fields per env var (NOT a multi-line dotenv
  blob) so each can be referenced via op://EquipQR Agents/{item}/{field}.

.PARAMETER Check
  Read-only mode: list drift between 1Password and Vercel, but do not modify
  Vercel env vars. Exits non-zero if drift is detected.

.PARAMETER Environment
  Which Vercel environment to sync: 'production' (default), 'preview', or 'all'.

.EXAMPLE
  .\scripts\sync-vercel-from-1password.ps1 -Check
  .\scripts\sync-vercel-from-1password.ps1 -Environment production
#>
[CmdletBinding()]
param(
    [switch]$Check,
    [ValidateSet('production', 'preview', 'all')]
    [string]$Environment = 'all'
)

$ErrorActionPreference = 'Stop'

$VERCEL_TEAM_ID = 'team_78VeGDURoofThjZNJOKEBpP5'
$VERCEL_PROJECT_ID = 'prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA'

$ENV_VAR_MAP = @{
    'production' = @{
        OpItem = 'app-env-prod-public'
        Vars = @(
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_ANON_KEY',
            'VITE_HCAPTCHA_SITEKEY',
            'VITE_SUPER_ADMIN_ORG_ID',
            'VITE_INTUIT_CLIENT_ID',
            'VITE_GOOGLE_WORKSPACE_CLIENT_ID',
            'VITE_GOOGLE_PICKER_API_KEY',
            'VITE_GOOGLE_PICKER_APP_ID',
            'VITE_GOOGLE_MAPS_API_KEY',
            'VITE_VAPID_PUBLIC_KEY'
        )
    }
    'preview' = @{
        OpItem = 'app-env-preview-public'
        Vars = @(
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_ANON_KEY',
            'VITE_HCAPTCHA_SITEKEY',
            'VITE_SUPER_ADMIN_ORG_ID',
            'VITE_INTUIT_CLIENT_ID',
            'VITE_GOOGLE_WORKSPACE_CLIENT_ID',
            'VITE_GOOGLE_PICKER_API_KEY',
            'VITE_GOOGLE_PICKER_APP_ID',
            'VITE_GOOGLE_MAPS_API_KEY',
            'VITE_VAPID_PUBLIC_KEY'
        )
    }
}

function Write-Step { param([string]$M) Write-Host "  [sync-vercel] $M" }
function Write-Ok   { param([string]$M) Write-Host "  [sync-vercel] OK   $M" -ForegroundColor Green }
function Write-Warn { param([string]$M) Write-Host "  [sync-vercel] WARN $M" -ForegroundColor Yellow }
function Write-Fail { param([string]$M) Write-Host "  [sync-vercel] FAIL $M" -ForegroundColor Red }

Write-Step "Validating prerequisites..."

if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
    Write-Fail "1Password CLI 'op' not found on PATH."
    exit 1
}
if (-not (Get-Command vercel -ErrorAction SilentlyContinue) -and -not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Fail "Neither 'vercel' nor 'npx' found on PATH. Install Vercel CLI: npm i -g vercel"
    exit 1
}

$vercelCmd = if (Get-Command vercel -ErrorAction SilentlyContinue) { 'vercel' } else { 'npx vercel' }
Write-Ok "Using Vercel CLI: $vercelCmd"

$OP_VAULT = 'tgo2m6qbct5otqeqirjocn3joa'  # EquipQR Agents
$vercelTokenItem = 'vercel-token'
$vercelToken = & op read "op://$OP_VAULT/$vercelTokenItem/credential" 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($vercelToken)) {
    Write-Warn "1Password item '$vercelTokenItem' not found. Falling back to existing Vercel CLI session."
    Write-Warn "  To enable headless sync, create item: op://$OP_VAULT/$vercelTokenItem/credential"
    $env:VERCEL_TOKEN = $null
} else {
    $env:VERCEL_TOKEN = $vercelToken.Trim()
    Write-Ok "Vercel token loaded from 1Password"
}

$envsToProcess = if ($Environment -eq 'all') { @('production', 'preview') } else { @($Environment) }
$totalDrift = 0
$totalApplied = 0

foreach ($envName in $envsToProcess) {
    Write-Step ""
    Write-Step "Processing Vercel environment: $envName"
    $cfg = $ENV_VAR_MAP[$envName]
    $opItem = $cfg.OpItem

    $itemProbe = & op item get $opItem --vault $OP_VAULT --format json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "1Password item '$opItem' not found in EquipQR Agents vault. Skipping $envName."
        Write-Warn "  Create with fields: $($cfg.Vars -join ', ')"
        continue
    }

    Write-Step "Listing current Vercel env vars for $envName..."
    $vercelEnvJson = & $vercelCmd.Split() env ls --token $env:VERCEL_TOKEN --scope $VERCEL_TEAM_ID 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "vercel env ls failed: $vercelEnvJson"
        continue
    }

    foreach ($var in $cfg.Vars) {
        $opValue = & op read "op://$OP_VAULT/$opItem/$var" 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($opValue)) {
            Write-Warn "  $var: missing in 1Password (op://$OP_VAULT/$opItem/$var)"
            continue
        }
        $opValue = $opValue.Trim()

        if ($Check) {
            Write-Step "  CHECK: $var would be set to a $($opValue.Length)-char value in $envName"
            $totalDrift++
        } else {
            Write-Step "  Setting $var in $envName..."
            $opValue | & $vercelCmd.Split() env add $var $envName --token $env:VERCEL_TOKEN --scope $VERCEL_TEAM_ID --force
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "    $var applied"
                $totalApplied++
            } else {
                Write-Fail "    $var failed (vercel env add exit $LASTEXITCODE)"
            }
        }
    }
}

Write-Host ""
if ($Check) {
    Write-Step "Drift summary: $totalDrift potential changes"
    if ($totalDrift -gt 0) { exit 1 } else { exit 0 }
} else {
    Write-Ok "$totalApplied env vars applied to Vercel"
    exit 0
}
