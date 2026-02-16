@echo off
REM ============================================================================
REM  dev-stop.bat — Gracefully shut down the EquipQR local development stack
REM
REM  Usage:
REM    dev-stop.bat            Stop dev processes, leave Docker Desktop running
REM    dev-stop.bat -Force     Stop dev processes AND shut down Docker Desktop
REM
REM  Stops (in order):
REM    1. Vite dev server          (port 8080)
REM    2. Supabase functions serve (if running)
REM    3. Supabase local stack     (npx supabase stop)
REM    4. Orphan processes on dev ports (safety net)
REM    5. Docker Desktop           (only with -Force)
REM
REM  Safe to run even when nothing is running.
REM ============================================================================

setlocal EnableDelayedExpansion

REM ---------- Parse arguments -------------------------------------------------
set "STOP_DOCKER=0"
if /i "%~1"=="-Force" set "STOP_DOCKER=1"
if /i "%~1"=="/Force" set "STOP_DOCKER=1"
if /i "%~1"=="--force" set "STOP_DOCKER=1"

echo.
echo  ============================================
echo   EquipQR Dev Environment — Shutdown
if %STOP_DOCKER% equ 1 (
    echo   Mode: FULL  (including Docker Desktop^)
) else (
    echo   Mode: Normal (Docker Desktop kept running^)
)
echo  ============================================
echo.

REM ---------- 1. Kill Vite dev server (port 8080) ----------------------------
echo  [1/4] Stopping Vite dev server (port 8080)...
powershell -NoProfile -Command ^
  "$pids = (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique; " ^
  "if ($pids) { foreach ($p in $pids) { try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host \"       Killed PID $p\" } catch { Write-Host \"       Could not kill PID $p — $($_.Exception.Message)\" } } } " ^
  "else { Write-Host '       Nothing listening on port 8080 — skipped.' }"

REM ---------- 2. Kill Supabase functions serve -------------------------------
echo.
echo  [2/4] Stopping Supabase Edge Functions serve...
powershell -NoProfile -Command ^
  "$procs = Get-Process -Name 'node','deno' -ErrorAction SilentlyContinue | Where-Object { " ^
  "  try { $cmd = (Get-CimInstance Win32_Process -Filter \"ProcessId=$($_.Id)\").CommandLine; " ^
  "    $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve') " ^
  "  } catch { $false } " ^
  "}; " ^
  "if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.Id -Force; Write-Host \"       Killed PID $($_.Id)\" } } " ^
  "else { Write-Host '       Edge Functions serve not detected — skipped.' }"

REM ---------- 3. Supabase stop (graceful Docker teardown) --------------------
echo.
echo  [3/4] Stopping Supabase local stack (Docker containers)...
where npx >nul 2>&1
if %errorlevel% neq 0 (
    echo        npx not found on PATH — skipping supabase stop.
    goto :port_cleanup
)

REM Check if supabase is actually running before trying to stop
call npx supabase status >nul 2>&1
if %errorlevel% neq 0 (
    echo        Supabase is not running — skipped.
    goto :supabase_container_cleanup
)

call npx supabase stop
if %errorlevel% equ 0 (
    echo        Supabase stopped successfully.
) else (
    echo        supabase stop returned an error — attempting container cleanup.
)

REM Remove any stopped/zombie Supabase containers that survive 'supabase stop'.
REM On Docker Desktop for Windows, the vector/analytics containers frequently
REM persist in Exited state, blocking the next 'supabase start'.
:supabase_container_cleanup
for /f "tokens=*" %%c in ('docker ps -aq --filter "name=supabase_" 2^>nul') do (
    docker rm -f %%c >nul 2>&1
    echo        Removed lingering container %%c
)

REM ---------- 4. Safety-net: kill anything still on dev ports -----------------
:port_cleanup
echo.
echo  [4/4] Cleaning up orphan processes on dev ports (8080, 54321, 54322)...
powershell -NoProfile -Command ^
  "$ports = @(8080, 54321, 54322); $killed = 0; " ^
  "foreach ($port in $ports) { " ^
  "  $pids = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique; " ^
  "  foreach ($p in $pids) { " ^
  "    try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host \"       Killed orphan PID $p on port $port\"; $killed++ } " ^
  "    catch { Write-Host \"       Could not kill PID $p on port $port — $($_.Exception.Message)\" } " ^
  "  } " ^
  "}; " ^
  "if ($killed -eq 0) { Write-Host '       No orphan processes found — all clean.' }"

REM ---------- 5. Optionally stop Docker Desktop ------------------------------
if %STOP_DOCKER% equ 0 goto :done

echo.
echo  [5/5] Stopping Docker Desktop...
powershell -NoProfile -Command ^
  "$dockerProc = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue; " ^
  "if (-not $dockerProc) { Write-Host '       Docker Desktop is not running — skipped.'; exit 0 }; " ^
  "Write-Host '       Shutting down Docker Desktop (this may take a moment)...'; " ^
  "Stop-Process -Name 'Docker Desktop' -Force -ErrorAction SilentlyContinue; " ^
  "Stop-Process -Name 'com.docker.backend' -Force -ErrorAction SilentlyContinue; " ^
  "Stop-Process -Name 'com.docker.proxy' -Force -ErrorAction SilentlyContinue; " ^
  "$timeout = 30; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  $still = Get-Process -Name 'com.docker.backend' -ErrorAction SilentlyContinue; " ^
  "  if (-not $still) { Write-Host '       Docker Desktop stopped.'; exit 0 }; " ^
  "  Start-Sleep -Seconds 2; $elapsed += 2 " ^
  "}; " ^
  "Write-Host '       Docker Desktop processes may still be shutting down.'"

REM ---------- Done -----------------------------------------------------------
:done
echo.
echo  ============================================
echo   All dev processes stopped.
echo  ============================================
if %STOP_DOCKER% equ 0 (
    echo.
    echo   Docker Desktop was left running. To also
    echo   stop Docker, re-run with -Force:
    echo     dev-stop.bat -Force
)
echo.

pause
endlocal
