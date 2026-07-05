#Requires -Version 5.1
<#
.SYNOPSIS
  Verify the production docs-media bucket (created by migration, not service role).

.DESCRIPTION
  Bucket creation is defined in supabase/migrations/20260704180000_create_docs_media_bucket.sql
  and applied through normal Supabase deploy/migration promotion. This script only verifies
  anonymous public read access is available — it does not use SUPABASE_SERVICE_ROLE_KEY.

.EXAMPLE
  .\scripts\docs-media\Bootstrap-DocsMediaBucket.ps1
#>
[CmdletBinding()]
param(
  [string]$PublicProbeUrl = 'https://supabase.equipqr.app/storage/v1/object/public/docs-media/'
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $here)
Set-Location -LiteralPath $repoRoot

Write-Host '[docs-media] Bucket provisioning is handled by migration 20260704180000_create_docs_media_bucket.sql.'
Write-Host '[docs-media] Verifying anonymous public bucket access ...'

try {
  $response = Invoke-WebRequest -Uri $PublicProbeUrl -Method Head -UseBasicParsing -TimeoutSec 20
  Write-Host ("[docs-media] Public bucket probe status={0}." -f $response.StatusCode)
}
catch {
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 404) {
    Write-Host '[docs-media] Bucket path reachable (404 without object key is expected before first upload).'
    Write-Host '{"success":true,"created":false,"bucket":"docs-media","verified":"public-endpoint"}'
    exit 0
  }

  throw "docs-media public probe failed: $($_.Exception.Message)"
}

Write-Host '{"success":true,"created":false,"bucket":"docs-media","verified":"public-endpoint"}'
