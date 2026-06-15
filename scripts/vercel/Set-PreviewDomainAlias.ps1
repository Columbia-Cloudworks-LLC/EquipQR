#Requires -Version 5.1
<#
.SYNOPSIS
  Point preview.equipqr.app at a Vercel Preview deployment URL.

.DESCRIPTION
  Used after Preview deployments so the stable hostname tracks the latest
  Preview environment build (not the retired custom "staging" environment).

.PARAMETER DeploymentUrl
  Hostname or URL of the Preview deployment (e.g. equipqr-abc123-columbia-cloudworks-llc.vercel.app).

.PARAMETER DryRun
  Print the alias command without executing it.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$DeploymentUrl,

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$VERCEL_TEAM_SLUG = 'columbia-cloudworks-llc'
$PREVIEW_HOST = 'preview.equipqr.app'
$AllowedPreviewHostPattern = '^(equipqr|equip-qr)-[a-z0-9-]+\.vercel\.app$'

function Test-PreviewDeploymentHost {
    param([Parameter(Mandatory = $true)][string]$HostOnly)

    if ($HostOnly -eq $PREVIEW_HOST) {
        throw "DeploymentUrl must be a Vercel preview hostname, not $PREVIEW_HOST itself."
    }
    if ($HostOnly -notmatch '\.vercel\.app$') {
        throw "DeploymentUrl must be a *.vercel.app hostname (got '$HostOnly')."
    }
    if ($HostOnly -notmatch $AllowedPreviewHostPattern) {
        throw "DeploymentUrl '$HostOnly' is not an allowed EquipQR Preview deployment hostname."
    }
}

function Get-VercelToken {
    if (-not [string]::IsNullOrWhiteSpace($env:VERCEL_TOKEN)) {
        return $env:VERCEL_TOKEN.Trim()
    }
    $prior = $env:OP_SERVICE_ACCOUNT_TOKEN
    if (-not $prior) {
        $prior = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    }
    $env:OP_SERVICE_ACCOUNT_TOKEN = $prior
    $token = & op read 'op://EquipQR Agents/vercel-write/VERCEL_TOKEN' 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
        throw 'VERCEL_TOKEN not set and op read vercel-write/VERCEL_TOKEN failed.'
    }
    return $token.Trim()
}

$hostOnly = ($DeploymentUrl -replace '^https?://', '' -replace '/+$', '').Trim()
if ([string]::IsNullOrWhiteSpace($hostOnly)) {
    throw 'DeploymentUrl resolved to an empty hostname.'
}

Test-PreviewDeploymentHost -HostOnly $hostOnly

$vercelToken = Get-VercelToken
$vercelExe = if (Get-Command vercel -ErrorAction SilentlyContinue) { 'vercel' } else { 'npx' }
$vercelPrefix = if ($vercelExe -eq 'npx') { @('--yes', 'vercel') } else { @() }

$args = @($vercelPrefix) + @(
    'alias', 'set', $hostOnly, $PREVIEW_HOST,
    '--token', $vercelToken,
    '--scope', $VERCEL_TEAM_SLUG
)

Write-Host "Set-PreviewDomainAlias: $PREVIEW_HOST -> $hostOnly"
if ($DryRun) {
    Write-Host ('DRY RUN: {0} {1}' -f $vercelExe, ($args -join ' '))
    exit 0
}

& $vercelExe @args
if ($LASTEXITCODE -ne 0) {
    throw "vercel alias set failed with exit code $LASTEXITCODE"
}

Write-Host "OK: $PREVIEW_HOST now points at $hostOnly"
