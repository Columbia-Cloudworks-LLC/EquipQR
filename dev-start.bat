@echo off
REM Thin launcher — full logic in dev-start.ps1 (double-click friendly).
set "SCRIPT_DIR=%~dp0"
if /I "%~1"=="-help" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%dev-start.ps1" %*
exit /b %ERRORLEVEL%

:help
echo Usage: dev-start.bat [dev-start.ps1 options]
echo.
echo Starts the local EquipQR development stack.
echo.
echo Options:
echo   -help, --help, /help, /?
echo                     Show this help.
echo.
echo Examples:
echo   dev-start.bat
echo   dev-start.bat -Force
exit /b 0
