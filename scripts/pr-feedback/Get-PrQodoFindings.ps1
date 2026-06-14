#Requires -Version 5.1
<#
.SYNOPSIS
  Fetch and parse Qodo Code Review findings from the persistent PR comment (address-pr-feedback Step 2c).

.PARAMETER PullRequestNumber
  PR number. If 0, resolves from the current branch.

.PARAMETER Json
  Emit structured JSON for agent triage.

.EXAMPLE
  .\scripts\pr-feedback\Get-PrQodoFindings.ps1 -Json
  .\scripts\pr-feedback\Get-PrQodoFindings.ps1 -PullRequestNumber 1037 -Json
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
    '--json', 'headRefOid,commits'
)
if ($prMeta.ExitCode -ne 0) {
    throw "gh pr view failed: $($prMeta.Raw)"
}
$pr = $prMeta.Raw | ConvertFrom-Json
$headSha = $pr.headRefOid

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

$qodoComments = @($allComments | Where-Object {
        $_.user.login -match 'qodo-code-review|qodo-merge'
    } | Sort-Object { [datetime]$_.updated_at })

$reviewComment = $qodoComments | Where-Object { (Get-QodoCommentKind -Body $_.body) -eq 'review' } | Select-Object -Last 1
$statusComments = @($qodoComments | Where-Object {
        $kind = Get-QodoCommentKind -Body $_.body
        $kind -in @('status', 'statusComplete', 'statusInProgress')
    })
$latestStatus = $statusComments | Select-Object -Last 1

$statusKind = $null
$reviewInProgress = $false
$statusMessage = $null
$parentCommentUrl = $null
$parentCommentId = $null

if ($latestStatus) {
    $statusKind = Get-QodoCommentKind -Body $latestStatus.body
    $statusMessage = ($latestStatus.body -replace '\s+', ' ').Trim()
    if ($statusKind -eq 'statusInProgress') {
        $reviewInProgress = $true
    }
    elseif ($statusKind -eq 'statusComplete') {
        if ($statusMessage -notmatch [regex]::Escape($headSha)) {
            $reviewInProgress = $true
        }
    }
    if ($latestStatus.body -match 'pull/\d+#issuecomment-(\d+)') {
        $parentCommentId = $Matches[1]
        $parentCommentUrl = "https://github.com/$slug/pull/$prNumber#issuecomment-$parentCommentId"
    }
}

$openFindings = @()
$resolvedFindings = @()
$parseError = $null

if ($reviewComment) {
    $parentCommentId = [string]$reviewComment.id
    $parentCommentUrl = "https://github.com/$slug/pull/$prNumber#issuecomment-$($reviewComment.id)"
    try {
        $parsed = Parse-QodoFindingsFromReviewBody -Body $reviewComment.body
        $openFindings = @($parsed.openFindings)
        $resolvedFindings = @($parsed.resolvedFindings)
    }
    catch {
        $parseError = $_.Exception.Message
    }
}
elseif (-not $reviewInProgress) {
    $parseError = 'No Qodo Code Review comment found on this PR.'
}

$summary = [ordered]@{
    slug               = $slug
    pullRequestNumber  = $prNumber
    headSha            = $headSha
    reviewInProgress   = $reviewInProgress
    statusKind         = $statusKind
    statusMessage      = $statusMessage
    parentCommentId    = $parentCommentId
    parentCommentUrl   = $parentCommentUrl
    openFindings       = $openFindings
    resolvedFindings   = $resolvedFindings
    openCount          = $openFindings.Count
    resolvedCount      = $resolvedFindings.Count
    openByBucket       = [ordered]@{
        actionRequired     = @($openFindings | Where-Object { $_.bucket -eq 'actionRequired' }).Count
        reviewRecommended  = @($openFindings | Where-Object { $_.bucket -eq 'reviewRecommended' }).Count
        optional           = @($openFindings | Where-Object { $_.bucket -eq 'optional' }).Count
    }
    parseError         = $parseError
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 20 -Compress
}
else {
    Write-Host "Repo: $slug  PR: $prNumber  head: $($headSha.Substring(0, 7))"
    if ($reviewInProgress) {
        Write-Host "Qodo review: IN PROGRESS — wait before triaging findings."
        if ($statusMessage) { Write-Host "  Status: $statusMessage" }
    }
    elseif ($parentCommentUrl) {
        Write-Host "Qodo parent comment: $parentCommentUrl"
    }
    Write-Host "Open findings: $($summary.openCount) (action=$($summary.openByBucket.actionRequired), recommended=$($summary.openByBucket.reviewRecommended), optional=$($summary.openByBucket.optional))"
    Write-Host "Resolved (struck through): $($summary.resolvedCount)"
    if ($parseError) { Write-Host "Note: $parseError" }
}

exit 0
