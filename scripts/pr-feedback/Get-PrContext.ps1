#Requires -Version 5.1
<#
.SYNOPSIS
  Preflight for PR feedback: PR metadata, owner/repo slug, optional dirty-tree summary.

.DESCRIPTION
  Wraps `gh pr view`, `gh repo view`, and `git status` / `git diff` for the address-pr-feedback skill.
  Run from the repository root (or any subdirectory); resolves repo root via git.

.PARAMETER PullRequestNumber
  PR number. Omit to use the PR associated with the current branch (`gh pr view`).

.PARAMETER Json
  Emit a single JSON object to stdout (no prose).

.PARAMETER IncludeDiffStat
  When true (default), include `git diff --stat` output unless -NoDiff.

.PARAMETER NoDiff
  Skip diff output entirely.

.EXAMPLE
  .\scripts\pr-feedback\Get-PrContext.ps1
  .\scripts\pr-feedback\Get-PrContext.ps1 -PullRequestNumber 712 -Json
#>
[CmdletBinding()]
param(
    [int]$PullRequestNumber = 0,
    [switch]$Json,
    [bool]$IncludeDiffStat = $true,
    [switch]$NoDiff
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'PrFeedbackCommon.ps1')

Assert-CommandExists 'git'
Assert-CommandExists 'gh'

$prevPwd = Get-Location
try {
    $top = (& git rev-parse --show-toplevel 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Not inside a git repository: $top"
    }
    Set-Location -LiteralPath $top.Trim()

    $prArgs = @('pr', 'view', '--json', 'number,title,url,baseRefName,headRefName,isDraft,state')
    if ($PullRequestNumber -gt 0) {
        $prArgs = @('pr', 'view', $PullRequestNumber, '--json', 'number,title,url,baseRefName,headRefName,isDraft,state')
    }

    $prOut = Invoke-PrFeedbackGhJson $prArgs
    if ($prOut.ExitCode -ne 0) {
        throw "gh $($prArgs -join ' ') failed: $($prOut.Raw)"
    }
    $pr = $prOut.Raw | ConvertFrom-Json

    $slug = Get-GhOwnerRepoSlug
    $parts = Split-OwnerRepo $slug

    $statusLines = (& git status --porcelain 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "git status --porcelain failed: $statusLines"
    }
    $dirtyFiles = @()
    if (-not [string]::IsNullOrWhiteSpace($statusLines)) {
        $dirtyFiles = ($statusLines -split '\r?\n') | Where-Object { $_.Length -gt 0 }
    }

    $diffStatText = $null
    if (-not $NoDiff -and $IncludeDiffStat) {
        $diffStatText = (& git diff --stat 2>&1 | Out-String).TrimEnd()
        if ($LASTEXITCODE -ne 0) {
            throw "git diff --stat failed: $diffStatText"
        }
    }

    $isMainBase = ($pr.baseRefName -eq 'main')

    $result = [ordered]@{
        owner            = $parts.Owner
        repo             = $parts.Repo
        slug             = $slug
        number           = $pr.number
        title            = $pr.title
        url              = $pr.url
        baseRefName      = $pr.baseRefName
        headRefName      = $pr.headRefName
        isDraft          = [bool]$pr.isDraft
        state            = $pr.state
        isDirty          = ($dirtyFiles.Count -gt 0)
        dirtyFileCount   = $dirtyFiles.Count
        dirtyFiles       = $dirtyFiles
        diffStat         = $diffStatText
        releasePrGuard   = [ordered]@{
            targetsMain = ($pr.baseRefName -eq 'main')
            note        = 'If base is main, do not defer compliance/security/RBAC/RLS/service-boundary feedback; resolve or escalate.'
        }
        repoRoot         = $top.Trim()
    }

    if ($Json) {
        $result | ConvertTo-Json -Depth 8 -Compress
    }
    else {
        Write-Host "PR: #$($result.number) $($result.title)"
        Write-Host "URL: $($result.url)"
        Write-Host "Base: $($result.baseRefName)  Head: $($result.headRefName)  Draft: $($result.isDraft)"
        Write-Host "Repo: $($result.slug)"
        Write-Host ("Working tree: {0} dirty file(s)" -f $result.dirtyFileCount)
        if ($isMainBase) {
            Write-Host "RELEASE PR GUARD: base is main - stricter deferral rules apply."
        }
        if ($result.isDirty -and $diffStatText) {
            Write-Host ""
            Write-Host "git diff --stat:"
            Write-Host $diffStatText
        }
    }
}
finally {
    Set-Location -LiteralPath $prevPwd.Path
}

exit 0
