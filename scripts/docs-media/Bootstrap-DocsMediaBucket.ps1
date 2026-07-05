#Requires -Version 5.1
<#
.SYNOPSIS
  Idempotently bootstrap the production docs-media Supabase Storage bucket.

.EXAMPLE
  .\scripts\docs-media\Bootstrap-DocsMediaBucket.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $here)
Set-Location -LiteralPath $repoRoot

. (Join-Path $repoRoot 'scripts\pr-evidence\PrEvidenceCommon.ps1')

Assert-PrEvidenceCommandExists 'npx'
Set-PrEvidenceUploadEnvironment

Write-Host '[docs-media] Bootstrapping docs-media bucket on production Supabase ...'

$result = Invoke-PrEvidenceNative -FilePath 'npx' -Arguments @(
  'tsx', 'scripts/docs-media/bootstrap-docs-media-bucket.ts'
)

if ($result.ExitCode -ne 0) {
  throw "docs-media bootstrap failed:`n$($result.Text)"
}

$parsed = $result.Text | ConvertFrom-Json
if (-not $parsed.success) {
  throw "docs-media bootstrap failed: $($parsed.error)"
}

Write-Host ("[docs-media] Bucket ready (created={0})." -f $parsed.created)
