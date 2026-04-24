#Requires -Version 5.1
<#
.SYNOPSIS
  Shut down the EquipQR local development stack (Vite, Edge Functions serve, Supabase Docker).

.PARAMETER Force
  Also stop Docker Desktop after tearing down dev services.

.EXAMPLE
  .\dev-stop.ps1
  .\dev-stop.ps1 -Force
#>
[CmdletBinding()]
param(
    [switch]$Force,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest = @()
)

$ErrorActionPreference = 'Continue'
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
    Write-Host 'Usage: .\dev-stop.ps1 [-Force]'
    exit 2
}

# dev-stop is normally a user-context operation. Running it from an
# Administrator shell is allowed (and sometimes useful for forcibly clearing
# wedged Docker Desktop state with -Force), but it is not the expected path
# and can mask permission issues developers will hit later. Warn but
# continue. dev-start.ps1 hard-fails on Admin context for the same reasons.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "WARNING: dev-stop is running from an Administrator shell."
    Write-Host '         OK if you are intentionally clearing wedged state with -Force.'
    Write-Host '         Otherwise, prefer a normal (non-elevated) shell.'
    Write-Host ''
}

$stopFail = $false

Write-Host ""
Write-Host " ============================================"
Write-Host '  EquipQR Dev Environment - Shutdown'
if ($Force) {
    Write-Host '  Docker: stop Desktop (-Force)'
} else {
    Write-Host '  Docker: keep Desktop running (use -Force to quit Docker Desktop)'
}
Write-Host " ============================================"
Write-Host ""

# --- Vite (port 8080) ---
Write-Host " [Vite] Stopping dev server (port 8080)..."
try {
    $pids = @(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique)
    if (-not $pids -or $pids.Count -eq 0) {
        Write-Host '        Nothing listening on port 8080 - skipped.'
    } else {
        foreach ($p in $pids) {
            try {
                Stop-Process -Id $p -Force -ErrorAction Stop
                Write-Host "        Killed PID $p"
            } catch {
                Write-Host "        Could not kill PID $p"
                $stopFail = $true
            }
        }
    }
} catch {
    Write-Host "        Vite stop step error: $_"
    $stopFail = $true
}

# --- Edge Functions serve ---
Write-Host ""
Write-Host " [Edge] Stopping Supabase Edge Functions serve..."
try {
    $procs = Get-Process -Name 'node', 'deno' -ErrorAction SilentlyContinue | Where-Object {
        try {
            $cmd = (Get-CimInstance Win32_Process -Filter ("ProcessId=$($_.Id)")).CommandLine
            $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve')
        } catch { $false }
    }
    if (-not $procs) {
        Write-Host '        Edge Functions serve not detected - skipped.'
    } else {
        foreach ($proc in $procs) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host "        Killed PID $($proc.Id)"
            } catch {
                Write-Host "        Could not kill PID $($proc.Id)"
                $stopFail = $true
            }
        }
    }
} catch {
    Write-Host "        Edge stop step error: $_"
    $stopFail = $true
}

# --- Supabase Docker stack ---
Write-Host ""
Write-Host " [Supabase] Stopping local stack (Docker containers)..."
$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) {
    Write-Host '        npx not found on PATH - cannot run supabase stop.'
    $stopFail = $true
} else {
    $null = & npx supabase status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host '        Supabase is not running - skipped supabase stop.'
    } else {
        & npx supabase stop
        if ($LASTEXITCODE -ne 0) {
            Write-Host '        supabase stop returned an error - attempting container cleanup.'
            $stopFail = $true
        } else {
            Write-Host "        Supabase stopped successfully."
        }
    }
}

$supaIds = docker ps -aq --filter "name=supabase_" 2>$null
if ($supaIds) {
    foreach ($line in ($supaIds -split "`r?`n")) {
        $c = $line.Trim()
        if ($c) {
            $null = docker rm -f $c 2>&1
            Write-Host "        Removed lingering container $c"
        }
    }
}

# Prune orphan Docker networks. Networks left behind by an unclean teardown
# can keep port-mapping references alive, which in turn keeps the Hyper-V
# host-side port reservation registered with vmcompute. `docker network
# prune` only removes networks not currently in use by any container, so
# this cannot interfere with anything that is intentionally up.
$oldPruneEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$null = & docker network prune -f 2>&1
$ErrorActionPreference = $oldPruneEap

# --- Port sweep (full stack) ---
Write-Host ""
Write-Host " [Ports] Cleaning up orphan listeners..."
$ports = @(8080, 54321, 54322, 54323, 54324, 54325, 54326, 54327, 54328, 58220, 58221, 58222, 58223, 58224, 58225, 58226, 58227)
$portFail = $false
foreach ($port in $ports) {
    $pids = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($p in $pids) {
        try {
            Stop-Process -Id $p -Force -ErrorAction Stop
            Write-Host "        Killed orphan PID $p on port $port"
        } catch {
            Write-Host "        Could not kill PID $p on port $port"
            $portFail = $true
        }
    }
}
Write-Host "        Port sweep complete."
if ($portFail) { $stopFail = $true }

