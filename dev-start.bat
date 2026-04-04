@echo off
REM Thin launcher — full logic in dev-start.ps1 (double-click friendly).
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%dev-start.ps1" %*
exit /b %ERRORLEVEL%
