#Requires -Version 5.1
<#
.SYNOPSIS
  Fetch top-level PR reviews (review bodies / states) via GraphQL (address-pr-feedback Step 2b).

.PARAMETER PullRequestNumber
  PR number. If 0, resolves from the current branch.

.PARAMETER Json
  Emit JSON array of reviews plus summary.

.EXAMPLE
  .\scripts\pr-feedback\Get-PrReviewBodies.ps1 -Json
#>
[CmdletBinding()]
param(
    [int]$PullRequestNumber = 0,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'PrFeedbackCommon.ps1')

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

$q = 'query($owner:String!,$repo:String!,$pr:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviews(first:50){nodes{databaseId author{login} body state submittedAt}}}}}'

$out = Invoke-PrFeedbackGhJson @(
    'api', 'graphql',
    '-f', "query=$q",
    '-f', "owner=$($parts.Owner)",
    '-f', "repo=$($parts.Repo)",
    '-F', "pr=$prNumber"
)
if ($out.ExitCode -ne 0) {
    throw "gh api graphql (reviews) failed: $($out.Raw)"
}
$json = $out.Raw | ConvertFrom-Json
if ($json.errors) {
    throw "GraphQL errors: $($json.errors | ConvertTo-Json -Compress)"
}

$reviews = @()
$nodes = $json.data.repository.pullRequest.reviews.nodes
if ($nodes) {
    foreach ($n in $nodes) {
        if ($null -ne $n) {
            $reviews += $n
        }
    }
}

$interesting = @($reviews | Where-Object {
        $_.state -eq 'CHANGES_REQUESTED' -or (-not [string]::IsNullOrWhiteSpace($_.body))
    })

$summary = [ordered]@{
    slug              = $slug
    pullRequestNumber = $prNumber
    reviewCount       = $reviews.Count
    actionableReviewCount = $interesting.Count
    reviews           = @($reviews)
    actionableReviews = @($interesting)
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 20 -Compress
}
else {
    Write-Host "Repo: $slug  PR: $prNumber"
    Write-Host "Reviews: $($summary.reviewCount); actionable (body or CHANGES_REQUESTED): $($summary.actionableReviewCount)"
}

exit 0
