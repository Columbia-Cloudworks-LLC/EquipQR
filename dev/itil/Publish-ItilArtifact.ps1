#Requires -Version 5.1
<#
.SYNOPSIS
  Validate ITIL markdown body file, post GitHub issue comment, optionally apply an existing label.

.PARAMETER ArtifactType
  ServiceRequest maps to "## Service Request" checks. ChangeRecord maps to "# Change Record" + "## Short Description".
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][int]$Issue,

    [Parameter(Mandatory)]
    [ValidateSet('ServiceRequest', 'ChangeRecord')]
    [string]$ArtifactType,

    [Parameter(Mandatory)][string]$BodyFile,

    [string]$ApplyExistingLabel = '',
    [switch]$DryRun,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'ItIlCommon.ps1')
. (Join-Path $here 'ItIlLogic.ps1')

Assert-CommandExists 'gh'

if (-not (Test-Path -LiteralPath $BodyFile)) {
    throw "BodyFile not found: $BodyFile"
}

$slug = Get-ItilGhOwnerRepoSlug
$bodyText = Get-Content -LiteralPath $BodyFile -Raw -Encoding UTF8

if ($ArtifactType -eq 'ServiceRequest') {
    $sectionErrors = @(Test-ItilRequiredSections -Markdown $bodyText -ArtifactType 'ServiceRequest')
}
else {
    $sectionErrors = @(Test-ItilRequiredSections -Markdown $bodyText -ArtifactType 'ChangeRecord')
}

if ($sectionErrors.Count -gt 0) {
    $msg = 'Artifact body validation failed:' + "`n- " + ($sectionErrors -join "`n- ")
    throw $msg
}

$warnings = New-Object System.Collections.Generic.List[string]

$commentUrl = $null

if ($DryRun) {
    $warnings.Add('DryRun enabled: skipping gh issue comment and label mutation.')
}
else {
    $out = Invoke-ItilGhJson @('issue', 'comment', $Issue, '--repo', $slug, '--body-file', $BodyFile)
    if ($out.ExitCode -ne 0) {
        throw "gh issue comment failed: $($out.Raw)"
    }
    $commentUrl = $out.Raw.Trim()
}

$labelApplied = $false

if (-not [string]::IsNullOrWhiteSpace($ApplyExistingLabel)) {
    $list = Invoke-ItilGhJson @('label', 'list', '--repo', $slug, '--limit', '500', '--json', 'name')

    if ($list.ExitCode -ne 0) {
        throw "gh label list failed: $($list.Raw)"
    }

    $labelsArr = ($list.Raw | ConvertFrom-Json)

    $names = New-Object System.Collections.Generic.HashSet[string]
    foreach ($row in @($labelsArr)) {
        if ($row.name) {
            [void]$names.Add([string]$row.name)
        }
    }

    if (-not $names.Contains($ApplyExistingLabel)) {
        $warnings.Add("Label '$ApplyExistingLabel' does not exist in repo; skipping --add-label (per workflow rule).")
    }
    elseif ($DryRun) {
        $warnings.Add('DryRun enabled: skipping label apply.')
    }
    else {
        $o2 = Invoke-ItilGhJson @('issue', 'edit', $Issue, '--repo', $slug, '--add-label', $ApplyExistingLabel)
        if ($o2.ExitCode -ne 0) {
            throw "gh issue edit --add-label failed: $($o2.Raw)"
        }
        $labelApplied = $true
    }
}

$result = [ordered]@{
    issue        = $Issue
    slug         = $slug
    artifactType = $ArtifactType
    commentUrl   = $commentUrl
    labelApplied = $labelApplied
    warnings     = @($warnings)
}

if ($Json) {
    $result | ConvertTo-Json -Depth 6 -Compress
}
else {
    foreach ($w in $warnings) {
        Write-Warning $w
    }
    Write-Host ('Posted comment URL: {0}' -f $commentUrl)
    Write-Host ('Label applied: {0}' -f $labelApplied)
}

exit 0
