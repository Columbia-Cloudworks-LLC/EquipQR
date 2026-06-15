param(
    [int]$ApiPort = 54321
)

$ErrorActionPreference = "Stop"

function Import-DotEnvFile {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    foreach ($line in [System.IO.File]::ReadLines($Path)) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
    return $true
}

function Read-OpField {
    param([string]$Item, [string]$Field)
    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
        $env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    }
    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) { return $null }
    try {
        return (op read "op://EquipQR Agents/$Item/$Field").Trim()
    } catch {
        return $null
    }
}

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$targetPath = Join-Path $workspaceRoot "supabase\.env"
$appItem = if ($env:EQUIPQR_OP_APP_ITEM) { $env:EQUIPQR_OP_APP_ITEM } else { 'app-env-local-dev' }

$clientId = Read-OpField -Item $appItem -Field 'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID'
$secret = Read-OpField -Item $appItem -Field 'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET'

if (-not $clientId -or -not $secret) {
    Write-Host "       WARNING: Missing SUPABASE_AUTH_EXTERNAL_GOOGLE_* in 1Password item '$appItem'."
    Write-Host "       Run scripts\bootstrap-local-google-auth.ps1 once, or add fields manually."
    exit 1
}

$lines = @(
    "# EquipQR local Supabase Auth (Google sign-in) - synced from 1Password item $appItem"
    "# Required by supabase/config.toml [auth.external.google] via env() bindings."
    "SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=$clientId"
    "SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=$secret"
)

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText(
    $targetPath,
    (($lines -join [Environment]::NewLine) + [Environment]::NewLine),
    $utf8NoBom
)

Import-DotEnvFile -Path $targetPath | Out-Null
Write-Host "       Synced Supabase Auth Google env into supabase\.env (port $ApiPort callback)."
exit 0
