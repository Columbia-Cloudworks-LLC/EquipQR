#Requires -Version 5.1
<#
.SYNOPSIS
  Compose and post the short ITIL implementation follow-up comment template.

.PARAMETER VerificationFile
  JSON array [{ "command": "...", "pass": true }] or plaintext embedded in bash fenced output.

.PARAMETER PrTitle
  Optional; inferred via `gh pr view` when omitted.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][int]$Issue,

    [Parameter(Mandatory)][string]$ChangeRecordUrl,

    [Parameter(Mandatory)][string]$PrUrl,

    [Parameter(Mandatory)][string]$VerificationFile,

    [string]$DeviationsFile = '',

    [string]$PrTitle = '',

    [switch]$Merged,

    [switch]$DryRun,

    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'ItIlCommon.ps1')
. (Join-Path $here 'ItIlLogic.ps1')

Assert-CommandExists 'git'

Assert-CommandExists 'gh'

function Invoke-GitNative {
    param([Parameter(Mandatory)][string[]]$GitArguments)

    $prevEap = $ErrorActionPreference
    $prevNative = $null
    if (Get-Variable -Name 'PSNativeCommandUseErrorActionPreference' -ErrorAction SilentlyContinue) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }

    $ErrorActionPreference = 'Continue'
    try {

        $out = (& git @GitArguments 2>&1 | Out-String).TrimEnd()
        return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Text = $out }

    }

    finally {
        $ErrorActionPreference = $prevEap
        if ($null -ne $prevNative) {
            $PSNativeCommandUseErrorActionPreference = $prevNative

        }

    }

}

function Get-GitHubPullNumber {
    param([Parameter(Mandatory)][string]$UrlText)
    $u = [string]$UrlText.Trim()
    if ($u -notmatch '(?i)/pull/(\d+)') {
        throw "PrUrl missing /pull/<number> segment: $u"
    }
    return [int]$Matches[1]
}

function Build-VerificationBlockText {
    param([Parameter(Mandatory)][string]$VerificationPath)

    if (-not (Test-Path -LiteralPath $VerificationPath)) {
        throw "VerificationFile not found: $VerificationPath"
    }

    $raw = Get-Content -LiteralPath $VerificationPath -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw 'VerificationFile is empty.'
    }

    $ext = [System.IO.Path]::GetExtension($VerificationPath).ToLowerInvariant()

    if ($ext -eq '.json') {

        $parsed = $raw | ConvertFrom-Json

        $lines = New-Object System.Collections.Generic.List[string]

        foreach ($row in @($parsed)) {

            $cmd = $null
            if ($row.PSObject.Properties.Name -contains 'command') {
                $cmd = [string]$row.command

            }

            elseif ($row.PSObject.Properties.Name -contains 'Command') {
                $cmd = [string]$row.Command

            }

            else {
                throw 'Verification JSON entry missing command.'
            }

            $outTxt = ''

            if ($row.PSObject.Properties.Name -contains 'pass') {
                $outTxt = if ([bool]$row.pass) { 'PASS' } else { 'FAIL' }

            }

            elseif ($row.PSObject.Properties.Name -contains 'outcome') {
                $outTxt = ([string]$row.outcome)

            }

            else {
                throw "Verification JSON entry missing pass/outcome for command: $cmd"
            }

            $lines.Add(('{0}  # {1}' -f $cmd.Trim(), $outTxt))

        }

        return ($lines.ToArray() -join "`r`n")
    }

    return ($raw.TrimEnd())

}

function Read-OptionalTextFile([string]$Path, [string]$DefaultText) {
    if ([string]::IsNullOrWhiteSpace($Path)) {

        return $DefaultText

    }

    if (-not (Test-Path -LiteralPath $Path)) {

        throw "DeviationsFile not found: $Path"
    }

    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8).TrimEnd()
}

$repoRoot = Get-ItilRepoRootFromGit

Set-Location -LiteralPath $repoRoot

$slug = Get-ItilGhOwnerRepoSlug

$parts = Split-ItilOwnerRepo $slug

$shaFullLine = Invoke-GitNative @('rev-parse', 'HEAD')

if ($shaFullLine.ExitCode -ne 0) {
    throw "git rev-parse HEAD failed: $($shaFullLine.Text)"
}

