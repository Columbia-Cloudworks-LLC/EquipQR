@echo off
REM ============================================================================
REM  dev-start.bat — Idempotent startup of the EquipQR local development stack
REM
REM  Brings up (in dependency order):
REM    1. Pre-flight checks    (node, npm, npx, docker)
REM    2. node_modules         (npm ci if missing)
REM    3. Supabase local stack (npx supabase start — Postgres, API, Auth, etc.)
REM    4. Supabase TypeScript types (regenerate from local schema)
REM    5. Vite dev server      (npm run dev — in a new window)
REM
REM  Idempotent: safe to run when services are already running.
REM  Exit code 0 = environment ready for Playwright / E2E tests.
REM ============================================================================

setlocal EnableDelayedExpansion

set "FAIL=0"

echo.
echo  ============================================
echo   EquipQR Dev Environment — Startup
echo  ============================================
echo.

REM ---------- 1. Pre-flight checks -------------------------------------------
echo  [1/5] Pre-flight checks...

REM -- Node.js --
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo        FAIL: node is not installed or not on PATH.
    echo              Download from https://nodejs.org/
    set "FAIL=1"
    goto :summary
)
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo        node  %NODE_VER%

REM -- npm --
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo        FAIL: npm is not installed or not on PATH.
    set "FAIL=1"
    goto :summary
)
for /f "tokens=*" %%v in ('call npm -v') do set "NPM_VER=%%v"
echo        npm   v%NPM_VER%

REM -- npx --
where npx >nul 2>&1
if %errorlevel% neq 0 (
    echo        FAIL: npx is not on PATH. Re-install Node.js.
    set "FAIL=1"
    goto :summary
)
echo        npx   OK

REM -- Docker CLI --
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo        FAIL: docker CLI is not installed or not on PATH.
    echo              Download Docker Desktop from https://www.docker.com/products/docker-desktop
    set "FAIL=1"
    goto :summary
)
echo        docker CLI OK

REM -- Docker daemon --
echo        Checking Docker daemon...
docker info >nul 2>&1
if %errorlevel% equ 0 goto :docker_ok

echo        Docker daemon is not running. Attempting to start Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe" 2>nul

echo        Waiting for Docker daemon to be ready (up to 120s)...
powershell -NoProfile -Command ^
  "$timeout = 120; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  $r = & docker info 2>&1; " ^
  "  if ($LASTEXITCODE -eq 0) { Write-Host '       Docker daemon is ready.'; exit 0 }; " ^
  "  Start-Sleep -Seconds 3; $elapsed += 3; " ^
  "  Write-Host \"       Waiting... $elapsed s\" " ^
  "}; " ^
  "Write-Host '       FAIL: Docker daemon did not start within 120 seconds.'; exit 1"
if %errorlevel% neq 0 (
    echo        FAIL: Docker Desktop could not be started automatically.
    echo              Please start Docker Desktop manually and re-run this script.
    set "FAIL=1"
    goto :summary
)

:docker_ok
echo        Docker daemon running
echo        All pre-flight checks passed.

REM ---------- 2. Verify node_modules -----------------------------------------
echo.
echo  [2/5] Checking node_modules...

if exist "node_modules\." (
    echo        node_modules exists — skipping npm ci.
) else (
    echo        node_modules not found — running npm ci...
    call npm ci
    if !errorlevel! neq 0 (
        echo        FAIL: npm ci failed. Check your network and try again.
        set "FAIL=1"
        goto :summary
    )
    echo        npm ci completed successfully.
)

REM ---------- 3. Start Supabase local stack -----------------------------------
echo.
echo  [3/5] Starting Supabase local stack...

REM Check if Supabase is already running by querying the API port
powershell -NoProfile -Command ^
  "if (Get-NetTCPConnection -LocalPort 54321 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel% neq 0 goto :supabase_start

echo        Supabase API already listening on port 54321 — verifying status...
call npx supabase status >nul 2>&1
if %errorlevel% equ 0 (
    echo        Supabase is running and healthy — skipped.
    goto :supabase_info
)
echo        Port 54321 is in use but Supabase status check failed.
echo        Attempting cleanup and restart...
call npx supabase stop >nul 2>&1

:supabase_start
REM Pre-start cleanup: remove any stopped/zombie Supabase containers to avoid
REM Docker name-conflict errors (common on Docker Desktop for Windows where
REM 'supabase stop' leaves Exited containers that block the next 'supabase start').
for /f "tokens=*" %%c in ('docker ps -aq --filter "name=supabase_" 2^>nul') do (
    docker rm -f %%c >nul 2>&1
)

echo        Starting Supabase (this may take a few minutes on first run)...
call npx supabase start
if !errorlevel! neq 0 (
    echo        First attempt failed. Cleaning up containers and retrying...
    call npx supabase stop >nul 2>&1
    for /f "tokens=*" %%c in ('docker ps -aq --filter "name=supabase_" 2^>nul') do (
        docker rm -f %%c >nul 2>&1
    )
    call npx supabase start
    if !errorlevel! neq 0 (
        echo        FAIL: supabase start failed after retry. Check Docker and try again.
        set "FAIL=1"
        goto :summary
    )
)

