#Requires -Version 5.1
<#
.SYNOPSIS
  Fetch PR review threads via GitHub GraphQL and split into working vs outdated unresolved sets.

.DESCRIPTION
  Implements address-pr-feedback Step 2 (inline threads): paginates reviewThreads and per-thread comments.

.PARAMETER PullRequestNumber
  PR number. If 0, resolves the current branch PR via `gh pr view --json number`.

.PARAMETER Json
  Emit one JSON document (threads + summary counts).

.EXAMPLE
  .\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -PullRequestNumber 712 -Json | Set-Content threads.json -Encoding utf8
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

function Invoke-ThreadsPage {
    param(
        [string]$Owner,
        [string]$Repo,
        [int]$Pr,
        [string]$After
    )
    $q = 'query($owner:String!,$repo:String!,$pr:Int!,$after:String){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviewThreads(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{id isResolved isOutdated comments(first:100){pageInfo{hasNextPage endCursor}nodes{databaseId body author{login} path line originalLine}}}}}}}'
    $args = @(
        'api', 'graphql',
        '-f', "query=$q",
        '-f', "owner=$Owner",
        '-f', "repo=$Repo",
        '-F', "pr=$Pr"
    )
    if (-not [string]::IsNullOrEmpty($After)) {
        $args += '-f'
        $args += "after=$After"
    }
    $out = Invoke-PrFeedbackGhJson $args
    if ($out.ExitCode -ne 0) {
        throw "gh api graphql (reviewThreads) failed: $($out.Raw)"
    }
    $json = $out.Raw | ConvertFrom-Json
    if ($json.errors) {
        throw "GraphQL errors: $($json.errors | ConvertTo-Json -Compress)"
    }
    return $json.data.repository.pullRequest.reviewThreads
}

function Invoke-ThreadCommentsPage {
    param(
        [string]$ThreadGlobalId,
        [string]$After
    )
    $q = 'query($id:ID!,$after:String){node(id:$id){... on PullRequestReviewThread{comments(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{databaseId body author{login} path line originalLine}}}}}'
    $args = @(
        'api', 'graphql',
        '-f', "query=$q",
        '-f', "id=$ThreadGlobalId"
    )
    if (-not [string]::IsNullOrEmpty($After)) {
        $args += '-f'
        $args += "after=$After"
    }
    $out = Invoke-PrFeedbackGhJson $args
    if ($out.ExitCode -ne 0) {
        throw "gh api graphql (thread comments) failed: $($out.Raw)"
    }
    $json = $out.Raw | ConvertFrom-Json
    if ($json.errors) {
        throw "GraphQL errors: $($json.errors | ConvertTo-Json -Compress)"
    }
    return $json.data.node.comments
}

function Get-AllThreadComments {
    param(
        [string]$ThreadGlobalId,
        $InitialComments
    )
    $list = [System.Collections.Generic.List[object]]::new()
    if ($InitialComments.nodes) {
        foreach ($n in $InitialComments.nodes) {
            $list.Add($n)
        }
    }
    $cAfter = $null
    if ($InitialComments.pageInfo) {
        if ($InitialComments.pageInfo.hasNextPage -and $InitialComments.pageInfo.endCursor) {
            $cAfter = $InitialComments.pageInfo.endCursor
        }
    }
    while ($cAfter) {
        $page = Invoke-ThreadCommentsPage -ThreadGlobalId $ThreadGlobalId -After $cAfter
        if ($page.nodes) {
            foreach ($n in $page.nodes) {
                $list.Add($n)
            }
        }
        if ($page.pageInfo -and $page.pageInfo.hasNextPage -and $page.pageInfo.endCursor) {
            $cAfter = $page.pageInfo.endCursor
        }
        else {
            $cAfter = $null
        }
    }
    return $list.ToArray()
}

$prNumber = Resolve-PullRequestNumber -Candidate $PullRequestNumber
$slug = Get-GhOwnerRepoSlug
$parts = Split-OwnerRepo $slug

$threadAfter = $null
$allThreads = [System.Collections.Generic.List[object]]::new()
do {
    $batch = Invoke-ThreadsPage -Owner $parts.Owner -Repo $parts.Repo -Pr $prNumber -After $threadAfter
    foreach ($node in $batch.nodes) {
        $comments = Get-AllThreadComments -ThreadGlobalId $node.id -InitialComments $node.comments
        $threadObj = [pscustomobject]@{
            id           = $node.id
            isResolved   = [bool]$node.isResolved
            isOutdated   = [bool]$node.isOutdated
            comments     = @($comments)
        }
        $allThreads.Add($threadObj)
    }
    if ($batch.pageInfo -and $batch.pageInfo.hasNextPage -and $batch.pageInfo.endCursor) {
        $threadAfter = $batch.pageInfo.endCursor
    }
    else {
        $threadAfter = $null
    }
} while ($threadAfter)

$buckets = Split-PrFeedbackThreads -Threads @($allThreads)

$summary = [ordered]@{
    slug                   = $slug
    pullRequestNumber      = $prNumber
    totalThreads           = $allThreads.Count
    unresolvedOpenThreads  = $buckets.unresolvedCount
    workingSetCount        = $buckets.workingSet.Count
    outdatedOpenSetCount   = $buckets.outdatedOpenSet.Count
    workingSet             = @($buckets.workingSet)
    outdatedOpenSet        = @($buckets.outdatedOpenSet)
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 20 -Compress
}
else {
    Write-Host "Repo: $slug  PR: $prNumber"
    Write-Host "Unresolved threads: $($summary.unresolvedOpenThreads)  (working: $($summary.workingSetCount), outdated+open: $($summary.outdatedOpenSetCount))"
}

exit 0
