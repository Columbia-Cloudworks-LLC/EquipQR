#Requires -Version 5.1
<#
.SYNOPSIS
  Push HEAD branch and create a preview-base PR (`gh pr create --base preview`).

.PARAMETER Branch
  Local branch expected to match the remote branch name supplied to --head.

.PARAMETER Issue
  Carried forward for tooling JSON only (PR body still must reference the issue in BodyFile).

.PARAMETER Title
  Conventional-commit style title recommended for gh pr create.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][int]$Issue,

    [Parameter(Mandatory)][string]$Branch,

    [Parameter(Mandatory)][string]$Title,

    [Parameter(Mandatory)][string]$BodyFile,

    [switch]$DryRun,

    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'ItIlCommon.ps1')

Assert-CommandExists 'git'
Assert-CommandExists 'gh'

if (-not (Test-Path -LiteralPath $BodyFile)) {

    throw "BodyFile not found: $BodyFile"
}

function Invoke-GitNative {
    param([Parameter(Mandatory)][string[]]$GitArguments)

    $prevEap = $ErrorActionPreference
    $prevNative = $null
    if (Get-Variable -Name 'PSNativeCommandUseErrorActionPreference' -ErrorAction SilentlyContinue) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }

    $ErrorActionPreference = 'Continue'
    try {

        $out = (& git @GitArguments 2>&1 | Out-String).TrimEnd()
        return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Text = $out }
    }
    finally {
        $ErrorActionPreference = $prevEap

        if ($null -ne $prevNative) {
            $PSNativeCommandUseErrorActionPreference = $prevNative

        }

    }

}

$repoRoot = Get-ItilRepoRootFromGit

Set-Location -LiteralPath $repoRoot

$slug = Get-ItilGhOwnerRepoSlug

$cur = Invoke-GitNative @('rev-parse', '--abbrev-ref', 'HEAD')

if ($cur.ExitCode -ne 0) {

    throw "git rev-parse --abbrev-ref HEAD failed: $($cur.Text)"

}

$currentBranch = [string]$cur.Text.Trim()

if ($currentBranch -ne $Branch) {

    throw "HEAD is '$currentBranch' but -Branch expects '$Branch'. Switch branches before New-ItilPreviewPr.ps1."

}

if (-not $DryRun) {

    $pushTry = Invoke-GitNative @('push', '-u', 'origin', $Branch)

    if ($pushTry.ExitCode -ne 0) {

        $pushPlain = Invoke-GitNative @('push', 'origin', $Branch)

        if ($pushPlain.ExitCode -ne 0) {

            throw "git push failed: $($pushTry.Text)`nFallback push failed: $($pushPlain.Text)"
        }

    }

}

$prUrl = ''

if ($DryRun) {

    Write-Warning 'DryRun enabled: skipping push and gh pr create.'

}

else {

    $prCmd = Invoke-ItilGhJson @('pr', 'create', '--repo', $slug, '--base', 'preview', '--head', $Branch, '--title', $Title, '--body-file', $BodyFile)

    if ($prCmd.ExitCode -ne 0) {

        throw "gh pr create failed: $($prCmd.Raw)"

    }

    $prUrl = $prCmd.Raw.Trim()

}

$result = [ordered]@{

    slug   = $slug

    branch = $Branch

    issue  = $Issue

    title  = $Title

    prUrl  = $prUrl

    base   = 'preview'

    dryRun = [bool]$DryRun

}

if ($Json) {

    $result | ConvertTo-Json -Depth 6 -Compress

}

else {

    Write-Host ('PR URL: {0}' -f $prUrl)

    Write-Host ('Branch: {0}' -f $Branch)

}

exit 0
