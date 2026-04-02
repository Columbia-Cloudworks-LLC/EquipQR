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

# --- Port sweep (full stack) ---
Write-Host ""
Write-Host " [Ports] Cleaning up orphan listeners..."
$ports = @(8080, 54321, 54322, 54323, 54324, 54325, 54326, 54327, 58220, 58221, 58222, 58223, 58224, 58225, 58226, 58227)
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
