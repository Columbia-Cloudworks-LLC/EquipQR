#Requires -Version 5.1
<#
.SYNOPSIS
  Wrapper for `gh pr checks` (address-pr-feedback Step 9).

.PARAMETER PullRequestNumber
  If 0, uses PR for current branch.

.EXAMPLE
  .\scripts\pr-feedback\Get-PrChecks.ps1
  .\scripts\pr-feedback\Get-PrChecks.ps1 -PullRequestNumber 712
#>
[CmdletBinding()]
param(
    [int]$PullRequestNumber = 0
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

$n = Resolve-PullRequestNumber -Candidate $PullRequestNumber
$exit = Invoke-PrFeedbackGh @('pr', 'checks', $n)
exit $exit
