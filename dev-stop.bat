@echo off
REM ============================================================================
REM  dev-stop.bat — Shut down the EquipQR local development stack
REM
REM  Usage:
REM    dev-stop.bat [--mode full|backend|core]   Default: full (stop all dev services)
REM    dev-stop.bat -Force                       Also shut down Docker Desktop
REM    dev-stop.bat --no-pause                   Suppress final pause (automation)
REM
REM  Modes (what gets stopped):
REM    full    — Vite, Edge Functions serve, Supabase Docker stack, dev ports
REM    backend — Edge Functions serve, Supabase Docker stack, Supabase-related ports
REM    core    — Supabase Docker stack and Supabase-related ports only
REM
REM  Exit code 0 = all attempted stop steps succeeded; 1 = one or more failures.
REM  Safe to run when nothing is running.
REM ============================================================================

setlocal EnableDelayedExpansion

set "STOP_DOCKER=0"
set "NO_PAUSE=0"
set "STOP_MODE=full"
set "STOP_FAIL=0"

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--mode" (
    if "%~2"=="" (
        echo        FAIL: --mode requires: core, backend, or full.
        endlocal & exit /b 1
    )
    set "STOP_MODE=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-Force" set "STOP_DOCKER=1"
if /i "%~1"=="/Force" set "STOP_DOCKER=1"
if /i "%~1"=="--force" set "STOP_DOCKER=1"
if /i "%~1"=="--no-pause" set "NO_PAUSE=1"
shift
goto :parse_args
:args_done

set "STOP_VITE=0"
set "STOP_EDGE=0"
set "STOP_SUPABASE=1"
if /i "!STOP_MODE!"=="core" goto :stop_mode_ok
if /i "!STOP_MODE!"=="backend" (
    set "STOP_EDGE=1"
    goto :stop_mode_ok
)
if /i "!STOP_MODE!"=="full" (
    set "STOP_VITE=1"
    set "STOP_EDGE=1"
    goto :stop_mode_ok
)
echo        FAIL: Unknown mode "!STOP_MODE!". Use: core, backend, or full.
endlocal & exit /b 1
:stop_mode_ok

echo.
echo  ============================================
echo   EquipQR Dev Environment — Shutdown
echo   Mode: !STOP_MODE!
if %STOP_DOCKER% equ 1 (
    echo   Docker: stop Desktop ^(-Force^)
) else (
    echo   Docker: keep Desktop running
)
echo  ============================================
echo.

REM ---------- 1. Vite (full only) --------------------------------------------
if %STOP_VITE% equ 0 goto :after_vite
echo  [Vite] Stopping dev server (port 8080)...
powershell -NoProfile -Command ^
  "$failed = $false; " ^
  "$pids = (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique; " ^
  "if (-not $pids) { Write-Host '       Nothing listening on port 8080 — skipped.'; exit 0 }; " ^
  "foreach ($p in $pids) { try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host ('       Killed PID ' + $p) } catch { Write-Host ('       Could not kill PID ' + $p); $failed = $true } }; " ^
  "if ($failed) { exit 1 } else { exit 0 }"
if !errorlevel! neq 0 set "STOP_FAIL=1"
:after_vite

REM ---------- 2. Edge Functions serve (backend / full) -----------------------
if %STOP_EDGE% equ 0 goto :after_edge
echo.
echo  [Edge] Stopping Supabase Edge Functions serve...
powershell -NoProfile -Command ^
  "$failed = $false; " ^
  "$procs = Get-Process -Name 'node','deno' -ErrorAction SilentlyContinue | Where-Object { " ^
  "  try { $cmd = (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.Id)).CommandLine; " ^
  "    $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve') " ^
  "  } catch { $false } " ^
  "}; " ^
  "if (-not $procs) { Write-Host '       Edge Functions serve not detected — skipped.'; exit 0 }; " ^
  "foreach ($proc in $procs) { try { Stop-Process -Id $proc.Id -Force -ErrorAction Stop; Write-Host ('       Killed PID ' + $proc.Id) } catch { Write-Host ('       Could not kill PID ' + $proc.Id); $failed = $true } }; " ^
  "if ($failed) { exit 1 } else { exit 0 }"
if !errorlevel! neq 0 set "STOP_FAIL=1"
:after_edge

REM ---------- 3. Supabase Docker stack -----------------------------------------
echo.
echo  [Supabase] Stopping local stack (Docker containers)...
where npx >nul 2>&1
if %errorlevel% neq 0 (
    echo        npx not found on PATH — cannot run supabase stop.
    set "STOP_FAIL=1"
    goto :supabase_container_cleanup
)

