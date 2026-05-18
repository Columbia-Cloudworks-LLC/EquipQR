#Requires -Version 5.1
<#
.SYNOPSIS
  Post deferred tracking issues, inline PR review replies, and a top-level PR comment (address-pr-feedback Step 8).

.DESCRIPTION
  Reads JSON manifests so bodies stay in files (PowerShell-safe, no inline heredocs).
  Inline replies use POST /repos/{owner}/{repo}/pulls/{pull_number}/comments with in_reply_to.

  Thread reply 404 immediately after push is treated as non-fatal (warning), per skill.

.PARAMETER PullRequestNumber
  PR number; use 0 to infer from current branch.

.PARAMETER ThreadRepliesFile
  JSON array: [ { "inReplyTo": 1234567890, "body": "..." }, ... ]
  Use review comment databaseId from GraphQL threads output.

.PARAMETER DeferredIssuesFile
  JSON array: [ { "title": "...", "body": "..." }, { "title": "...", "bodyFile": "C:\\path.md" } ]

.PARAMETER SummaryBodyFile
  Markdown file for top-level `gh pr comment` (## PR Feedback Response).

.PARAMETER DryRun
  Print intended operations; do not call GitHub mutating APIs.

.PARAMETER Json
  Emit JSON summary of actions and warnings.

.EXAMPLE
  .\scripts\pr-feedback\Publish-PrFeedbackResponses.ps1 -PullRequestNumber 712 -DryRun -ThreadRepliesFile .\replies.json -SummaryBodyFile .\summary.md
#>
[CmdletBinding()]
param(
    [int]$PullRequestNumber = 0,
    [string]$ThreadRepliesFile = '',
    [string]$DeferredIssuesFile = '',
    [string]$SummaryBodyFile = '',
    [switch]$DryRun,
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

function Read-JsonFile {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "File not found: $Path"
    }
    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }
    return $raw | ConvertFrom-Json
}

function Invoke-CreatePullReviewCommentReply {
    param(
        [string]$Owner,
        [string]$Repo,
        [int]$PullNumber,
        [int64]$InReplyTo,
        [string]$Body
    )
    $payload = @{
        body         = $Body
        in_reply_to  = $InReplyTo
    } | ConvertTo-Json -Compress

    $tmp = Join-Path $env:TEMP ("equipqr-pr-reply-{0}.json" -f [Guid]::NewGuid().ToString('N'))
    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tmp, $payload, $utf8NoBom)

        $args = @(
            'api', "repos/$Owner/$Repo/pulls/$PullNumber/comments",
            '--method', 'POST',
            '--input', $tmp
        )
        $out = Invoke-PrFeedbackGhJson $args
        return [pscustomobject]@{ ExitCode = $out.ExitCode; Raw = $out.Raw }
    }
    finally {
        if (Test-Path -LiteralPath $tmp) {
            Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
        }
    }
}

$prNumber = Resolve-PullRequestNumber -Candidate $PullRequestNumber
$slug = Get-GhOwnerRepoSlug
$parts = Split-OwnerRepo $slug