# --- Hyper-V / WinNAT port reservation check (diagnostic only) ---
# The port sweep above can only see Windows-side processes. The Windows
# kernel itself can also reserve port chunks within the ephemeral range
# (49152-65535) via WinNAT or Hyper-V, and Supabase's ports 54321-54328
# fall inside that range. When the dynamic allocator traps one of those
# ports, no `Get-NetTCPConnection` and no `docker ps` will reveal it --
# only `netsh int ipv4 show excludedportrange` does, and that range has
# no owning user-space process to kill.
#
# Crucially, this is NOT a Docker leak. Restarting Docker Desktop, killing
# the docker-desktop WSL distro, and pruning networks all leave it intact
# because the reservation belongs to the Windows TCP/IP stack itself. The
# only fix is a one-time Admin `netsh add excludedportrange ... store=
# persistent` registered for the Supabase port band, after which the
# kernel will skip those ports forever (across reboots). That fix lives
# in scripts\reserve-supabase-ports.ps1 -- so dev-stop only diagnoses and
# tells the user how to fix it.
Write-Host ""
Write-Host " [Hyper-V] Checking for trapped Supabase ports..."
$supabasePorts = @(54321, 54322, 54323, 54324, 54327, 54328)
$trappedDetail = @()
$administeredCount = 0
$rawExcl = (netsh int ipv4 show excludedportrange protocol=tcp 2>&1) -join "`n"
foreach ($p in $supabasePorts) {
    foreach ($line in ($rawExcl -split "`r?`n")) {
        if ($line -match '^\s*(\d+)\s+(\d+)\s*(\*?)\s*$') {
            $startPort = [int]$matches[1]
            $endPort = [int]$matches[2]
            $isAdministered = ($matches[3] -eq '*')
            if ($p -ge $startPort -and $p -le $endPort) {
                if ($isAdministered) {
                    $administeredCount++
                } else {
                    $trappedDetail += "$p (in WinNAT-allocated range $startPort-$endPort)"
                }
                break
            }
        }
    }
}
if ($administeredCount -ge $supabasePorts.Count) {
    Write-Host "        OK: Supabase ports are protected by an administered exclusion (one-time fix is in place)."
} elseif ($trappedDetail.Count -eq 0) {
    Write-Host "        OK: no Supabase ports currently trapped by WinNAT."
} else {
    Write-Host "        WARNING: Supabase port(s) trapped by Windows' ephemeral port allocator:"
    $trappedDetail | ForEach-Object { Write-Host "          $_" }
    Write-Host ""
    Write-Host "        This is an OS-level reservation conflict, NOT a Docker leak."
    Write-Host "        Stopping/restarting Docker, terminating WSL, and pruning networks will not help."
    Write-Host ""
    Write-Host "        ONE-TIME FIX (persistent across reboots, run once per machine):"
    Write-Host "          .\scripts\reserve-supabase-ports.ps1     (auto-elevates)"
    Write-Host ""
    Write-Host "        Or manually in an Admin PowerShell:"
    Write-Host "          net stop winnat"
    Write-Host "          netsh int ipv4 add excludedportrange protocol=tcp startport=54321 numberofports=8 store=persistent"
    Write-Host "          net start winnat"
    Write-Host ""
    Write-Host "        After running once, this WARNING will never appear again."
}

# --- Docker Desktop (optional) ---
if ($Force) {
    Write-Host ""
    Write-Host " [Docker] Stopping Docker Desktop..."
    $dockerProc = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue
    if (-not $dockerProc) {
        Write-Host '        Docker Desktop is not running - skipped.'
    } else {
        Write-Host "        Shutting down Docker Desktop..."
        Stop-Process -Name 'Docker Desktop' -Force -ErrorAction SilentlyContinue
        Stop-Process -Name 'com.docker.backend' -Force -ErrorAction SilentlyContinue
        Stop-Process -Name 'com.docker.proxy' -Force -ErrorAction SilentlyContinue
        $timeout = 30
        $elapsed = 0
        $dockerStopped = $false
        while ($elapsed -lt $timeout) {
            $still = Get-Process -Name 'com.docker.backend' -ErrorAction SilentlyContinue
            if (-not $still) {
                Write-Host "        Docker Desktop stopped."
                $dockerStopped = $true
                break
            }
            Start-Sleep -Seconds 2
            $elapsed += 2
        }
        if (-not $dockerStopped) {
            Write-Host "        Docker Desktop may still be shutting down."
            $stopFail = $true
        }
    }
}

Write-Host ""
Write-Host " ============================================"
if (-not $stopFail) {
    Write-Host "  Shutdown complete."
} else {
    Write-Host "  Shutdown finished with one or more errors."
    Write-Host "  Review messages above."
}
Write-Host " ============================================"
if (-not $Force) {
    Write-Host ""
    Write-Host "  Docker Desktop was left running. To stop it:"
    Write-Host '    .\dev-stop.bat -Force'
    Write-Host '    .\dev-stop.ps1 -Force'
}
Write-Host ""

exit $(if ($stopFail) { 1 } else { 0 })
