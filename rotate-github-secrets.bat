@echo off
setlocal EnableExtensions

if /I "%~1"=="-help" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="/help" goto help
if /I "%~1"=="/?" goto help

set "ROOT=%~dp0"
set "SCRIPT=%ROOT%scripts\op-to-github.ps1"

where op >nul 2>&1
if errorlevel 1 (
  echo [rotate-github-secrets] FAIL: 1Password CLI 'op' is not on PATH.
  exit /b 1
)

where gh >nul 2>&1
if errorlevel 1 (
  echo [rotate-github-secrets] FAIL: GitHub CLI 'gh' is not on PATH.
  exit /b 1
)

op account list >nul 2>&1
if errorlevel 1 (
  echo [rotate-github-secrets] FAIL: no active 1Password sign-in session.
  echo Run: op signin
  exit /b 1
)

for /f "usebackq delims=" %%i in (`op read "op://EquipQR Agents/github-write/credential"`) do set "GH_TOKEN=%%i"
if not defined GH_TOKEN (
  echo [rotate-github-secrets] FAIL: could not read github-write token from 1Password.
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "EXITCODE=%ERRORLEVEL%"

exit /b %EXITCODE%

:help
echo Usage: rotate-github-secrets.bat [op-to-github.ps1 options]
echo.
echo Syncs selected 1Password-backed secrets into GitHub using scripts\op-to-github.ps1.
echo Requires the 1Password CLI and GitHub CLI for non-help runs.
echo.
echo Options:
echo   -help, --help, /help, /?
echo                     Show this help.
echo.
echo Examples:
echo   rotate-github-secrets.bat
exit /b 0
