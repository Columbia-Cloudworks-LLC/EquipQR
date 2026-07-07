#Requires -Version 5.1
<#
.SYNOPSIS
  Start the full EquipQR local stack: Supabase, Edge Functions serve, Vite, and docs.

.PARAMETER Force
  After Supabase is up: regenerate volume seed data, reset local DB, regenerate TypeScript types, seed equipment images, then ensure Edge, docs, and Vite are running.
  If Vite, docs, or Edge Functions serve is already running, stops the dev stack first, then continues startup.

.PARAMETER SeedScale
  Volume multiplier (1-100) for generated seed data (scripts/seed-data/generate-seeds.ts). Only used with -Force. Default 1.

.PARAMETER PrepareOnly
  Run setup through env sync (steps 1-7) and exit before launching Edge Functions, docs, or Vite.
  Used by Cursor/VS Code tasks so long-running servers start in integrated terminals.

.EXAMPLE
  .\dev-start.ps1
  .\dev-start.ps1 -Force
  .\dev-start.ps1 -Force -SeedScale 5
  .\dev-start.ps1 -PrepareOnly
#>
[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$ResetDocker,
    [switch]$PrepareOnly,
    [ValidateRange(1, 100)]
    [int]$SeedScale = 1,
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
    } elseif ($r -match '^(?i)(/ResetDocker|--reset-docker)$') {
        $ResetDocker = $true
    } elseif ($r -match '^(?i)(/PrepareOnly|--prepare-only)$') {
        $PrepareOnly = $true
    } else {
        [void]$unknown.Add($r)
    }
}
$Rest = @($unknown)

if ($Rest.Count -gt 0) {
    Write-Host "FAIL: Unknown argument(s): $($Rest -join ', ')"
    Write-Host 'Usage: .\dev-start.ps1 [-Force] [-ResetDocker] [-PrepareOnly] [-SeedScale <1-100>]'
    exit 2
}

# dev-start is designed for user context. Running as Administrator is a
# common-but-subtle source of bugs that hide in development and explode in
# production:
#   - 1Password CLI sessions belong to the launching user account; an Admin
#     `op signin` cannot be re-used by a user-context process and vice versa.
#   - Files written into WSL distros from an Admin process can end up
#     owned by root, which then breaks user-context tools that try to
#     read or modify them.
#   - Docker named-volume ACLs inherit from the launching context.
# This guard does NOT prevent Supabase port-reservation conflicts -- those
# are an OS-level issue resolved by `scripts\reserve-supabase-ports.ps1`,
# not by privilege level.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "FAIL: dev-start.bat must NOT be run from an Administrator shell."
    Write-Host '       Reasons: 1Password session ownership, WSL file ownership, Docker volume ACLs.'
    Write-Host '       Open a normal (non-elevated) PowerShell or cmd and re-run dev-start.bat.'
    Write-Host ''
    Write-Host '       If you hit a port-reservation issue (WSAEACCES on 54321-54328),'
    Write-Host '       that is a separate one-time admin fix:'
    Write-Host '         scripts\reserve-supabase-ports.ps1   (auto-elevates)'
    exit 1
}

$SUPABASE_API_PORT = '54321'
$DEFAULT_EDGE_ENV_FILE = Join-Path $repoRoot 'supabase\functions\.env'
$DEFAULT_OP_EDGE_ITEM = 'edge-env-local-dev'
$DEFAULT_OP_APP_ITEM = 'app-env-local-dev'

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

function Test-DocsResponding {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:5174' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Test-Port8080Listening {
    $conns = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
    return [bool]$conns
}

function Test-Port5174Listening {
    $conns = Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue
    return [bool]$conns
}

function Test-RootNodeModulesHealthy {
    $viteBin = Join-Path $repoRoot 'node_modules\.bin\vite.cmd'
    $vitePkg = Join-Path $repoRoot 'node_modules\vite\package.json'
    return (Test-Path -LiteralPath $viteBin) -and (Test-Path -LiteralPath $vitePkg)
}

