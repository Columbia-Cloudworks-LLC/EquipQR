@echo off
REM ============================================================================
REM  dev-start.bat — Idempotent startup of the EquipQR local development stack
REM
REM  Usage:
REM    dev-start.bat [--mode core|backend|full]   Default: full (strict all services)
REM    dev-start.bat -Force                       dev-stop + --reset-db + --gen-types, then start
REM    dev-start.bat --reset-db                   Wipe DB and re-apply migrations (after Supabase up)
REM    dev-start.bat --gen-types                  Regenerate TS types only when this flag is set
REM    dev-start.bat --no-pause                   No pause at end (automation / CI)
REM
REM  Modes:
REM    full    — Supabase + Edge Functions + Vite (default). Exit 0 only if all healthy.
REM    backend — Supabase + Edge Functions. Vite not started; health shows Frontend [N/A].
REM    core    — Supabase only. Edge/Vite not started; health shows [N/A] for those.
REM
REM  Idempotent: safe to run back-to-back. Does not modify supabase/config.toml.
REM  Exit code 0 = selected mode's required services are ready.
REM ============================================================================

setlocal EnableDelayedExpansion

set "FAIL=0"
set "OPT_RESET_DB=0"
set "OPT_GEN_TYPES=0"
set "OPT_FORCE=0"
set "NO_PAUSE=0"
set "START_MODE=full"

REM Supabase API port (must match supabase/config.toml [api] port)
set "SUPABASE_API_PORT=54321"
set "DEFAULT_EDGE_ENV_FILE=supabase\functions\.env"
set "DEFAULT_OP_ENVIRONMENT_ID=f4rdrusaoxvzwngz2jxs7vy7ye"
set "DEFAULT_OP_APP_ENV_ID=ylilu4hpf6nq6bfm5ykg6nh2kq"

REM --- Parse command-line arguments ---
:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--mode" (
    if "%~2"=="" (
        echo        FAIL: --mode requires a value: core, backend, or full.
        endlocal & exit /b 1
    )
    set "START_MODE=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--reset-db"   set "OPT_RESET_DB=1"
if /i "%~1"=="--gen-types"  set "OPT_GEN_TYPES=1"
if /i "%~1"=="-Force"       set "OPT_FORCE=1"
if /i "%~1"=="/Force"       set "OPT_FORCE=1"
if /i "%~1"=="--force"      set "OPT_FORCE=1"
if /i "%~1"=="--no-pause"   set "NO_PAUSE=1"
shift
goto :parse_args
:args_done

REM Force implies full reset + typegen for a clean tree
if %OPT_FORCE% equ 1 (
    set "OPT_RESET_DB=1"
    set "OPT_GEN_TYPES=1"
)

REM --- Resolve mode flags (RUN_EDGE, RUN_VITE) ---
set "RUN_EDGE=0"
set "RUN_VITE=0"
if /i "!START_MODE!"=="core" goto :mode_ok
if /i "!START_MODE!"=="backend" (
    set "RUN_EDGE=1"
    goto :mode_ok
)
if /i "!START_MODE!"=="full" (
    set "RUN_EDGE=1"
    set "RUN_VITE=1"
    goto :mode_ok
)
echo        FAIL: Unknown mode "!START_MODE!". Use: core, backend, or full.
endlocal & exit /b 1
:mode_ok

echo.
echo  ============================================
echo   EquipQR Dev Environment - Startup
echo   Mode: !START_MODE!
if %OPT_FORCE% equ 1     echo   Flag: -Force      ^(dev-stop + --reset-db + --gen-types^)
if %OPT_RESET_DB% equ 1  echo   Flag: --reset-db
if %OPT_GEN_TYPES% equ 1 echo   Flag: --gen-types
echo  ============================================
echo.

REM ---------- 0. Optional force-mode hard reset ---------------------------------
if %OPT_FORCE% equ 1 (
    echo  [0/10] Force mode: hard reset before startup ^(Docker Desktop stays running^)...
    if not exist "%~dp0dev-stop.bat" (
        echo        FAIL: dev-stop.bat not found next to dev-start.bat.
        set "FAIL=1"
        goto :summary
    )
    call "%~dp0dev-stop.bat" --no-pause --mode !START_MODE!
    if !errorlevel! neq 0 (
        echo        WARNING: dev-stop reported issues during force reset. Continuing startup.
    ) else (
        echo        Force reset complete.
    )
    echo.
)

