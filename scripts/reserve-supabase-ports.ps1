#Requires -Version 5.1
<#
.SYNOPSIS
  Permanently reserve Supabase ports 54321-54328 from Windows' ephemeral
  port allocator. One-time admin fix; survives reboots.

.DESCRIPTION
  Supabase uses fixed ports 54321 (API), 54322 (Postgres), 54323 (Studio),
  54324 (Inbucket), 54327 (Analytics), 54328 (Pooler). All of these fall
  inside Windows' default ephemeral port range (49152-65535).

  WinNAT and Hyper-V can dynamically reserve 100-port chunks within that
  range for outbound NAT mappings, occasionally landing on top of these
  Supabase ports and blocking dev-start.bat with a misleading
  "An attempt was made to access a socket in a way forbidden by its access
  permissions" error (Win32 WSAEACCES) on `bind`.

  This script registers a persistent administered exclusion for 54321-54328
  via `netsh int ipv4 add excludedportrange ... store=persistent`. After
  running once, the Windows kernel will never auto-allocate these ports
  again, regardless of reboots, Docker restarts, or WSL2 churn.

  Why the netsh call needs `net stop winnat` first:
    Windows refuses to add an "administered" excluded range that overlaps
    an active OS-allocated dynamic reservation. The error it returns
    (ERROR_SHARING_VIOLATION) is misleading — it has nothing to do with
    file access. Briefly stopping WinNAT releases all dynamic
    reservations; we add the persistent exclusion in the clear window;
    then restart WinNAT and it will respect the new exclusion forever.

.NOTES
  - Requires Administrator. Will self-elevate if not already elevated.
  - Briefly stops/starts WinNAT (~2s window). This drops all Hyper-V/WSL2
    NAT mappings for that window — VPN clients (e.g. Mullvad) may need to
    reconnect, in-flight SSH sessions through WSL2 will drop. Best run
    when Docker Desktop is stopped (`dev-stop.bat -Force` first).
  - This script is idempotent: if the exclusion already covers
    54321-54328, it exits OK without making changes.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Test-IsAdmin {
    return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Find-CoveringAdministeredExclusion {
    $rawExcl = (netsh int ipv4 show excludedportrange protocol=tcp 2>&1) -join "`n"
    foreach ($line in ($rawExcl -split "`r?`n")) {
        if ($line -match '^\s*(\d+)\s+(\d+)\s*\*\s*$') {
            $startPort = [int]$matches[1]
            $endPort = [int]$matches[2]
            if ($startPort -le 54321 -and $endPort -ge 54328) {
                return "$startPort-$endPort"
            }
        }
    }
    return $null
}

if (-not (Test-IsAdmin)) {
    Write-Host "Re-launching with Administrator privileges (a UAC prompt will appear)..."
    $scriptPath = $PSCommandPath
    if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$scriptPath`"" `
        -Verb RunAs -Wait
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host " ============================================"
Write-Host "  EquipQR - Reserve Supabase Ports (one-time)"
Write-Host " ============================================"
Write-Host ""

# Idempotency check: if 54321-54328 is already covered by an administered
# exclusion, exit cleanly without touching anything.
$existing = Find-CoveringAdministeredExclusion
if ($existing) {
    Write-Host "        Supabase ports 54321-54328 are already protected by administered exclusion $existing."
    Write-Host "        Nothing to do. Exiting."
    Write-Host ""
    if ($Host.Name -eq 'ConsoleHost') {
        Write-Host "        Press any key to close..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    }
    exit 0
}

Write-Host "        Stopping WinNAT (releases overlapping dynamic reservations)..."
$hnsStopped = $false
$null = & net stop winnat 2>&1
$winnatStopExit = $LASTEXITCODE
if ($winnatStopExit -ne 0) {
    Write-Host "        net stop winnat returned exit $winnatStopExit; trying to stop hns first..."
    $null = & net stop hns 2>&1
    $hnsStopExit = $LASTEXITCODE
    if ($hnsStopExit -eq 0) { $hnsStopped = $true }
    $null = & net stop winnat 2>&1
    $winnatStopExit = $LASTEXITCODE
    if ($winnatStopExit -ne 0) {
        Write-Host "        FAIL: could not stop WinNAT (exit $winnatStopExit). Aborting."
        if ($hnsStopped) { $null = & net start hns 2>&1 }
        exit 1
    }
}

Write-Host "        Adding persistent exclusion for ports 54321-54328..."
$null = & netsh int ipv4 add excludedportrange protocol=tcp startport=54321 numberofports=8 store=persistent 2>&1
$addExit = $LASTEXITCODE

Write-Host "        Restarting WinNAT..."
$null = & net start winnat 2>&1
if ($hnsStopped) { $null = & net start hns 2>&1 }

if ($addExit -ne 0) {
    Write-Host "        FAIL: netsh add excludedportrange returned exit $addExit."
    Write-Host "        WinNAT has been restarted. No persistent exclusion was added."
    if ($Host.Name -eq 'ConsoleHost') {
        Write-Host ""
        Write-Host "        Press any key to close..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    }
    exit 1
}

Write-Host ""
Write-Host "        Verifying..."
$verified = Find-CoveringAdministeredExclusion
if ($verified) {
    Write-Host "        OK - Supabase ports 54321-54328 are now protected (administered exclusion $verified)."
} else {
    Write-Host "        FAIL: verification did not find an administered exclusion covering 54321-54328."
    if ($Host.Name -eq 'ConsoleHost') {
        Write-Host ""
        Write-Host "        Press any key to close..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    }
    exit 1
}

Write-Host ""
Write-Host " ============================================"
Write-Host "  Done. dev-start.bat will no longer hit"
Write-Host "  WSAEACCES on Supabase ports 54321-54328."
Write-Host "  This survives reboots, Docker restarts, and"
Write-Host "  WSL2 churn. No need to ever re-run this script."
Write-Host " ============================================"
Write-Host ""

if ($Host.Name -eq 'ConsoleHost') {
    Write-Host "Press any key to close..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
}
exit 0
