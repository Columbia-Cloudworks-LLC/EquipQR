#Requires -Version 5.1
<#
.SYNOPSIS
  Run 1Password item create/edit outside Cursor's piped-stdin shell.

.DESCRIPTION
  Cursor agent inline terminals feed stdin to child processes, which breaks
  op item create/edit (hangs or "invalid JSON in piped input"). This script
  spawns a detached powershell.exe child with a closed stdin contract.

  Uses OP_SAT_EquipQR (write) by default. Pass -ReadOnly to use OP_SERVICE_ACCOUNT_TOKEN
  for get/list operations only.

.PARAMETER Action
  Edit | Create | Get

.PARAMETER Item
  Item title or ID (Edit/Get)

.PARAMETER Vault
  Vault name or ID (default: EquipQR Agents vault ID)

.PARAMETER Assignment
  Repeatable assignment string(s). Use -- before assignments with dotted values.
  Example: GOOGLE_WORKSPACE_CLIENT_ID[text]=87469690682-xxx.apps.googleusercontent.com

.PARAMETER TemplatePath
  JSON template path for create/edit (see 1Password CLI docs)

.PARAMETER Category
  Item category for Create (default: Secure Note)

.PARAMETER Title
  Title for Create

.PARAMETER DryRun
  Pass --dry-run to op

.EXAMPLE
  .\scripts\op-item-mutate.ps1 -Action Edit -Item app-env-preview-public `
    -Assignment 'GOOGLE_WORKSPACE_CLIENT_ID[text]=87469690682-xxx.apps.googleusercontent.com' -DryRun
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Edit', 'Create', 'Get')]
    [string]$Action,

    [string]$Item,

    [string]$Vault = 'tgo2m6qbct5otqeqirjocn3joa',

    [string[]]$Assignment = @(),

    [string]$TemplatePath,

    [string]$Category = 'Secure Note',

    [string]$Title,

    [switch]$DryRun,

    [switch]$ReadOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-OpServiceAccountToken {
    param([switch]$Write)
    if ($Write) {
        $token = [Environment]::GetEnvironmentVariable('OP_SAT_EquipQR', 'User')
        if (-not $token) {
            throw 'OP_SAT_EquipQR is not set in User scope. Provision write SAT for EquipQR Agents vault.'
        }
        return $token
    }
    $token = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    if (-not $token) {
        throw 'OP_SERVICE_ACCOUNT_TOKEN is not set in User scope.'
    }
    return $token
}

$token = Get-OpServiceAccountToken -Write:(-not $ReadOnly)

$inner = @"
param(
    [string]`$Token,
    [string]`$Action,
    [string]`$Item,
    [string]`$Vault,
    [string[]]`$Assignment,
    [string]`$TemplatePath = '',
    [string]`$Category = 'Secure Note',
    [string]`$Title = '',
    [switch]`$DryRun
)
`$ErrorActionPreference = 'Stop'
`$env:OP_SERVICE_ACCOUNT_TOKEN = `$Token

`$opArgs = New-Object System.Collections.Generic.List[string]

switch (`$Action) {
    'Edit' {
        if (-not `$Item) { throw 'Edit requires -Item' }
        `$opArgs.Add('item')
        `$opArgs.Add('edit')
        `$opArgs.Add(`$Item)
        `$opArgs.Add('--vault')
        `$opArgs.Add(`$Vault)
        if (`$DryRun) { `$opArgs.Add('--dry-run') }
        if (`$TemplatePath) { `$opArgs.Add("--template=`$TemplatePath") }
        if (`$Assignment.Count -gt 0) {
            `$opArgs.Add('--')
            foreach (`$a in `$Assignment) { `$opArgs.Add(`$a) }
        }
    }
    'Create' {
        `$opArgs.Add('item')
        `$opArgs.Add('create')
        `$opArgs.Add("--category=`$Category")
        if (`$Title) { `$opArgs.Add("--title=`$Title") }
        `$opArgs.Add('--vault')
        `$opArgs.Add(`$Vault)
        if (`$DryRun) { `$opArgs.Add('--dry-run') }
        if (`$TemplatePath) { `$opArgs.Add("--template=`$TemplatePath") }
        elseif (`$Assignment.Count -gt 0) {
            foreach (`$a in `$Assignment) { `$opArgs.Add(`$a) }
        }
    }
    'Get' {
        if (-not `$Item) { throw 'Get requires -Item' }
        `$opArgs.Add('item')
        `$opArgs.Add('get')
        `$opArgs.Add(`$Item)
        `$opArgs.Add('--vault')
        `$opArgs.Add(`$Vault)
    }
}

& op `@opArgs
exit `$LASTEXITCODE
"@

$helperPath = Join-Path $env:TEMP "op-item-mutate-inner.ps1"
Set-Content -Path $helperPath -Value $inner -Encoding utf8

$logPath = Join-Path $env:TEMP "op-item-mutate.log"
$errPath = Join-Path $env:TEMP "op-item-mutate.err"
if (Test-Path $logPath) { Remove-Item $logPath -Force }
if (Test-Path $errPath) { Remove-Item $errPath -Force }

$itemArg = if ($Item) { $Item } else { '' }
$templateArg = if ($TemplatePath) { $TemplatePath } else { '' }
$titleArg = if ($Title) { $Title } else { '' }

$argList = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $helperPath,
    '-Token', $token,
    '-Action', $Action,
    '-Item', $itemArg,
    '-Vault', $Vault
)
if ($Action -eq 'Create') {
    $argList += @('-Category', $Category)
    if ($titleArg) {
        $argList += @('-Title', $titleArg)
    }
}
if ($DryRun) {
    $argList += '-DryRun'
}
if ($templateArg) {
    $argList += @('-TemplatePath', $templateArg)
}
if ($Assignment.Count -gt 0) {
    $argList += '-Assignment'
    foreach ($assignmentLine in $Assignment) {
        $argList += $assignmentLine
    }
}

$p = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Wait -PassThru `
    -RedirectStandardOutput $logPath -RedirectStandardError $errPath -WindowStyle Hidden

Get-Content $logPath -ErrorAction SilentlyContinue | Write-Host
Get-Content $errPath -ErrorAction SilentlyContinue | Write-Host
exit $p.ExitCode