REM ---------- 1. Pre-flight checks -------------------------------------------
echo  [1/10] Pre-flight checks...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo        FAIL: node is not installed or not on PATH.
    set "FAIL=1"
    goto :summary
)
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo        node  %NODE_VER%

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo        FAIL: npm is not installed or not on PATH.
    set "FAIL=1"
    goto :summary
)
for /f "tokens=*" %%v in ('call npm -v') do set "NPM_VER=%%v"
echo        npm   v%NPM_VER%

where npx >nul 2>&1
if %errorlevel% neq 0 (
    echo        FAIL: npx is not on PATH. Re-install Node.js.
    set "FAIL=1"
    goto :summary
)
echo        npx   OK

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo        FAIL: docker CLI is not installed or not on PATH.
    set "FAIL=1"
    goto :summary
)
echo        docker CLI OK

echo        Checking Docker daemon...
docker info >nul 2>&1
if %errorlevel% equ 0 goto :docker_ok

echo        Docker daemon is not running. Attempting to start Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul

echo        Waiting for Docker daemon to be ready (up to 120s)...
powershell -NoProfile -Command ^
  "$timeout = 120; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  $null = & docker info 2>&1; " ^
  "  if ($LASTEXITCODE -eq 0) { Write-Host '       Docker daemon is ready.'; exit 0 }; " ^
  "  Start-Sleep -Seconds 3; $elapsed += 3; " ^
  "  Write-Host ('       Waiting... ' + $elapsed + ' s') " ^
  "}; " ^
  "Write-Host '       FAIL: Docker daemon did not start within 120 seconds.'; exit 1"
if %errorlevel% neq 0 (
    echo        FAIL: Docker Desktop could not be started automatically.
    set "FAIL=1"
    goto :summary
)

:docker_ok
echo        Docker daemon running
echo        All pre-flight checks passed.

REM ---------- 1b. Sync 1Password environments (best-effort) -------------------
echo.
echo  [1b/10] Syncing 1Password environments early...

set "OP_APP_ENV_ID=%EQUIPQR_OP_APP_ENVIRONMENT_ID%"
if not defined OP_APP_ENV_ID set "OP_APP_ENV_ID=%DEFAULT_OP_APP_ENV_ID%"
set "OP_ENV_ID=%EQUIPQR_OP_ENVIRONMENT_ID%"
if not defined OP_ENV_ID set "OP_ENV_ID=%DEFAULT_OP_ENVIRONMENT_ID%"

where op >nul 2>&1
if !errorlevel! equ 0 (
    echo        Syncing app + edge env from 1Password
    echo          App:  !OP_APP_ENV_ID!
    echo          Edge: !OP_ENV_ID!
    powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\sync-1password-dev-envs.ps1" -AppEnvironmentId !OP_APP_ENV_ID! -EdgeEnvironmentId !OP_ENV_ID! -ApiPort %SUPABASE_API_PORT%
    if !errorlevel! neq 0 (
        echo        WARNING: One or both 1Password env syncs failed. Using existing .env and %DEFAULT_EDGE_ENV_FILE%.
    )
) else (
    echo        1Password CLI not found on PATH - using existing .env and %DEFAULT_EDGE_ENV_FILE%.
)

REM ---------- 2. Verify node_modules -----------------------------------------
echo.
echo  [2/10] Checking node_modules...

if exist "node_modules\." (
    echo        node_modules exists - skipping npm ci.
) else (
    echo        node_modules not found - running npm ci...
    call npm ci
    if !errorlevel! neq 0 (
        echo        FAIL: npm ci failed.
        set "FAIL=1"
        goto :summary
    )
    echo        npm ci completed successfully.
)

REM ---------- 3. Stale container cleanup --------------------------------------
echo.
echo  [3/10] Cleaning up stale Supabase containers...

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
echo  [4/10] Starting Supabase local stack...

