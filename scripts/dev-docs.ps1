#Requires -Version 5.1
<#
.SYNOPSIS
  Start the VitePress documentation dev server in the current terminal.

.DESCRIPTION
  Runs `npm run docs:dev`, waits for http://localhost:5174 to respond, emits a
  readiness marker for Cursor background tasks, then streams dev server output
  until the process exits.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$docsRoot = Join-Path $repoRoot 'docs'
Set-Location -LiteralPath $repoRoot

function Test-DocsResponding {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:5174' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
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

Write-Host "[EquipQR] Docs dev server starting"

if (-not (Test-Path -LiteralPath (Join-Path $docsRoot 'node_modules'))) {
    Write-Host "        docs/node_modules not found - running npm --prefix docs ci..."
    & npm --prefix docs ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: npm --prefix docs ci failed."
        exit 1
    }
}

$listen5174 = Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue
if ($listen5174 -and (Test-DocsResponding)) {
    Write-Host "        Docs already running on port 5174."
    Write-Host "[EquipQR] Docs ready"
    exit 0
}

if ($listen5174 -and -not (Test-DocsResponding)) {
    Write-Host "FAIL: Port 5174 is in use but not serving EquipQR docs. Free the port or run dev-stop."
    exit 1
}

$docsJob = Start-Job -ScriptBlock {
    param($Root)
    Set-Location -LiteralPath $Root
    npm run docs:dev
} -ArgumentList $repoRoot

$timeout = 45
$elapsed = 0
$docsUp = $false
while ($elapsed -lt $timeout) {
    Receive-JobOutput -Job $docsJob
    if (Test-DocsResponding) {
        $docsUp = $true
        break
    }
    $jobState = (Get-Job -Id $docsJob.Id -ErrorAction SilentlyContinue).State
    if ($jobState -and $jobState -ne 'Running') {
        break
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "        Waiting for docs... ${elapsed}s"
}

if (-not $docsUp) {
    Receive-JobOutput -Job $docsJob
    Stop-Job -Job $docsJob -ErrorAction SilentlyContinue
    Remove-Job -Job $docsJob -Force -ErrorAction SilentlyContinue
    Write-Host "FAIL: Docs health check timed out."
    exit 1
}

Write-Host "[EquipQR] Docs ready"

try {
    while ((Get-Job -Id $docsJob.Id -ErrorAction SilentlyContinue).State -eq 'Running') {
        Receive-JobOutput -Job $docsJob
        Start-Sleep -Milliseconds 500
    }
    Receive-JobOutput -Job $docsJob
} finally {
    Remove-Job -Job $docsJob -Force -ErrorAction SilentlyContinue
}

exit 0
