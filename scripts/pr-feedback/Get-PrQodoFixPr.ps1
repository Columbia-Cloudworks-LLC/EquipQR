#Requires -Version 5.1
<#
.SYNOPSIS
  Discover Qodo Fixer auto-fix PRs linked from a feature PR (cherry-pick workflow).

.DESCRIPTION
  Mines the latest "Qodo Fixer" issue comment on a PR for the closed fix PR link
  (title pattern: "Fix: [for cherry-picking] ...", author app/qodo-code-review).
  Use before hand-implementing Qodo findings — review the fix PR diff, cherry-pick or
  merge selective commits into the feature branch so Qodo can track applied fixes.

.PARAMETER PullRequestNumber
  PR number. If 0, resolves from the current branch.

.PARAMETER Json
  Emit structured JSON for agent triage.

.EXAMPLE
  .\scripts\pr-feedback\Get-PrQodoFixPr.ps1 -PullRequestNumber 1229 -Json
#>
[CmdletBinding()]
param(
    [int]$PullRequestNumber = 0,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'PrFeedbackCommon.ps1')
. (Join-Path $here 'PrFeedbackLogic.ps1')

Assert-CommandExists 'gh'

function Resolve-PullRequestNumber {
    param([int]$Candidate)
    if ($Candidate -gt 0) { return $Candidate }
    $r = Invoke-PrFeedbackGhJson @('pr', 'view', '--json', 'number')
    if ($r.ExitCode -ne 0) {
        throw "Could not resolve PR for current branch. Specify -PullRequestNumber. Details: $($r.Raw)"
    }
    $j = $r.Raw | ConvertFrom-Json
    return [int]$j.number
}

$prNumber = Resolve-PullRequestNumber -Candidate $PullRequestNumber
$slug = Get-GhOwnerRepoSlug
$parts = Split-OwnerRepo $slug

$prMeta = Invoke-PrFeedbackGhJson @(
    'pr', 'view', $prNumber,
    '--json', 'headRefName,headRefOid'
)
if ($prMeta.ExitCode -ne 0) {
    throw "gh pr view failed: $($prMeta.Raw)"
}
$pr = $prMeta.Raw | ConvertFrom-Json

$commentsOut = Invoke-PrFeedbackGhJson @(
    'api', "repos/$($parts.Owner)/$($parts.Repo)/issues/$prNumber/comments",
    '--paginate'
)
if ($commentsOut.ExitCode -ne 0) {
    throw "gh api issue comments failed: $($commentsOut.Raw)"
}
$allComments = $commentsOut.Raw | ConvertFrom-Json
if ($allComments -isnot [array]) {
    $allComments = @($allComments)
}

$fixerComments = @($allComments | Where-Object {
        $_.user.login -match 'qodo-code-review|qodo-merge' -and
        (Get-QodoCommentKind -Body $_.body) -eq 'fixer'
    } | Sort-Object { [datetime]$_.updated_at })

$latestFixer = $fixerComments | Select-Object -Last 1
$parsed = $null
$parseError = $null

if ($latestFixer) {
    try {
        $parsed = Parse-QodoFixerCommentBody -Body $latestFixer.body
    }
    catch {
        $parseError = $_.Exception.Message
    }
}

$fixPrMeta = $null
if ($parsed -and $parsed.fixPrNumber) {
    $fixView = Invoke-PrFeedbackGhJson @(
        'pr', 'view', $parsed.fixPrNumber,
        '--json', 'number,title,state,url,headRefName,baseRefName,author,closedAt,mergedAt'
    )
    if ($fixView.ExitCode -eq 0) {
        $fix = $fixView.Raw | ConvertFrom-Json
        $fixPrMeta = [ordered]@{
            number       = $fix.number
            title        = $fix.title
            state        = $fix.state
            url          = $fix.url
            headRefName  = $fix.headRefName
            baseRefName  = $fix.baseRefName
            author       = $fix.author.login
            closedAt     = $fix.closedAt
            mergedAt     = $fix.mergedAt
            isCherryPick = ($fix.title -match '\[for cherry-picking\]')
        }
    }
}

$summary = [ordered]@{
    slug              = $slug
    pullRequestNumber = $prNumber
    headRefName       = $pr.headRefName
    headSha           = $pr.headRefOid
    hasFixerComment   = ($null -ne $latestFixer)
    fixerCommentId    = if ($latestFixer) { [string]$latestFixer.id } else { $null }
    fixerCommentUrl   = if ($latestFixer) { $latestFixer.html_url } else { $null }
    mergedCount       = if ($parsed) { $parsed.mergedCount } else { 0 }
    fixedCount        = if ($parsed) { $parsed.fixedCount } else { 0 }
    pendingCount      = if ($parsed) { $parsed.pendingCount } else { 0 }
    fixPrNumber       = if ($parsed) { $parsed.fixPrNumber } else { $null }
    fixPrUrl          = if ($parsed) { $parsed.fixPrUrl } else { $null }
    fixedItems        = if ($parsed) { @($parsed.fixedItems) } else { @() }
    needsAction       = if ($parsed) { $parsed.needsAction } else { $false }
    fixPr             = $fixPrMeta
    parseOk           = [string]::IsNullOrEmpty($parseError)
    parseError        = $parseError
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 20 -Compress
}
else {
    Write-Host "Repo: $slug  PR: $prNumber  head: $($pr.headRefName)"
    if (-not $latestFixer) {
        Write-Host 'Qodo Fixer: none — no closed auto-fix PR linked on this PR.'
    }
    else {
        Write-Host "Qodo Fixer: $($summary.fixerCommentUrl)"
        Write-Host "  Merged=$($summary.mergedCount) Fixed=$($summary.fixedCount) Pending=$($summary.pendingCount)"
        if ($summary.fixPrNumber) {
            Write-Host "  Fix PR: #$($summary.fixPrNumber) $($summary.fixPrUrl)"
            if ($fixPrMeta) {
                Write-Host "  Fix branch: $($fixPrMeta.headRefName) (state=$($fixPrMeta.state))"
            }
        }
        if ($summary.needsAction) {
            Write-Host '  Action: review fix PR diff and cherry-pick/merge selective fixes into this branch.'
        }
    }
    if ($parseError) { Write-Host "Note: $parseError" }
}

if ($parseError) { exit 1 }
exit 0
