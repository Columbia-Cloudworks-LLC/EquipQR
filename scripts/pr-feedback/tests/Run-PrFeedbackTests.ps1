#Requires -Version 5.1
# Deterministic tests for scripts/pr-feedback/PrFeedbackLogic.ps1 (no network).

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $here '..\..\..')
. (Join-Path $repoRoot 'scripts\pr-feedback\PrFeedbackLogic.ps1')

function Assert-Equal {
    param($Expected, $Actual, [string]$Message)
    if ($Expected -ne $Actual) {
        throw "FAIL: $Message (expected $Expected, got $Actual)"
    }
}

$threads = @(
    [pscustomobject]@{ id = 't1'; isResolved = $true; isOutdated = $false; comments = @() },
    [pscustomobject]@{ id = 't2'; isResolved = $false; isOutdated = $false; comments = @() },
    [pscustomobject]@{ id = 't3'; isResolved = $false; isOutdated = $true; comments = @() },
    [pscustomobject]@{ id = 't4'; isResolved = $false; isOutdated = $true; comments = @() }
)

$b = Split-PrFeedbackThreads -Threads $threads

Assert-Equal -Expected 4 -Actual $threads.Count -Message 'input count'
Assert-Equal -Expected 1 -Actual $b.resolvedCount -Message 'resolvedCount'
Assert-Equal -Expected 3 -Actual $b.unresolvedCount -Message 'unresolvedCount'
Assert-Equal -Expected 1 -Actual $b.workingSet.Count -Message 'workingSet.Count'
Assert-Equal -Expected 2 -Actual $b.outdatedOpenSet.Count -Message 'outdatedOpenSet.Count'
Assert-Equal -Expected 't2' -Actual $b.workingSet[0].id -Message 'working id'

Write-Host "PrFeedbackLogic: OK"
exit 0