function Test-DocsNodeModulesHealthy {
    $docsRoot = Join-Path $repoRoot 'docs'
    $vitepressBin = Join-Path $docsRoot 'node_modules\.bin\vitepress.cmd'
    $vitepressPkg = Join-Path $docsRoot 'node_modules\vitepress\package.json'
    return (Test-Path -LiteralPath $vitepressBin) -and (Test-Path -LiteralPath $vitepressPkg)
}

function Install-RootNodeModules {
    param([string]$Reason)

    Write-Host "        $Reason"
    Write-Host '        Running npm ci --prefer-offline --no-audit...'
    & npm ci --prefer-offline --no-audit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "        npm ci failed (exit $LASTEXITCODE) - retrying with npm install..."
        & npm install --prefer-offline --no-audit
        if ($LASTEXITCODE -ne 0) {
            Write-Host '        FAIL: Could not install root dependencies.'
            Write-Host '        Close other Node/Vite processes and retry dev-start.bat -Force.'
            exit 1
        }
    }
    if (-not (Test-RootNodeModulesHealthy)) {
        Write-Host '        FAIL: node_modules is still incomplete after install (missing vite .bin shim).'
        Write-Host '        Try: dev-stop.bat, delete node_modules, then dev-start.bat -Force'
        exit 1
    }
    Write-Host '        Root dependencies installed successfully.'
}

function Install-DocsNodeModules {
    param([string]$Reason)

    Write-Host "        $Reason"
    Write-Host '        Running npm --prefix docs ci --prefer-offline --no-audit...'
    & npm --prefix docs ci --prefer-offline --no-audit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "        docs npm ci failed (exit $LASTEXITCODE) - retrying with npm install..."
        & npm --prefix docs install --prefer-offline --no-audit
        if ($LASTEXITCODE -ne 0) {
            Write-Host '        FAIL: Could not install docs dependencies.'
            exit 1
        }
    }
    if (-not (Test-DocsNodeModulesHealthy)) {
        Write-Host '        FAIL: docs/node_modules is still incomplete after install (missing vitepress .bin shim).'
        exit 1
    }
    Write-Host '        Docs dependencies installed successfully.'
}

