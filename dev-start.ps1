#Requires -Version 5.1
<#
.SYNOPSIS
  Start the full EquipQR local stack: Supabase, Edge Functions serve, and Vite.

.PARAMETER Force
  After Supabase is up: reset local DB, regenerate TypeScript types, seed equipment images, then ensure Edge + Vite are running.
  Does not call dev-stop. If Vite or Edge Functions serve is already running, exits with an error — run dev-stop first.

.EXAMPLE
  .\dev-start.ps1
  .\dev-start.ps1 -Force
#>
[CmdletBinding()]
param(
    [switch]$Force,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest = @()
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$unknown = [System.Collections.Generic.List[string]]::new()
foreach ($r in $Rest) {
    if ($r -match '^(?i)(/Force|--force)$') {
        $Force = $true
    } else {
        [void]$unknown.Add($r)
    }
}
$Rest = @($unknown)

if ($Rest.Count -gt 0) {
    Write-Host "FAIL: Unknown argument(s): $($Rest -join ', ')"
    Write-Host 'Usage: .\dev-start.ps1 [-Force]'
    exit 2
}

$SUPABASE_API_PORT = '54321'
$DEFAULT_EDGE_ENV_FILE = Join-Path $repoRoot 'supabase\functions\.env'
$DEFAULT_OP_ENVIRONMENT_ID = 'f4rdrusaoxvzwngz2jxs7vy7ye'
$DEFAULT_OP_APP_ENV_ID = 'ylilu4hpf6nq6bfm5ykg6nh2kq'

$fail = $false

function Test-EdgeFunctionsServeRunning {
    $procs = Get-Process -Name 'node', 'deno' -ErrorAction SilentlyContinue | Where-Object {
        try {
            $cmd = (Get-CimInstance Win32_Process -Filter ("ProcessId=$($_.Id)")).CommandLine
            $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve')
        } catch { $false }
    }
    return [bool]$procs
}

function Test-ViteResponding {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Test-Port8080Listening {
    $conns = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
    return [bool]$conns
}

function Test-DevStackAlreadyRunningForForce {
    if (Test-EdgeFunctionsServeRunning) { return $true }
    if (Test-Port8080Listening -and (Test-ViteResponding)) { return $true }
    return $false
}

Write-Host ""
Write-Host " ============================================"
Write-Host "  EquipQR Dev Environment - Startup"
Write-Host "  Mode: full (Supabase + Edge Functions + Vite)"
if ($Force) {
    Write-Host '  Flag: -Force (DB reset + type generation + full verification)'
}
Write-Host " ============================================"
Write-Host ""

if ($Force) {
    if (Test-DevStackAlreadyRunningForForce) {
        Write-Host "FAIL: A dev server is already running (Vite on port 8080 and/or Edge Functions serve)."
        Write-Host '       Stop the stack first, then run with -Force:'
        Write-Host '         .\dev-stop.bat'
        Write-Host '         .\dev-start.bat -Force'
        exit 1
    }
}

# ---------- 1. Pre-flight ----------
Write-Host " [1/10] Pre-flight checks..."

foreach ($cmd in @('node', 'npm', 'npx', 'docker')) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if (-not $found) {
        Write-Host "        FAIL: $cmd is not installed or not on PATH."
        exit 1
    }
}
Write-Host "        node  $(& node -v)"
Write-Host "        npm   v$(& npm -v)"
Write-Host "        npx   OK"
Write-Host "        docker CLI OK"

Write-Host "        Checking Docker daemon..."
$dockerOk = $false
$oldDockerProbeEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $null = & docker info > $null 2>$null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch { }
finally {
    $ErrorActionPreference = $oldDockerProbeEap
}

if (-not $dockerOk) {
    Write-Host "        Docker daemon is not running. Attempting to start Docker Desktop..."
    $dd = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (Test-Path -LiteralPath $dd) {
        Start-Process -FilePath $dd
    }
    Write-Host "        Waiting for Docker daemon to be ready (up to 120s)..."
    $timeout = 120
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        $oldDockerProbeEap = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $null = & docker info > $null 2>$null
            $probeOk = ($LASTEXITCODE -eq 0)
        } catch {
            $probeOk = $false
        } finally {
            $ErrorActionPreference = $oldDockerProbeEap
        }
        if ($probeOk) {
            Write-Host "        Docker daemon is ready."
            $dockerOk = $true
            break
        }
        Start-Sleep -Seconds 3
        $elapsed += 3
        Write-Host "        Waiting... ${elapsed}s"
    }
}
if (-not $dockerOk) {
    Write-Host "        FAIL: Docker Desktop could not be started automatically."
    exit 1
}
Write-Host "        All pre-flight checks passed."

