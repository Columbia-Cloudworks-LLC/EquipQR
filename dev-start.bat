@echo off
REM ============================================================================
REM  dev-start.bat — Idempotent startup of the EquipQR local development stack
REM
REM  Usage:
REM    dev-start.bat                        Normal startup (skips already-running services)
REM    dev-start.bat --reset-db             Reset local database after Supabase starts,
REM                                         applying all migrations from scratch
REM    dev-start.bat --gen-types            Ensure Supabase is up and regenerate TypeScript
REM                                         types; skip Edge Functions and Vite
REM    dev-start.bat --reset-db --gen-types DB reset + type regen, then exit (no Vite/edge)
REM
REM  Steps (in dependency order):
REM    1. Pre-flight checks    (node, npm, npx, docker)
REM    2. node_modules         (npm ci if missing)
REM    3. Docker cleanup       (remove stale Supabase containers from previous runs)
REM    4. Supabase local stack (npx supabase start)
REM    5. DB Reset             (only with --reset-db)
REM    6. Supabase TypeScript types (regenerate from local schema)
REM    7. Sync local env files (write VITE_SUPABASE_URL etc. to .env.local)
REM    8. Supabase Edge Functions  (skipped with --gen-types)
REM    9. Vite dev server          (skipped with --gen-types)
REM
REM  Idempotent: safe to run back-to-back without issues.
REM  This script NEVER modifies tracked files (e.g. supabase/config.toml).
REM  Local Supabase state is ephemeral — it can always be rebuilt from migrations.
REM  Exit code 0 = environment ready.
REM ============================================================================

setlocal EnableDelayedExpansion

set "FAIL=0"
set "OPT_RESET_DB=0"
set "OPT_GEN_TYPES=0"

REM Supabase CLI default ports (from config.toml — do NOT change here, change config.toml)
set "SUPABASE_API_PORT=54321"
set "DEFAULT_EDGE_ENV_FILE=supabase\functions\.env"
set "DEFAULT_OP_ENVIRONMENT_ID=f4rdrusaoxvzwngz2jxs7vy7ye"

REM --- Parse command-line arguments ---
:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--reset-db"   set "OPT_RESET_DB=1"
if /i "%~1"=="--gen-types"  set "OPT_GEN_TYPES=1"
shift
goto :parse_args
:args_done

echo.
echo  ============================================
echo   EquipQR Dev Environment - Startup
if %OPT_RESET_DB% equ 1  echo   Flag: --reset-db   (database will be reset)
if %OPT_GEN_TYPES% equ 1 echo   Flag: --gen-types  (types only; Vite + Edge Functions skipped)
echo  ============================================
echo.

REM ---------- 1. Pre-flight checks -------------------------------------------
echo  [1/9] Pre-flight checks...

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
echo  [2/9] Checking node_modules...

if exist "node_modules\." (
    echo        node_modules exists - skipping npm ci.
) else (
    echo        node_modules not found - running npm ci...
    call npm ci
    if !errorlevel! neq 0 (
        echo        FAIL: npm ci failed. Check your network and try again.
        set "FAIL=1"
        goto :summary
    )
    echo        npm ci completed successfully.
)

REM ---------- 3. Stale container cleanup --------------------------------------
echo.
echo  [3/9] Cleaning up stale Supabase containers...

REM Docker Desktop for Windows often leaves Exited/dead Supabase containers after
REM a reboot or unclean shutdown. These block the next 'supabase start' with
REM name-conflict errors. Remove them proactively so start always works cleanly.
set "CLEANED=0"
for /f "tokens=*" %%c in ('docker ps -aq --filter "name=supabase_" --filter "status=exited" 2^>nul') do (
    docker rm -f %%c >nul 2>&1
    echo        Removed exited container %%c
    set "CLEANED=1"
)
for /f "tokens=*" %%c in ('docker ps -aq --filter "name=supabase_" --filter "status=dead" 2^>nul') do (
    docker rm -f %%c >nul 2>&1
    echo        Removed dead container %%c
    set "CLEANED=1"
)
for /f "tokens=*" %%c in ('docker ps -aq --filter "name=supabase_" --filter "status=created" 2^>nul') do (
    docker rm -f %%c >nul 2>&1
    echo        Removed orphaned container %%c
    set "CLEANED=1"
)
if %CLEANED% equ 0 echo        No stale containers found.

REM ---------- 4. Start Supabase local stack -----------------------------------
echo.
echo  [4/9] Starting Supabase local stack...

call npx supabase status >nul 2>&1
if %errorlevel% equ 0 (
    echo        Supabase is already running - skipped.
    goto :supabase_info
)
echo        Supabase is not running - starting now...