$actions = [System.Collections.Generic.List[object]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

if (-not $ThreadRepliesFile -and -not $DeferredIssuesFile -and -not $SummaryBodyFile) {
    throw "Specify at least one of: -ThreadRepliesFile, -DeferredIssuesFile, -SummaryBodyFile."
}

# Deferred issues first (so replies can link issue numbers)
if ($DeferredIssuesFile) {
    $items = Read-JsonFile -Path $DeferredIssuesFile
    if ($null -eq $items) {
        $items = @()
    }
    foreach ($it in $items) {
        $title = [string]$it.title
        if ([string]::IsNullOrWhiteSpace($title)) {
            throw "Deferred issue entry missing title."
        }
        $bodyText = $null
        if ($it.body) {
            $bodyText = [string]$it.body
        }
        elseif ($it.bodyFile) {
            if (-not (Test-Path -LiteralPath $it.bodyFile)) {
                throw "bodyFile not found: $($it.bodyFile)"
            }
            $bodyText = Get-Content -LiteralPath $it.bodyFile -Raw -Encoding UTF8
        }
        else {
            throw "Deferred issue entry needs body or bodyFile: $title"
        }

        $tmpBody = Join-Path $env:TEMP ("equipqr-issue-body-{0}.md" -f [Guid]::NewGuid().ToString('N'))
        try {
            $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
            [System.IO.File]::WriteAllText($tmpBody, $bodyText, $utf8NoBom)

            if ($DryRun) {
                $actions.Add([pscustomobject]@{ kind = 'issue'; status = 'skipped-dry-run'; title = $title })
            }
            else {
                $cOut = Invoke-PrFeedbackGhJson @('issue', 'create', '--title', $title, '--body-file', $tmpBody)
                if ($cOut.ExitCode -ne 0) {
                    throw "gh issue create failed for '$title': $($cOut.Raw)"
                }
                $actions.Add([pscustomobject]@{ kind = 'issue'; status = 'created'; title = $title; url = ($cOut.Raw.Trim()) })
            }
        }
        finally {
            if (Test-Path -LiteralPath $tmpBody) {
                Remove-Item -LiteralPath $tmpBody -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Inline replies
if ($ThreadRepliesFile) {
    $replies = Read-JsonFile -Path $ThreadRepliesFile
    if ($null -eq $replies) {
        $replies = @()
    }
    foreach ($r in $replies) {
        $inReply = [int64]$r.inReplyTo
        $body = [string]$r.body
        if ($inReply -le 0 -or [string]::IsNullOrWhiteSpace($body)) {
            throw "Thread reply must include inReplyTo (databaseId) and body."
        }

        if ($DryRun) {
            $actions.Add([pscustomobject]@{ kind = 'reply'; status = 'skipped-dry-run'; inReplyTo = $inReply })
            continue
        }

        $resp = Invoke-CreatePullReviewCommentReply -Owner $parts.Owner -Repo $parts.Repo -PullNumber $prNumber -InReplyTo $inReply -Body $body
        if ($resp.ExitCode -ne 0) {
            $text = $resp.Raw
            if ($text -match '404' -or $text -match 'Not Found') {
                $warnings.Add("Reply to in_reply_to=$inReply treated as non-fatal (likely auto-resolved/outdated): $text")
                $actions.Add([pscustomobject]@{ kind = 'reply'; status = 'warn-404'; inReplyTo = $inReply; detail = $text })
            }
            else {
                throw "Reply failed for in_reply_to=$inReply : $text"
            }
        }
        else {
            $actions.Add([pscustomobject]@{ kind = 'reply'; status = 'created'; inReplyTo = $inReply; detail = $resp.Raw.Trim() })
        }
    }
}

# Top-level summary
if ($SummaryBodyFile) {
    if (-not (Test-Path -LiteralPath $SummaryBodyFile)) {
        throw "SummaryBodyFile not found: $SummaryBodyFile"
    }
    if ($DryRun) {
        $actions.Add([pscustomobject]@{ kind = 'pr-comment'; status = 'skipped-dry-run'; path = $SummaryBodyFile })
    }
    else {
        $cOut = Invoke-PrFeedbackGhJson @('pr', 'comment', $prNumber, '--body-file', $SummaryBodyFile)
        if ($cOut.ExitCode -ne 0) {
            throw "gh pr comment failed: $($cOut.Raw)"
        }
        $actions.Add([pscustomobject]@{ kind = 'pr-comment'; status = 'created'; detail = $cOut.Raw.Trim() })
    }
}

$payload = [ordered]@{
    slug              = $slug
    pullRequestNumber = $prNumber
    dryRun            = [bool]$DryRun
    actions           = @($actions)
    warnings          = @($warnings)
}

if ($Json) {
    $payload | ConvertTo-Json -Depth 10 -Compress
}
else {
    Write-Host "Repo: $slug  PR: $prNumber  DryRun: $DryRun"
    foreach ($w in $warnings) {
        Write-Warning $w
    }
    foreach ($a in $actions) {
        Write-Host ("{0}: {1}" -f $a.kind, $a.status)
    }
}

exit 0