# ---------- 1b. 1Password sync ----------
Write-Host ""
Write-Host " [1b/10] Syncing 1Password environments early..."
$OP_APP_ENV_ID = $env:EQUIPQR_OP_APP_ENVIRONMENT_ID
if (-not $OP_APP_ENV_ID) { $OP_APP_ENV_ID = $DEFAULT_OP_APP_ENV_ID }
$OP_ENV_ID = $env:EQUIPQR_OP_ENVIRONMENT_ID
if (-not $OP_ENV_ID) { $OP_ENV_ID = $DEFAULT_OP_ENVIRONMENT_ID }

$opCli = Get-Command op -ErrorAction SilentlyContinue
if ($opCli) {
    Write-Host "        Syncing app + edge env from 1Password"
    Write-Host "          App:  $OP_APP_ENV_ID"
    Write-Host "          Edge: $OP_ENV_ID"
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'scripts\sync-1password-dev-envs.ps1') `
        -AppEnvironmentId $OP_APP_ENV_ID -EdgeEnvironmentId $OP_ENV_ID -ApiPort $SUPABASE_API_PORT
    if ($LASTEXITCODE -ne 0) {
        Write-Host "        WARNING: One or both 1Password env syncs failed. Using existing .env and $DEFAULT_EDGE_ENV_FILE."
    }
} else {
    Write-Host "        1Password CLI not found on PATH - using existing .env and $DEFAULT_EDGE_ENV_FILE."
}

# ---------- 2. node_modules ----------
Write-Host ""
Write-Host " [2/10] Checking node_modules..."
if (Test-Path -LiteralPath (Join-Path $repoRoot 'node_modules')) {
    Write-Host "        node_modules exists - skipping npm ci."
} else {
    Write-Host "        node_modules not found - running npm ci..."
    & npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host "        FAIL: npm ci failed."
        exit 1
    }
    Write-Host "        npm ci completed successfully."
}

# ---------- 3. Stale containers ----------
Write-Host ""
Write-Host " [3/10] Cleaning up stale Supabase containers..."
$cleaned = $false
foreach ($status in @('exited', 'dead', 'created')) {
    $out = docker ps -aq --filter "name=supabase_" --filter "status=$status" 2>$null
    if ($out) {
        foreach ($line in ($out -split "`r?`n")) {
            $c = $line.Trim()
            if ($c) {
                $null = docker rm -f $c 2>&1
                Write-Host "        Removed container $c ($status)"
                $cleaned = $true
            }
        }
    }
}

$oldStaleEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $staleCheck = & npx supabase status 2>&1
    $staleExit = $LASTEXITCODE
    $hasContainerError = ($staleCheck | Out-String) -match 'No such container'
} catch {
    $staleExit = 1
    $hasContainerError = "$_" -match 'No such container'
} finally {
    $ErrorActionPreference = $oldStaleEap
}
if ($hasContainerError) {
    Write-Host "        Detected stale Supabase CLI state (phantom container). Resetting..."
    $ErrorActionPreference = 'Continue'
    try { $null = & npx supabase stop 2>&1 } catch { }
    $ErrorActionPreference = $oldStaleEap
    $staleIds = docker ps -aq --filter "name=supabase_" 2>$null
    if ($staleIds) {
        foreach ($line in ($staleIds -split "`r?`n")) {
            $c = $line.Trim()
            if ($c) { $null = docker rm -f $c 2>&1 }
        }
    }
    $cleaned = $true
    Write-Host "        Stale CLI state cleared."
}

if (-not $cleaned) { Write-Host "        No stale containers found." }

# ---------- 4. Supabase start ----------
Write-Host ""
Write-Host " [4/10] Starting Supabase local stack..."

$needStart = $true
$oldSupaEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $null = & npx supabase status 2>&1
    $statusExit = $LASTEXITCODE
} catch {
    $statusExit = 1
} finally {
    $ErrorActionPreference = $oldSupaEap
}

if ($statusExit -eq 0) {
    Write-Host "        Supabase CLI reports stack is up - verifying API..."
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$SUPABASE_API_PORT/rest/v1/" -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -lt 500) {
            $needStart = $false
            Write-Host "        Supabase API is already responding - skipped start."
        }
    } catch { }
    if ($needStart) {
        Write-Host "        WARNING: CLI said running but API unreachable - will try supabase start..."
    }
}

if ($needStart) {
    Write-Host "        Starting Supabase (this may take a few minutes on first run)..."
    $oldStartEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & npx supabase start
    $startExit = $LASTEXITCODE
    $ErrorActionPreference = $oldStartEap
    if ($startExit -ne 0) {
        Write-Host ""
        Write-Host "        First attempt failed. Running full cleanup and retrying..."
        $ErrorActionPreference = 'Continue'
        try { $null = & npx supabase stop 2>&1 } catch { }
        $ErrorActionPreference = $oldStartEap
        $retryIds = docker ps -aq --filter "name=supabase_" 2>$null
        if ($retryIds) {
            foreach ($line in ($retryIds -split "`r?`n")) {
                $c = $line.Trim()
                if ($c) { $null = docker rm -f $c 2>&1 }
            }
        }
        Write-Host "        Retrying supabase start..."
        $ErrorActionPreference = 'Continue'
        & npx supabase start
        $retryExit = $LASTEXITCODE
        $ErrorActionPreference = $oldStartEap
        if ($retryExit -ne 0) {
            Write-Host ""
            Write-Host "        FAIL: supabase start failed after retry."
            Write-Host "        Try: dev-stop.bat then dev-start.bat, or check port $SUPABASE_API_PORT"
            exit 1
        }
    }
}

Write-Host "        Waiting for Supabase API to be ready (up to 90s)..."
$timeout = 90
$elapsed = 0
$apiReady = $false
while ($elapsed -lt $timeout) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$SUPABASE_API_PORT/rest/v1/" -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -lt 500) {
            Write-Host "        Supabase API is responding."
            $apiReady = $true
            break
        }
    } catch { }
    Start-Sleep -Seconds 3
    $elapsed += 3
    Write-Host "        Waiting... ${elapsed}s"
}
if (-not $apiReady) {
    Write-Host "        FAIL: Supabase API health check timed out."
    exit 1
}

Write-Host ""
Write-Host "        --- Supabase Status ---"
$oldStatusDispEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try { & npx supabase status 2>$null } catch { }
$ErrorActionPreference = $oldStatusDispEap
Write-Host "        -----------------------"

# ---------- 5. DB reset (Force only) ----------
Write-Host ""
if (-not $Force) {
    Write-Host ' [5/10] DB Reset - skipped (use -Force to reset).'
} else {
    Write-Host ' [5/10] Resetting local database (-Force)...'
    $oldResetEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & npx supabase db reset
    $resetExit = $LASTEXITCODE
    $ErrorActionPreference = $oldResetEap
    if ($resetExit -ne 0) {
        Write-Host "        FAIL: supabase db reset failed."
        exit 1
    }
    Write-Host "        Database reset complete."

    Write-Host ""
    Write-Host " [5b] Seeding equipment images into local storage..."
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'scripts\seed-equipment-images.ps1') -ApiPort $SUPABASE_API_PORT
    if ($LASTEXITCODE -ne 0) {
        Write-Host "        WARNING: Seed image upload had errors. Equipment images may be missing."
    }
}

# ---------- 6. Types (Force only) ----------
Write-Host ""
if (-not $Force) {
    Write-Host ' [6/10] Type generation - skipped (use -Force to regenerate types).'
} else {
    Write-Host " [6/10] Regenerating Supabase TypeScript types..."
    $typesPath = Join-Path $repoRoot 'src\integrations\supabase\types.ts'
    $tmpPath = "$typesPath.tmp"
    Remove-Item -LiteralPath $tmpPath -ErrorAction SilentlyContinue
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $genOut = & npx supabase gen types typescript --local 2>&1
    $genExit = $LASTEXITCODE
    $ErrorActionPreference = $oldEap
    if ($genExit -ne 0) {
        Remove-Item -LiteralPath $tmpPath -ErrorAction SilentlyContinue
        Write-Host "        FAIL: Type generation failed."
        exit 1
    }
    $genOut | Set-Content -LiteralPath $tmpPath -Encoding utf8
    Move-Item -LiteralPath $tmpPath -Destination $typesPath -Force
    Write-Host "        Types regenerated successfully."
}

# ---------- 7. Sync local env ----------
Write-Host ""
Write-Host " [7/10] Syncing local Supabase URLs in env files..."
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'scripts\sync-local-supabase-env.ps1') -ApiPort $SUPABASE_API_PORT
if ($LASTEXITCODE -ne 0) {
    Write-Host "        WARNING: Could not sync local Supabase URLs. Update .env.local manually if needed."
}

# ---------- 8. Edge Functions ----------
Write-Host ""
Write-Host " [8/10] Starting Supabase Edge Functions serve..."
$EDGE_ENV_FILE = $DEFAULT_EDGE_ENV_FILE
Write-Host "        Using edge env file: $EDGE_ENV_FILE"
Write-Host "        Validating edge env file..."
if (-not (Test-Path -LiteralPath $EDGE_ENV_FILE)) {
    Write-Host "        FAIL: Edge env file does not exist."
    exit 1
}
$item = Get-Item -LiteralPath $EDGE_ENV_FILE
if ($item.Length -gt 1048576) {
    Write-Host "        FAIL: Edge env file is unexpectedly large (>1MB)."
    exit 1
}
$maxLen = 0
foreach ($line in [System.IO.File]::ReadLines($EDGE_ENV_FILE)) {
    if ($line.Length -gt $maxLen) { $maxLen = $line.Length }
    if ($line.Length -gt 32768) {
        Write-Host "        FAIL: Edge env contains an oversized line."
        exit 1
    }
}
Write-Host "        Edge env sanity check passed. Max line length: $maxLen"

if (Test-EdgeFunctionsServeRunning) {
    Write-Host "        Edge Functions serve already running - skipped."
} else {
    $EDGE_SERVE_FLAGS = "--env-file `"$EDGE_ENV_FILE`""
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$SUPABASE_API_PORT/rest/v1/" -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -lt 500) {
            $EDGE_SERVE_FLAGS += ' --no-verify-jwt'
            Write-Host "        Local API on port $SUPABASE_API_PORT - JWT verification disabled for dev serve."
        }
    } catch {
        Write-Host "        WARNING: Could not confirm local API - functions serve may verify JWT."
    }
    $edgeCmd = "cd /d `"$repoRoot`" && npx supabase functions serve $EDGE_SERVE_FLAGS"
    Start-Process cmd -ArgumentList @('/k', $edgeCmd) -WindowStyle Normal

    Write-Host "        Waiting for Edge Functions serve process (up to 45s)..."
    $timeout = 45
    $elapsed = 0
    $edgeUp = $false
    while ($elapsed -lt $timeout) {
        if (Test-EdgeFunctionsServeRunning) {
            Write-Host "        Edge Functions serve detected."
            $edgeUp = $true
            break
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "        Waiting... ${elapsed}s"
    }
    if (-not $edgeUp) {
        Write-Host "        FAIL: Edge Functions serve did not appear within 45 seconds."
        exit 1
    }
    Write-Host "        Edge Functions serve launched."
}

# ---------- 9. Vite ----------
Write-Host ""
Write-Host " [9/10] Starting Vite dev server (port 8080)..."

$listen8080 = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($listen8080) {
    Write-Host "        Port 8080 in use - verifying Vite..."
    if (Test-ViteResponding) {
        Write-Host "        Vite already running - skipped."
    } else {
        Write-Host "        FAIL: Port 8080 is not serving Vite. Free the port or stop the other process."
        exit 1
    }
} else {
    Write-Host "        Launching Vite in a new window..."
    Start-Process cmd -ArgumentList @('/k', "cd /d `"$repoRoot`" && npm run dev") -WindowStyle Normal

    Write-Host "        Waiting for Vite (up to 45s)..."
    $timeout = 45
    $elapsed = 0
    $viteUp = $false
    while ($elapsed -lt $timeout) {
        if (Test-ViteResponding) {
            Write-Host "        Vite dev server is ready."
            $viteUp = $true
            break
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "        Waiting... ${elapsed}s"
    }
    if (-not $viteUp) {
        Write-Host "        FAIL: Vite health check timed out."
        exit 1
    }
}