call npx supabase status >nul 2>&1
set "SUPABASE_STATUS_EXIT=%errorlevel%"
set "NEED_START=1"
if %SUPABASE_STATUS_EXIT% equ 0 (
    echo        Supabase CLI reports stack is up - verifying API...
    powershell -NoProfile -Command ^
      "try { " ^
      "  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%SUPABASE_API_PORT%/rest/v1/' -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; " ^
      "  if ($r.StatusCode -lt 500) { exit 0 } else { exit 1 } " ^
      "} catch { exit 1 }"
    if not errorlevel 1 (
        set "NEED_START=0"
        echo        Supabase API is already responding - skipped start.
    ) else (
        echo        WARNING: CLI said running but API unreachable - will try supabase start...
    )
)

if !NEED_START! equ 1 (
    echo        Starting Supabase ^(this may take a few minutes on first run^)...
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
            echo        FAIL: supabase start failed after retry.
            echo        Try: dev-stop.bat then dev-start.bat, or netstat for port %SUPABASE_API_PORT%
            set "FAIL=1"
            goto :summary
        )
    )
)

echo        Waiting for Supabase API to be ready (up to 90s)...
powershell -NoProfile -Command ^
  "$timeout = 90; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  try { " ^
  "    $r = Invoke-WebRequest -Uri 'http://localhost:%SUPABASE_API_PORT%/rest/v1/' -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; " ^
  "    if ($r.StatusCode -lt 500) { Write-Host '       Supabase API is responding.'; exit 0 } " ^
  "  } catch { }; " ^
  "  Start-Sleep -Seconds 3; $elapsed += 3; " ^
  "  Write-Host ('       Waiting... ' + $elapsed + ' s') " ^
  "}; " ^
  "Write-Host '       FAIL: Supabase API did not respond within 90 seconds.'; exit 1"
if %errorlevel% neq 0 (
    echo        FAIL: Supabase API health check timed out.
    set "FAIL=1"
    goto :summary
)

echo.
echo        --- Supabase Status ---
call npx supabase status 2>nul
echo        -----------------------

REM ---------- 5. DB Reset (optional) ------------------------------------------
echo.
if %OPT_RESET_DB% equ 0 (
    echo  [5/10] DB Reset - skipped.
    goto :db_reset_done
)

echo  [5/10] Resetting local database ^(--reset-db^)...
call npx supabase db reset
if !errorlevel! neq 0 (
    echo        FAIL: supabase db reset failed.
    set "FAIL=1"
    goto :summary
)
echo        Database reset complete.

echo.
echo  [5b]  Seeding equipment images into local storage...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\seed-equipment-images.ps1" -ApiPort %SUPABASE_API_PORT%
if !errorlevel! neq 0 (
    echo        WARNING: Seed image upload had errors. Equipment images may be missing.
)

:db_reset_done

REM ---------- 6. TypeScript types (only with --gen-types or -Force implied) ---
echo.
if %OPT_GEN_TYPES% equ 0 (
    echo  [6/10] Type generation - skipped ^(pass --gen-types or use -Force^).
    goto :types_done
)

echo  [6/10] Regenerating Supabase TypeScript types...
call npx supabase gen types typescript --local > src\integrations\supabase\types.ts.tmp 2>nul
if !errorlevel! equ 0 (
    move /Y src\integrations\supabase\types.ts.tmp src\integrations\supabase\types.ts >nul
    echo        Types regenerated successfully.
) else (
    del src\integrations\supabase\types.ts.tmp 2>nul
    echo        FAIL: Type generation failed.
    set "FAIL=1"
    goto :summary
)
:types_done

REM ---------- 7. Sync local env files -----------------------------------------
echo.
echo  [7/10] Syncing local Supabase URLs in env files...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\sync-local-supabase-env.ps1" -ApiPort %SUPABASE_API_PORT%
if %errorlevel% neq 0 (
    echo        WARNING: Could not sync local Supabase URLs. Update .env.local manually if needed.
)

REM ---------- 8. Edge Functions (backend / full only) -------------------------
if %RUN_EDGE% equ 0 goto :edge_functions_done

echo.
echo  [8/10] Starting Supabase Edge Functions serve...

