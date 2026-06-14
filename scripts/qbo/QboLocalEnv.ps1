#Requires -Version 5.1
<#
.SYNOPSIS
  Load local Supabase and Intuit env vars for QuickBooks CLI helpers.

.DESCRIPTION
  Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from repo .env and
  INTUIT_CLIENT_ID / INTUIT_CLIENT_SECRET from supabase/functions/.env.
  Does not print secret values.
#>
function Read-DotEnvFile {
    param([string]$FilePath)

    $result = @{}
    if (-not (Test-Path $FilePath)) {
        return $result
    }

    foreach ($line in Get-Content $FilePath -Encoding utf8) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$') {
            $key = $matches[1]
            $value = $matches[2].Trim()
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $result[$key] = $value
        }
    }

    return $result
}

function Get-QboLocalEnv {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

    $appEnv = Read-DotEnvFile (Join-Path $repoRoot '.env')
    $edgeEnv = Read-DotEnvFile (Join-Path $repoRoot 'supabase/functions/.env')

    $supabaseUrl = $appEnv['VITE_SUPABASE_URL']
    if (-not $supabaseUrl) {
        $supabaseUrl = 'http://127.0.0.1:54321'
    }

    $serviceRoleKey = $appEnv['SUPABASE_SERVICE_ROLE_KEY']
    if (-not $serviceRoleKey) {
        throw 'SUPABASE_SERVICE_ROLE_KEY missing from .env. Run .\dev-start.bat or .\scripts\sync-1password-dev-envs.ps1'
    }

    $clientId = $edgeEnv['INTUIT_CLIENT_ID']
    if (-not $clientId) {
        $clientId = $appEnv['INTUIT_CLIENT_ID']
    }
    if (-not $clientId) {
        $clientId = $appEnv['VITE_INTUIT_CLIENT_ID']
    }

    $clientSecret = $edgeEnv['INTUIT_CLIENT_SECRET']
    if (-not $clientSecret) {
        throw 'INTUIT_CLIENT_SECRET missing from supabase/functions/.env. Run .\scripts\sync-local-supabase-env.ps1'
    }
    if (-not $clientId) {
        throw 'INTUIT_CLIENT_ID missing from edge or app env. Run sync scripts.'
    }

    $qboApiBase = $edgeEnv['QBO_API_BASE']
    if (-not $qboApiBase) {
        $useSandbox = $edgeEnv['QBO_USE_SANDBOX']
        if ($useSandbox -eq 'true' -or $env:QBO_USE_SANDBOX -eq 'true') {
            $qboApiBase = 'https://sandbox-quickbooks.api.intuit.com'
        } elseif ($env:QBO_API_BASE) {
            $qboApiBase = $env:QBO_API_BASE
        } elseif ($SupabaseUrl -match 'localhost|127\.0\.0\.1') {
            $qboApiBase = 'https://sandbox-quickbooks.api.intuit.com'
        } else {
            $qboApiBase = 'https://quickbooks.api.intuit.com'
        }
    }

    return [PSCustomObject]@{
        RepoRoot        = $repoRoot
        SupabaseUrl     = $supabaseUrl.TrimEnd('/')
        ServiceRoleKey  = $serviceRoleKey
        IntuitClientId  = $clientId
        IntuitClientSecret = $clientSecret
        QboApiBase      = $qboApiBase
        QboTokenUrl     = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
        QboMinorVersion = 70
    }
}

