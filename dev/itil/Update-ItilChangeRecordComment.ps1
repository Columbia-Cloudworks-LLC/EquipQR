#Requires -Version 5.1
<#
.SYNOPSIS
  PATCH an existing issue comment body (same Change Record thread) via GitHub API.

.PARAMETER CommentUrl
  Typical form: .../pull/<n>#issuecomment-<id> or .../issues/<n>#issuecomment-<id>.

.PARAMETER CommentId
  Numeric comment database id.

.PARAMETER Status
  Accepted for forward compatibility only; callers should refresh the markdown body offline.
#>
[CmdletBinding()]
param(
    [string]$CommentUrl = '',
    [int64]$CommentId = 0,
    [Parameter(Mandatory)][string]$BodyFile,

    [ValidateSet('', 'Approved', 'InProgress', 'Revised')]
    [string]$Status = '',

    [switch]$DryRun,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'ItIlCommon.ps1')

Assert-CommandExists 'gh'

function Resolve-GitHubIssueCommentId {
    param([string]$UrlText)
    if ([string]::IsNullOrWhiteSpace($UrlText)) {
        throw 'CommentUrl is empty.'
    }
    $u = [string]$UrlText.Trim()
    if ($u -notmatch '(?i)issuecomment-(?<id>[0-9]+)') {
        throw "CommentUrl does not contain an issuecomment id token: $u"
    }
    return [int64]$Matches['id']
}

if ($CommentId -le 0 -and [string]::IsNullOrWhiteSpace($CommentUrl)) {
    throw 'Provide -CommentUrl or numeric -CommentId.'
}

if ($CommentId -le 0) {
    $CommentId = Resolve-GitHubIssueCommentId -UrlText $CommentUrl
}

if (-not (Test-Path -LiteralPath $BodyFile)) {
    throw "BodyFile not found: $BodyFile"
}

$warnings = New-Object System.Collections.Generic.List[string]

if (-not [string]::IsNullOrWhiteSpace($Status)) {
    $warnings.Add("'Status' is informational; this script PATCHes BodyFile verbatim. Embed status text in BodyFile.")
}

$newBody = Get-Content -LiteralPath $BodyFile -Raw -Encoding UTF8

$slug = Get-ItilGhOwnerRepoSlug
$parts = Split-ItilOwnerRepo $slug

$payloadPath = Join-Path $env:TEMP ("equipqr-itil-comment-patch-{0}.json" -f [Guid]::NewGuid().ToString('N'))

try {
    $payloadHash = @{ body = $newBody }

    Write-ItilUtf8NoBomFile -Path $payloadPath -Content (($payloadHash | ConvertTo-Json -Compress))

    if ($DryRun) {
        $warnings.Add('DryRun enabled: skipping gh api PATCH.')
        $patchUrl = "repos/$($parts.Owner)/$($parts.Repo)/issues/comments/$CommentId"
        if ($Json) {
            [ordered]@{
                commentId = $CommentId
                slug      = $slug
                dryRun    = $true
                patchPath = $patchUrl
                warnings  = @($warnings)
            } | ConvertTo-Json -Compress
        }
        else {
            foreach ($w in $warnings) { Write-Warning $w }
            Write-Host ('Would PATCH repos/{0}/{1}/issues/comments/{2}' -f $parts.Owner, $parts.Repo, $CommentId)
        }

        exit 0
    }

    $endpoint = ('repos/{0}/{1}/issues/comments/{2}' -f $parts.Owner, $parts.Repo, $CommentId)
    $out = Invoke-ItilGhJson @(
        'api',
        '--method', 'PATCH',
        $endpoint,
        '--input', $payloadPath
    )

    if ($out.ExitCode -ne 0) {

        throw "gh api PATCH failed: $($out.Raw)"
    }

    $obj = $out.Raw | ConvertFrom-Json

    $result = [ordered]@{
        commentId    = [int64]$obj.id
        commentUrl   = [string]$obj.html_url
        slug         = $slug
        updateStatus = 'patched'
        warnings     = @($warnings)
    }

    if ($Json) {
        $result | ConvertTo-Json -Depth 8 -Compress
    }
    else {
        foreach ($w in $warnings) { Write-Warning $w }
        Write-Host ('Updated comment URL: {0}' -f $result.commentUrl)
    }
}
finally {
    if (Test-Path -LiteralPath $payloadPath) {
        Remove-Item -LiteralPath $payloadPath -Force -ErrorAction SilentlyContinue
    }
}

exit 0