set "EDGE_ENV_FILE=%DEFAULT_EDGE_ENV_FILE%"
echo        Using edge env file: %EDGE_ENV_FILE%
echo        Validating edge env file...
powershell -NoProfile -Command ^
  "$p = '%EDGE_ENV_FILE%'; " ^
  "if (-not (Test-Path -LiteralPath $p)) { Write-Host '       FAIL: Edge env file does not exist.'; exit 2 }; " ^
  "$item = Get-Item -LiteralPath $p; " ^
  "if ($item.Length -gt 1048576) { Write-Host '       FAIL: Edge env file is unexpectedly large (^>1MB).'; exit 3 }; " ^
  "$maxLen = 0; " ^
  "foreach ($line in [System.IO.File]::ReadLines($p)) { " ^
  "  if ($line.Length -gt $maxLen) { $maxLen = $line.Length }; " ^
  "  if ($line.Length -gt 32768) { Write-Host '       FAIL: Edge env contains an oversized line.'; exit 4 } " ^
  "}; " ^
  "Write-Host ('       Edge env sanity check passed. Max line length: ' + $maxLen)"
if %errorlevel% neq 0 (
    echo        FAIL: Edge env validation failed.
    set "FAIL=1"
    goto :summary
)

powershell -NoProfile -Command ^
  "$procs = Get-Process -Name 'node','deno' -ErrorAction SilentlyContinue | Where-Object { " ^
  "  try { $cmd = (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.Id)).CommandLine; " ^
  "    $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve') " ^
  "  } catch { $false } " ^
  "}; " ^
  "if ($procs) { exit 0 } else { exit 1 }"
if %errorlevel% equ 0 (
    echo        Edge Functions serve already running - skipped.
    goto :edge_functions_done
)

if "%SUPABASE_API_PORT%"=="" set "SUPABASE_API_PORT=54321"
set "EDGE_SERVE_FLAGS=--env-file %EDGE_ENV_FILE%"
powershell -NoProfile -Command ^
  "try { " ^
  "  $r = Invoke-WebRequest -Uri 'http://localhost:%SUPABASE_API_PORT%/rest/v1/' -Method HEAD -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; " ^
  "  if ($r.StatusCode -lt 500) { exit 0 } else { exit 1 } " ^
  "} catch { exit 1 }"
if %errorlevel% equ 0 (
    set "EDGE_SERVE_FLAGS=%EDGE_SERVE_FLAGS% --no-verify-jwt"
    echo        Local API on port %SUPABASE_API_PORT% - JWT verification disabled for dev serve.
) else (
    echo        WARNING: Could not confirm local API - functions serve may verify JWT.
)
start "EquipQR Edge Functions" cmd /k "cd /d %~dp0 && npx supabase functions serve %EDGE_SERVE_FLAGS%"

echo        Waiting for Edge Functions serve process (up to 45s)...
powershell -NoProfile -Command ^
  "$timeout = 45; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  $procs = Get-Process -Name 'node','deno' -ErrorAction SilentlyContinue | Where-Object { " ^
  "    try { $cmd = (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.Id)).CommandLine; " ^
  "      $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve') " ^
  "    } catch { $false } " ^
  "  }; " ^
  "  if ($procs) { Write-Host '       Edge Functions serve detected.'; exit 0 }; " ^
  "  Start-Sleep -Seconds 2; $elapsed += 2; " ^
  "  Write-Host ('       Waiting... ' + $elapsed + ' s') " ^
  "}; " ^
  "Write-Host '       FAIL: Edge Functions serve did not appear within 45 seconds.'; exit 1"
if %errorlevel% neq 0 (
    echo        FAIL: Edge Functions serve failed to start.
    set "FAIL=1"
    goto :summary
)
echo        Edge Functions serve launched.

:edge_functions_done

REM ---------- 9. Vite (full mode only) ----------------------------------------
if %RUN_VITE% equ 0 goto :vite_done

echo.
echo  [9/10] Starting Vite dev server (port 8080)...

