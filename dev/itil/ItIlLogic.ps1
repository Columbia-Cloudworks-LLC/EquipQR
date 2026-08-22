#Requires -Version 5.1
# Pure helpers for ITIL workflow scripts (dot-source only; no network).

function Resolve-ItilIssueReference {
    param([Parameter(Mandatory)][string]$Issue)
    $t = ($Issue.Trim())
    if ([string]::IsNullOrWhiteSpace($t)) {
        throw 'Issue reference is empty. Provide #123, 123, or a GitHub issues URL.'
    }

    # Reject obvious PR URLs
    if ($t -match '(?i)/pull/\d+|github\.com/[^/\s]+/[^/\s]+/pull/\d+') {
        throw 'Pull request URLs are not valid issue references. Provide an issue number or issues URL.'
    }

    # Full issue URL (github.com)
    if ($t -match '(?i)github\.com/[^/\s]+/[^/\s]+/issues/(\d+)') {
        return [int]$Matches[1]
    }

    # Standalone URLs without github.com subdomain (reject)
    if ($t -match '(?i)^https?://' -and $t -notmatch 'github\.com') {
        throw 'Unsupported issue URL. Use a github.com/issues/<n> URL or a numeric issue reference.'
    }

    # Multiple issue markers (#nnn appears more than once)
    $hashMatches = [regex]::Matches($t, '#(\d+)')
    if ($hashMatches.Count -gt 1) {
        throw 'Multiple issue references detected. Provide exactly one issue (#nnn).'
    }

    $digitsOnly = ($t -match '^\d+$')

    if ($hashMatches.Count -eq 1) {
        return [int]$hashMatches[0].Groups[1].Value
    }

    if ($digitsOnly) {
        return [int]$t
    }

    # Single bare number embedded
    $bare = [regex]::Match($t, '^\s*(\d+)\s*$')
    if ($bare.Success) {
        return [int]$bare.Groups[1].Value
    }

    throw 'Could not resolve a single issue number from the input.'
}

function New-ItilKebabSlug {
    param([Parameter(Mandatory)][string]$Text)
    $s = $Text.ToLowerInvariant()
    $s = $s -replace '[^a-z0-9]+', '-'
    $s = $s.Trim('-')
    if ([string]::IsNullOrWhiteSpace($s)) {
        return 'change'
    }
    if ($s.Length -gt 60) {
        $s = $s.Substring(0, 60).TrimEnd('-')
    }
    return $s
}

function New-ItilBranchName {
    param(
        [Parameter(Mandatory)][ValidateSet('feat', 'fix', 'chore', 'docs', 'refactor')]
        [string]$Type,

        [Parameter(Mandatory)][int]$IssueNumber,

        [Parameter(Mandatory)][string]$Slug
    )
    $kebab = New-ItilKebabSlug -Text $Slug
    return '{0}/issue-{1}-{2}' -f $Type, $IssueNumber, $kebab
}

function Test-ItilRequiredSections {
    param(
        [Parameter(Mandatory)][string]$Markdown,

        [Parameter(Mandatory)][ValidateSet('ServiceRequest', 'ChangeRecord')]
        [string]$ArtifactType
    )

    $errors = New-Object System.Collections.Generic.List[string]

    if ([string]::IsNullOrWhiteSpace($Markdown)) {
        $errors.Add('Body is empty.')
        return $errors.ToArray()
    }

    switch ($ArtifactType) {
        'ServiceRequest' {
            if ($Markdown -notmatch '(?m)^##\s+Service Request') {
                $errors.Add('Missing required header "## Service Request".')
            }
        }
        'ChangeRecord' {
            if ($Markdown -notmatch '(?m)^#\s+Change Record') {
                $errors.Add('Missing required header "# Change Record" (Issue comment format).')
            }
            if ($Markdown -notmatch '(?m)^##\s+Short Description\b') {
                $errors.Add('Missing required header "## Short Description".')
            }
        }
    }

    return $errors.ToArray()
}

function New-ItilCommitUrl {
    param(
        [Parameter(Mandatory)][string]$Owner,

        [Parameter(Mandatory)][string]$Repo,

        [Parameter(Mandatory)][string]$ShaFull
    )
    return 'https://github.com/{0}/{1}/commit/{2}' -f $Owner, $Repo, $ShaFull
}

function New-ItilImplementationFollowupBody {
    param(
        [Parameter(Mandatory)][int]$IssueNumber,

        [Parameter(Mandatory)][string]$ShortSha,

        [Parameter(Mandatory)][string]$CommitUrl,

        [Parameter(Mandatory)][string]$BranchName,

        [Parameter(Mandatory)][string]$ChangeRecordUrl,

        [Parameter(Mandatory)][string]$PrTitle,

        [Parameter(Mandatory)][string]$PrUrl,

        [Parameter(Mandatory)][string]$VerificationBlock,

        [string]$DeviationsBlock = 'None.',

        [bool]$MergedHint = $false
    )

    $statusLine = '**Issue status:** Fixed when this PR merges into `preview`.'
    if ($MergedHint) {
        $statusLine = '**Issue status:** Merged into `preview`.'
    }

    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("### Implemented --- Issue #$IssueNumber")
    [void]$sb.AppendLine('')
    $statusImpl = ('Implemented in commit [`{0}`]({1}) on branch `{2}`. Change Record: {3}.' -f $ShortSha, $CommitUrl, $BranchName, $ChangeRecordUrl)
    [void]$sb.AppendLine($statusImpl)
    [void]$sb.AppendLine('')
    [void]$sb.AppendLine("PR: [$PrTitle]($PrUrl)")
    [void]$sb.AppendLine('')
    [void]$sb.AppendLine($statusLine)
    [void]$sb.AppendLine('')
    [void]$sb.AppendLine('```bash')
    [void]$sb.AppendLine($VerificationBlock.TrimEnd())
    [void]$sb.AppendLine('```')
    [void]$sb.AppendLine('')
    [void]$sb.AppendLine('**Deviations:**')
    [void]$sb.AppendLine($DeviationsBlock.TrimEnd())

    return $sb.ToString()
}