echo        Starting Supabase (this may take a few minutes on first run)...
call npx supabase start
if !errorlevel! neq 0 (
    echo.
    echo        First attempt failed. Running full cleanup and retrying...
    call npx supabase stop >nul 2>&1
    for /f "tokens=*" %%c in ('docker ps -aq --filter "name=supabase_" 2^>nul') do (
        docker rm -f %%c >nul 2>&1
    )
    echo        Retrying supabase start...
    call npx supabase start
    if !errorlevel! neq 0 (
        echo.
        echo        ================================================================
        echo        FAIL: supabase start failed after retry.
        echo.
        echo        Common fixes:
        echo          1. Run dev-stop.bat, then try dev-start.bat again
        echo          2. Restart Docker Desktop, then try again
        echo          3. Check if another project is using the same ports:
        echo               netstat -ano ^| findstr 54321
        echo        ================================================================
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
  "    $r = Invoke-WebRequest -Uri 'http://localhost:%SUPABASE_API_PORT%/rest/v1/' -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; " ^
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

REM ---------- 5. DB Reset (optional — only with --reset-db) -------------------
echo.
if %OPT_RESET_DB% equ 0 (
    echo  [5/9] DB Reset - skipped.  Pass --reset-db to wipe and re-apply all migrations.
    goto :db_reset_done
)

echo  [5/9] Resetting local database ^(--reset-db^)...
echo        All local data will be wiped and every migration re-applied from scratch.
call npx supabase db reset
if !errorlevel! neq 0 (
    echo        FAIL: supabase db reset failed. Check the output above for details.
    set "FAIL=1"
    goto :summary
)
echo        Database reset complete - all migrations re-applied successfully.

:db_reset_done

REM ---------- 6. Regenerate Supabase TypeScript types -------------------------
echo.
echo  [6/9] Regenerating Supabase TypeScript types...

REM Write to a temp file first so a failure does not corrupt the existing types
call npx supabase gen types typescript --local > src\integrations\supabase\types.ts.tmp 2>nul
if !errorlevel! equ 0 (
    move /Y src\integrations\supabase\types.ts.tmp src\integrations\supabase\types.ts >nul
    echo        Types regenerated successfully.
) else (
    del src\integrations\supabase\types.ts.tmp 2>nul
    echo        WARNING: Type generation failed. Existing types.ts will be used.
)

REM ---------- 7. Sync local env files -----------------------------------------
echo.
echo  [7/9] Syncing local Supabase URLs in env files...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\sync-local-supabase-env.ps1" -ApiPort %SUPABASE_API_PORT%
if %errorlevel% neq 0 (
    echo        WARNING: Could not sync local Supabase URLs. You may need to update .env.local manually.
)

REM If --gen-types, skip Edge Functions and Vite and go straight to the summary
if %OPT_GEN_TYPES% equ 1 (
    echo.
    echo        --gen-types: skipping Edge Functions and Vite dev server.
    goto :healthcheck
)

REM ---------- 8. Start Supabase Edge Functions --------------------------------
echo.
echo  [8/9] Starting Supabase Edge Functions serve...

set "EDGE_ENV_FILE=%DEFAULT_EDGE_ENV_FILE%"

REM Try to sync secrets from 1Password into supabase\functions\.env
set "OP_ENV_ID=%EQUIPQR_OP_ENVIRONMENT_ID%"
if not defined OP_ENV_ID set "OP_ENV_ID=%DEFAULT_OP_ENVIRONMENT_ID%"

where op >nul 2>&1
if !errorlevel! equ 0 (
    echo        Syncing edge env from 1Password Environment: !OP_ENV_ID!
    powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\sync-1password-edge-env.ps1" -EnvironmentId !OP_ENV_ID! -ApiPort %SUPABASE_API_PORT%
    if !errorlevel! neq 0 (
        echo        WARNING: 1Password sync failed. Using existing %DEFAULT_EDGE_ENV_FILE%.
    )
) else (
    echo        1Password CLI not found on PATH - using existing %DEFAULT_EDGE_ENV_FILE%.
)

echo        Using edge env file: %EDGE_ENV_FILE%
echo        Validating edge env file...
powershell -NoProfile -Command ^
  "$p = '%EDGE_ENV_FILE%'; " ^
  "if (-not (Test-Path -LiteralPath $p)) { Write-Host '       FAIL: Edge env file does not exist.'; exit 2 }; " ^
  "$item = Get-Item -LiteralPath $p; " ^
  "if ($item.Length -gt 1048576) { Write-Host '       FAIL: Edge env file is unexpectedly large (>1MB), likely corrupted.'; exit 3 }; " ^
  "$maxLen = 0; " ^
  "foreach ($line in [System.IO.File]::ReadLines($p)) { " ^
  "  if ($line.Length -gt $maxLen) { $maxLen = $line.Length }; " ^
  "  if ($line.Length -gt 32768) { Write-Host '       FAIL: Edge env file contains an oversized line, likely corrupted.'; exit 4 } " ^
  "}; " ^
  "Write-Host ('       Edge env sanity check passed. Max line length: ' + $maxLen)"
if %errorlevel% neq 0 (
    echo        FAIL: Edge env validation failed.
    echo        Tip: confirm %DEFAULT_EDGE_ENV_FILE% has required keys after 1Password sync.
    set "FAIL=1"
    goto :summary
)

powershell -NoProfile -Command ^
  "$procs = Get-Process -Name 'node','deno' -ErrorAction SilentlyContinue | Where-Object { " ^
  "  try { $cmd = (Get-CimInstance Win32_Process -Filter \"ProcessId=$($_.Id)\").CommandLine; " ^
  "    $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve') " ^
  "  } catch { $false } " ^
  "}; " ^
  "if ($procs) { exit 0 } else { exit 1 }"
if %errorlevel% equ 0 (
    echo        Edge Functions serve already running - skipped.
    goto :edge_functions_done
)

echo        Launching Edge Functions serve in a new window...
REM --no-verify-jwt is safe only for local development (localhost API)
if "%SUPABASE_API_PORT%"=="" set "SUPABASE_API_PORT=54321"
set "EDGE_SERVE_FLAGS=--env-file %EDGE_ENV_FILE%"
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %SUPABASE_API_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel% equ 0 (
    set "EDGE_SERVE_FLAGS=%EDGE_SERVE_FLAGS% --no-verify-jwt"
    echo        Local Supabase API detected on port %SUPABASE_API_PORT% - JWT verification disabled for dev.
) else (
    echo        WARNING: Could not confirm local Supabase on port %SUPABASE_API_PORT% - JWT verification enabled.
)
start "EquipQR Edge Functions" cmd /k "cd /d %~dp0 && npx supabase functions serve %EDGE_SERVE_FLAGS%"

REM Brief pause to let the process start
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
echo        Edge Functions serve launched.

:edge_functions_done

REM ---------- 9. Start Vite dev server ----------------------------------------
echo.
echo  [9/9] Starting Vite dev server (port 8080)...

REM Check if port 8080 is already in use
powershell -NoProfile -Command ^
  "if (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel% neq 0 goto :vite_start

echo        Port 8080 is already in use - checking if it is Vite...
powershell -NoProfile -Command ^
  "try { " ^
  "  $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; " ^
  "  if ($r.StatusCode -eq 200) { Write-Host '       Vite dev server already running - skipped.'; exit 0 } " ^
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
echo   EquipQR Dev Environment - Status Report
echo  ============================================
echo.

set "FRONTEND_STATUS=[SKIPPED]"
set "API_STATUS=[UNKNOWN]"
set "DB_STATUS=[UNKNOWN]"
set "FUNCTIONS_STATUS=[SKIPPED]"

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:%SUPABASE_API_PORT%/rest/v1/' -Method HEAD -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 ( set "API_STATUS=[OK]" ) else ( set "API_STATUS=[FAILED]" & set "FAIL=1" )

REM DB check: Docker Desktop ports are not visible to Get-NetTCPConnection on Windows.
REM Use the API health result as a proxy — if the API is up the DB container is up.
if "%API_STATUS%"=="[OK]" ( set "DB_STATUS=[OK]" ) else ( set "DB_STATUS=[FAILED]" & set "FAIL=1" )

REM Only check Vite and Edge Functions when not in --gen-types mode.
if %OPT_GEN_TYPES% equ 1 goto :print_status

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 ( set "FRONTEND_STATUS=[OK]" ) else ( set "FRONTEND_STATUS=[FAILED]" & set "FAIL=1" )

powershell -NoProfile -Command ^
  "$procs = Get-Process -Name 'node','deno' -ErrorAction SilentlyContinue | Where-Object { " ^
  "  try { $cmd = (Get-CimInstance Win32_Process -Filter \"ProcessId=$($_.Id)\").CommandLine; " ^
  "    $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve') " ^
  "  } catch { $false } " ^
  "}; " ^
  "if ($procs) { exit 0 } else { exit 1 }"
if %errorlevel% equ 0 ( set "FUNCTIONS_STATUS=[OK]" ) else ( set "FUNCTIONS_STATUS=[FAILED]" & set "FAIL=1" )

:print_status

echo   Supabase API:   http://localhost:%SUPABASE_API_PORT%      %API_STATUS%
echo   Database:       localhost:54322                %DB_STATUS%
echo   Frontend:       http://localhost:8080          %FRONTEND_STATUS%
echo   Edge Functions: (via Supabase API)             %FUNCTIONS_STATUS%
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
