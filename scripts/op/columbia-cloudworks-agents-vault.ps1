#Requires -Version 5.1
<#
.SYNOPSIS
  Constants for the Columbia Cloudworks Agents 1Password vault.

.DESCRIPTION
  Human Google sign-in for admin.google.com and console.cloud.google.com lives here
  (item IDs required because titles contain parentheses).

  EquipQR product E2E automation still uses EquipQR Agents item google-login.
#>

$script:ColumbiaCloudworksAgentsVaultId = 'mrviyowmjwrxv7syobdlhnmawa'
$script:ColumbiaCloudworksAgentsVaultName = 'Columbia Cloudworks Agents'

# op:// paths must use item IDs when titles contain ( ) characters.
$script:GoogleBusinessItemId = 'ukvy6bzwb2ikq5cfeambgcq5u4'   # Google (Business)
$script:GoogleTestUserItemId = 'hlp7llqbvfm7mmic2z2e43ftem'   # Google (Test User)

function Get-ColumbiaCloudworksOpUri {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ItemId,

        [Parameter(Mandatory = $true)]
        [string]$Field
    )

    return "op://$($script:ColumbiaCloudworksAgentsVaultId)/$ItemId/$Field"
}

function Read-ColumbiaCloudworksOpField {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ItemId,

        [Parameter(Mandatory = $true)]
        [string]$Field
    )

    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
        $env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    }
    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
        throw 'OP_SERVICE_ACCOUNT_TOKEN is required.'
    }

    return (op read (Get-ColumbiaCloudworksOpUri -ItemId $ItemId -Field $Field)).Trim()
}
