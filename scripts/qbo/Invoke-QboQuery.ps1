#Requires -Version 5.1
<#
.SYNOPSIS
  Run a QuickBooks Online query against the local connected company using DB-stored OAuth tokens.

.DESCRIPTION
  Reads quickbooks_credentials from local Supabase (service role), refreshes the access token
  when needed, and calls the production QBO Data API. Tokens are never printed.

.EXAMPLE
  .\scripts\qbo\Invoke-QboQuery.ps1

.EXAMPLE
  .\scripts\qbo\Invoke-QboQuery.ps1 -Query "select Id, DisplayName from Customer maxresults 10"

.EXAMPLE
  .\scripts\qbo\Invoke-QboQuery.ps1 -StatusOnly
#>
[CmdletBinding()]
param(
    [string]$OrganizationId = $env:E2E_QB_ORG_ID,
    [string]$Query = 'select Id, DisplayName from Customer maxresults 5',
    [switch]$StatusOnly
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'QboLocalEnv.ps1')

$envConfig = Get-QboLocalEnv
$credential = Get-QboLocalCredential -Env $envConfig -OrganizationId $OrganizationId

Write-Host "organization_id=$($credential.organization_id)"
Write-Host "realm_id=$($credential.realm_id)"
Write-Host "qbo_api_base=$($envConfig.QboApiBase)"
Write-Host "access_token_expires_at=$($credential.access_token_expires_at)"
Write-Host "refresh_token_expires_at=$($credential.refresh_token_expires_at)"

if ($StatusOnly) {
    exit 0
}

$token = Get-QboFreshAccessToken -Env $envConfig -Credential $credential
if ($token.Refreshed) {
    Write-Host 'access_token_refreshed=true'
}

$encodedQuery = [uri]::EscapeDataString($Query)
$qboUri = "$($envConfig.QboApiBase)/v3/company/$($credential.realm_id)/query?query=$encodedQuery&minorversion=$($envConfig.QboMinorVersion)"

$qboHeaders = @{
    Authorization = "Bearer $($token.AccessToken)"
    Accept        = 'application/json'
}

$response = Invoke-WebRequest -Uri $qboUri -Headers $qboHeaders -Method Get -UseBasicParsing
$intuitTid = $response.Headers['intuit_tid']
if ($intuitTid) {
    Write-Host "intuit_tid=$intuitTid"
}

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 12