$shaShortLine = Invoke-GitNative @('rev-parse', '--short', 'HEAD')

if ($shaShortLine.ExitCode -ne 0) {
    throw "git rev-parse --short HEAD failed: $($shaShortLine.Text)"

}

$branchLine = Invoke-GitNative @('rev-parse', '--abbrev-ref', 'HEAD')

if ($branchLine.ExitCode -ne 0) {

    throw "git branch resolution failed: $($branchLine.Text)"
}

$shaFull = $shaFullLine.Text.Trim()

$shaShort = $shaShortLine.Text.Trim()

$branchName = $branchLine.Text.Trim()

if ($branchName -eq 'HEAD') {
    throw 'Detached HEAD detected. Switch to your feature branch before Publish-ItilImplementationFollowup.ps1.'
}

$commitUrl = New-ItilCommitUrl -Owner $parts.Owner -Repo $parts.Repo -ShaFull $shaFull

if ([string]::IsNullOrWhiteSpace($PrTitle)) {

    $prNum = Get-GitHubPullNumber -UrlText $PrUrl

    $pt = Invoke-ItilGhJson @('pr', 'view', $prNum, '--repo', $slug, '--json', 'title')

    if ($pt.ExitCode -ne 0) {

        throw "Could not infer PR title: $($pt.Raw)"
    }

    $j = $pt.Raw | ConvertFrom-Json

    $PrTitle = [string]$j.title

}

$verificationJoined = Build-VerificationBlockText -VerificationPath $VerificationFile

$devTxt = Read-OptionalTextFile -Path $DeviationsFile -DefaultText 'None.'

$body = New-ItilImplementationFollowupBody `
    -IssueNumber $Issue `
    -ShortSha $shaShort `
    -CommitUrl $commitUrl `
    -BranchName $branchName `
    -ChangeRecordUrl $ChangeRecordUrl `
    -PrTitle $PrTitle `
    -PrUrl $PrUrl `
    -VerificationBlock $verificationJoined `
    -DeviationsBlock $devTxt `
    -MergedHint ([bool]$Merged)

$warnings = New-Object System.Collections.Generic.List[string]

if ($DryRun) {
    $warnings.Add('DryRun enabled: skipping gh issue comment.')

}

if ($DryRun -and -not $Json) {

    foreach ($w in $warnings) {
        Write-Warning $w
    }

    Write-Host '-- DryRun body preview --'
    Write-Host $body

    Write-Host '-- end preview --'

    exit 0

}

$followupUrl = ''

if (-not $DryRun) {

    $tempBodyPath = Join-Path $env:TEMP ('equipqr-itil-followup-{0}.md' -f [Guid]::NewGuid().ToString('N'))

    try {

        Write-ItilUtf8NoBomFile -Path $tempBodyPath -Content $body

        $out = Invoke-ItilGhJson @('issue', 'comment', $Issue, '--repo', $slug, '--body-file', $tempBodyPath)

        if ($out.ExitCode -ne 0) {

            throw "gh issue comment failed: $($out.Raw)"
        }

        $followupUrl = $out.Raw.Trim()

    }

    finally {

        if (Test-Path -LiteralPath $tempBodyPath) {

            Remove-Item -LiteralPath $tempBodyPath -Force -ErrorAction SilentlyContinue

        }

    }

}

$objOut = [ordered]@{

    issue           = $Issue

    slug            = $slug

    commitSha       = $shaFull

    shortSha        = $shaShort

    branch          = $branchName

    prUrl           = $PrUrl

    prTitle         = $PrTitle

    changeRecordUrl = $ChangeRecordUrl

    followupUrl     = $followupUrl

    mergedHint      = [bool]$Merged

    warnings        = @($warnings.ToArray())

    dryRun          = [bool]$DryRun

}

if ($Json) {

    if ($DryRun -and [string]::IsNullOrWhiteSpace($followupUrl)) {

        $objOut.followupPreview = $body

    }

    $objOut | ConvertTo-Json -Depth 10 -Compress

}

else {

    foreach ($w in $warnings) {

        Write-Warning $w
    }

    Write-Host ('Follow-up URL: {0}' -f $followupUrl)

}

exit 0