call npx supabase status >nul 2>&1
if %errorlevel% neq 0 (
    echo        Supabase is not running — skipped supabase stop.
    goto :supabase_container_cleanup
)

call npx supabase stop
if %errorlevel% neq 0 (
    echo        supabase stop returned an error — attempting container cleanup.
    set "STOP_FAIL=1"
) else (
    echo        Supabase stopped successfully.
)

:supabase_container_cleanup
for /f "tokens=*" %%c in ('docker ps -aq --filter "name=supabase_" 2^>nul') do (
    docker rm -f %%c >nul 2>&1
    echo        Removed lingering container %%c
)

REM ---------- 4. Orphan port cleanup (mode-scoped) ----------------------------
echo.
echo  [Ports] Cleaning up orphan listeners...
if /i "!STOP_MODE!"=="full" (
    powershell -NoProfile -Command ^
      "$failed = $false; " ^
      "$ports = @(8080, 54321, 54322, 54323, 54324, 54325, 54326, 54327, 58220, 58221, 58222, 58223, 58224, 58225, 58226, 58227); " ^
      "foreach ($port in $ports) { " ^
      "  $pids = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique; " ^
      "  foreach ($p in $pids) { " ^
      "    try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host ('       Killed orphan PID ' + $p + ' on port ' + $port) } " ^
      "    catch { Write-Host ('       Could not kill PID ' + $p + ' on port ' + $port); $failed = $true } " ^
      "  } " ^
      "}; " ^
      "Write-Host '       Port sweep complete.'; " ^
      "if ($failed) { exit 1 } else { exit 0 }"
    if !errorlevel! neq 0 set "STOP_FAIL=1"
    goto :after_ports
)
REM backend / core: Supabase-related ports only (no Vite 8080)
powershell -NoProfile -Command ^
  "$failed = $false; " ^
  "$ports = @(54321, 54322, 54323, 54324, 54325, 54326, 54327, 58220, 58221, 58222, 58223, 58224, 58225, 58226, 58227); " ^
  "foreach ($port in $ports) { " ^
  "  $pids = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique; " ^
  "  foreach ($p in $pids) { " ^
  "    try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host ('       Killed orphan PID ' + $p + ' on port ' + $port) } " ^
  "    catch { Write-Host ('       Could not kill PID ' + $p + ' on port ' + $port); $failed = $true } " ^
  "  } " ^
  "}; " ^
  "Write-Host '       Port sweep complete.'; " ^
  "if ($failed) { exit 1 } else { exit 0 }"
if !errorlevel! neq 0 set "STOP_FAIL=1"
:after_ports

REM ---------- 5. Docker Desktop (optional) -----------------------------------
if %STOP_DOCKER% equ 0 goto :done

echo.
echo  [5/5] Stopping Docker Desktop...
powershell -NoProfile -Command ^
  "$dockerProc = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue; " ^
  "if (-not $dockerProc) { Write-Host '       Docker Desktop is not running — skipped.'; exit 0 }; " ^
  "Write-Host '       Shutting down Docker Desktop...'; " ^
  "Stop-Process -Name 'Docker Desktop' -Force -ErrorAction SilentlyContinue; " ^
  "Stop-Process -Name 'com.docker.backend' -Force -ErrorAction SilentlyContinue; " ^
  "Stop-Process -Name 'com.docker.proxy' -Force -ErrorAction SilentlyContinue; " ^
  "$timeout = 30; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  $still = Get-Process -Name 'com.docker.backend' -ErrorAction SilentlyContinue; " ^
  "  if (-not $still) { Write-Host '       Docker Desktop stopped.'; exit 0 }; " ^
  "  Start-Sleep -Seconds 2; $elapsed += 2 " ^
  "}; " ^
  "Write-Host '       Docker Desktop may still be shutting down.'; exit 1"
if !errorlevel! neq 0 set "STOP_FAIL=1"

:done
echo.
echo  ============================================
if %STOP_FAIL% equ 0 (
    echo   Shutdown complete ^(mode: !STOP_MODE!^).
) else (
    echo   Shutdown finished with one or more errors ^(mode: !STOP_MODE!^).
    echo   Review messages above.
)
echo  ============================================
if %STOP_DOCKER% equ 0 (
    echo.
    echo   Docker Desktop was left running. To stop it:
    echo     dev-stop.bat -Force
)
echo.

set "EC=0"
if %STOP_FAIL% neq 0 set "EC=1"
if %NO_PAUSE% equ 0 pause
endlocal & exit /b %EC%