function Get-QboLocalCredential {
    param(
        [Parameter(Mandatory = $true)][pscustomobject]$Env,
        [string]$OrganizationId
    )

    $headers = @{
        apikey        = $Env.ServiceRoleKey
        Authorization = "Bearer $($Env.ServiceRoleKey)"
    }

    $query = 'select=id,organization_id,realm_id,access_token,refresh_token,access_token_expires_at,refresh_token_expires_at'
    $uri = if ($OrganizationId) {
        "$($Env.SupabaseUrl)/rest/v1/quickbooks_credentials?organization_id=eq.$OrganizationId&$query"
    } else {
        "$($Env.SupabaseUrl)/rest/v1/quickbooks_credentials?$query&limit=1"
    }

    $rows = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    if (-not $rows -or $rows.Count -eq 0) {
        throw 'No quickbooks_credentials row found. Run npm run e2e:quickbooks-auth:capture and connect on Integrations.'
    }

    return $rows[0]
}

function Update-QboAccessToken {
    param(
        [Parameter(Mandatory = $true)][pscustomobject]$Env,
        [Parameter(Mandatory = $true)][string]$CredentialId,
        [Parameter(Mandatory = $true)][string]$AccessToken,
        [Parameter(Mandatory = $true)][string]$RefreshToken,
        [Parameter(Mandatory = $true)][datetime]$AccessExpiresAt,
        [Parameter(Mandatory = $true)][datetime]$RefreshExpiresAt
    )

    $headers = @{
        apikey        = $Env.ServiceRoleKey
        Authorization = "Bearer $($Env.ServiceRoleKey)"
        'Content-Type' = 'application/json'
        Prefer        = 'return=minimal'
    }

    $body = @{
        access_token             = $AccessToken
        refresh_token            = $RefreshToken
        access_token_expires_at  = $AccessExpiresAt.ToUniversalTime().ToString('o')
        refresh_token_expires_at = $RefreshExpiresAt.ToUniversalTime().ToString('o')
        updated_at               = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json

    $uri = "$($Env.SupabaseUrl)/rest/v1/quickbooks_credentials?id=eq.$CredentialId"
    Invoke-RestMethod -Uri $uri -Headers $headers -Method Patch -Body $body | Out-Null
}

function Get-QboFreshAccessToken {
    param(
        [Parameter(Mandatory = $true)][pscustomobject]$Env,
        [Parameter(Mandatory = $true)][pscustomobject]$Credential
    )

    $accessExpires = [datetime]::Parse($Credential.access_token_expires_at).ToUniversalTime()
    $refreshExpires = [datetime]::Parse($Credential.refresh_token_expires_at).ToUniversalTime()
    $now = [datetime]::UtcNow

    if ($refreshExpires -le $now) {
        throw 'QuickBooks refresh token expired. Re-run npm run e2e:quickbooks-auth:capture.'
    }

    if ($accessExpires -gt $now.AddMinutes(5)) {
        return [PSCustomObject]@{
            AccessToken = [string]$Credential.access_token
            Refreshed   = $false
        }
    }

    $basic = [Convert]::ToBase64String(
        [Text.Encoding]::ASCII.GetBytes("$($Env.IntuitClientId):$($Env.IntuitClientSecret)")
    )
    $tokenHeaders = @{
        Authorization = "Basic $basic"
        Accept        = 'application/json'
        'Content-Type' = 'application/x-www-form-urlencoded'
    }
    $tokenBody = "grant_type=refresh_token&refresh_token=$([uri]::EscapeDataString($Credential.refresh_token))"

    $tokenResponse = Invoke-RestMethod -Uri $Env.QboTokenUrl -Method Post -Headers $tokenHeaders -Body $tokenBody
    $newAccessExpires = $now.AddSeconds([int]$tokenResponse.expires_in)
    $newRefreshExpires = $now.AddSeconds([int]$tokenResponse.x_refresh_token_expires_in)

    Update-QboAccessToken -Env $Env `
        -CredentialId $Credential.id `
        -AccessToken $tokenResponse.access_token `
        -RefreshToken $tokenResponse.refresh_token `
        -AccessExpiresAt $newAccessExpires `
        -RefreshExpiresAt $newRefreshExpires

    return [PSCustomObject]@{
        AccessToken = [string]$tokenResponse.access_token
        Refreshed   = $true
    }
}
