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

.PARAMETER OverlayMode
  debug keeps technical status details; marketing uses a branded lower-third caption.

.PARAMETER BaseUrl
  App URL to test. Defaults to http://localhost:8080.

.PARAMETER SlowMoMs
  Slow motion delay for Watch mode. Defaults to 800 when Watch is set.

.PARAMETER WatchPauseMs
  Final-state pause for Watch mode. Defaults to 1000 when Watch is set.

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
    [ValidateSet('debug', 'marketing')]
    [string]$OverlayMode,
    [string]$BaseUrl = 'http://localhost:8080',
    [int]$SlowMoMs = -1,
    [int]$WatchPauseMs = -1,
    [switch]$PlaywrightDebug,
    [switch]$ResetDb,
    [switch]$SkipStackStart
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$appUrl = $BaseUrl.TrimEnd('/')
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

$runConfigPath = Join-Path $repoRoot 'tmp\playwright\run-config.json'

$playwrightArgs = @(
    'playwright', 'test',
    '--config=playwright.user.config.ts',
    "--project=$Suite"
)

if ($Headed -and -not $Headless) {
    $playwrightArgs += '--headed'
}

if ($Watch) {
    if ($OverlayMode) {
        $resolvedOverlayMode = $OverlayMode
    } else {
        $resolvedOverlayMode = 'debug'
    }
    if ($SlowMoMs -lt 0) {
        $resolvedSlowMoMs = 800
    } else {
        $resolvedSlowMoMs = $SlowMoMs
    }
    if ($WatchPauseMs -lt 0) {
        $resolvedWatchPauseMs = 1000
    } else {
        $resolvedWatchPauseMs = $WatchPauseMs
    }
    if (-not $Headless -and -not ($playwrightArgs -contains '--headed')) {
        $playwrightArgs += '--headed'
    }
} else {
    $resolvedOverlayMode = if ($OverlayMode) { $OverlayMode } else { 'debug' }
    $resolvedSlowMoMs = if ($SlowMoMs -gt 0) { $SlowMoMs } else { 0 }
    $resolvedWatchPauseMs = if ($WatchPauseMs -gt 0) { $WatchPauseMs } else { 0 }
}

$actionOverlay = [bool]($Watch -or $resolvedOverlayMode -eq 'marketing')
$annotateVideos = [bool]($RecordVideo -or $Watch)

$runConfig = [ordered]@{
    baseURL = $appUrl
    recordAllVideos = [bool]$RecordVideo
    annotateVideos = $annotateVideos
    actionOverlay = $actionOverlay
    overlayMode = $resolvedOverlayMode
    slowMoMs = $resolvedSlowMoMs
    watchPauseMs = $resolvedWatchPauseMs
}
$runConfig | ConvertTo-Json -Depth 3 | Set-Content -Path $runConfigPath -Encoding utf8

if ($PlaywrightDebug) {
    $playwrightArgs += '--debug'
}

Write-Host "[EquipQR E2E] Running suite: $Suite"
if ($Watch) {
    Write-Host "[EquipQR E2E] Watch mode: overlay=$resolvedOverlayMode, slowMo=$resolvedSlowMoMs ms, pause=$resolvedWatchPauseMs ms"
}
if ($RecordVideo) {
    Write-Host "[EquipQR E2E] Recording videos for every test under tmp\playwright\test-results"
}
if ($resolvedOverlayMode -eq 'marketing') {
    Write-Host "[EquipQR E2E] Marketing overlay enabled; Playwright video annotations are suppressed."
}
Write-Host "[EquipQR E2E] Command: npx $($playwrightArgs -join ' ')"

try {
    & npx @playwrightArgs
    $exitCode = $LASTEXITCODE
} finally {
    if (Test-Path -LiteralPath $runConfigPath) {
        Remove-Item -LiteralPath $runConfigPath -Force -ErrorAction SilentlyContinue
    }
}

if ($exitCode -ne 0) {
    $report = Join-Path $repoRoot 'tmp\playwright\report\index.html'
    if (Test-Path -LiteralPath $report) {
        Write-Host "[EquipQR E2E] HTML report: $report"
    }
}

exit $exitCode
