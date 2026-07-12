#Requires -Version 5.1
<#
.SYNOPSIS
  Stop running Playwright user-regression runs, release node_modules locks, then shut down the local dev stack.

.PARAMETER Force
  Passed through to dev-stop.ps1 (also stops Docker Desktop).

.EXAMPLE
  .\scripts\stop-dev-and-e2e.ps1
  .\scripts\stop-dev-and-e2e.ps1 -Force
#>
[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

. (Join-Path $PSScriptRoot 'Release-EquipQrNodeModuleLocks.ps1')

$stopFail = $false

Write-Host ''
Write-Host ' ============================================'
Write-Host '  EquipQR - Stop E2E Tests and Dev Stack'
Write-Host ' ============================================'
Write-Host ''

$runnerRegex = @(
    'run-user-regression\.ps1',
    'dev-test\.bat',
    'playwright\.user\.config',
    'playwright\.config',
    '@playwright/test',
    '\\@playwright\\test',
    'playwright\s+test',
    'demo-smoke\.spec'
) -join '|'

Stop-ProcessesMatchingCommandLine -ProcessNames @('node', 'cmd') -Label 'E2E' -MatchRegex $runnerRegex
Stop-ProcessesMatchingCommandLine -ProcessNames @('powershell') -Label 'E2E shell' -MatchRegex $runnerRegex

$browserRegex = 'ms-playwright|playwright.*\\chromium|playwright.*\\chrome'
Stop-ProcessesMatchingCommandLine -ProcessNames @('chrome', 'chromium') -Label 'Playwright browser' -MatchRegex $browserRegex -ExcludeRegex 'DOES_NOT_MATCH'

Stop-EquipQrDevToolingProcesses -RepoRoot $repoRoot

Write-Host ''
Write-Host ' [Dev stack] Running dev-stop.ps1...'
$devStopArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repoRoot 'dev-stop.ps1'))
if ($Force) {
    $devStopArgs += '-Force'
}
& powershell.exe @devStopArgs
if ($LASTEXITCODE -ne 0) {
    $stopFail = $true
}

exit $(if ($stopFail) { 1 } else { 0 })
