#Requires -Version 5.1
<#
.SYNOPSIS
  Start Supabase Edge Functions serve in the current terminal (Cursor integrated terminal).

.DESCRIPTION
  Runs `npx supabase functions serve`, waits for the process to appear, refreshes
  the Kong upstream pool, emits a readiness marker for VS Code/Cursor background
  tasks, then streams serve output until the process exits.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$SUPABASE_API_PORT = '54321'
$EDGE_ENV_FILE = Join-Path $repoRoot 'supabase\functions\.env'

function Test-EdgeFunctionsServeRunning {
    $procs = Get-Process -Name 'node', 'deno' -ErrorAction SilentlyContinue | Where-Object {
        try {
            $cmd = (Get-CimInstance Win32_Process -Filter ("ProcessId=$($_.Id)")).CommandLine
            $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve')
        } catch { $false }
    }
    return [bool]$procs
}

function Invoke-KongUpstreamRefresh {
    Write-Host ""
    Write-Host " Refreshing kong upstream pool for new edge_runtime IP..."
    $kongName = (docker ps --filter 'name=supabase_kong_' --format '{{.Names}}' 2>$null | Select-Object -First 1)
    if (-not $kongName) {
        Write-Host "        WARNING: kong container not found - skipping refresh."
        return
    }

    $oldKongEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $null = & docker restart $kongName 2>&1
    $restartExit = $LASTEXITCODE
    $ErrorActionPreference = $oldKongEap

    if ($restartExit -ne 0) {
        Write-Host "        WARNING: docker restart $kongName failed (exit $restartExit)."
        Write-Host "        Function calls may 502 until kong is restarted manually."
        return
    }

    $kongReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$SUPABASE_API_PORT/" `
                -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            $kongReady = $true
            break
        } catch {
            if ($_.Exception.Response) { $kongReady = $true; break }
        }
    }

    if ($kongReady) {
        Write-Host "        Kong restarted; upstream pool refreshed."
    } else {
        Write-Host "        WARNING: Kong restart did not complete within 30s."
        Write-Host "        Function calls may still 502. Manual fix: docker restart $kongName"
    }
}

function Receive-JobOutput {
    param([System.Management.Automation.Job]$Job)
    if (-not $Job) { return }
    Receive-Job -Job $Job -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
}

Write-Host "[EquipQR] Edge Functions serve starting"

if (-not (Test-Path -LiteralPath $EDGE_ENV_FILE)) {
    Write-Host "FAIL: Edge env file does not exist: $EDGE_ENV_FILE"
    exit 1
}

$serveArgs = @(
    'supabase', 'functions', 'serve',
    '--env-file', $EDGE_ENV_FILE
)

try {
    $r = Invoke-WebRequest -Uri "http://localhost:$SUPABASE_API_PORT/rest/v1/" -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -lt 500) {
        $serveArgs += '--no-verify-jwt'
        Write-Host "        Local API on port $SUPABASE_API_PORT - JWT verification disabled for dev serve."
    }
} catch {
    Write-Host "        WARNING: Could not confirm local API - functions serve may verify JWT."
}

if (Test-EdgeFunctionsServeRunning) {
    Write-Host "        Edge Functions serve already running."
    Invoke-KongUpstreamRefresh
    Write-Host "[EquipQR] Edge Functions ready"
    Write-Host "        Attach to the existing serve process or run dev-stop before restarting."
    exit 0
}

$edgeJob = Start-Job -ScriptBlock {
    param($Root, $ArgsList)
    Set-Location -LiteralPath $Root
    & npx @ArgsList
} -ArgumentList $repoRoot, $serveArgs

$timeout = 45
$elapsed = 0
$edgeUp = $false
while ($elapsed -lt $timeout) {
    Receive-JobOutput -Job $edgeJob
    if (Test-EdgeFunctionsServeRunning) {
        $edgeUp = $true
        break
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "        Waiting for Edge Functions serve... ${elapsed}s"
}

if (-not $edgeUp) {
    Stop-Job -Job $edgeJob -ErrorAction SilentlyContinue
    Remove-Job -Job $edgeJob -Force -ErrorAction SilentlyContinue
    Write-Host "FAIL: Edge Functions serve did not appear within 45 seconds."
    exit 1
}

Invoke-KongUpstreamRefresh
Write-Host "[EquipQR] Edge Functions ready"

try {
    while ((Get-Job -Id $edgeJob.Id -ErrorAction SilentlyContinue).State -eq 'Running') {
        Receive-JobOutput -Job $edgeJob
        Start-Sleep -Milliseconds 500
    }
    Receive-JobOutput -Job $edgeJob
} finally {
    Remove-Job -Job $edgeJob -Force -ErrorAction SilentlyContinue
}

exit 0
