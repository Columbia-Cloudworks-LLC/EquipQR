#Requires -Version 5.1
<#
.SYNOPSIS
  Upload PR visual evidence to preview Supabase Storage and build markdown for PR comments.

.PARAMETER ManifestPath
  Path to manifest.json from Invoke-PrEvidenceCapture.ps1.

.PARAMETER Branch
  Branch slug for storage paths. Defaults to current git branch.

.PARAMETER MarkdownOut
  Optional path to write generated markdown (UTF-8).

.PARAMETER Json
  Emit upload results as JSON on stdout.

.EXAMPLE
  .\scripts\pr-evidence\Publish-PrEvidence.ps1 -ManifestPath tmp\pr-evidence\gw-disconnect\manifest.json -MarkdownOut tmp\pr-evidence\gw-disconnect\evidence-markdown.md
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ManifestPath,

    [string]$Branch = '',

    [string]$MarkdownOut = '',

    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'PrEvidenceCommon.ps1')

Assert-PrEvidenceCommandExists 'npx'

$repoRoot = Get-PrEvidenceRepoRoot
Set-Location -LiteralPath $repoRoot

$manifestFull = if ([System.IO.Path]::IsPathRooted($ManifestPath)) { $ManifestPath } else { Join-Path $repoRoot $ManifestPath }
if (-not (Test-Path -LiteralPath $manifestFull)) {
    throw "Manifest not found: $manifestFull"
}

$manifest = Get-Content -LiteralPath $manifestFull -Raw -Encoding utf8 | ConvertFrom-Json
$branchSlug = Get-PrEvidenceBranchSlug -Branch $Branch

Set-PrEvidenceUploadEnvironment

$uploads = @()

foreach ($shot in @($manifest.screenshots)) {
    $localPath = Join-Path $repoRoot (($shot.localPath -replace '/', '\'))
    if (-not (Test-Path -LiteralPath $localPath)) {
        throw "Screenshot missing on disk: $localPath"
    }

    $storagePath = ('pr-evidence/{0}/{1}-{2}.png' -f $branchSlug, $manifest.flow, $shot.label)
    $env:OUTPUT_JSON = 'true'
    $upload = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments @(
        'tsx', 'scripts/upload-screenshot.ts', $localPath, $storagePath, 'landing-page-images'
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
        kind       = 'screenshot'
        label      = $shot.label
        publicUrl  = $parsed.publicUrl
        storagePath = $parsed.storagePath
    }
}

if ($manifest.gif) {
    $gifLocal = Join-Path $repoRoot (($manifest.gif -replace '/', '\'))
    if (-not (Test-Path -LiteralPath $gifLocal)) {
        throw "GIF missing on disk: $gifLocal"
    }

    $gifStorage = ('pr-evidence/{0}/{1}-demo.gif' -f $branchSlug, $manifest.flow)
    $env:OUTPUT_JSON = 'true'
    $gifUpload = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments @(
        'tsx', 'scripts/upload-screenshot.ts', $gifLocal, $gifStorage, 'landing-page-images'
    )
    Remove-Item Env:OUTPUT_JSON -ErrorAction SilentlyContinue

    if ($gifUpload.ExitCode -ne 0) {
        throw "GIF upload failed: $($gifUpload.Text)"
    }

    $gifParsed = $gifUpload.Text | ConvertFrom-Json
    if (-not $gifParsed.success) {
        throw "GIF upload failed: $($gifParsed.error)"
    }

    $uploads += [ordered]@{
        kind       = 'gif'
        label      = 'demo'
        publicUrl  = $gifParsed.publicUrl
        storagePath = $gifParsed.storagePath
    }
}
else {
    throw 'Manifest has no demo.gif. Re-run capture; GIF is required for PR evidence.'
}

$lines = @(
    '## Visual evidence (local dev stack)',
    '',
    ('Captured from `{0}` on {1}.' -f $manifest.baseUrl, $manifest.capturedAt),
    ''
)

$gifItem = @($uploads | Where-Object { $_.kind -eq 'gif' })[0]
if ($gifItem) {
    $lines += '### Flow demo'
    $lines += ''
    $lines += ('![{0} demo]({1})' -f $manifest.flow, $gifItem.publicUrl)
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

$lines += '_Evidence uploaded from local Playwright capture (`scripts/pr-evidence/`)._'

$markdown = ($lines -join [Environment]::NewLine)

if (-not [string]::IsNullOrWhiteSpace($MarkdownOut)) {
    $mdFull = if ([System.IO.Path]::IsPathRooted($MarkdownOut)) { $MarkdownOut } else { Join-Path $repoRoot $MarkdownOut }
    $mdDir = Split-Path -Parent $mdFull
    if (-not (Test-Path -LiteralPath $mdDir)) {
        New-Item -ItemType Directory -Path $mdDir -Force | Out-Null
    }
    Set-Content -LiteralPath $mdFull -Value $markdown -Encoding utf8
    if (-not $Json) {
        Write-Host ('[PR evidence] Markdown written: {0}' -f $mdFull)
    }
}

$result = [ordered]@{
    branch   = $branchSlug
    flow     = $manifest.flow
    uploads  = $uploads
    markdown = $markdown
}

if ($Json) {
    $result | ConvertTo-Json -Depth 8 -Compress
}
else {
    Write-Host $markdown
}

exit 0
