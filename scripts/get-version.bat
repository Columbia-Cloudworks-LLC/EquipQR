@echo off
REM Get the current app version from git tags
REM This script can be used for local development or CI environments

set TAG_PREFIX=v

REM Try to get a tag exactly at HEAD first
for /f "delims=" %%i in ('git tag --points-at HEAD ^| findstr "^%TAG_PREFIX%[0-9]" ^| findstr /r "^%TAG_PREFIX%[0-9]"') do (
    set HEAD_TAG=%%i
    goto :found
)

REM If no tag at HEAD, fall back to the latest tag
for /f "delims=" %%i in ('git describe --tags --abbrev=0 --match "%TAG_PREFIX%[0-9]*" 2^>nul') do (
    set HEAD_TAG=%%i
    goto :found
)

REM Default if no tags exist
set HEAD_TAG=%TAG_PREFIX%0.0.0

:found
REM Remove the 'v' prefix
set VERSION=%HEAD_TAG:~1%

echo %VERSION%
