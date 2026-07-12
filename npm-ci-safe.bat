@echo off
REM Stop dev/E2E processes that lock node_modules native binaries, then npm ci with EPERM recovery.
set "SCRIPT_DIR=%~dp0"
if /I "%~1"=="-help" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\Invoke-SafeNpmCi.ps1" %*
exit /b %ERRORLEVEL%

:help
echo Usage: npm-ci-safe.bat [Invoke-SafeNpmCi.ps1 options]
echo.
echo Stops Playwright/dev tooling, releases node_modules file locks, then runs npm ci.
echo Use this instead of bare npm ci on Windows when EPERM/EBUSY hits tailwindcss-oxide,
echo lightningcss, or vite native binaries.
echo.
echo Options (passed to Invoke-SafeNpmCi.ps1):
echo   -SkipStackStop     Skip stop-dev-and-e2e (stack already down).
echo   -Docs              Also npm ci in docs/.
echo   -PreferOffline     Default on; pass -PreferOffline:$false to disable.
echo   -NoAudit           Default on; pass -NoAudit:$false to disable.
echo.
echo Examples:
echo   npm-ci-safe.bat
echo   npm-ci-safe.bat -Docs
echo   npm-ci-safe.bat -SkipStackStop
exit /b 0
