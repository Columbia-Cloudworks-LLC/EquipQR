@echo off
REM One-click local Playwright user regression (headed critical suite by default).
setlocal
set "SCRIPT_DIR=%~dp0"
set "SUITE=critical"
set "HEADED=1"
set "HEADLESS=0"
set "DEBUG=0"
set "RESET_DB=0"

:parse_args
if "%~1"=="" goto run
if /I "%~1"=="critical" set "SUITE=critical" & shift & goto parse_args
if /I "%~1"=="full" set "SUITE=full" & shift & goto parse_args
if /I "%~1"=="headed" set "HEADED=1" & set "HEADLESS=0" & shift & goto parse_args
if /I "%~1"=="headless" set "HEADED=0" & set "HEADLESS=1" & shift & goto parse_args
if /I "%~1"=="debug" set "DEBUG=1" & shift & goto parse_args
if /I "%~1"=="reset-db" set "RESET_DB=1" & shift & goto parse_args
echo Unknown argument: %~1
echo Usage: dev-test.bat [critical^|full] [headed^|headless] [debug] [reset-db]
exit /b 2

:run
set "PS_ARGS=-Suite %SUITE%"
if "%HEADED%"=="1" if "%HEADLESS%"=="0" set "PS_ARGS=%PS_ARGS% -Headed"
if "%HEADLESS%"=="1" set "PS_ARGS=%PS_ARGS% -Headless"
if "%DEBUG%"=="1" set "PS_ARGS=%PS_ARGS% -PlaywrightDebug"
if "%RESET_DB%"=="1" set "PS_ARGS=%PS_ARGS% -ResetDb"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\run-user-regression.ps1" %PS_ARGS%
exit /b %ERRORLEVEL%
