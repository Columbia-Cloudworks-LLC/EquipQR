@echo off
REM Thin launcher — full logic in dev-stop.ps1 (double-click friendly).
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%dev-stop.ps1" %*
exit /b %ERRORLEVEL%
