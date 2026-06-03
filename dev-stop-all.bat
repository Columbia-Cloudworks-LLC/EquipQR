@echo off
REM Stop Playwright user-regression runs, then the local dev stack (dev-stop.ps1).
set "SCRIPT_DIR=%~dp0"
if /I "%~1"=="-help" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\stop-dev-and-e2e.ps1" %*
exit /b %ERRORLEVEL%

:help
echo Usage: dev-stop-all.bat [dev-stop.ps1 options]
echo.
echo Stops running Playwright E2E tests, then the local EquipQR dev stack.
echo.
echo Options:
echo   -Force              Also stop Docker Desktop (passed to dev-stop.ps1).
echo   -help, --help, /help, /?
echo                     Show this help.
echo.
echo Examples:
echo   dev-stop-all.bat
echo   dev-stop-all.bat -Force
exit /b 0
