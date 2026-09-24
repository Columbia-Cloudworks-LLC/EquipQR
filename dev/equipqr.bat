@echo off
setlocal
set "ACTION=%~1"
if not defined ACTION set "ACTION=start"
if /I "%ACTION%"=="start" goto run
if /I "%ACTION%"=="stop" goto run
if /I "%ACTION%"=="status" goto run
if /I "%ACTION%"=="reset" goto run
echo Usage: equipqr.bat [start^|stop^|status^|reset]
exit /b 2
:run
wsl.exe -d Ubuntu -- bash -lc "cd ~/projects/EquipQR && exec bash dev/linux/dev.sh %ACTION%"
set "RESULT=%ERRORLEVEL%"
if "%RESULT%"=="0" if /I "%ACTION%"=="start" start "" "http://localhost:8080/"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
