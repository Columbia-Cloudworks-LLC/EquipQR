#Requires -Version 5.1
<#
.SYNOPSIS
  Start the Vite dev server in the current terminal (Cursor integrated terminal).

.DESCRIPTION
  Runs `npm run dev`, waits for http://localhost:8080 to respond, emits a readiness
  marker for VS Code/Cursor background tasks, then streams dev server output until
  the process exits.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

function Test-ViteResponding {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Receive-JobOutput {
    param([System.Management.Automation.Job]$Job)
    if (-not $Job) { return }
    Receive-Job -Job $Job -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
}

Write-Host "[EquipQR] Vite dev server starting"

$listen8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($listen8080 -and (Test-ViteResponding)) {
    Write-Host "        Vite already running on port 8080."
    Write-Host "[EquipQR] Vite ready"
    exit 0
}

if ($listen8080 -and -not (Test-ViteResponding)) {
    Write-Host "FAIL: Port 8080 is in use but not serving Vite. Free the port or run dev-stop."
    exit 1
}

$viteJob = Start-Job -ScriptBlock {
    param($Root)
    Set-Location -LiteralPath $Root
    npm run dev
} -ArgumentList $repoRoot

$timeout = 45
$elapsed = 0
$viteUp = $false
while ($elapsed -lt $timeout) {
    Receive-JobOutput -Job $viteJob
    if (Test-ViteResponding) {
        $viteUp = $true
        break
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "        Waiting for Vite... ${elapsed}s"
}

if (-not $viteUp) {
    Stop-Job -Job $viteJob -ErrorAction SilentlyContinue
    Remove-Job -Job $viteJob -Force -ErrorAction SilentlyContinue
    Write-Host "FAIL: Vite health check timed out."
    exit 1
}

Write-Host "[EquipQR] Vite ready"

try {
    while ((Get-Job -Id $viteJob.Id -ErrorAction SilentlyContinue).State -eq 'Running') {
        Receive-JobOutput -Job $viteJob
        Start-Sleep -Milliseconds 500
    }
    Receive-JobOutput -Job $viteJob
} finally {
    Remove-Job -Job $viteJob -Force -ErrorAction SilentlyContinue
}

exit 0
