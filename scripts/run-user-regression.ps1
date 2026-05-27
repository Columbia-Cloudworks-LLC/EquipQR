#Requires -Version 5.1
<#
.SYNOPSIS
  Run EquipQR Playwright user regression suites against the local dev stack.

.PARAMETER Suite
  critical (default) or full.

.PARAMETER Headed
  Show the browser while tests run.

.PARAMETER Headless
  Force headless mode (overrides Headed default from dev-test.bat).

.PARAMETER Watch
  Show the browser with an in-page status overlay and slow motion for passive observation.

.PARAMETER RecordVideo
  Save video for every test instead of only retaining videos on failure.

.PARAMETER PlaywrightDebug
  Run Playwright in debug mode.

.PARAMETER ResetDb
  Reset local Supabase before tests (supabase db reset).

.PARAMETER SkipStackStart
  Do not invoke dev-start.bat when the stack is down.

.EXAMPLE
  .\scripts\run-user-regression.ps1
  .\scripts\run-user-regression.ps1 -Suite full -Headed
  .\scripts\run-user-regression.ps1 -ResetDb -Headless
#>
[CmdletBinding()]
param(
    [ValidateSet('critical', 'full')]
    [string]$Suite = 'critical',

    [switch]$Headed,
    [switch]$Headless,
    [switch]$Watch,
    [switch]$RecordVideo,
    [switch]$PlaywrightDebug,
    [switch]$ResetDb,
    [switch]$SkipStackStart
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$appUrl = if ($env:E2E_BASE_URL) { $env:E2E_BASE_URL.TrimEnd('/') } else { 'http://localhost:8080' }
$supabaseRest = 'http://127.0.0.1:54321/rest/v1/'

function Test-AppReady {
    try {
        $r = Invoke-WebRequest -Uri $appUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Test-SupabaseReady {
    try {
        $r = Invoke-WebRequest -Uri $supabaseRest -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
    } catch {
        return $false
    }
}

function Wait-ForApp {
    param([int]$TimeoutSec = 180)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if ((Test-AppReady) -and (Test-SupabaseReady)) {
            return $true
        }
        Start-Sleep -Seconds 3
    }
    return $false
}

function Ensure-PlaywrightChromium {
    $check = node -e "const { chromium } = require('@playwright/test'); process.stdout.write(chromium.executablePath());"
    if (-not $check) {
        Write-Host 'Installing Playwright Chromium...'
        npx playwright install chromium
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}

$appReady = Test-AppReady
$supabaseReady = Test-SupabaseReady

if (-not $SkipStackStart -and (-not $appReady -or -not $supabaseReady)) {
    Write-Host "[EquipQR E2E] Local stack not ready (app=$appReady supabase=$supabaseReady). Starting dev-start.bat..."
    $devStart = Join-Path $repoRoot 'dev-start.bat'
    if (-not (Test-Path -LiteralPath $devStart)) {
        Write-Host "FAIL: dev-start.bat not found at $devStart"
        exit 1
    }
    & $devStart
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: dev-start.bat exited with code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    if (-not (Wait-ForApp)) {
        Write-Host "FAIL: Timed out waiting for $appUrl and Supabase after dev-start."
        exit 1
    }
} elseif (-not $appReady) {
    Write-Host "FAIL: Vite is not reachable at $appUrl. Run dev-start.bat first."
    exit 1
} elseif (-not $supabaseReady) {
    Write-Host "FAIL: Supabase is not reachable at $supabaseRest. Run dev-start.bat first."
    exit 1
}

if ($ResetDb) {
    Write-Host '[EquipQR E2E] Resetting local database (supabase db reset)...'
    npx supabase db reset
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Ensure-PlaywrightChromium

$authDir = Join-Path $repoRoot 'tmp\playwright\auth'
if (-not (Test-Path -LiteralPath $authDir)) {
    New-Item -ItemType Directory -Path $authDir -Force | Out-Null
}

$playwrightArgs = @(
    'playwright', 'test',
    '--config=playwright.user.config.ts',
    "--project=$Suite"
)

if ($Headed -and -not $Headless) {
    $playwrightArgs += '--headed'
}

if ($Watch) {
    $env:E2E_ACTION_OVERLAY = '1'
    $env:E2E_VIDEO_ANNOTATIONS = '1'
    if (-not $env:E2E_SLOW_MO_MS) {
        $env:E2E_SLOW_MO_MS = '800'
    }
    if (-not $env:E2E_WATCH_PAUSE_MS) {
        $env:E2E_WATCH_PAUSE_MS = '1000'
    }
    if (-not $Headless -and -not ($playwrightArgs -contains '--headed')) {
        $playwrightArgs += '--headed'
    }
}

if ($RecordVideo) {
    $env:E2E_RECORD_VIDEO = '1'
    $env:E2E_VIDEO_ANNOTATIONS = '1'
}

if ($PlaywrightDebug) {
    $playwrightArgs += '--debug'
}

Write-Host "[EquipQR E2E] Running suite: $Suite"
if ($Watch) {
    Write-Host "[EquipQR E2E] Watch mode: overlay enabled, slowMo=$env:E2E_SLOW_MO_MS ms, pause=$env:E2E_WATCH_PAUSE_MS ms"
}
if ($RecordVideo) {
    Write-Host "[EquipQR E2E] Recording videos for every test under tmp\playwright\test-results"
}
Write-Host "[EquipQR E2E] Command: npx $($playwrightArgs -join ' ')"

& npx @playwrightArgs
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    $report = Join-Path $repoRoot 'tmp\playwright\report\index.html'
    if (Test-Path -LiteralPath $report) {
        Write-Host "[EquipQR E2E] HTML report: $report"
    }
}

exit $exitCode
