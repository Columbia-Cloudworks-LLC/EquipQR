#Requires -Version 5.1
<#
.SYNOPSIS
  Capture PR visual evidence (screenshots + MP4 demo video) from the local dev stack via Playwright.

.PARAMETER Flow
  Short slug for artifact folder names (e.g. gw-disconnect-ux).

.PARAMETER Spec
  Playwright spec path relative to repo root. Defaults to e2e/pr-evidence/smoke-dashboard.spec.ts.

.PARAMETER BaseUrl
  Local app URL. Defaults to http://localhost:8080.

.PARAMETER SkipStackStart
  Do not invoke dev-start.bat when the stack is down.

.EXAMPLE
  .\scripts\pr-evidence\Invoke-PrEvidenceCapture.ps1 -Flow gw-disconnect -Spec e2e/pr-evidence/gw-disconnect.spec.ts
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Flow,

    [string]$Spec = 'e2e/pr-evidence/smoke-dashboard.spec.ts',

    [string]$BaseUrl = 'http://localhost:8080',

    [switch]$SkipStackStart,

    [switch]$MobileViewport
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'PrEvidenceCommon.ps1')

Assert-PrEvidenceCommandExists 'git'
Assert-PrEvidenceCommandExists 'npx'

$repoRoot = Get-PrEvidenceRepoRoot
Set-Location -LiteralPath $repoRoot

$flowSlug = ($Flow.ToLower() -replace '[^a-z0-9-]+', '-' -replace '-+', '-' -replace '^-|-$', '')
if ([string]::IsNullOrWhiteSpace($flowSlug)) {
    throw 'Flow slug is empty after sanitization.'
}

$artifactDir = Join-Path $repoRoot ('tmp\pr-evidence\{0}' -f $flowSlug)
$screenshotsDir = Join-Path $artifactDir 'screenshots'
$playwrightOutput = Join-Path $artifactDir 'playwright-output'
New-Item -ItemType Directory -Path $screenshotsDir -Force | Out-Null
New-Item -ItemType Directory -Path $playwrightOutput -Force | Out-Null

$requiresDocs = $Spec -match 'daily-operator-check-in-docs-discovery'
$configuredDocsUrl = $env:PR_EVIDENCE_DOCS_URL
$docsUrl = if ($configuredDocsUrl -and $configuredDocsUrl.Trim()) {
    $configuredDocsUrl.Trim()
} else {
    'http://127.0.0.1:5174'
}
if ($requiresDocs) {
    $env:PR_EVIDENCE_DOCS_URL = $docsUrl
}

$stack = Test-PrEvidenceLocalStack -BaseUrl $BaseUrl -CheckDocs:$requiresDocs
$stackReady = $stack.AppReady -and $stack.SupabaseReady -and (-not $requiresDocs -or $stack.DocsReady)
if (-not $stackReady) {
    if ($SkipStackStart) {
        $docsDetail = if ($requiresDocs) { ", docsReady=$($stack.DocsReady)" } else { '' }
        throw "Local stack probe failed for $BaseUrl (appReady=$($stack.AppReady), supabaseReady=$($stack.SupabaseReady)$docsDetail). Start the stack with .\dev-start.bat or omit -SkipStackStart."
    }

    Write-Host "[PR evidence] Local stack not ready; starting dev-start.bat ..."
    $devStart = Join-Path $repoRoot 'dev-start.bat'
    if (-not (Test-Path -LiteralPath $devStart)) {
        throw "dev-start.bat not found at $devStart"
    }

    $startResult = Invoke-PrEvidenceNative -FilePath $devStart
    if ($startResult.ExitCode -ne 0) {
        throw "dev-start.bat failed: $($startResult.Text)"
    }

    $stack = Test-PrEvidenceLocalStack -BaseUrl $BaseUrl -CheckDocs:$requiresDocs
    $stackReady = $stack.AppReady -and $stack.SupabaseReady -and (-not $requiresDocs -or $stack.DocsReady)
    if (-not $stackReady) {
        $docsDetail = if ($requiresDocs) { ", docsReady=$($stack.DocsReady)" } else { '' }
        throw "Local stack still not ready at $BaseUrl after dev-start.bat (appReady=$($stack.AppReady), supabaseReady=$($stack.SupabaseReady)$docsDetail)."
    }
}

