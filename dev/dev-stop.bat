@echo off
REM Thin Windows launcher. Stops the WSL Linux dev stack.
set "SCRIPT_DIR=%~dp0"
if /I "%~1"=="-help" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Invoke-EquipQrWsl.ps1" -Command stop %*
exit /b %ERRORLEVEL%

:help
echo Usage: dev-stop.bat
echo.
echo Stops the EquipQR stack started in WSL2 Ubuntu.
echo.
echo Examples:
echo   dev-stop.bat
exit /b 0
