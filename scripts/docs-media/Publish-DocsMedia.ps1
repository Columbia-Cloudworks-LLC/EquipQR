#Requires -Version 5.1
<#
.SYNOPSIS
  Upload PR evidence artifacts to the public docs-media bucket and emit markdown snippets.

.PARAMETER ManifestPath
  Path to manifest.json from Invoke-PrEvidenceCapture.ps1.

.PARAMETER Collection
  Docs collection slug (e.g. location-maps).

.PARAMETER Variant
  desktop or mobile.

.PARAMETER MarkdownOut
  Optional path to write generated markdown (UTF-8).

.PARAMETER Json
  Emit upload results as JSON on stdout.

.EXAMPLE
  .\scripts\docs-media\Publish-DocsMedia.ps1 `
    -ManifestPath tmp\pr-evidence\location-maps-desktop\manifest.json `
    -Collection location-maps `
    -Variant desktop `
    -MarkdownOut tmp\docs-media\location-maps\desktop.md
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ManifestPath,

    [Parameter(Mandatory)][string]$Collection,

    [Parameter(Mandatory)][ValidateSet('desktop', 'mobile')][string]$Variant,

    [string]$MarkdownOut = '',

    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $here)
Set-Location -LiteralPath $repoRoot

. (Join-Path $repoRoot 'scripts\pr-evidence\PrEvidenceCommon.ps1')

Assert-PrEvidenceCommandExists 'npx'

$manifestFull = if ([System.IO.Path]::IsPathRooted($ManifestPath)) { $ManifestPath } else { Join-Path $repoRoot $ManifestPath }
if (-not (Test-Path -LiteralPath $manifestFull)) {
    throw "Manifest not found: $manifestFull"
}

$manifest = Get-Content -LiteralPath $manifestFull -Raw -Encoding utf8 | ConvertFrom-Json

Set-PrEvidenceUploadEnvironment

& (Join-Path $here 'Bootstrap-DocsMediaBucket.ps1') | Out-Null

$uploads = @()

foreach ($shot in @($manifest.screenshots)) {
    $localPath = Join-Path $repoRoot (($shot.localPath -replace '/', '\'))
    if (-not (Test-Path -LiteralPath $localPath)) {
        throw "Screenshot missing on disk: $localPath"
    }

    $pathResult = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments @(
        'tsx', 'scripts/docs-media/print-storage-path.ts', $Collection, $Variant, $shot.label, 'png'
    )
    if ($pathResult.ExitCode -ne 0) {
        throw "Failed to build docs-media storage path for $($shot.label): $($pathResult.Text)"
    }
    $storagePath = $pathResult.Text.Trim()

    $env:OUTPUT_JSON = 'true'
    $upload = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments @(
        'tsx', 'scripts/upload-screenshot.ts', $localPath, $storagePath, 'docs-media'
    )
    Remove-Item Env:OUTPUT_JSON -ErrorAction SilentlyContinue

    if ($upload.ExitCode -ne 0) {
        throw "Screenshot upload failed for $($shot.label): $($upload.Text)"
    }

    $parsed = $upload.Text | ConvertFrom-Json
    if (-not $parsed.success) {
        throw "Screenshot upload failed for $($shot.label): $($parsed.error)"
    }

    $uploads += [ordered]@{
        kind        = 'screenshot'
        label       = $shot.label
        publicUrl   = $parsed.publicUrl
        storagePath = $parsed.storagePath
    }
}

if ($manifest.video) {
    $videoLocal = Join-Path $repoRoot (($manifest.video -replace '/', '\'))
    if (-not (Test-Path -LiteralPath $videoLocal)) {
        throw "MP4 missing on disk: $videoLocal"
    }

    $videoPathResult = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments @(
        'tsx', 'scripts/docs-media/print-storage-path.ts', $Collection, $Variant, 'demo', 'mp4'
    )
    if ($videoPathResult.ExitCode -ne 0) {
        throw "Failed to build docs-media video storage path: $($videoPathResult.Text)"
    }
    $videoStoragePath = $videoPathResult.Text.Trim()

    $env:OUTPUT_JSON = 'true'
    $videoUpload = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments @(
        'tsx', 'scripts/upload-screenshot.ts', $videoLocal, $videoStoragePath, 'docs-media'
    )
    Remove-Item Env:OUTPUT_JSON -ErrorAction SilentlyContinue

    if ($videoUpload.ExitCode -ne 0) {
        throw "Video upload failed: $($videoUpload.Text)"
    }

    $videoParsed = $videoUpload.Text | ConvertFrom-Json
    if (-not $videoParsed.success) {
        throw "Video upload failed: $($videoParsed.error)"
    }

    $uploads += [ordered]@{
        kind        = 'video'
        label       = 'demo'
        publicUrl   = $videoParsed.publicUrl
        storagePath = $videoParsed.storagePath
    }
}
else {
    throw 'Manifest has no demo.mp4. Re-run capture; MP4 demo video is required for docs media.'
}

$lines = @(
    "## $Variant documentation media",
    '',
    ('Captured from `{0}` on {1}.' -f $manifest.baseUrl, $manifest.capturedAt),
    ''
)

$videoItem = @($uploads | Where-Object { $_.kind -eq 'video' })[0]
if ($videoItem) {
    $lines += '### Flow demo'
    $lines += ''
    $lines += [string]$videoItem.publicUrl
    $lines += ''
}

$shots = @($uploads | Where-Object { $_.kind -eq 'screenshot' })
if ($shots.Count -gt 0) {
    $lines += '### Screenshots'
    $lines += ''
    foreach ($shot in $shots) {
        $title = ($shot.label -replace '-', ' ')
        $lines += ('#### {0}' -f $title)
        $lines += ''
        $lines += ('![{0}]({1})' -f $shot.label, $shot.publicUrl)
        $lines += ''
    }
}

$lines += '_Uploaded to Supabase `docs-media` for equipqr.info documentation._'

$markdown = ($lines -join [Environment]::NewLine)

if (-not [string]::IsNullOrWhiteSpace($MarkdownOut)) {
    $mdFull = if ([System.IO.Path]::IsPathRooted($MarkdownOut)) { $MarkdownOut } else { Join-Path $repoRoot $MarkdownOut }
    $mdDir = Split-Path -Parent $mdFull
    if (-not (Test-Path -LiteralPath $mdDir)) {
        New-Item -ItemType Directory -Path $mdDir -Force | Out-Null
    }
    $markdown | Set-Content -LiteralPath $mdFull -Encoding utf8
}

$resultsPath = Join-Path $repoRoot ("tmp\docs-media\{0}\{1}-upload-results.json" -f $Collection, $Variant)
$resultsDir = Split-Path -Parent $resultsPath
if (-not (Test-Path -LiteralPath $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
}

$payload = [ordered]@{
    collection = $Collection
    variant    = $Variant
    manifest   = ($manifestFull -replace '\\', '/')
    uploads    = $uploads
    markdown   = $markdown
}

$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resultsPath -Encoding utf8

if ($Json) {
    $payload | ConvertTo-Json -Depth 8
}
else {
    Write-Host "[docs-media] Uploaded $($uploads.Count) artifact(s) to docs-media."
    if (-not [string]::IsNullOrWhiteSpace($MarkdownOut)) {
        Write-Host "[docs-media] Markdown: $MarkdownOut"
    }
    Write-Host "[docs-media] Results: $resultsPath"
}
