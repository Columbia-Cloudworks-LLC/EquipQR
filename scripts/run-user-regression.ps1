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
  none shows no overlay; debug uses Playwright's built-in annotations; marketing uses the branded lower-third caption.

.PARAMETER ViewportMode
  desktop uses the normal browser viewport; mobile uses an iPhone-sized viewport; both runs desktop then mobile.

.PARAMETER RunProfile
  test is fast regression mode, watch is passive observation mode, demo is customer-quality recording mode.

.PARAMETER RecordingTitle
  Static marketing overlay title for reusable support recordings.

.PARAMETER BaseUrl
  App URL to test. Defaults to http://localhost:8080.

.PARAMETER SlowMoMs
  Playwright low-level slow motion delay. Defaults to 0.

.PARAMETER StagePauseMs
  Pause after each visible overlay step. Defaults to 1000 when Watch is set.

.PARAMETER WatchPauseMs
  Final-state pause for Watch mode. Defaults to 5000 when Watch is set.

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
    [ValidateSet('critical', 'full', 'all')]
    [string]$Suite = 'critical',

    [switch]$Headed,
    [switch]$Headless,
    [switch]$Watch,
    [switch]$RecordVideo,
    [ValidateSet('none', 'debug', 'marketing')]
    [string]$OverlayMode,
    [ValidateSet('desktop', 'mobile', 'both')]
    [string]$ViewportMode,
    [ValidateSet('test', 'watch', 'demo')]
    [string]$RunProfile = 'test',
    [string]$RecordingTitle,
    [string]$BaseUrl = 'http://localhost:8080',
    [int]$SlowMoMs = -1,
    [int]$StagePauseMs = -1,
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

if (($Suite -eq 'full' -or $Suite -eq 'all') -and -not $ResetDb) {
    Write-Host '[EquipQR E2E] WARNING: full/all suites mutate data; auto-enabling -ResetDb for repeatable runs.'
    $ResetDb = $true
}

