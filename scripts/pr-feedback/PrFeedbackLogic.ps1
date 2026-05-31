#Requires -Version 5.1
# Pure classification helpers for PR review threads (dot-source only).

function Split-PrFeedbackThreads {
    <#
    .SYNOPSIS
      Split threads into workingSet vs outdatedOpenSet (unresolved only).
    #>
    param(
        [Parameter(Mandatory)]
        [object[]]$Threads
    )
    $workingSet = [System.Collections.Generic.List[object]]::new()
    $outdatedOpenSet = [System.Collections.Generic.List[object]]::new()
    $resolvedCount = 0

    foreach ($t in $Threads) {
        if ($t.isResolved) {
            $resolvedCount++
            continue
        }
        if (-not $t.isOutdated) {
            $workingSet.Add($t)
        }
        else {
            $outdatedOpenSet.Add($t)
        }
    }

    return [ordered]@{
        workingSet        = @($workingSet)
        outdatedOpenSet   = @($outdatedOpenSet)
        resolvedCount     = $resolvedCount
        unresolvedCount   = $workingSet.Count + $outdatedOpenSet.Count
    }
}
