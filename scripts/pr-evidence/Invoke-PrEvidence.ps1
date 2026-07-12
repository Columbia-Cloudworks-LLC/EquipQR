#Requires -Version 5.1
<#
.SYNOPSIS
  Capture, upload, and optionally publish PR visual evidence as a GitHub PR comment.

.PARAMETER Flow
  Short slug for artifacts (e.g. gw-disconnect-ux).

.PARAMETER Spec
  Playwright spec under e2e/pr-evidence/. Defaults to smoke-dashboard fallback.

.PARAMETER PrNumber
  When set with -Publish, posts the evidence markdown as a PR comment.

.PARAMETER Publish
  Upload artifacts and post PR comment. Requires -PrNumber.

.PARAMETER CaptureOnly
  Skip upload/publish (local artifact generation only).

.PARAMETER Recapture
  Force a fresh Playwright capture even when publishing existing artifacts.

.EXAMPLE
  .\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow gw-disconnect -Spec e2e/pr-evidence/gw-disconnect.spec.ts -PrNumber 1050 -Publish
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Flow,

    [string]$Spec = 'e2e/pr-evidence/smoke-dashboard.spec.ts',

    [int]$PrNumber = 0,

    [switch]$Publish,

    [switch]$CaptureOnly,

    [switch]$Recapture,

    [string]$BaseUrl = 'http://localhost:8080',

    [switch]$SkipStackStart,

    [switch]$MobileViewport
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'PrEvidenceCommon.ps1')

$repoRoot = Get-PrEvidenceRepoRoot
Set-Location -LiteralPath $repoRoot

$flowSlug = ($Flow.ToLower() -replace '[^a-z0-9-]+', '-' -replace '-+', '-' -replace '^-|-$', '')
$artifactDir = Join-Path $repoRoot ('tmp\pr-evidence\{0}' -f $flowSlug)
$manifestPath = Join-Path $artifactDir 'manifest.json'
$markdownPath = Join-Path $artifactDir 'evidence-markdown.md'

function Resolve-PrEvidenceArtifactPath {
    param([string]$RelativeOrAbsolutePath)

    if ([string]::IsNullOrWhiteSpace($RelativeOrAbsolutePath)) {
        return $null
    }

    if ([System.IO.Path]::IsPathRooted($RelativeOrAbsolutePath)) {
        return $RelativeOrAbsolutePath
    }

    return Join-Path $repoRoot (($RelativeOrAbsolutePath -replace '/', '\'))
}

function Test-PrEvidenceCapturedManifest {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }

    try {
        $manifest = Get-Content -LiteralPath $Path -Raw -Encoding utf8 | ConvertFrom-Json
    }
    catch {
        return $false
    }

    if (-not $manifest.screenshots) {
        return $false
    }

    $screenshots = @($manifest.screenshots)
    if ($screenshots.Count -lt 1) {
        return $false
    }

    foreach ($shot in $screenshots) {
        if (-not $shot -or [string]::IsNullOrWhiteSpace([string]$shot.localPath)) {
            return $false
        }

        $shotFull = Resolve-PrEvidenceArtifactPath -RelativeOrAbsolutePath $shot.localPath
        if (-not (Test-Path -LiteralPath $shotFull)) {
            return $false
        }
    }

    if ([string]::IsNullOrWhiteSpace([string]$manifest.video)) {
        return $false
    }

    $videoFull = Resolve-PrEvidenceArtifactPath -RelativeOrAbsolutePath $manifest.video
    return Test-Path -LiteralPath $videoFull
}

$manifestArtifactsReady = Test-PrEvidenceCapturedManifest -Path $manifestPath
$manifestMatchesInvocation = Test-PrEvidenceManifestMatchesInvocation -ManifestPath $manifestPath -Spec $Spec -BaseUrl $BaseUrl -MobileViewport:$MobileViewport
$shouldCapture = -not ($manifestArtifactsReady -and $manifestMatchesInvocation)
if ($Recapture) {
    $shouldCapture = $true
}
if ($manifestArtifactsReady -and -not $manifestMatchesInvocation) {
    Write-Host '[PR evidence] Existing capture does not match current -Spec/-BaseUrl/-MobileViewport; recapturing.'
}
if (-not $shouldCapture) {
    Write-Host ('[PR evidence] Reusing existing capture at {0}' -f $artifactDir)
}

if ($Publish -and $shouldCapture -and -not $Recapture -and -not (Test-PrEvidenceCapturedManifest -Path $manifestPath)) {
    throw ('No captured evidence found at {0}. Run capture first: .\scripts\pr-evidence\Invoke-PrEvidence.ps1 -Flow {1} -Spec {2} -CaptureOnly' -f $artifactDir, $Flow, $Spec)
}

if ($shouldCapture) {
    $captureParams = @{
        Flow    = $Flow
        Spec    = $Spec
        BaseUrl = $BaseUrl
    }
    if ($SkipStackStart) {
        $captureParams['SkipStackStart'] = $true
    }
    if ($MobileViewport) {
        $captureParams['MobileViewport'] = $true
    }

    $staleReviewPath = Get-PrEvidenceVisualReviewPath -ArtifactDir $artifactDir
    if (Test-Path -LiteralPath $staleReviewPath) {
        Remove-Item -LiteralPath $staleReviewPath -Force
        Write-Host '[PR evidence] Cleared stale visual-review.json for fresh capture.'
    }

    & (Join-Path $here 'Invoke-PrEvidenceCapture.ps1') @captureParams
}

if ($CaptureOnly) {
    Write-Host ('[PR evidence] Capture-only complete: {0}' -f $artifactDir)
    Write-Host ('[PR evidence] Next: open {0}\visual-review-checklist.md, inspect each PNG, then Complete-PrEvidenceVisualReview.ps1' -f $artifactDir)
    exit 0
}

Assert-PrEvidenceVisualReviewComplete -ArtifactDir $artifactDir -FlowSlug $flowSlug

$publishJsonFile = Join-Path $artifactDir 'publish-result.json'
$publishOutput = & (Join-Path $here 'Publish-PrEvidence.ps1') -ManifestPath $manifestPath -MarkdownOut $markdownPath -Json
$publishOutput | Set-Content -LiteralPath $publishJsonFile -Encoding utf8
$publishResult = $publishOutput | ConvertFrom-Json

if ($Publish) {
    if ($PrNumber -le 0) {
        throw '-Publish requires -PrNumber.'
    }

    Assert-PrEvidenceCommandExists 'gh'

    $commentMarker = '<!-- pr-visual-evidence -->'
    $body = @(
        $commentMarker,
        [string]$publishResult.markdown
    ) -join [Environment]::NewLine

    $bodyFile = Join-Path $artifactDir 'pr-comment-body.md'
    Set-Content -LiteralPath $bodyFile -Value $body -Encoding utf8

    $create = Invoke-PrEvidenceNative -FilePath 'gh' -Arguments @(
        'pr', 'comment', [string]$PrNumber, '--body-file', $bodyFile
    )
    if ($create.ExitCode -ne 0) {
        throw "gh pr comment failed: $($create.Text)"
    }

    Write-Host ('[PR evidence] Posted comment on PR #{0}: {1}' -f $PrNumber, $create.Text.Trim())
}

Write-Host ('[PR evidence] Done. Markdown: {0}' -f $markdownPath)
exit 0
