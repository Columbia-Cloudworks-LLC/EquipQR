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
    (ERROR_SHARING_VIOLATION) is misleading -- it has nothing to do with
    file access. Briefly stopping WinNAT releases all dynamic
    reservations; we add the persistent exclusion in the clear window;
    then restart WinNAT and it will respect the new exclusion forever.

.NOTES
  - Requires Administrator. Will self-elevate if not already elevated.
  - Briefly stops/starts WinNAT (~2s window). This drops all Hyper-V/WSL2
    NAT mappings for that window -- VPN clients (e.g. Mullvad) may need to
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

# Returns a string describing the administered exclusion(s) that cover the
# Supabase port band 54321-54328 if (and only if) every port in that band
# is covered by at least one administered range, or $null otherwise.
#
# Why per-port coverage instead of single-range coverage:
#   On machines that have previously had ad-hoc `netsh add excludedportrange`
#   calls (e.g. a developer who added 54321-54324 once and 54325-54328 later,
#   or who has unrelated administered exclusions that happen to clip into the
#   Supabase band), the band can be fully protected by multiple smaller
#   administered ranges. The earlier single-range check would miss that and
#   try to add an overlapping persistent exclusion, which `netsh` rejects
#   with ERROR_SHARING_VIOLATION even though the band is already protected.
function Find-CoveringAdministeredExclusion {
    $rawExcl = (netsh int ipv4 show excludedportrange protocol=tcp 2>&1) -join "`n"
    $adminRanges = @()
    foreach ($line in ($rawExcl -split "`r?`n")) {
        if ($line -match '^\s*(\d+)\s+(\d+)\s*\*\s*$') {
            $adminRanges += [pscustomobject]@{
                Start = [int]$matches[1]
                End   = [int]$matches[2]
            }
        }
    }

    if ($adminRanges.Count -eq 0) { return $null }

    $supabasePorts = 54321..54328
    $coveringRanges = @{}
    foreach ($p in $supabasePorts) {
        $covered = $false
        foreach ($r in $adminRanges) {
            if ($p -ge $r.Start -and $p -le $r.End) {
                $coveringRanges["$($r.Start)-$($r.End)"] = $true
                $covered = $true
                break
            }
        }
        if (-not $covered) { return $null }
    }

    return ($coveringRanges.Keys | Sort-Object) -join ', '
}

if (-not (Test-IsAdmin)) {
    Write-Host "Re-launching with Administrator privileges (a UAC prompt will appear)..."
    $scriptPath = $PSCommandPath
    if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }
    try {
        $proc = Start-Process -FilePath 'powershell.exe' `
            -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$scriptPath`"" `
            -Verb RunAs -Wait -PassThru
        exit $proc.ExitCode
    } catch {
        Write-Host "FAIL: Elevation was cancelled or failed: $($_.Exception.Message)"
        exit 1
    }
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
$winnatStartExit = $LASTEXITCODE
$hnsStartExit = 0
if ($hnsStopped) {
    $null = & net start hns 2>&1
    $hnsStartExit = $LASTEXITCODE
}

if (($winnatStartExit -ne 0) -or ($hnsStopped -and $hnsStartExit -ne 0)) {
    if ($winnatStartExit -ne 0) {
        Write-Host "        FAIL: could not restart WinNAT (exit $winnatStartExit)."
    }
    if ($hnsStopped -and $hnsStartExit -ne 0) {
        Write-Host "        FAIL: could not restart HNS (exit $hnsStartExit)."
    }
    Write-Host "        NAT services did not come back up. Please restart the failed service(s) manually"
    Write-Host "        (for example: 'net start winnat' and/or 'net start hns') before continuing."
    if ($Host.Name -eq 'ConsoleHost') {
        Write-Host ""
        Write-Host "        Press any key to close..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    }
    exit 1
}

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
