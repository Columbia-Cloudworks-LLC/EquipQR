#Requires -Version 5.1
<#
.SYNOPSIS
  Render the MCP server configuration for Cursor by injecting 1Password
  references from scripts/mcp.template.json into ~/.cursor/mcp.json.

.DESCRIPTION
  Reads scripts/mcp.template.json (committed, contains op:// references),
  resolves each op:// URI against the EquipQR Agents 1Password vault using
  'op inject', and writes the rendered result to %USERPROFILE%\.cursor\mcp.json.

  Also writes the GCP service-account JSON from the gcp-viewer 1Password item
  to %USERPROFILE%\.config\gcloud\equipqr-agent-viewer.json so the gcloud MCP
  can locate it via GOOGLE_APPLICATION_CREDENTIALS.

  Idempotent. Safe to run on every dev-start. Requires that you are signed in
  to 1Password (op signin) or that OP_SERVICE_ACCOUNT_TOKEN is set.

.PARAMETER WhatIf
  Show what would be written without modifying any files.

.PARAMETER SkipGcp
  Skip writing the GCP SA JSON (use when gcp-viewer item does not yet exist
  in 1Password, e.g. before Phase 1.5 is complete).

.EXAMPLE
  .\scripts\render-mcp-config.ps1
  .\scripts\render-mcp-config.ps1 -SkipGcp
  .\scripts\render-mcp-config.ps1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$SkipGcp
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $repoRoot 'scripts\mcp.template.json'
$cursorDir = Join-Path $env:USERPROFILE '.cursor'
$mcpJsonPath = Join-Path $cursorDir 'mcp.json'
$gcpKeyDir = Join-Path $env:USERPROFILE '.config\gcloud'
$gcpKeyPath = Join-Path $gcpKeyDir 'equipqr-agent-viewer.json'

function Write-Step { param([string]$Msg) Write-Host "  [render-mcp] $Msg" }
function Write-Ok { param([string]$Msg) Write-Host "  [render-mcp] OK   $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  [render-mcp] WARN $Msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "  [render-mcp] FAIL $Msg" -ForegroundColor Red }

Write-Step "Validating prerequisites..."

if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
    Write-Fail "1Password CLI 'op' not found on PATH. Install from https://developer.1password.com/docs/cli/get-started"
    exit 1
}

if (-not (Test-Path -LiteralPath $templatePath)) {
    Write-Fail "Template not found: $templatePath"
    exit 1
}

$opAccountOk = $false
$opAccountProbe = & op account list 2>&1
if ($LASTEXITCODE -eq 0 -and $opAccountProbe) {
    $opAccountOk = $true
}

$opServiceAccountOk = -not [string]::IsNullOrEmpty($env:OP_SERVICE_ACCOUNT_TOKEN)

if (-not $opAccountOk -and -not $opServiceAccountOk) {
    Write-Fail "Not authenticated to 1Password. Run 'op signin' or set OP_SERVICE_ACCOUNT_TOKEN."
    exit 1
}

if ($opServiceAccountOk) {
    Write-Ok "Auth: OP_SERVICE_ACCOUNT_TOKEN (headless mode)"
} else {
    Write-Ok "Auth: op signin (interactive mode)"
}

if (-not (Test-Path -LiteralPath $cursorDir)) {
    if ($PSCmdlet.ShouldProcess($cursorDir, 'Create Cursor config directory')) {
        New-Item -ItemType Directory -Path $cursorDir -Force | Out-Null
    }
}

Write-Step "Rendering $templatePath -> $mcpJsonPath..."

$injectExitCode = 0
if ($PSCmdlet.ShouldProcess($mcpJsonPath, 'Render via op inject')) {
    & op inject --in-file $templatePath --out-file $mcpJsonPath --force
    $injectExitCode = $LASTEXITCODE
} else {
    Write-Warn "WhatIf: would render $mcpJsonPath via 'op inject'"
}

if ($injectExitCode -ne 0) {
    Write-Fail "op inject failed (exit $injectExitCode). Likely cause: an op:// reference in the template points to an item or field that does not exist in the EquipQR Agents vault. Verify Phase 1 has minted all credentials."
    exit $injectExitCode
}

$rendered = Get-Content -LiteralPath $mcpJsonPath -Raw
try {
    $null = $rendered | ConvertFrom-Json
    Write-Ok "Rendered mcp.json is valid JSON ($($rendered.Length) bytes)"
} catch {
    Write-Fail "Rendered mcp.json is not valid JSON: $_"
    exit 1
}

if ($rendered -match 'op://') {
    Write-Warn "Rendered mcp.json still contains 'op://' references - some secrets did not resolve"
}

if (-not $SkipGcp) {
    Write-Step "Writing GCP SA JSON to $gcpKeyPath..."

    if (-not (Test-Path -LiteralPath $gcpKeyDir)) {
        if ($PSCmdlet.ShouldProcess($gcpKeyDir, 'Create gcloud config directory')) {
            New-Item -ItemType Directory -Path $gcpKeyDir -Force | Out-Null
        }
    }

    $gcpProbe = & op item get 'gcp-viewer' --vault 'tgo2m6qbct5otqeqirjocn3joa' --fields credential --format json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "gcp-viewer item not found in EquipQR Agents vault. Skipping GCP SA write."
        Write-Warn "  Re-run after Phase 1.5 mints the GCP service account JSON, or pass -SkipGcp to suppress this warning."
    } else {
            if ($PSCmdlet.ShouldProcess($gcpKeyPath, 'Write GCP SA JSON')) {
            $gcpJson = & op read 'op://tgo2m6qbct5otqeqirjocn3joa/gcp-viewer/credential'
            if ($LASTEXITCODE -ne 0) {
                Write-Fail "op read failed for gcp-viewer credential field (exit $LASTEXITCODE)"
                exit 1
            }
            $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
            [System.IO.File]::WriteAllText($gcpKeyPath, $gcpJson, $utf8NoBom)

            $saEmail = $null
            try {
                $parsed = $gcpJson | ConvertFrom-Json
                $saEmail = $parsed.client_email
                Write-Ok "GCP SA JSON written and validated as JSON ($saEmail)"
            } catch {
                Write-Fail "GCP SA JSON is not valid JSON. The gcp-viewer/credential field probably contains a literal pasting artifact - re-paste the JSON directly into the field."
                exit 1
            }

            if (Get-Command gcloud -ErrorAction SilentlyContinue) {
                Write-Step "Activating SA in gcloud config: $saEmail"
                $null = & gcloud auth activate-service-account --key-file=$gcpKeyPath --quiet 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $null = & gcloud config set account $saEmail --quiet 2>&1
                    $null = & gcloud config set project equipqr-prod --quiet 2>&1
                    Write-Ok "gcloud active account: $saEmail (project: equipqr-prod)"
                    Write-Ok "  To switch back to your user account: gcloud config set account nicholas.king@columbiacloudworks.com"
                } else {
                    Write-Warn "gcloud activate-service-account failed (exit $LASTEXITCODE). MCP gcloud tool may not work until manually activated."
                }
            } else {
                Write-Warn "gcloud CLI not on PATH - skipping SA activation. MCP gcloud tool requires gcloud installed."
            }
        }
    }
}

Write-Host ""
Write-Ok "MCP config rendered. Restart Cursor to pick up changes."
Write-Host "  Path: $mcpJsonPath"
exit 0
