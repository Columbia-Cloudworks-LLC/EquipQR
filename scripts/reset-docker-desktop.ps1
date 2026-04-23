#Requires -Version 5.1
<#
.SYNOPSIS
  Surgically recover a wedged Docker Desktop / dockerDesktopLinuxEngine pipe on
  Windows without touching unrelated WSL distros.

.DESCRIPTION
  Docker Desktop on Windows can land in a "half-restart" state where the GUI is
  running but the Linux engine pipe (`\\.\pipe\dockerDesktopLinuxEngine`) is
  dead - every `docker info` succeeds (it returns client-only data and exits 0)
  while every container/image API call hangs or returns "500 Internal Server
  Error". This script forces a clean recovery:

  1. Kill orphaned Docker host processes (Docker Desktop GUI, com.docker.backend,
     com.docker.proxy, com.docker.build, docker-agent, docker-sandbox, hung
     `docker` CLI children).
  2. Terminate the `docker-desktop` and `docker-desktop-data` WSL distros only
     (the user's own distros, e.g. Ubuntu, stay running).
  3. Best-effort start of the `com.docker.service` Windows service. This call
     requires Administrator and silently skips when not elevated; Docker Desktop
     GUI starts the service itself in that case.
  4. Re-launch Docker Desktop.
  5. Poll the daemon with a per-call hard timeout (default 8s) up to a wall-clock
     budget (default 180s) using `docker ps -q` - the same readiness probe used
     by `dev-start.ps1`'s `Test-DockerDaemonReady`. `docker info` is intentionally
     NOT used because it lies in the wedge state.

.PARAMETER TimeoutSeconds
  Wall-clock budget to wait for the daemon to come back. Default 180s.

.PARAMETER PerCallTimeoutSeconds
  Per `docker ps -q` invocation hard timeout - protects against the hung pipe
  blocking the script forever. Default 8s.

.PARAMETER SkipKill
  Skip step 1 (process kill) - useful when chaining with another recovery.

.OUTPUTS
  Exit code 0 when the daemon answers `docker ps -q` cleanly within the budget,
  1 otherwise.

.EXAMPLE
  .\scripts\reset-docker-desktop.ps1

.EXAMPLE
  # Tighter budget for CI / interactive use
  .\scripts\reset-docker-desktop.ps1 -TimeoutSeconds 90
#>
[CmdletBinding()]
param(
    [int]$TimeoutSeconds = 180,
    [int]$PerCallTimeoutSeconds = 8,
    [switch]$SkipKill
)

$ErrorActionPreference = 'Continue'

function Write-Step {
    param([string]$Message)
    Write-Host "        [reset-docker] $Message"
}

# Bounded daemon health check. Returns $true only when `docker ps -q` exits 0
# AND its stderr does not contain a known wedge signature, AND the call returns
# within $PerCallTimeoutSeconds. Uses a background job so a hung pipe cannot
# block the parent script.
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
    Remove-Job  -Job $job -Force -ErrorAction SilentlyContinue

    if ($null -eq $result) { return $false }
    if ($result.ExitCode -ne 0) { return $false }
    if ($result.Output -match '500 Internal Server Error') { return $false }
    if ($result.Output -match 'error during connect') { return $false }
    if ($result.Output -match 'Cannot connect to the Docker daemon') { return $false }
    return $true
}

if (-not $SkipKill) {
    Write-Step 'Killing orphaned Docker host processes...'
    $procNames = @(
        'Docker Desktop',
        'com.docker.backend',
        'com.docker.proxy',
        'com.docker.build',
        'docker-agent',
        'docker-sandbox',
        'docker'
    )
    foreach ($name in $procNames) {
        Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force -ErrorAction Stop
                Write-Step "  killed $name (pid $($_.Id))"
            } catch {
                # Permission denied or already exited - fine to ignore.
            }
        }
    }
    Start-Sleep -Seconds 2
}

Write-Step 'Terminating docker-desktop WSL distro (Ubuntu and other distros are NOT touched)...'
$null = & wsl --terminate docker-desktop 2>&1
$null = & wsl --terminate docker-desktop-data 2>&1
Start-Sleep -Seconds 2

Write-Step 'Best-effort: ensuring com.docker.service is running...'
try {
    $svc = Get-Service -Name 'com.docker.service' -ErrorAction Stop
    if ($svc.Status -ne 'Running') {
        try {
            Start-Service -Name 'com.docker.service' -ErrorAction Stop
            Write-Step '  com.docker.service started'
        } catch {
            # Non-admin shells cannot Start-Service for Docker Desktop's
            # service. Docker Desktop GUI will start it on launch, so this is
            # expected and recoverable.
            Write-Step '  Start-Service failed (non-admin shell?) - Docker Desktop GUI will start it'
        }
    } else {
        Write-Step '  com.docker.service already Running'
    }
} catch {
    Write-Step '  com.docker.service not registered - skipping'
}

Write-Step 'Launching Docker Desktop...'
$candidates = @(
    'C:\Program Files\Docker\Docker\Docker Desktop.exe',
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
)
$dd = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if ($dd) {
    Start-Process -FilePath $dd
    Write-Step "  launched: $dd"
} else {
    Write-Step '  WARNING: Docker Desktop.exe not found - daemon will not come back without manual launch'
    exit 1
}

Write-Step "Waiting for daemon to be ready (up to ${TimeoutSeconds}s, ${PerCallTimeoutSeconds}s per probe)..."
$elapsed = 0
$ready = $false
while ($elapsed -lt $TimeoutSeconds) {
    if (Test-DockerDaemonReady -PerCallTimeoutSeconds $PerCallTimeoutSeconds) {
        Write-Step "  daemon READY after ${elapsed}s"
        $ready = $true
        break
    }
    Start-Sleep -Seconds 3
    $elapsed += 3
    if (($elapsed % 15) -eq 0) {
        Write-Step "  ... still waiting (${elapsed}s)"
    }
}

if (-not $ready) {
    Write-Step "FAIL: daemon did not come back within ${TimeoutSeconds}s"
    Write-Step 'Manual recovery:'
    Write-Step '  1. Quit Docker Desktop from the tray (right-click whale > Quit)'
    Write-Step '  2. PowerShell (Admin): wsl --shutdown'
    Write-Step '  3. Relaunch Docker Desktop and wait for the steady whale icon'
    Write-Step '  4. Re-run dev-start'
    exit 1
}

exit 0
