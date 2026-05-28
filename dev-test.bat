@echo off
REM One-click local Playwright user regression (headless critical suite by default).
setlocal
set "SCRIPT_DIR=%~dp0"
set "SUITE=critical"
set "HEADED=0"
set "HEADLESS=1"
set "WATCH=0"
set "RECORD_VIDEO=0"
set "OVERLAY_MODE="
set "DEBUG=0"
set "RESET_DB=0"

:parse_args
if "%~1"=="" goto run
if /I "%~1"=="-help" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help
if /I "%~1"=="critical" set "SUITE=critical" & shift & goto parse_args
if /I "%~1"=="full" set "SUITE=full" & shift & goto parse_args
if /I "%~1"=="headed" set "HEADED=1" & set "HEADLESS=0" & shift & goto parse_args
if /I "%~1"=="headless" set "HEADED=0" & set "HEADLESS=1" & shift & goto parse_args
if /I "%~1"=="watch" set "WATCH=1" & set "HEADED=1" & set "HEADLESS=0" & shift & goto parse_args
if /I "%~1"=="record" set "RECORD_VIDEO=1" & shift & goto parse_args
if /I "%~1"=="video" set "RECORD_VIDEO=1" & shift & goto parse_args
if /I "%~1"=="marketing" set "OVERLAY_MODE=marketing" & shift & goto parse_args
if /I "%~1"=="debug-overlay" set "OVERLAY_MODE=debug" & shift & goto parse_args
if /I "%~1"=="support-record" set "SUITE=full" & set "WATCH=1" & set "HEADED=1" & set "HEADLESS=0" & set "RECORD_VIDEO=1" & set "OVERLAY_MODE=marketing" & shift & goto parse_args
if /I "%~1"=="debug" set "DEBUG=1" & shift & goto parse_args
if /I "%~1"=="reset-db" set "RESET_DB=1" & shift & goto parse_args
echo Unknown argument: %~1
echo Usage: dev-test.bat [critical^|full] [headed^|headless^|watch] [record^|video] [marketing^|debug-overlay^|support-record] [debug] [reset-db]
exit /b 2

:help
echo Usage: dev-test.bat [critical^|full] [headed^|headless^|watch] [record^|video] [marketing^|debug-overlay^|support-record] [debug] [reset-db]
echo.
echo Runs the local Playwright user regression suite.
echo.
echo Options:
echo   critical          Run the critical suite (default).
echo   full              Run the full user regression suite.
echo   headed            Show the browser.
echo   headless          Hide the browser (default).
echo   watch             Headed passive-observation mode with slow motion.
echo   record, video     Save videos for successful and failed tests.
echo   marketing         Use the branded lower-third recording overlay.
echo   debug-overlay     Use the technical overlay explicitly.
echo   support-record    Full headed watch recording with marketing overlay.
echo   debug             Launch Playwright inspector.
echo   reset-db          Reset local Supabase before running tests.
echo   -help, --help, /help, /?
echo                     Show this help.
echo.
echo Examples:
echo   dev-test.bat
echo   dev-test.bat full
echo   dev-test.bat full watch record marketing
echo   dev-test.bat support-record
exit /b 0

:run
set "PS_ARGS=-Suite %SUITE%"
if "%HEADED%"=="1" if "%HEADLESS%"=="0" set "PS_ARGS=%PS_ARGS% -Headed"
if "%HEADLESS%"=="1" set "PS_ARGS=%PS_ARGS% -Headless"
if "%WATCH%"=="1" set "PS_ARGS=%PS_ARGS% -Watch"
if "%RECORD_VIDEO%"=="1" set "PS_ARGS=%PS_ARGS% -RecordVideo"
if not "%OVERLAY_MODE%"=="" set "PS_ARGS=%PS_ARGS% -OverlayMode %OVERLAY_MODE%"
if "%DEBUG%"=="1" set "PS_ARGS=%PS_ARGS% -PlaywrightDebug"
if "%RESET_DB%"=="1" set "PS_ARGS=%PS_ARGS% -ResetDb"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\run-user-regression.ps1" %PS_ARGS%
exit /b %ERRORLEVEL%
