#Requires -Version 5.1
<#
.SYNOPSIS
  Record agent visual review approval after inspecting PR evidence screenshots.

.PARAMETER Flow
  Evidence flow slug (same value passed to Invoke-PrEvidence.ps1 -Flow).

.PARAMETER Notes
  Short summary of what was verified (controls framed, mobile stacking, no horizontal scroll, etc.).

.EXAMPLE
  .\scripts\pr-evidence\Complete-PrEvidenceVisualReview.ps1 -Flow "mobile-shell" -Notes "Inventory list, members, integrations — no overflow; primary actions visible."
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Flow,

    [Parameter(Mandatory)][string]$Notes
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'PrEvidenceCommon.ps1')

$repoRoot = Get-PrEvidenceRepoRoot
Set-Location -LiteralPath $repoRoot

$flowSlug = ($Flow.ToLower() -replace '[^a-z0-9-]+', '-' -replace '-+', '-' -replace '^-|-$', '')
if ([string]::IsNullOrWhiteSpace($flowSlug)) {
    throw 'Flow slug is empty after sanitization.'
}

$artifactDir = Join-Path $repoRoot ('tmp\pr-evidence\{0}' -f $flowSlug)
$manifestPath = Join-Path $artifactDir 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "No capture manifest at $manifestPath. Run Invoke-PrEvidenceCapture.ps1 or Invoke-PrEvidence.ps1 -CaptureOnly first."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json
$screenshots = @($manifest.screenshots)
if ($screenshots.Count -lt 1) {
    throw 'Capture manifest has zero screenshots.'
}

$review = [ordered]@{
    approved   = $true
    flow       = $flowSlug
    notes      = $Notes.Trim()
    reviewedAt = (Get-Date).ToUniversalTime().ToString('o')
    screenshotCount = $screenshots.Count
    screenshots = @(
        $screenshots | ForEach-Object {
            [ordered]@{
                label     = [string]$_.label
                localPath = [string]$_.localPath
            }
        }
    )
}

$reviewPath = Get-PrEvidenceVisualReviewPath -ArtifactDir $artifactDir
$review | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reviewPath -Encoding utf8

Write-Host ('[PR evidence] Visual review recorded: {0}' -f $reviewPath)
exit 0
