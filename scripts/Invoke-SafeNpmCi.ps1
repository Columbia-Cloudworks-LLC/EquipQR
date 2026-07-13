#Requires -Version 5.1
<#
.SYNOPSIS
  Stop dev/E2E tooling that locks node_modules, then run npm ci with Windows EPERM recovery.

.PARAMETER SkipStackStop
  Do not run stop-dev-and-e2e.ps1 first (use when the caller already stopped the stack).

.PARAMETER Docs
  Also run npm ci in docs/ after the root install succeeds.

.PARAMETER PreferOffline
  Pass --prefer-offline to npm ci (default: true).

.PARAMETER NoAudit
  Pass --no-audit to npm ci (default: true).

.EXAMPLE
  .\scripts\Invoke-SafeNpmCi.ps1
  .\scripts\Invoke-SafeNpmCi.ps1 -SkipStackStop
  .\npm-ci-safe.bat
#>
[CmdletBinding()]
param(
    [switch]$SkipStackStop,
    [switch]$Docs,
    [switch]$PreferOffline = $true,
    [switch]$NoAudit = $true
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

. (Join-Path $PSScriptRoot 'Release-EquipQrNodeModuleLocks.ps1')

Write-Host ''
Write-Host ' ============================================'
Write-Host '  EquipQR - Safe npm ci (Windows lock recovery)'
Write-Host ' ============================================'
Write-Host ''

if (-not $SkipStackStop) {
    Write-Host ' [Stack] Stopping E2E runners and dev stack...'
    $stopScript = Join-Path $repoRoot 'scripts\stop-dev-and-e2e.ps1'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $stopScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host '        WARN: stop-dev-and-e2e reported errors; continuing with lock release.'
    }
    Write-Host ''
}

Stop-EquipQrDevToolingProcesses -RepoRoot $repoRoot
Start-Sleep -Seconds 2
Remove-RepoNodeModulesScrap -ParentDirectory $repoRoot

$ciParams = @{
    WorkingDirectory = $repoRoot
}
if ($PreferOffline) { $ciParams['PreferOffline'] = $true }
if ($NoAudit) { $ciParams['NoAudit'] = $true }

Invoke-EquipQrSafeNpmCi @ciParams

if ($Docs) {
    Invoke-EquipQrSafeNpmCi @ciParams -NpmPrefix 'docs' -SkipToolingStop
}

Write-Host ''
Write-Host ' ============================================'
Write-Host '  Safe npm ci complete.'
Write-Host ' ============================================'
Write-Host ''

exit 0