function Start-DevBackgroundProcess {
    param(
        [Parameter(Mandatory)]
        [string]$Name,
        [Parameter(Mandatory)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [string[]]$ArgumentList
    )

    $logDir = Join-Path $repoRoot 'tmp\dev-logs'
    if (-not (Test-Path -LiteralPath $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $stdoutLog = Join-Path $logDir "$Name.stdout.log"
    $stderrLog = Join-Path $logDir "$Name.stderr.log"
    '' | Set-Content -Path $stdoutLog -Encoding utf8
    '' | Set-Content -Path $stderrLog -Encoding utf8

    Write-Host "        Starting $Name in background (logs: tmp\dev-logs\$Name.*.log)"

    $proc = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru

    if (-not $proc) {
        Write-Host "        FAIL: Could not start background process for $Name."
        exit 1
    }

    return $proc
}

function Import-SupabaseDotEnv {
    param([string]$Path = (Join-Path $repoRoot 'supabase\.env'))
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    foreach ($line in [System.IO.File]::ReadLines($Path)) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
    return $true
}

function Test-DevStackAlreadyRunningForForce {
    if (Test-EdgeFunctionsServeRunning) { return $true }
    if (Test-Port8080Listening -and (Test-ViteResponding)) { return $true }
    if (Test-Port5174Listening -and (Test-DocsResponding)) { return $true }
    return $false
}

# Returns $true only when the Docker daemon's Linux engine actually answers
# a real container API call. `docker info` is NOT sufficient - when Docker
# Desktop's engine is wedged it still prints client info and exits 0, while
# every container/image API request returns "500 Internal Server Error" via
# the dockerDesktopLinuxEngine pipe. `docker ps` exercises the engine path
# and exits non-zero when wedged, so we use it as the source of truth and
# additionally scan stderr for the known wedge signatures.
#
# We invoke `docker ps -q` inside a background job with a hard per-call
# timeout. Without this, a half-dead pipe can block the CLI for ~30s per
# probe, multiplying every readiness loop iteration into a stall and making
# the script appear to hang itself.
function Test-DockerDaemonReady {
    param([int]$PerCallTimeoutSeconds = 8)

    $job = Start-Job -ScriptBlock {
        $out = & docker ps -q 2>&1
        [pscustomobject]@{
            ExitCode = $LASTEXITCODE
            Output   = ($out | Out-String)
        }
    }

    if (-not (Wait-Job -Job $job -Timeout $PerCallTimeoutSeconds)) {
        Stop-Job  -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        return $false
    }

    $result = Receive-Job -Job $job
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue

    if ($null -eq $result) { return $false }
    if ($result.ExitCode -ne 0) { return $false }
    if ($result.Output -match '500 Internal Server Error') { return $false }
    if ($result.Output -match 'error during connect') { return $false }
    if ($result.Output -match 'Cannot connect to the Docker daemon') { return $false }
    return $true
}

# Run the reusable surgical recovery script and return $true when the daemon
# answers `docker ps -q` cleanly within the budget. Centralizing the recovery
# in scripts\reset-docker-desktop.ps1 lets the user invoke the same flow
# manually (`scripts\reset-docker-desktop.ps1`) when the dev stack is already
# running and only Docker is wedged.
function Invoke-DockerRecovery {
    param([int]$TimeoutSeconds = 180)

    $resetScript = Join-Path $repoRoot 'scripts\reset-docker-desktop.ps1'
    if (-not (Test-Path -LiteralPath $resetScript)) {
        Write-Host "        FAIL: reset-docker-desktop.ps1 not found at $resetScript"
        return $false
    }

    $oldRecEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $resetScript -TimeoutSeconds $TimeoutSeconds
        $resetExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $oldRecEap
    }
    return ($resetExit -eq 0)
}

Write-Host ""
Write-Host " ============================================"
Write-Host "  EquipQR Dev Environment - Startup"
Write-Host "  Mode: full (Supabase + Edge Functions + Docs + Vite)"
if ($Force) {
    Write-Host '  Flag: -Force (DB reset + type generation + full verification)'
}
if ($PrepareOnly) {
    Write-Host '  Flag: -PrepareOnly (setup only; Edge + Docs + Vite via Cursor tasks)'
}
Write-Host " ============================================"
Write-Host ""

if ($Force -and (Test-DevStackAlreadyRunningForForce)) {
    Write-Host ' [-Force] Dev stack already running - stopping first...'
    $stopScript = Join-Path $repoRoot 'dev-stop.ps1'
    $oldStopEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $stopScript
        $stopExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $oldStopEap
    }
    if ($stopExit -ne 0) {
        Write-Host "FAIL: dev-stop exited with code $stopExit before -Force restart."
        exit 1
    }
    Start-Sleep -Seconds 2
    if (Test-DevStackAlreadyRunningForForce) {
        Write-Host 'FAIL: Dev stack still running after dev-stop. Close remaining processes and retry.'
        exit 1
    }
    Write-Host '        Dev stack stopped - continuing startup.'
    Write-Host ''
}

# ---------- 1. Pre-flight ----------
Write-Host " [1/11] Pre-flight checks..."

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
if ($ResetDocker) {
    Write-Host "        -ResetDocker requested - forcing surgical recovery before probing the daemon."
    $dockerOk = Invoke-DockerRecovery -TimeoutSeconds 180
} else {
    $dockerOk = Test-DockerDaemonReady
}

if (-not $dockerOk) {
    Write-Host "        Docker daemon is not running or is wedged. Running surgical recovery..."
    $dockerOk = Invoke-DockerRecovery -TimeoutSeconds 180

    if (-not $dockerOk) {
        # Second-attempt escalation. The first pass occasionally races with a
        # Docker Desktop that is still mid-initialization from a Windows boot;
        # waiting a few seconds and re-running the full recovery typically
        # clears that without escalating to `wsl --shutdown` (which would also
        # kill the user's other WSL distros).
        Write-Host "        First recovery pass did not bring the daemon back. Sleeping 5s and retrying once..."
        Start-Sleep -Seconds 5
        $dockerOk = Invoke-DockerRecovery -TimeoutSeconds 180
    }
}
if (-not $dockerOk) {
    Write-Host "        FAIL: Docker Desktop could not be started or is in a wedged state."
    Write-Host "        Manual recovery (use only when the surgical reset twice in a row failed):"
    Write-Host "          1. Quit Docker Desktop from the tray (right-click whale > Quit)"
    Write-Host "          2. PowerShell (Admin): wsl --shutdown"
    Write-Host "          3. Relaunch Docker Desktop and wait for the steady whale icon"
    Write-Host "          4. Re-run dev-start"
    exit 1
}
Write-Host "        All pre-flight checks passed."

# ---------- 1b. 1Password sync ----------
Write-Host ""
Write-Host " [1b/11] Syncing 1Password item env files early..."
$OP_APP_ITEM = $env:EQUIPQR_OP_APP_ITEM
if (-not $OP_APP_ITEM) { $OP_APP_ITEM = $DEFAULT_OP_APP_ITEM }
$OP_EDGE_ITEM = $env:EQUIPQR_OP_EDGE_ITEM
if (-not $OP_EDGE_ITEM) { $OP_EDGE_ITEM = $DEFAULT_OP_EDGE_ITEM }

$opCli = Get-Command op -ErrorAction SilentlyContinue
if ($opCli) {
    Write-Host "        Syncing app + edge env from 1Password items"
    Write-Host "          App:  $OP_APP_ITEM"
    Write-Host "          Edge: $OP_EDGE_ITEM"

    # Run both helpers IN-PROCESS (no `powershell -NoProfile -File` shell-out)
    # so they share the same OP_SESSION_* env vars and any 1Password Desktop
    # App socket session. This collapses what used to be two separate
    # PowerShell child processes (and two visible 1Password auth handshakes)
    # into a single auth context. Each script still owns its own exit code,
    # which we capture via $LASTEXITCODE, and `exit` from inside an &-invoked
    # script does NOT terminate this parent script (only dot-sourced scripts
    # would do that).
    $syncScript = Join-Path $repoRoot 'scripts\sync-1password-dev-envs.ps1'

    $oldOpEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $syncScript -AppItem $OP_APP_ITEM -EdgeItem $OP_EDGE_ITEM -ApiPort $SUPABASE_API_PORT
        $syncExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $oldOpEap
    }
    if ($syncExit -ne 0) {
        Write-Host "        WARNING: One or both 1Password env syncs failed. Using existing .env and $DEFAULT_EDGE_ENV_FILE."
    }

    $supabaseAuthSyncScript = Join-Path $repoRoot 'scripts\sync-local-supabase-auth-env.ps1'
    if (Test-Path -LiteralPath $supabaseAuthSyncScript) {
        $oldSupaAuthEap = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            & $supabaseAuthSyncScript -ApiPort $SUPABASE_API_PORT
            if ($LASTEXITCODE -ne 0) {
                Write-Host "        WARNING: Could not sync supabase\.env Google Auth vars. Run scripts\bootstrap-local-google-auth.ps1 once."
            }
        } finally {
            $ErrorActionPreference = $oldSupaAuthEap
        }
    }

} else {
    Write-Host "        1Password CLI not found on PATH - using existing .env and $DEFAULT_EDGE_ENV_FILE."
}

