#Requires -Version 5.1
<#
.SYNOPSIS
  Inspect or watch PR CI checks (address-pr-feedback Steps 1b and 9).

.PARAMETER PullRequestNumber
  If 0, uses PR for current branch.

.PARAMETER Watch
  Block until all checks finish (`gh pr checks --watch`). Use at session start and after push.

.PARAMETER FailFast
  With -Watch, exit when the first check fails.

.PARAMETER Json
  Emit structured JSON (name, bucket, state, workflow, link).

.EXAMPLE
  .\scripts\pr-feedback\Get-PrChecks.ps1 -Json
  .\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber 712 -Watch -FailFast
#>
[CmdletBinding()]
param(
    [int]$PullRequestNumber = 0,
    [switch]$Watch,
    [switch]$FailFast,
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

function Get-PrChecksSummary {
    param(
        [int]$PrNumber
    )
    $r = Invoke-PrFeedbackGhJson @(
        'pr', 'checks', $PrNumber,
        '--json', 'name,bucket,state,workflow,link'
    )
    if ($r.ExitCode -ne 0) {
        throw "gh pr checks --json failed: $($r.Raw)"
    }
    $checks = $r.Raw | ConvertFrom-Json
    if ($checks -isnot [array]) {
        $checks = @($checks)
    }

    $failed = @($checks | Where-Object { $_.bucket -eq 'fail' })
    $pending = @($checks | Where-Object { $_.bucket -eq 'pending' })
    $passed = @($checks | Where-Object { $_.bucket -eq 'pass' })
    $other = @($checks | Where-Object { $_.bucket -notin @('pass', 'fail', 'pending', 'skipping') })

    $isGreen = ($failed.Count -eq 0 -and $pending.Count -eq 0 -and $other.Count -eq 0 -and $checks.Count -gt 0)
    $hasPending = ($pending.Count -gt 0)
    $hasFailed = ($failed.Count -gt 0)
    $hasOther = ($other.Count -gt 0)

    return [ordered]@{
        pullRequestNumber = $PrNumber
        isGreen           = $isGreen
        hasPending        = $hasPending
        hasFailed         = $hasFailed
        hasOther          = $hasOther
        hasNoChecks       = ($checks.Count -eq 0)
        passCount         = $passed.Count
        failCount         = $failed.Count
        pendingCount      = $pending.Count
        otherCount        = $other.Count
        failedChecks      = @($failed)
        pendingChecks     = @($pending)
        otherChecks       = @($other)
        checks            = @($checks)
    }
}

$n = Resolve-PullRequestNumber -Candidate $PullRequestNumber

if ($Watch) {
    $watchArgs = @('pr', 'checks', $n, '--watch')
    if ($FailFast) { $watchArgs += '--fail-fast' }
    $watchExit = Invoke-PrFeedbackGh @watchArgs
    if ($watchExit -ne 0 -and $watchExit -ne 8) {
        exit $watchExit
    }
}

$summary = Get-PrChecksSummary -PrNumber $n

if ($Json) {
    $summary | ConvertTo-Json -Depth 10 -Compress
}
else {
    Write-Host "PR #$n CI: pass=$($summary.passCount) fail=$($summary.failCount) pending=$($summary.pendingCount)"
    if ($summary.hasFailed) {
        foreach ($c in $summary.failedChecks) {
            Write-Host "  FAIL: $($c.name) ($($c.workflow))"
        }
    }
    if ($summary.hasPending) {
        foreach ($c in $summary.pendingChecks) {
            Write-Host "  PENDING: $($c.name)"
        }
    }
    if ($summary.hasOther) {
        foreach ($c in $summary.otherChecks) {
            Write-Host "  OTHER ($($c.bucket)): $($c.name)"
        }
    }
    if ($summary.hasNoChecks) {
        Write-Host '  NO CHECKS: gh pr checks returned an empty list'
    }
    if ($summary.isGreen) {
        Write-Host 'CI: green'
    }
}

if ($summary.hasPending -or $summary.hasNoChecks) { exit 8 }
if ($summary.hasFailed) { exit 1 }
if ($summary.hasOther) { exit 1 }
if (-not $summary.isGreen) { exit 1 }
exit 0
