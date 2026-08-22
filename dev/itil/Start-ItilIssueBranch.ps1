#Requires -Version 5.1
<#
.SYNOPSIS
  Fetch origin/preview and sync a feature branch (create off preview or switch + rebase).

.PARAMETER Type
  Branch prefix compatible with branching rule (feat/fix/chore/docs/refactor).

.PARAMETER Slug
  Slug merged into branch name via kebab normalization when Branch is omitted.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][int]$Issue,

    [Parameter(Mandatory)]
    [ValidateSet('feat', 'fix', 'chore', 'docs', 'refactor')]
    [string]$Type,

    [Parameter(Mandatory)][string]$Slug,

    [string]$Branch = '',

    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'ItIlCommon.ps1')
. (Join-Path $here 'ItIlLogic.ps1')

Assert-CommandExists 'git'

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

$p = Invoke-GitNative @('status', '--porcelain')
if ($p.ExitCode -ne 0) {
    throw "git status --porcelain failed: $($p.Text)"
}
if (-not [string]::IsNullOrWhiteSpace($p.Text)) {
    throw 'Working tree is dirty. Commit or stash before Start-ItilIssueBranch.ps1.'
}

$branchToUse = $Branch
if ([string]::IsNullOrWhiteSpace($branchToUse)) {
    $branchToUse = New-ItilBranchName -Type $Type -IssueNumber $Issue -Slug $Slug
}

$fetch = Invoke-GitNative @('fetch', 'origin', 'preview')
if ($fetch.ExitCode -ne 0) {
    throw "git fetch origin preview failed: $($fetch.Text)"
}

$peek = Invoke-GitNative @('rev-parse', '--verify', 'origin/preview')
if ($peek.ExitCode -ne 0) {
    throw ('origin/preview not found locally after fetch. Verify git remotes. Details: ' + $peek.Text)
}

$existsLocal = Invoke-GitNative @('show-ref', '--verify', '--quiet', ('refs/heads/{0}' -f $branchToUse))
if ($existsLocal.ExitCode -eq 0) {

    $sw = Invoke-GitNative @('switch', $branchToUse)
    if ($sw.ExitCode -ne 0) {
        throw "git switch failed: $($sw.Text)"
    }

    $rb = Invoke-GitNative @('rebase', 'origin/preview')
    if ($rb.ExitCode -ne 0) {
        throw "git rebase origin/preview failed: $($rb.Text)"
    }
}

else {

    $cr = Invoke-GitNative @('switch', '-c', $branchToUse, 'origin/preview')
    if ($cr.ExitCode -ne 0) {
        throw "git switch -c failed: $($cr.Text)"
    }
}

if ($Json) {
    [ordered]@{
        branch   = $branchToUse
        base     = 'origin/preview'
        repoRoot = $repoRoot
        action   = 'synced-from-preview'
    } | ConvertTo-Json -Compress
}
else {

    Write-Host ('Branch: {0}' -f $branchToUse)
    Write-Host ('Base: origin/preview')
    Write-Host ('RepoRoot: {0}' -f $repoRoot)
}

exit 0
