#Requires -Version 5.1
<#
.SYNOPSIS
  Render Cursor MCP configuration from the EquipQR 1Password vault.

.DESCRIPTION
  Runs scripts/render-mcp-config.ps1 outside of dev-start so local stack startup
  remains focused on Supabase/Edge/Vite only.

.PARAMETER SkipGcp
  Skip writing the gcloud service-account JSON during MCP setup.

.EXAMPLE
  .\dev-setup-cursor-mcp.ps1
  .\dev-setup-cursor-mcp.ps1 -SkipGcp
#>
[CmdletBinding()]
param(
    [switch]$SkipGcp,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest = @()
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$unknown = [System.Collections.Generic.List[string]]::new()
foreach ($r in $Rest) {
    if ($r -match '^(?i)(/SkipGcp|--skip-gcp)$') {
        $SkipGcp = $true
    } else {
        [void]$unknown.Add($r)
    }
}
$Rest = @($unknown)

if ($Rest.Count -gt 0) {
    Write-Host "FAIL: Unknown argument(s): $($Rest -join ', ')"
    Write-Host 'Usage: .\dev-setup-cursor-mcp.ps1 [-SkipGcp]'
    exit 2
}

$renderScript = Join-Path $repoRoot 'scripts\render-mcp-config.ps1'
if (-not (Test-Path -LiteralPath $renderScript)) {
    Write-Host "FAIL: Missing script: $renderScript"
    exit 1
}

Write-Host ""
Write-Host " ============================================"
Write-Host "  EquipQR Cursor MCP Setup"
Write-Host " ============================================"
Write-Host ""

$oldEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    if ($SkipGcp) {
        & $renderScript -SkipGcp
    } else {
        & $renderScript
    }
    $renderExit = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $oldEap
}

if ($renderExit -ne 0) {
    Write-Host "FAIL: MCP setup failed (exit $renderExit)."
    exit $renderExit
}

Write-Host ""
Write-Host "MCP setup complete."
Write-Host "Restart Cursor to load updated MCP servers."
exit 0
