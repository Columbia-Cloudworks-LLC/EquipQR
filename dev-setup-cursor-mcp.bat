@echo off
REM Thin launcher - full logic in dev-setup-cursor-mcp.ps1 (double-click friendly).
set "SCRIPT_DIR=%~dp0"
if /I "%~1"=="-help" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%dev-setup-cursor-mcp.ps1" %*
exit /b %ERRORLEVEL%

:help
echo Usage: dev-setup-cursor-mcp.bat [dev-setup-cursor-mcp.ps1 options]
echo.
echo Sets up Cursor MCP configuration for EquipQR local development.
echo.
echo Options:
echo   -help, --help, /help, /?
echo                     Show this help.
echo.
echo Examples:
echo   dev-setup-cursor-mcp.bat
exit /b 0