# ---------- 2. node_modules ----------
Write-Host ""
Write-Host " [2/11] Checking node_modules..."
if ((Test-Path -LiteralPath (Join-Path $repoRoot 'node_modules')) -and (Test-RootNodeModulesHealthy)) {
    Write-Host '        node_modules OK (vite .bin present) - skipping npm ci.'
} elseif (Test-Path -LiteralPath (Join-Path $repoRoot 'node_modules')) {
    Install-RootNodeModules -Reason 'node_modules exists but is incomplete (common after a partial npm ci) - repairing...'
} else {
    Install-RootNodeModules -Reason 'node_modules not found - installing...'
}

$docsNodeModules = Join-Path $repoRoot 'docs\node_modules'
if ((Test-Path -LiteralPath $docsNodeModules) -and (Test-DocsNodeModulesHealthy)) {
    Write-Host '        docs/node_modules OK (vitepress .bin present) - skipping docs npm ci.'
} elseif (Test-Path -LiteralPath $docsNodeModules) {
    Install-DocsNodeModules -Reason 'docs/node_modules exists but is incomplete - repairing...'
} else {
    Install-DocsNodeModules -Reason 'docs/node_modules not found - installing...'
}

# ---------- 3. Stale containers ----------
Write-Host ""
Write-Host " [3/11] Cleaning up stale Supabase containers..."
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
Write-Host " [4/11] Starting Supabase local stack..."

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
            $googleEnabled = docker inspect supabase_auth_ymxkzronkhwxzcdcbnwq --format '{{range .Config.Env}}{{println .}}{{end}}' 2>$null |
                Select-String 'GOTRUE_EXTERNAL_GOOGLE_ENABLED=true'
            if (-not $googleEnabled) {
                Write-Host "        WARNING: Supabase is up but Google sign-in is disabled in the auth container."
                Write-Host "        Run dev-stop.bat then dev-start.bat (or restart Supabase after sync-local-supabase-auth-env.ps1)."
            }
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
    if (-not (Import-SupabaseDotEnv)) {
        Write-Host "        WARNING: supabase\.env missing - Google sign-in will fail until scripts\bootstrap-local-google-auth.ps1 runs."
    }
    # Exclude logflare (Logflare analytics) and vector (its log shipper) on
    # Windows hosts. Vector requires Docker to be exposed on tcp://localhost:2375
    # (the Docker SDK over an unauthenticated TCP socket). Without that,
    # vector restart-loops every ~10 seconds and the CLI emits the
    # "Analytics on Windows requires Docker daemon exposed on tcp://localhost:2375"
    # warning on every start. Enabling the unauthenticated TCP socket just
    # to silence the warning is a security regression for local dev. Local
    # development does not need centralized log shipping; logs remain
    # readable via `docker logs <container>` for any individual service.
    $oldStartEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & npx supabase start -x logflare -x vector
    $startExit = $LASTEXITCODE
    $ErrorActionPreference = $oldStartEap
    if ($startExit -ne 0) {
        # Diagnose the failure mode before retrying. There are two classes:
        #
        # (A) Supabase port trapped in Windows' ephemeral port range. The
        #     OS itself (WinNAT / Hyper-V / WSL2 NAT) has reserved a
        #     100-port chunk that includes one of 54321-54328. This is NOT
        #     a Docker leak -- `docker ps` is empty and no Windows process
        #     is listening -- and it CANNOT be fixed by user-context recovery
        #     (cleaning containers, restarting Docker Desktop, terminating
        #     WSL distros). The only fix is a one-time persistent
        #     administered exclusion, registered via Admin `netsh`. Once
        #     done, it survives reboots forever.
        #
        # (B) Anything else (stuck CLI state, mid-air container, half-dead
        #     supabase_db, etc.). The existing supabase-stop + container-rm
        #     sweep is the right recovery.
        #
        # We probe (A) first because the user-action it requires is
        # different and more important to surface clearly.
        $supabasePorts = @(54321, 54322, 54323, 54324, 54327, 54328)
        $trappedDetail = @()
        $rawExcl = (netsh int ipv4 show excludedportrange protocol=tcp 2>&1) -join "`n"
        foreach ($p in $supabasePorts) {
            foreach ($line in ($rawExcl -split "`r?`n")) {
                if ($line -match '^\s*(\d+)\s+(\d+)\s*(\*?)\s*$') {
                    $startPort = [int]$matches[1]
                    $endPort = [int]$matches[2]
                    $isAdministered = ($matches[3] -eq '*')
                    if ($p -ge $startPort -and $p -le $endPort -and -not $isAdministered) {
                        $trappedDetail += "$p (in WinNAT-allocated range $startPort-$endPort)"
                        break
                    }
                }
            }
        }

        if ($trappedDetail.Count -gt 0) {
            Write-Host ""
            Write-Host "        FAIL: Supabase port(s) trapped by Windows' ephemeral port allocator:"
            $trappedDetail | ForEach-Object { Write-Host "          $_" }
            Write-Host ""
            Write-Host "        ROOT CAUSE: Supabase uses ports 54321-54328, which fall inside"
            Write-Host "        Windows' default ephemeral port range (49152-65535). WinNAT or"
            Write-Host "        Hyper-V can reserve a 100-port chunk that overlaps these ports."
            Write-Host "        This is NOT a Docker problem and CANNOT be fixed by restarting"
            Write-Host "        Docker, terminating WSL, or any user-context recovery."
            Write-Host ""
            Write-Host "        ONE-TIME FIX (persistent across reboots, run once per machine):"
            Write-Host "          .\scripts\reserve-supabase-ports.ps1     (auto-elevates)"
            Write-Host ""
            Write-Host "        Or manually in an Admin PowerShell:"
            Write-Host "          net stop winnat"
            Write-Host "          netsh int ipv4 add excludedportrange protocol=tcp startport=54321 numberofports=8 store=persistent"
            Write-Host "          net start winnat"
            Write-Host ""
            Write-Host "        Then re-run dev-start.bat from your normal (non-elevated) shell."
            exit 1
        }

        # Path (B): not a port-trap. Existing cleanup-and-retry logic.
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
        & npx supabase start -x logflare -x vector
        $retryExit = $LASTEXITCODE
        $ErrorActionPreference = $oldStartEap
        if ($retryExit -ne 0) {
            Write-Host ""
            Write-Host "        FAIL: supabase start failed after retry."
            Write-Host ""
            Write-Host "        Common causes (most likely first):"
            Write-Host "          1. Storage container reports 'Migration <name> not found' or"
            Write-Host "             logs container 'unhealthy'. This is local Storage volume"
            Write-Host "             drift after a Supabase CLI / service-image upgrade."
            Write-Host "             Recovery (removes ONLY local Supabase data for the linked"
            Write-Host "             project ref - not unrelated Docker volumes):"
            Write-Host "                dev-stop.bat"
            Write-Host "                docker volume rm supabase_db_<project-ref>"
            Write-Host "                docker volume rm supabase_storage_<project-ref>"
            Write-Host "                docker volume rm supabase_edge_runtime_<project-ref>"
            Write-Host "                Remove-Item supabase\.temp\storage-version,supabase\.temp\storage-migration -ErrorAction SilentlyContinue"
            Write-Host "                dev-start.bat -Force"
            Write-Host "          2. Pinned Supabase CLI is older than the linked project's"
            Write-Host "             service images. Check: npx supabase --version vs the"
            Write-Host "             'different service versions' warning earlier in this log."
            Write-Host "             Bump the devDependency: npm install --save-dev supabase@latest"
            Write-Host "          3. Trapped Windows ephemeral port (54321-54328). Already"
            Write-Host "             diagnosed above when applicable."
            Write-Host "          4. Run 'dev-stop.bat' then 'dev-start.bat' once more in case"
            Write-Host "             of a transient Docker race."
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
    Write-Host ' [5/11] DB Reset - skipped (use -Force to reset).'
} else {
    Write-Host " [5/11] Generating volume seed data (scale $SeedScale)..."
    & npx tsx scripts/seed-data/generate-seeds.ts --scale $SeedScale
    if ($LASTEXITCODE -ne 0) {
        Write-Host "        FAIL: seed data generation failed (scripts/seed-data/generate-seeds.ts)."
        exit 1
    }

    Write-Host '        Resetting local database (-Force)...'
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
    Write-Host ' [6/11] Type generation - skipped (use -Force to regenerate types).'
} else {
    Write-Host " [6/11] Regenerating Supabase TypeScript types..."
    # Why this is more involved than `Set-Content $cliOutput`:
    # The Supabase CLI (~v2.77 on Windows) interleaves status text with the
    # generated TypeScript on the same streams it uses for the module body.
    # Observed prefixes on stdout: "Connecting to db <port>". Observed
    # suffixes on stderr: the version-bump banner ("A new version of Supabase
    # CLI is available..."). The previous step used `2>&1` to merge streams
    # and then dumped the whole blob into types.ts, which left the file
    # uncompilable. We now (a) divert stderr to a side file so it doesn't
    # contaminate the capture, (b) slice the captured stdout to just the
    # range between the first `export type ` and the last `} as const`
    # (the same defense .cursor/hooks/sync-types.ps1 uses), and (c) write
    # UTF-8 without BOM to match the canonical encoding of the existing file.
    $typesPath = Join-Path $repoRoot 'src\integrations\supabase\types.ts'
    $tmpPath = "$typesPath.tmp"
    $errPath = "$typesPath.err"
    Remove-Item -LiteralPath $tmpPath, $errPath -ErrorAction SilentlyContinue
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $genOut = & npx supabase gen types typescript --local 2> $errPath
    $genExit = $LASTEXITCODE
    $ErrorActionPreference = $oldEap
    if ($genExit -ne 0) {
        Write-Host "        FAIL: Type generation failed (exit $genExit)."
        if (Test-Path -LiteralPath $errPath) {
            Get-Content -LiteralPath $errPath -ErrorAction SilentlyContinue |
                ForEach-Object { Write-Host "          $_" }
        }
        Remove-Item -LiteralPath $tmpPath, $errPath -ErrorAction SilentlyContinue
        exit 1
    }
    $rawContent = if ($genOut) { ($genOut -join "`n") } else { '' }
    $startMatch = [regex]::Match($rawContent, '(?m)^export type ')
    $endMatches = [regex]::Matches($rawContent, '(?m)^} as const\s*$')
    if (-not $startMatch.Success -or $endMatches.Count -eq 0) {
        Write-Host "        FAIL: Generated output did not contain expected TypeScript markers."
        $excerpt = if ($rawContent.Length -gt 500) { $rawContent.Substring(0, 500) } else { $rawContent }
        Write-Host "          stdout (first 500 chars): $excerpt"
        if (Test-Path -LiteralPath $errPath) {
            Write-Host "          captured stderr:"
            Get-Content -LiteralPath $errPath -TotalCount 20 -ErrorAction SilentlyContinue |
                ForEach-Object { Write-Host "            $_" }
        }
        Remove-Item -LiteralPath $tmpPath, $errPath -ErrorAction SilentlyContinue
        exit 1
    }
    $endMatch = $endMatches[$endMatches.Count - 1]
    $startIdx = $startMatch.Index
    $endIdx = $endMatch.Index + $endMatch.Length
    $cleanContent = $rawContent.Substring($startIdx, $endIdx - $startIdx).TrimEnd() + "`n"
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($tmpPath, $cleanContent, $utf8NoBom)
    Move-Item -LiteralPath $tmpPath -Destination $typesPath -Force
    Remove-Item -LiteralPath $errPath -ErrorAction SilentlyContinue
    Write-Host "        Types regenerated successfully."
}

# ---------- 7. Sync local env ----------
Write-Host ""
Write-Host " [7/11] Syncing local Supabase URLs in env files..."
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'scripts\sync-local-supabase-env.ps1') -ApiPort $SUPABASE_API_PORT
if ($LASTEXITCODE -ne 0) {
    Write-Host "        WARNING: Could not sync local Supabase URLs. Update .env.local manually if needed."
}

