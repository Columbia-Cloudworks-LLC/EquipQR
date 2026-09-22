@echo off
REM Thin Windows launcher. Development logic runs in WSL via dev/linux/dev-start.sh.
set "SCRIPT_DIR=%~dp0"
if /I "%~1"=="-help" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Invoke-EquipQrWsl.ps1" -Command start %*
exit /b %ERRORLEVEL%

:help
echo Usage: dev-start.bat [-Force] [-PrepareOnly]
echo.
echo Starts EquipQR inside WSL2 Ubuntu using dev/linux/dev-start.sh.
echo If WSL or Ubuntu is missing, prints Microsoft install commands and exits 1.
echo.
echo Examples:
echo   dev-start.bat
echo   dev-start.bat -Force
exit /b 0