if ($ResetDb) {
    Write-Host '[EquipQR E2E] Generating volume seed data (scripts/seed-data/generate-seeds.ts)...'
    npx tsx scripts/seed-data/generate-seeds.ts
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host '[EquipQR E2E] Resetting local database (supabase db reset)...'
    npx supabase db reset
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Ensure-PlaywrightChromium

$authDir = Join-Path $repoRoot 'tmp\playwright\auth'
if (-not (Test-Path -LiteralPath $authDir)) {
    New-Item -ItemType Directory -Path $authDir -Force | Out-Null
}

$defaultRunConfigPath = Join-Path $repoRoot 'e2e\user\run-config.defaults.json'
$runConfigPath = Join-Path $repoRoot 'tmp\playwright\run-config.json'

function Read-RunConfigDefaults {
    $fallback = [ordered]@{
        baseURL = 'http://localhost:8080'
        runProfile = 'test'
        recordAllVideos = $false
        annotateVideos = $false
        actionOverlay = $false
        actionCue = $false
        overlayMode = 'none'
        viewportMode = 'desktop'
        recordingTitle = ''
        desktopViewport = [ordered]@{ width = 1920; height = 1080 }
        mobileViewport = [ordered]@{ width = 390; height = 844 }
        videoSize = [ordered]@{ width = 1920; height = 1080 }
        slowMoMs = 0
        stagePauseMs = 1000
        watchPauseMs = 5000
    }

    if (-not (Test-Path -LiteralPath $defaultRunConfigPath)) {
        return $fallback
    }

    try {
        $raw = Get-Content -LiteralPath $defaultRunConfigPath -Raw | ConvertFrom-Json
        if ($raw.baseURL) { $fallback.baseURL = [string]$raw.baseURL }
        if ($raw.runProfile -eq 'test' -or $raw.runProfile -eq 'watch' -or $raw.runProfile -eq 'demo') { $fallback.runProfile = [string]$raw.runProfile }
        if ($null -ne $raw.recordAllVideos) { $fallback.recordAllVideos = [bool]$raw.recordAllVideos }
        if ($null -ne $raw.annotateVideos) { $fallback.annotateVideos = [bool]$raw.annotateVideos }
        if ($null -ne $raw.actionOverlay) { $fallback.actionOverlay = [bool]$raw.actionOverlay }
        if ($null -ne $raw.actionCue) { $fallback.actionCue = [bool]$raw.actionCue }
        if ($raw.overlayMode -eq 'none' -or $raw.overlayMode -eq 'marketing' -or $raw.overlayMode -eq 'debug') { $fallback.overlayMode = [string]$raw.overlayMode }
        if ($raw.viewportMode -eq 'mobile' -or $raw.viewportMode -eq 'desktop' -or $raw.viewportMode -eq 'both') { $fallback.viewportMode = [string]$raw.viewportMode }
        if ($null -ne $raw.recordingTitle) { $fallback.recordingTitle = ([string]$raw.recordingTitle).Trim() }
        if ($null -ne $raw.desktopViewport -and $raw.desktopViewport.width -gt 0 -and $raw.desktopViewport.height -gt 0) {
            $fallback.desktopViewport = [ordered]@{ width = [int]$raw.desktopViewport.width; height = [int]$raw.desktopViewport.height }
        }
        if ($null -ne $raw.mobileViewport -and $raw.mobileViewport.width -gt 0 -and $raw.mobileViewport.height -gt 0) {
            $fallback.mobileViewport = [ordered]@{ width = [int]$raw.mobileViewport.width; height = [int]$raw.mobileViewport.height }
        }
        if ($null -ne $raw.videoSize -and $raw.videoSize.width -gt 0 -and $raw.videoSize.height -gt 0) {
            $fallback.videoSize = [ordered]@{ width = [int]$raw.videoSize.width; height = [int]$raw.videoSize.height }
        }
        if ($null -ne $raw.slowMoMs -and [int]$raw.slowMoMs -ge 0) { $fallback.slowMoMs = [int]$raw.slowMoMs }
        if ($null -ne $raw.stagePauseMs -and [int]$raw.stagePauseMs -ge 0) { $fallback.stagePauseMs = [int]$raw.stagePauseMs }
        if ($null -ne $raw.watchPauseMs -and [int]$raw.watchPauseMs -ge 0) { $fallback.watchPauseMs = [int]$raw.watchPauseMs }
    } catch {
        Write-Host "[EquipQR E2E] WARNING: Could not read $defaultRunConfigPath; using built-in defaults."
    }

    return $fallback
}

$defaultRunConfig = Read-RunConfigDefaults
$resolvedViewportMode = if ($ViewportMode) { $ViewportMode } else { $defaultRunConfig.viewportMode }
$resolvedRecordingTitle = if ($RecordingTitle) { $RecordingTitle.Trim() } else { $defaultRunConfig.recordingTitle }
$resolvedRunProfile = if ($RunProfile) { $RunProfile } else { $defaultRunConfig.runProfile }
if ($Watch -and $resolvedRunProfile -eq 'test') {
    $resolvedRunProfile = 'watch'
}
$effectiveWatch = [bool]($Watch -or $resolvedRunProfile -eq 'watch' -or $resolvedRunProfile -eq 'demo')

$projectArgs = if ($Suite -eq 'all') {
    @('--project=setup', '--project=critical', '--project=full')
} else {
    @("--project=$Suite")
}

function ConvertTo-ArtifactToken {
    param([string]$Value)
    $token = $Value.ToLowerInvariant().Trim()
    $token = [regex]::Replace($token, '[^a-z0-9-]+', '-')
    $token = [regex]::Replace($token, '-+', '-')
    return $token.Trim('-')
}

function New-ViewportSize {
    param(
        [int]$Width,
        [int]$Height
    )
    return [ordered]@{ width = $Width; height = $Height }
}

function Resolve-ViewportSize {
    param(
        [object]$Configured,
        [int]$FallbackWidth,
        [int]$FallbackHeight
    )
    if ($null -ne $Configured -and $Configured.width -gt 0 -and $Configured.height -gt 0) {
        return New-ViewportSize -Width ([int]$Configured.width) -Height ([int]$Configured.height)
    }
    return New-ViewportSize -Width $FallbackWidth -Height $FallbackHeight
}

function Invoke-PlaywrightViewportRun {
    param([string]$Viewport)

    $resolvedOverlayMode = if ($OverlayMode) {
        $OverlayMode
    } elseif ($resolvedRunProfile -eq 'demo') {
        'marketing'
    } else {
        $defaultRunConfig.overlayMode
    }

    $resolvedSlowMoMs = if ($SlowMoMs -ge 0) {
        $SlowMoMs
    } elseif ($resolvedRunProfile -eq 'demo') {
        200
    } else {
        $defaultRunConfig.slowMoMs
    }

    $resolvedStagePauseMs = if ($StagePauseMs -ge 0) {
        $StagePauseMs
    } elseif ($resolvedRunProfile -eq 'demo') {
        1500
    } elseif ($effectiveWatch) {
        if ($defaultRunConfig.stagePauseMs -gt 0) { $defaultRunConfig.stagePauseMs } else { 1000 }
    } else {
        0
    }

    $resolvedWatchPauseMs = if ($WatchPauseMs -ge 0) {
        $WatchPauseMs
    } elseif ($resolvedRunProfile -eq 'demo') {
        6000
    } elseif ($effectiveWatch) {
        if ($defaultRunConfig.watchPauseMs -gt 0) { $defaultRunConfig.watchPauseMs } else { 5000 }
    } else {
        0
    }

    $desktopViewport = if ($resolvedRunProfile -eq 'demo') {
        New-ViewportSize -Width 1920 -Height 1080
    } else {
        Resolve-ViewportSize -Configured $defaultRunConfig.desktopViewport -FallbackWidth 1920 -FallbackHeight 1080
    }
    $mobileViewport = Resolve-ViewportSize -Configured $defaultRunConfig.mobileViewport -FallbackWidth 390 -FallbackHeight 844
    $videoSize = if ($Viewport -eq 'mobile') { $mobileViewport } else { $desktopViewport }

    $actionOverlay = [bool]($resolvedOverlayMode -eq 'marketing')
    $annotateVideos = [bool]($resolvedOverlayMode -eq 'debug')
    $recordAllVideos = [bool]($RecordVideo -or $defaultRunConfig.recordAllVideos -or $resolvedRunProfile -eq 'demo')
    $actionCue = [bool]($defaultRunConfig.actionCue -or $resolvedRunProfile -eq 'demo')

    $artifactParts = @(
        (ConvertTo-ArtifactToken $Viewport),
        (ConvertTo-ArtifactToken $resolvedRunProfile),
        $(if ($recordAllVideos) { 'record' } else { 'test' })
    )
    if ($resolvedRecordingTitle) {
        $artifactParts += (ConvertTo-ArtifactToken $resolvedRecordingTitle)
    } elseif ($resolvedOverlayMode -ne 'none') {
        $artifactParts += (ConvertTo-ArtifactToken $resolvedOverlayMode)
    }
    $artifactContext = ($artifactParts | Where-Object { $_ }) -join '-'
    if (-not $artifactContext) {
        $artifactContext = 'desktop-test'
    }
    $relativeOutputDir = "tmp/playwright/test-results/$artifactContext"
    $absoluteOutputDir = Join-Path $repoRoot ($relativeOutputDir -replace '/', '\')

    $runConfig = [ordered]@{
        baseURL = $appUrl
        runProfile = $resolvedRunProfile
        recordAllVideos = $recordAllVideos
        annotateVideos = $annotateVideos
        actionOverlay = $actionOverlay
        actionCue = $actionCue
        overlayMode = $resolvedOverlayMode
        viewportMode = $Viewport
        recordingTitle = $resolvedRecordingTitle
        outputDir = $relativeOutputDir
        desktopViewport = $desktopViewport
        mobileViewport = $mobileViewport
        videoSize = $videoSize
        slowMoMs = $resolvedSlowMoMs
        stagePauseMs = $resolvedStagePauseMs
        watchPauseMs = $resolvedWatchPauseMs
        generatedAt = (Get-Date).ToUniversalTime().ToString('o')
        source = 'scripts/run-user-regression.ps1'
    }
    $runConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $runConfigPath -Encoding ascii

    $playwrightArgs = @(
        'playwright', 'test',
        '--config=playwright.user.config.ts'
    ) + $projectArgs

    $effectiveHeaded = [bool](($Headed -or $effectiveWatch -or $resolvedRunProfile -eq 'demo') -and -not $Headless)
    if ($effectiveHeaded) {
        $playwrightArgs += '--headed'
    }
    if ($PlaywrightDebug) {
        $playwrightArgs += '--debug'
    }

    Write-Host "[EquipQR E2E] Running suite: $Suite"
    Write-Host "[EquipQR E2E] Run profile: $resolvedRunProfile"
    Write-Host "[EquipQR E2E] Effective config: $runConfigPath"
    Write-Host "[EquipQR E2E] Viewport mode: $Viewport"
    Write-Host "[EquipQR E2E] Output folder: $absoluteOutputDir"
    if ($effectiveWatch) {
        Write-Host "[EquipQR E2E] Watch pacing: overlay=$resolvedOverlayMode, stagePause=$resolvedStagePauseMs ms, finalPause=$resolvedWatchPauseMs ms, slowMo=$resolvedSlowMoMs ms"
    }
    if ($recordAllVideos) {
        Write-Host "[EquipQR E2E] Recording videos for every test under tmp\playwright\test-results"
    }
    if ($actionCue) {
        Write-Host "[EquipQR E2E] Demo action spotlight enabled."
    }
    if ($resolvedOverlayMode -eq 'marketing') {
        Write-Host "[EquipQR E2E] Marketing overlay enabled; Playwright video annotations are suppressed."
        if ($resolvedRecordingTitle) {
            Write-Host "[EquipQR E2E] Recording title: $resolvedRecordingTitle"
        }
    } elseif ($resolvedOverlayMode -eq 'debug') {
        Write-Host "[EquipQR E2E] Debug overlay enabled; Playwright video annotations are enabled."
    } else {
        Write-Host "[EquipQR E2E] Overlay disabled."
    }
    Write-Host "[EquipQR E2E] Command: npx $($playwrightArgs -join ' ')"

    $previousNoColor = $env:NO_COLOR
    try {
        Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
        & npx @playwrightArgs
        $runExitCode = $LASTEXITCODE
    } finally {
        if ($null -ne $previousNoColor) {
            $env:NO_COLOR = $previousNoColor
        } else {
            Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
        }
    }

    if ($runExitCode -ne 0) {
        $report = Join-Path $repoRoot 'tmp\playwright\report\index.html'
        if (Test-Path -LiteralPath $report) {
            Write-Host "[EquipQR E2E] HTML report: $report"
        }
    }

    if ($recordAllVideos) {
        $videoFiles = @(Get-ChildItem -LiteralPath $absoluteOutputDir -Recurse -Filter 'video.webm' -File -ErrorAction SilentlyContinue)
        Write-Host "[EquipQR E2E] Video files retained: $($videoFiles.Count)"
        if ($videoFiles.Count -gt 0) {
            Write-Host "[EquipQR E2E] First video: $($videoFiles[0].FullName)"
        }
    }

    $script:LastPlaywrightViewportExitCode = $runExitCode
    return
}

$viewportsToRun = if ($resolvedViewportMode -eq 'both') { @('desktop', 'mobile') } else { @($resolvedViewportMode) }
$exitCode = 0
foreach ($viewport in $viewportsToRun) {
    $script:LastPlaywrightViewportExitCode = 0
    Invoke-PlaywrightViewportRun -Viewport $viewport
    $viewportExitCode = $script:LastPlaywrightViewportExitCode
    if ($viewportExitCode -ne 0 -and $exitCode -eq 0) {
        $exitCode = $viewportExitCode
    }
}

exit $exitCode
