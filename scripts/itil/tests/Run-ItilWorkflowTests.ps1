#Requires -Version 5.1
# Deterministic local tests for scripts/itil/ItIlLogic.ps1

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

$repoRoot = Resolve-Path (Join-Path $here '..\..\..')

. (Join-Path $repoRoot 'scripts\itil\ItIlLogic.ps1')

function Assert-Throws {
    param(
        [Parameter(Mandatory)][scriptblock]$Script,

        [string]$MessageHint = ''
    )
    try {

        & $Script | Out-Null

    }
    catch {

        return
    }

    if ([string]::IsNullOrWhiteSpace($MessageHint)) {

        throw 'ASSERT: expected terminating throw, but none occurred.'

    }
    throw ('ASSERT: expected terminating throw ({0}), but none occurred.' -f $MessageHint)

}

function Assert-Equal {

    param(
        [Parameter(Mandatory)]$Expected,
        [Parameter(Mandatory)]$Actual,
        [Parameter(Mandatory)][string]$Message)

    if ($Expected -ne $Actual) {

        throw ('FAIL: {0} (expected [{1}], got [{2}])' -f $Message, $Expected, $Actual)
    }

}

$r1 = Resolve-ItilIssueReference -Issue '#123'

Assert-Equal -Expected 123 -Actual $r1 -Message 'hash form'

$r2 = Resolve-ItilIssueReference -Issue '456'

Assert-Equal -Expected 456 -Actual $r2 -Message 'digits only'

$r3 = Resolve-ItilIssueReference -Issue 'https://github.com/org/repo/issues/789'

Assert-Equal -Expected 789 -Actual $r3 -Message 'canonical url'

$r4 = Resolve-ItilIssueReference -Issue 'HTTPS://Github.Com/org/repo/Issues/111'

Assert-Equal -Expected 111 -Actual $r4 -Message 'case-insensitive ISSUES segment'

Assert-Throws -MessageHint 'multiple hashes' -Script { Resolve-ItilIssueReference -Issue 'see #12 and also #34' }

Assert-Throws -MessageHint 'pull url' -Script { Resolve-ItilIssueReference -Issue 'https://github.com/org/repo/pull/12' }

Assert-Throws -MessageHint 'empty' -Script { Resolve-ItilIssueReference -Issue '' }

$b1 = New-ItilBranchName -Type 'feat' -IssueNumber 10 -Slug 'Hello   World!!!'

Assert-Equal -Expected 'feat/issue-10-hello-world' -Actual $b1 -Message 'branch kebab normalization'

$b2 = New-ItilBranchName -Type 'fix' -IssueNumber 2 -Slug '___'

Assert-Equal -Expected 'fix/issue-2-change' -Actual $b2 -Message 'fallback slug change'

$srr = @(Test-ItilRequiredSections -ArtifactType 'ServiceRequest' -Markdown @'
## Service Request --- Issue #1

Foo
'@)

if ($srr.Count -ne 0) {

    throw ('FAIL: service request markdown should validate: ' + ($srr -join ', '))
}

$crrMiss = @(Test-ItilRequiredSections -ArtifactType 'ChangeRecord' -Markdown @'
## Short Description

oops
'@)

$crrJoined = ([string]::Join("`n", $crrMiss))
if (-not ($crrJoined -match '(?i)Change Record')) {
    throw 'FAIL: ChangeRecord validation missing expected error substring'
}

$crGood = @(Test-ItilRequiredSections -ArtifactType 'ChangeRecord' -Markdown @'
# Change Record --- Issue #1

## Short Description

Hello
'@)

if ($crGood.Count -ne 0) {

    throw ('FAIL: good change record unexpectedly failed validation: ' + ($crGood -join ', '))

}

$fBody = New-ItilImplementationFollowupBody `
    -IssueNumber 99 `
    -ShortSha 'abc1234' `
    -CommitUrl 'https://github.com/org/repo/commit/deadbeef' `
    -BranchName 'feat/issue-99-test' `
    -ChangeRecordUrl 'https://github.com/org/repo/issues/99#issuecomment-1' `
    -PrTitle 'fix: wow' `
    -PrUrl 'https://github.com/org/repo/pull/5' `
    -VerificationBlock ("npm run lint  # PASS`r`nnpm run type-check  # FAIL") `
    -DeviationsBlock '* None noted.' `
    -MergedHint $false

if (-not ($fBody.Contains('[`abc1234`]('))) {

    throw 'FAIL: missing commit link markup'
}

$needleBranch = @'
`feat/issue-99-test`
'@

if (-not ($fBody.Contains($needleBranch.Trim()))) {

    throw 'FAIL: missing branch inline code markup'

}

$needlePreview = @'
`preview`
'@

if (-not ($fBody.Contains($needlePreview.Trim()))) {

    throw 'FAIL: missing preview environment inline code markup'

}

if (-not ($fBody.Contains('**Deviations:**'))) {

    throw 'FAIL: missing deviations header'
}

Write-Host 'ItIlLogic: OK'

exit 0