if ($PrepareOnly) {
    Write-Host ""
    Write-Host " [PrepareOnly] Stack prepared through step 7."
    Write-Host "        Start Edge Functions, docs, and Vite via Cursor tasks (F5 or Tasks: Run Task)."
    Write-Host ""
    exit 0
}

# ---------- 8. Edge Functions ----------
Write-Host ""
Write-Host " [8/11] Starting Supabase Edge Functions serve..."
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
    $edgeArgs = @('supabase', 'functions', 'serve', '--env-file', $EDGE_ENV_FILE)
    if ($EDGE_SERVE_FLAGS -match '--no-verify-jwt') {
        $edgeArgs += '--no-verify-jwt'
    }
    $null = Start-DevBackgroundProcess `
        -Name 'edge-functions' `
        -WorkingDirectory $repoRoot `
        -FilePath 'npx.cmd' `
        -ArgumentList $edgeArgs

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

# ---------- 8b. Refresh kong upstream pool ----------
# `supabase functions serve` (step 8) recreates the supabase_edge_runtime
# Docker container with the locally-mounted source tree, which assigns it
# a NEW container IP. Kong (started by `supabase start` in step 4) keeps
# the OLD edge_runtime IP in its nginx upstream connection pool, so every
# subsequent /functions/v1/* request fails with 502 Bad Gateway and a
# kong error log line "connect() failed (113: Host is unreachable)" or
# "connect() failed (111: Connection refused)" depending on what now
# occupies the stale IP. Restarting kong forces it to re-resolve the
# upstream hostname and refresh its pool. No-op if kong isn't running.
Write-Host ""
Write-Host " [8b/11] Refreshing kong upstream pool for new edge_runtime IP..."
$kongName = (docker ps --filter 'name=supabase_kong_' --format '{{.Names}}' 2>$null | Select-Object -First 1)
if ($kongName) {
    $oldKongEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $null = & docker restart $kongName 2>&1
    $restartExit = $LASTEXITCODE
    $ErrorActionPreference = $oldKongEap
    if ($restartExit -eq 0) {
        # Wait for kong to accept HTTP requests with a real route loaded.
        # Probing root returns a kong "no Route matched" 404 with a JSON
        # body once routes are loaded, which is our readiness signal.
        $kongReady = $false
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 1
            try {
                $r = Invoke-WebRequest -Uri "http://localhost:$SUPABASE_API_PORT/" `
                    -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
                $kongReady = $true; break
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
    } else {
        Write-Host "        WARNING: docker restart $kongName failed (exit $restartExit)."
        Write-Host "        Function calls may 502 until kong is restarted manually."
    }
} else {
    Write-Host "        WARNING: kong container not found - skipping refresh."
}

# ---------- 9. Docs ----------
Write-Host ""
Write-Host " [9/11] Starting documentation dev server (port 5174)..."

$listen5174 = Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue
if ($listen5174) {
    Write-Host "        Port 5174 in use - verifying docs..."
    if (Test-DocsResponding) {
        Write-Host "        Docs already running - skipped."
    } else {
        Write-Host "        FAIL: Port 5174 is not serving EquipQR docs. Free the port or stop the other process."
        exit 1
    }
} else {
    Write-Host '        Launching docs in background...'
    $null = Start-DevBackgroundProcess `
        -Name 'docs' `
        -WorkingDirectory $repoRoot `
        -FilePath 'npm.cmd' `
        -ArgumentList @('run', 'docs:dev')

    Write-Host "        Waiting for docs (up to 45s)..."
    $timeout = 45
    $elapsed = 0
    $docsUp = $false
    while ($elapsed -lt $timeout) {
        if (Test-DocsResponding) {
            Write-Host "        Documentation dev server is ready."
            $docsUp = $true
            break
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "        Waiting... ${elapsed}s"
    }
    if (-not $docsUp) {
        Write-Host "        FAIL: Docs health check timed out."
        exit 1
    }
}

# ---------- 10. Vite ----------
Write-Host ""
Write-Host " [10/11] Starting Vite dev server (port 8080)..."

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
    if (-not (Test-RootNodeModulesHealthy)) {
        Write-Host '        FAIL: vite is not installed in node_modules. Re-run dev-start.bat (step 2 repairs dependencies).'
        exit 1
    }
    Write-Host '        Launching Vite in background...'
    $null = Start-DevBackgroundProcess `
        -Name 'vite' `
        -WorkingDirectory $repoRoot `
        -FilePath 'npm.cmd' `
        -ArgumentList @('run', 'dev')

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
$DOCS_STATUS = '[UNKNOWN]'
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

if (Test-DocsResponding) {
    $DOCS_STATUS = '[OK]'
} else {
    $DOCS_STATUS = '[FAILED]'
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
Write-Host "  Docs:           http://localhost:5174          $DOCS_STATUS"
Write-Host "  Edge Functions: (via Supabase API)             $FUNCTIONS_STATUS"
Write-Host ""
Write-Host "  Background logs: tmp\dev-logs\ (vite, docs, edge-functions)"
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
