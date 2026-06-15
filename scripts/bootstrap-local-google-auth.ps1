# One-time (or refresh) bootstrap: copy production Supabase Auth Google credentials
# into app-env-local-dev and align Workspace client ID for local Vite env.
param(
    [string]$AppItem = 'app-env-local-dev',
    [string]$EdgeItem = 'edge-env-local-dev'
)

$ErrorActionPreference = 'Stop'

if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
    $env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
}
if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
    throw 'OP_SERVICE_ACCOUNT_TOKEN is required to read production auth config.'
}

$token = (op read 'op://EquipQR Agents/supabase-write/SUPABASE_ACCESS_TOKEN').Trim()
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$prodAuth = Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/ymxkzronkhwxzcdcbnwq/config/auth' -Headers $headers -Method Get

$authClientId = $prodAuth.external_google_client_id.Trim()
$authSecret = $prodAuth.external_google_secret.Trim()
if ($authSecret -notmatch '^GOCSPX-') {
    throw @"
Supabase Management API external_google_secret is not a usable Google OAuth client secret (expected GOCSPX-*).
Copy the secret from GCP Console -> EquipQR Google Login -> Client secrets, then update production Supabase Auth and app-env-local-dev manually.
"@
}
$workspaceClientId = (op read "op://EquipQR Agents/$EdgeItem/GOOGLE_WORKSPACE_CLIENT_ID").Trim()

$mutateScript = Join-Path $PSScriptRoot 'op-item-mutate.ps1'
$assignments = @(
    "SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID[text]=$authClientId"
    "SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET[concealed]=$authSecret"
    "GOOGLE_WORKSPACE_CLIENT_ID[text]=$workspaceClientId"
)

foreach ($assignment in $assignments) {
    & $mutateScript -Action Edit -Item $AppItem -Assignment $assignment
    if ($LASTEXITCODE -ne 0) {
        throw "op-item-mutate failed for assignment on $AppItem"
    }
}

Write-Host "Updated 1Password item '$AppItem' with local Supabase Auth Google + Workspace client ID."
Write-Host "Next: .\scripts\sync-local-supabase-auth-env.ps1 and restart dev stack (dev-start.bat)."