REM Health-check: wait for the API to respond
echo        Waiting for Supabase API to be ready (up to 90s)...
powershell -NoProfile -Command ^
  "$timeout = 90; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  try { " ^
  "    $r = Invoke-WebRequest -Uri 'http://localhost:54321/rest/v1/' -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; " ^
  "    if ($r.StatusCode -lt 500) { Write-Host '       Supabase API is responding.'; exit 0 } " ^
  "  } catch { }; " ^
  "  Start-Sleep -Seconds 3; $elapsed += 3; " ^
  "  Write-Host \"       Waiting... $elapsed s\" " ^
  "}; " ^
  "Write-Host '       WARNING: Supabase API did not respond within 90 seconds.'; exit 1"
if %errorlevel% neq 0 (
    echo        WARNING: Supabase API health check timed out. It may still be starting.
)

:supabase_info
echo.
echo        --- Supabase Status ---
call npx supabase status 2>nul
echo        -----------------------

REM ---------- 4. Regenerate Supabase TypeScript types -------------------------
echo.
echo  [4/5] Regenerating Supabase TypeScript types...

REM Write to a temp file first so a failure does not corrupt the existing types
call npx supabase gen types typescript --local > src\integrations\supabase\types.ts.tmp 2>nul
if !errorlevel! equ 0 (
    move /Y src\integrations\supabase\types.ts.tmp src\integrations\supabase\types.ts >nul
    echo        Types regenerated successfully.
) else (
    del src\integrations\supabase\types.ts.tmp 2>nul
    echo        WARNING: Type generation failed. Existing types.ts will be used.
)

REM ---------- 5. Start Vite dev server ----------------------------------------
echo.
echo  [5/5] Starting Vite dev server (port 8080)...

REM Check if port 8080 is already in use
powershell -NoProfile -Command ^
  "if (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel% neq 0 goto :vite_start

echo        Port 8080 is already in use — checking if it is Vite...
powershell -NoProfile -Command ^
  "try { " ^
  "  $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; " ^
  "  if ($r.StatusCode -eq 200) { Write-Host '       Vite dev server already running — skipped.'; exit 0 } " ^
  "  else { Write-Host '       Port 8080 is in use by another process. Please free the port.'; exit 2 } " ^
  "} catch { Write-Host '       Port 8080 is in use but not responding to HTTP. Please investigate.'; exit 2 }"
if %errorlevel% equ 2 (
    echo        WARNING: Could not confirm Vite is running on port 8080.
)
goto :healthcheck

:vite_start
echo        Launching Vite in a new window...
start "EquipQR Vite Dev Server" cmd /k "cd /d %~dp0 && npm run dev"

REM Wait for Vite to start responding
echo        Waiting for Vite dev server to be ready (up to 45s)...
powershell -NoProfile -Command ^
  "$timeout = 45; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  try { " ^
  "    $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; " ^
  "    if ($r.StatusCode -eq 200) { Write-Host '       Vite dev server is ready.'; exit 0 } " ^
  "  } catch { }; " ^
  "  Start-Sleep -Seconds 2; $elapsed += 2; " ^
  "  Write-Host \"       Waiting... $elapsed s\" " ^
  "}; " ^
  "Write-Host '       WARNING: Vite dev server did not respond within 45 seconds.'; exit 1"
if %errorlevel% neq 0 (
    echo        WARNING: Vite health check timed out. Check the Vite window for errors.
    set "FAIL=1"
)

REM ---------- Final readiness report ------------------------------------------
:healthcheck
echo.
echo  ============================================
echo   EquipQR Dev Environment — Status Report
echo  ============================================
echo.

REM Check each service individually (outside of if/else blocks to avoid parenthesis issues)
set "FRONTEND_STATUS=[UNKNOWN]"
set "API_STATUS=[UNKNOWN]"
set "DB_STATUS=[UNKNOWN]"

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 ( set "FRONTEND_STATUS=[OK]" ) else ( set "FRONTEND_STATUS=[FAILED]" & set "FAIL=1" )

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:54321/rest/v1/' -Method HEAD -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 ( set "API_STATUS=[OK]" ) else ( set "API_STATUS=[FAILED]" & set "FAIL=1" )

powershell -NoProfile -Command ^
  "if (Get-NetTCPConnection -LocalPort 54322 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel% equ 0 ( set "DB_STATUS=[OK]" ) else ( set "DB_STATUS=[FAILED]" & set "FAIL=1" )

echo   Frontend:      http://localhost:8080       %FRONTEND_STATUS%
echo   Supabase API:  http://localhost:54321      %API_STATUS%
echo   Database:      localhost:54322             %DB_STATUS%
echo.
echo  ============================================

if %FAIL% equ 0 (
    echo   All services are running. Ready to develop.
) else (
    echo   WARNING: One or more services failed to start.
    echo   Review the output above for details.
)
echo  ============================================

:summary
echo.
pause

if %FAIL% neq 0 ( exit /b 1 )
exit /b 0

endlocal
