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

function Get-QodoReviewCurrentSection {
    <#
    .SYNOPSIS
      Return only the current (non-folded) portion of a Qodo Code Review comment body.
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Body
    )
    $markers = @(
        '<!-- FOLDED_SECTION_START -->',
        '### Previous review results'
    )
    $section = $Body
    foreach ($marker in $markers) {
        $idx = $section.IndexOf($marker)
        if ($idx -ge 0) {
            $section = $section.Substring(0, $idx)
        }
    }
    return $section
}

function Test-QodoFindingSummaryResolved {
    <#
    .SYNOPSIS
      True when a Qodo finding summary line is struck through or marked resolved.
    #>
    param(
        [Parameter(Mandatory)]
        [string]$SummaryHtml
    )
    if ($SummaryHtml -match '<s[\s>]' -or $SummaryHtml -match '</s>') {
        return $true
    }
    if ($SummaryHtml -match '~~') {
        return $true
    }
    if ($SummaryHtml -match 'Resolved</code>' -or $SummaryHtml -match '✓\s*Resolved') {
        return $true
    }
    return $false
}

function Get-QodoBucketFromBadge {
    param([string]$BadgeFragment)
    switch -Regex ($BadgeFragment) {
        'Action_required' { return 'actionRequired' }
        'Review_recommended' { return 'reviewRecommended' }
        'Optional' { return 'optional' }
        default { return $null }
    }
}

function Parse-QodoFindingsFromReviewBody {
    <#
    .SYNOPSIS
      Parse open and resolved Qodo findings from the persistent Code Review comment body.
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Body
    )
    $section = Get-QodoReviewCurrentSection -Body $Body
    $badgePattern = '<img[^>]+badge/(Action_required|Review_recommended|Optional)[^>]*>'
    $summaryPattern = '<details>\s*<summary>\s*((?:\s*\d+\.\s*)[\s\S]*?)</summary>'

    $open = [System.Collections.Generic.List[object]]::new()
    $resolved = [System.Collections.Generic.List[object]]::new()
    $currentBucket = 'unknown'

    $badgeMatches = [regex]::Matches($section, $badgePattern)
    for ($bi = 0; $bi -lt $badgeMatches.Count; $bi++) {
        $badge = $badgeMatches[$bi]
        $bucket = Get-QodoBucketFromBadge -BadgeFragment $badge.Groups[1].Value
        if (-not $bucket) { continue }

        $start = $badge.Index + $badge.Length
        if ($bi + 1 -lt $badgeMatches.Count) {
            $end = $badgeMatches[$bi + 1].Index
        }
        else {
            $end = $section.Length
        }
        $bucketSection = $section.Substring($start, $end - $start)
        $currentBucket = $bucket

        $summaries = [regex]::Matches($bucketSection, $summaryPattern)
        foreach ($sm in $summaries) {
            $summaryHtml = $sm.Groups[1].Value.Trim()
            if ($summaryHtml -notmatch '^\d+\.') {
                continue
            }
            if ($summaryHtml -match '^(?:Description|Code|Evidence|Agent prompt|Diagram|Walkthroughs)\b') {
                continue
            }

            $plain = ($summaryHtml -replace '<[^>]+>', ' ' -replace '\s+', ' ').Trim()
            $item = [ordered]@{
                bucket      = $currentBucket
                index       = if ($plain -match '^(\d+)\.') { [int]$Matches[1] } else { 0 }
                title       = ($plain -replace '^\d+\.\s*', '').Trim()
                summaryHtml = $summaryHtml
                isResolved  = (Test-QodoFindingSummaryResolved -SummaryHtml $summaryHtml)
            }
            if ($item.isResolved) {
                $resolved.Add($item)
            }
            else {
                $open.Add($item)
            }
        }
    }

    return [ordered]@{
        openFindings     = @($open)
        resolvedFindings = @($resolved)
        openCount        = $open.Count
        resolvedCount    = $resolved.Count
    }
}

function Get-QodoCommentKind {
    param(
        [Parameter(Mandatory)]
        [string]$Body
    )
    if ($Body -match 'Code Review by Qodo') { return 'review' }
    if ($Body -match 'PR Summary by Qodo') { return 'summary' }
    if ($Body -match 'was updated up to the latest commit') { return 'statusComplete' }
    if ($Body -match 'check back|reviewing|in progress|analyzing|please wait') { return 'statusInProgress' }
    if ($Body -match '\[Code review\]\(') { return 'status' }
    return 'other'
}
