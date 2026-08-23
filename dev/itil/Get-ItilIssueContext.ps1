#Requires -Version 5.1
<#
.SYNOPSIS
  Fetch GitHub issue JSON plus EquipQR ITIL heuristic flags.

.PARAMETER Issue
  Issue number, #nnn, or github.com/issues/n URL.

.PARAMETER Json
  Emit compact JSON to stdout only.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Issue,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'ItIlCommon.ps1')
. (Join-Path $here 'ItIlLogic.ps1')

Assert-CommandExists 'gh'
Assert-CommandExists 'git'

$repoRoot = Get-ItilRepoRootFromGit
Set-Location -LiteralPath $repoRoot

$issueNum = Resolve-ItilIssueReference -Issue $Issue
$slug = Get-ItilGhOwnerRepoSlug
$parts = Split-ItilOwnerRepo $slug

$fields = @(
    'number', 'title', 'body', 'labels', 'state', 'assignees', 'comments', 'url', 'author'
)
$gv = Invoke-ItilGhJson @('issue', 'view', $issueNum, '--repo', $slug, '--json', ($fields -join ','))

if ($gv.ExitCode -ne 0) {
    throw "gh issue view failed: $($gv.Raw)"
}

$issueObj = $gv.Raw | ConvertFrom-Json

$labelNames = @()
foreach ($lab in @($issueObj.labels)) {
    if ($lab -and $lab.name) {
        $labelNames += [string]$lab.name
    }
}

$comments = @($issueObj.comments)
$combinedCommentText = ''

foreach ($c in $comments) {
    $body = ''
    if ($c.body) { $body = [string]$c.body }
    $combinedCommentText += "`n`n"
    $combinedCommentText += $body
}

function Test-CombinedText {
    param([string]$Text, [string]$Pattern)
    return ($Text -match $Pattern)
}

$isBugLike = $false
if ($labelNames -match '(?i)bug|regression|defect') {
    $isBugLike = $true
}
$bodyAll = ''
if ($issueObj.body) { $bodyAll = [string]$issueObj.body }
$hay = $combinedCommentText + "`n`n" + $bodyAll
if (Test-CombinedText $hay '(?mi)^(?:##\s+)?problem\s+record\b') {
    $isBugLike = $true
}

$isFeatureLike = $false
if ($labelNames -match '(?i)enhancement|feature|\bintegration\b|\bfeature-request\b') {
    $isFeatureLike = $true
}

$hasServiceRequestComment = Test-CombinedText $hay '(?m)^##\s+Service Request'
$hasProblemRecordComment = Test-CombinedText $hay '(?mi)^(?:##\s+)?problem\s+record\b'
$hasChangeRecordComment = Test-CombinedText $hay '(?m)^#\s+Change Record'

$result = [ordered]@{
    slug                    = $slug
    owner                   = $parts.Owner
    repo                    = $parts.Repo
    repoRoot                = $repoRoot
    number                  = [int]$issueObj.number
    title                   = $issueObj.title
    url                     = $issueObj.url
    state                   = $issueObj.state
    labels                  = $labelNames
    assignees               = @()
    authorLogin             = $null
    isBugLike               = [bool]$isBugLike
    isFeatureLike           = [bool]$isFeatureLike
    hasServiceRequestComment = [bool]$hasServiceRequestComment
    hasProblemRecordComment  = [bool]$hasProblemRecordComment
    hasChangeRecordComment   = [bool]$hasChangeRecordComment
    commentsCount           = $comments.Count
}

if ($issueObj.author -and $issueObj.author.login) {
    $result.authorLogin = [string]$issueObj.author.login
}

foreach ($a in @($issueObj.assignees)) {
    if ($a -and $a.login) {
        $result.assignees += [string]$a.login
    }
}

if ($Json) {
    $result | ConvertTo-Json -Depth 10 -Compress
}
else {
    Write-Host ('Issue #{0}: {1}' -f $result.number, $result.title)
    Write-Host ('URL: {0}' -f $result.url)
    Write-Host ('Labels: {0}' -f ($labelNames -join ', '))
    Write-Host ('Heuristics bugLike={0} featureLike={1} SRComment={2} ProblemComment={3} CRComment={4}' -f `
            $result.isBugLike, $result.isFeatureLike, $result.hasServiceRequestComment, `
            $result.hasProblemRecordComment, $result.hasChangeRecordComment)
}

exit 0