# ---------- Final health report ----------
Write-Host ""
Write-Host " ============================================"
Write-Host "  EquipQR Dev Environment - Status Report"
Write-Host " ============================================"
Write-Host ""

$API_STATUS = '[UNKNOWN]'
$DB_STATUS = '[UNKNOWN]'
$FUNCTIONS_STATUS = '[UNKNOWN]'
$FRONTEND_STATUS = '[UNKNOWN]'

try {
    $r = Invoke-WebRequest -Uri "http://localhost:$SUPABASE_API_PORT/rest/v1/" -Method HEAD -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    $API_STATUS = '[OK]'
} catch {
    $API_STATUS = '[FAILED]'
    $fail = $true
}

if ($API_STATUS -eq '[OK]') { $DB_STATUS = '[OK]' } else { $DB_STATUS = '[FAILED]'; $fail = $true }

if (Test-EdgeFunctionsServeRunning) {
    $FUNCTIONS_STATUS = '[OK]'
} else {
    $FUNCTIONS_STATUS = '[FAILED]'
    $fail = $true
}

if (Test-ViteResponding) {
    $FRONTEND_STATUS = '[OK]'
} else {
    $FRONTEND_STATUS = '[FAILED]'
    $fail = $true
}

Write-Host "  Supabase API:   http://localhost:$SUPABASE_API_PORT      $API_STATUS"
Write-Host "  Database:       localhost:54322                $DB_STATUS"
Write-Host "  Frontend:       http://localhost:8080          $FRONTEND_STATUS"
Write-Host "  Edge Functions: (via Supabase API)             $FUNCTIONS_STATUS"
Write-Host ""
Write-Host " ============================================"
if (-not $fail) {
    Write-Host "  All required services are ready."
} else {
    Write-Host "  One or more required checks failed."
    Write-Host "  Review the output above."
}
Write-Host " ============================================"
Write-Host ""

exit $(if ($fail) { 1 } else { 0 })