$specFull = Join-Path $repoRoot ($Spec -replace '/', '\')
if (-not (Test-Path -LiteralPath $specFull)) {
    throw "PR evidence spec not found: $Spec"
}

$recordingViewport = Get-PrEvidenceRecordingViewport -MobileViewport:$MobileViewport
$env:PR_EVIDENCE_FLOW = $flowSlug
$env:PR_EVIDENCE_SPEC = $Spec
$env:PR_EVIDENCE_BASE_URL = $BaseUrl
$env:PR_EVIDENCE_VIEWPORT_WIDTH = [string]$recordingViewport.width
$env:PR_EVIDENCE_VIEWPORT_HEIGHT = [string]$recordingViewport.height

$specText = Get-Content -LiteralPath $specFull -Raw
$usesRealAuth = $specText -match '@real-auth'
$playwrightProject = if ($usesRealAuth) { 'pr-evidence-real-auth' } else { 'pr-evidence' }

if ($usesRealAuth) {
    $loadGoogleAuth = Join-Path $repoRoot 'scripts\e2e\Load-GoogleLocalAuthEnv.ps1'
    if (-not (Test-Path -LiteralPath $loadGoogleAuth)) {
        throw "Real-auth PR evidence spec requires $loadGoogleAuth"
    }
    . $loadGoogleAuth -BaseUrl $BaseUrl
    Write-Host '[PR evidence] Using pr-evidence-real-auth project with captured Google storage state.'
}

if ($Spec -match 'getting-started-onboarding') {
    Write-Host '[PR evidence] Pre-reset Fresh Start onboarding fixture (before Playwright video)...'
    $resetScript = Join-Path $repoRoot 'scripts\pr-evidence\reset-fresh-start-onboarding.ts'
    if (-not (Test-Path -LiteralPath $resetScript)) {
        throw "Fresh Start reset script not found: $resetScript"
    }
    $resetResult = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments @('tsx', $resetScript)
    if ($resetResult.ExitCode -ne 0) {
        throw "Fresh Start onboarding reset failed:`n$($resetResult.Text)"
    }
}

Write-Host "[PR evidence] Running Playwright capture: $Spec (flow=$flowSlug, project=$playwrightProject)"

$pwArgs = @(
    'playwright', 'test', $Spec,
    '--config', 'playwright.pr-evidence.config.ts',
    '--project', $playwrightProject
)

$pwResult = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments $pwArgs
if ($pwResult.ExitCode -ne 0) {
    throw "Playwright PR evidence capture failed:`n$($pwResult.Text)"
}

$webm = Find-PrEvidenceWebm -SearchRoot $playwrightOutput
$mp4Relative = ('tmp/pr-evidence/{0}/demo.mp4' -f $flowSlug)
$mp4Full = Join-Path $repoRoot ($mp4Relative -replace '/', '\')

if ($webm) {
    Write-Host '[PR evidence] Converting Playwright video to H.264 MP4 ...'
    Convert-PrEvidenceWebmToMp4 -WebmPath $webm -Mp4Path $mp4Full
}
else {
    Write-Warning '[PR evidence] No video.webm found; demo.mp4 was not generated.'
}

$screenshotFiles = @(Get-ChildItem -LiteralPath $screenshotsDir -Filter '*.png' -File -ErrorAction SilentlyContinue)
if ($screenshotFiles.Count -eq 0) {
    throw 'PR evidence capture produced zero screenshots. Add evidenceScreenshot() calls to the spec.'
}

$manifest = [ordered]@{
    flow       = $flowSlug
    spec       = $Spec
    baseUrl    = $BaseUrl
    capturedAt = (Get-Date).ToUniversalTime().ToString('o')
    viewport   = [ordered]@{
        width  = [int]$recordingViewport.width
        height = [int]$recordingViewport.height
    }
    screenshots = @(
        $screenshotFiles | ForEach-Object {
            $relative = ('tmp/pr-evidence/{0}/screenshots/{1}' -f $flowSlug, $_.Name)
            [ordered]@{
                label    = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
                localPath = ($relative -replace '\\', '/')
            }
        }
    )
    video = if (Test-Path -LiteralPath $mp4Full) { ($mp4Relative -replace '\\', '/') } else { $null }
}

$manifestPath = Join-Path $artifactDir 'manifest.json'
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding utf8

Write-Host ('[PR evidence] Capture complete: {0} screenshot(s), video={1}' -f $screenshotFiles.Count, [bool]$manifest.video)
Write-Host ('[PR evidence] Manifest: {0}' -f $manifestPath)

exit 0