powershell -NoProfile -Command ^
  "if (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel% equ 0 (
    echo        Port 8080 in use - verifying Vite...
    powershell -NoProfile -Command ^
      "try { " ^
      "  $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; " ^
      "  if ($r.StatusCode -eq 200) { Write-Host '       Vite already running - skipped.'; exit 0 } " ^
      "  else { Write-Host '       FAIL: Port 8080 is not serving Vite.'; exit 1 } " ^
      "} catch { Write-Host '       FAIL: Port 8080 is not responding as Vite.'; exit 1 }"
    if errorlevel 1 (
        echo        FAIL: Port 8080 blocked or not Vite. Free the port or stop the other process.
        set "FAIL=1"
        goto :summary
    )
    goto :vite_done
)

echo        Launching Vite in a new window...
start "EquipQR Vite Dev Server" cmd /k "cd /d %~dp0 && npm run dev"

echo        Waiting for Vite (up to 45s)...
powershell -NoProfile -Command ^
  "$timeout = 45; $elapsed = 0; " ^
  "while ($elapsed -lt $timeout) { " ^
  "  try { " ^
  "    $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; " ^
  "    if ($r.StatusCode -eq 200) { Write-Host '       Vite dev server is ready.'; exit 0 } " ^
  "  } catch { }; " ^
  "  Start-Sleep -Seconds 2; $elapsed += 2; " ^
  "  Write-Host ('       Waiting... ' + $elapsed + ' s') " ^
  "}; " ^
  "Write-Host '       FAIL: Vite did not respond within 45 seconds.'; exit 1"
if %errorlevel% neq 0 (
    echo        FAIL: Vite health check timed out.
    set "FAIL=1"
    goto :summary
)

:vite_done

REM ---------- Final readiness report (mode-aware) -----------------------------
:healthcheck
echo.
echo  ============================================
echo   EquipQR Dev Environment - Status Report
echo   Mode: !START_MODE!
echo  ============================================
echo.

set "FRONTEND_STATUS=[N/A]"
set "API_STATUS=[UNKNOWN]"
set "DB_STATUS=[UNKNOWN]"
set "FUNCTIONS_STATUS=[N/A]"

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:%SUPABASE_API_PORT%/rest/v1/' -Method HEAD -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 ( set "API_STATUS=[OK]" ) else ( set "API_STATUS=[FAILED]" & set "FAIL=1" )

if "%API_STATUS%"=="[OK]" ( set "DB_STATUS=[OK]" ) else ( set "DB_STATUS=[FAILED]" & set "FAIL=1" )

if %RUN_EDGE% equ 1 (
    set "FUNCTIONS_STATUS=[UNKNOWN]"
    powershell -NoProfile -Command ^
      "$procs = Get-Process -Name 'node','deno' -ErrorAction SilentlyContinue | Where-Object { " ^
      "  try { $cmd = (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.Id)).CommandLine; " ^
      "    $cmd -and ($cmd -match 'supabase' -and $cmd -match 'functions' -and $cmd -match 'serve') " ^
      "  } catch { $false } " ^
      "}; " ^
      "if ($procs) { exit 0 } else { exit 1 }"
    if not errorlevel 1 ( set "FUNCTIONS_STATUS=[OK]" ) else ( set "FUNCTIONS_STATUS=[FAILED]" & set "FAIL=1" )
)

if %RUN_VITE% equ 1 (
    set "FRONTEND_STATUS=[UNKNOWN]"
    powershell -NoProfile -Command ^
      "try { $r = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    if not errorlevel 1 ( set "FRONTEND_STATUS=[OK]" ) else ( set "FRONTEND_STATUS=[FAILED]" & set "FAIL=1" )
)

echo   Supabase API:   http://localhost:%SUPABASE_API_PORT%      %API_STATUS%
echo   Database:       localhost:54322                %DB_STATUS%
echo   Frontend:       http://localhost:8080          %FRONTEND_STATUS%
echo   Edge Functions: (via Supabase API)             %FUNCTIONS_STATUS%
echo.
echo  ============================================

if %FAIL% equ 0 (
    echo   Required services for mode !START_MODE! are ready.
) else (
    echo   One or more required checks failed for mode !START_MODE!.
    echo   Review the output above.
)
echo  ============================================

:summary
echo.
if %NO_PAUSE% equ 0 pause

set "EC=0"
if %FAIL% neq 0 set "EC=1"
endlocal & exit /b %EC%
