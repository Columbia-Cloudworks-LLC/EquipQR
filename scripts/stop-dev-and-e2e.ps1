#Requires -Version 5.1
<#
.SYNOPSIS
  Stop running Playwright user-regression runs, then shut down the local dev stack.

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

$stopFail = $false

Write-Host ''
Write-Host ' ============================================'
Write-Host '  EquipQR - Stop E2E Tests and Dev Stack'
Write-Host ' ============================================'
Write-Host ''

function Get-ProcessCommandLine {
    param([int]$ProcessId)
    try {
        return (Get-CimInstance Win32_Process -Filter ("ProcessId=$ProcessId")).CommandLine
    } catch {
        return $null
    }
}

function Stop-ProcessesMatchingCommandLine {
    param(
        [string[]]$ProcessNames,
        [string]$Label,
        [string]$MatchRegex,
        [string]$ExcludeRegex = 'stop-dev-and-e2e\.ps1'
    )

    Write-Host " [$Label] Stopping matching processes..."
    $killed = 0
    foreach ($name in $ProcessNames) {
        $procs = @(Get-Process -Name $name -ErrorAction SilentlyContinue)
        foreach ($proc in $procs) {
            $cmd = Get-ProcessCommandLine -ProcessId $proc.Id
            if (-not $cmd) { continue }
            if ($cmd -match $ExcludeRegex) { continue }
            if ($cmd -notmatch $MatchRegex) { continue }
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host "        Killed $name PID $($proc.Id)"
                $killed++
            } catch {
                Write-Host "        Could not kill $name PID $($proc.Id): $_"
                $script:stopFail = $true
            }
        }
    }
    if ($killed -eq 0) {
        Write-Host '        Nothing matched - skipped.'
    }
}

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
