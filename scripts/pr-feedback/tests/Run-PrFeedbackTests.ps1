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

# Qodo finding resolution detection
Assert-Equal -Expected $true -Actual (Test-QodoFindingSummaryResolved -SummaryHtml '<s>Cleanup aborts DOCX download</s> <code>✓ Resolved</code>') -Message 'resolved via s tag'
Assert-Equal -Expected $false -Actual (Test-QodoFindingSummaryResolved -SummaryHtml '  3.  Error CORS opts omitted <code>🐞 Bug</code>') -Message 'open finding'

$qodoSample = @'
<img src="https://img.shields.io/badge/Action_required-634FD1?style=flat-square" height="20px" alt="Action required">
<details>
<summary>  1.  <s>DOCX function bypasses response helpers</s> <code>✓ Resolved</code></summary>
</details>
<details>
<summary>  2.  Error CORS opts omitted <code>🐞 Bug</code></summary>
</details>
<img src="https://img.shields.io/badge/Review_recommended-634FD1?style=flat-square" height="20px" alt="Remediation recommended">
<details>
<summary>  3.  <s>Wildcard CORS in exports</s> <code>✓ Resolved</code></summary>
</details>
<details>
<summary>  4.  Missing test coverage <code>📘 Rule violation</code></summary>
</details>
'@
$parsed = Parse-QodoFindingsFromReviewBody -Body $qodoSample
Assert-Equal -Expected 2 -Actual $parsed.openCount -Message 'qodo openCount'
Assert-Equal -Expected 2 -Actual $parsed.resolvedCount -Message 'qodo resolvedCount'
Assert-Equal -Expected 'actionRequired' -Actual $parsed.openFindings[0].bucket -Message 'first open bucket'
Assert-Equal -Expected 'reviewRecommended' -Actual $parsed.openFindings[1].bucket -Message 'second open bucket'

$qodoWithNestedBadge = @'
<img src="https://img.shields.io/badge/Action_required-634FD1?style=flat-square" height="20px" alt="Action required">
<details>
<summary>  1.  First action item <code>🐞 Bug</code></summary>
</details>
<img src="https://img.shields.io/badge/custom-634FD1?style=flat-square" height="20px" alt="custom">
<details>
<summary>  2.  Second action item <code>🐞 Bug</code></summary>
</details>
<img src="https://img.shields.io/badge/Review_recommended-634FD1?style=flat-square" height="20px" alt="Remediation recommended">
<details>
<summary>  3.  Recommended item <code>📘 Rule violation</code></summary>
</details>
'@
$nestedParsed = Parse-QodoFindingsFromReviewBody -Body $qodoWithNestedBadge
Assert-Equal -Expected 3 -Actual $nestedParsed.openCount -Message 'nested badge openCount'
Assert-Equal -Expected 'actionRequired' -Actual $nestedParsed.openFindings[0].bucket -Message 'nested first bucket'
Assert-Equal -Expected 'actionRequired' -Actual $nestedParsed.openFindings[1].bucket -Message 'nested second bucket'
Assert-Equal -Expected 'reviewRecommended' -Actual $nestedParsed.openFindings[2].bucket -Message 'nested third bucket'

$fixerSample = @'
### Qodo Fixer

🍒 Ready to be cherry-picked — ✅ Merged (0) · ☑ Fixed (2)

🔗 Fix PR: [#1230](https://github.com/Columbia-Cloudworks-LLC/EquipQR/pull/1230)

<details><summary>Process — 2 fixed</summary>

- ☑ Fixed: Audit list locator unstable
- ☑ Fixed: Scroll helper robustness

</details>
'@
Assert-Equal -Expected 'fixer' -Actual (Get-QodoCommentKind -Body $fixerSample) -Message 'fixer comment kind'
$fixerParsed = Parse-QodoFixerCommentBody -Body $fixerSample
Assert-Equal -Expected 0 -Actual $fixerParsed.mergedCount -Message 'fixer mergedCount'
Assert-Equal -Expected 2 -Actual $fixerParsed.fixedCount -Message 'fixer fixedCount'
Assert-Equal -Expected 2 -Actual $fixerParsed.pendingCount -Message 'fixer pendingCount'
Assert-Equal -Expected 1230 -Actual $fixerParsed.fixPrNumber -Message 'fixer fixPrNumber'
Assert-Equal -Expected $true -Actual $fixerParsed.needsAction -Message 'fixer needsAction'
Assert-Equal -Expected 2 -Actual $fixerParsed.fixedItems.Count -Message 'fixer fixedItems count'

Write-Host "PrFeedbackLogic: OK"
exit 0
