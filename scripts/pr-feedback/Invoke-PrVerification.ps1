#Requires -Version 5.1
<#
.SYNOPSIS
  Run local verification gates for PR feedback / raise (lint, typecheck, test, build).

.DESCRIPTION
  Stops at first failing command by default (unless -ContinueOnFailure).
  Matches `.cursor/skills/address-pr-feedback` and `.cursor/skills/raise` gate order.

.PARAMETER SkipTest
  Skip `npm test`.

.PARAMETER SkipBuild
  Skip `npm run build`.

.PARAMETER TypeCheck
  How to typecheck: `Tsc` (default, `npx tsc --noEmit`) or `NpmScript` (`npm run type-check`).

.PARAMETER ContinueOnFailure
  Run all steps even if one fails (exit code is non-zero if any failed).

.PARAMETER Json
  Emit JSON summary to stdout.

.EXAMPLE
  .\scripts\pr-feedback\Invoke-PrVerification.ps1
  .\scripts\pr-feedback\Invoke-PrVerification.ps1 -SkipBuild -Json
#>
[CmdletBinding()]
param(
    [switch]$SkipTest,
    [switch]$SkipBuild,
    [ValidateSet('Tsc', 'NpmScript')]
    [string]$TypeCheck = 'Tsc',
    [switch]$ContinueOnFailure,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'PrFeedbackCommon.ps1')

Assert-CommandExists 'git'
Assert-CommandExists 'npm'

$npmPath = $null
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($npmCmd) {
    $npmPath = $npmCmd.Path
}
else {
    $npmAny = Get-Command npm -CommandType Application -ErrorAction SilentlyContinue
    if ($npmAny) {
        $npmPath = $npmAny.Path
    }
}
if (-not $npmPath) {
    throw "Could not resolve npm.cmd on PATH."
}

$prevPwd = Get-Location
try {
    $top = (& git rev-parse --show-toplevel 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Not inside a git repository: $top"
    }
    $repoRoot = $top.Trim()
    Set-Location -LiteralPath $repoRoot

    $typeCheckCmd = if ($TypeCheck -eq 'NpmScript') {
        @{ Name = 'npm run type-check'; Args = @('run', 'type-check') }
    }
    else {
        @{ Name = 'npm exec -- tsc --noEmit'; Args = @('exec', '--', 'tsc', '--noEmit') }
    }

    $steps = [System.Collections.Generic.List[object]]::new()
    $steps.Add([pscustomobject]@{ Name = 'npm ci --prefer-offline --no-audit'; Args = @('ci', '--prefer-offline', '--no-audit') })
    $steps.Add([pscustomobject]@{ Name = 'npm run lint'; Args = @('run', 'lint') })
    $steps.Add([pscustomobject]@{ Name = $typeCheckCmd.Name; Args = $typeCheckCmd.Args })

    if (-not $SkipTest) {
        $steps.Add([pscustomobject]@{ Name = 'npm test'; Args = @('test') })
    }
    if (-not $SkipBuild) {
        $steps.Add([pscustomobject]@{ Name = 'npm run build'; Args = @('run', 'build') })
    }

    $results = [System.Collections.Generic.List[object]]::new()
    $anyFail = $false

    foreach ($step in $steps) {
        $prevEap = $ErrorActionPreference
        $prevNative = $null
        if (Get-Variable -Name 'PSNativeCommandUseErrorActionPreference' -ErrorAction SilentlyContinue) {
            $prevNative = $PSNativeCommandUseErrorActionPreference
            $PSNativeCommandUseErrorActionPreference = $false
        }
        $ErrorActionPreference = 'Continue'

        $log = $null
        $code = 0
        try {
            $log = & $npmPath @($step.Args) 2>&1 | Out-String
            $code = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $prevEap
            if ($null -ne $prevNative) {
                $PSNativeCommandUseErrorActionPreference = $prevNative
            }
        }

        $ok = ($code -eq 0)
        if (-not $ok) { $anyFail = $true }

        $results.Add([pscustomobject]@{
                name   = $step.Name
                exitCode = $code
                passed   = $ok
                logTail  = if ($log) { ($log.TrimEnd() -split "`r?`n" | Select-Object -Last 25) -join "`n" } else { '' }
            })

        if (-not $ok -and -not $ContinueOnFailure) {
            break
        }
    }

    $payload = [ordered]@{
        repoRoot = $repoRoot
        steps    = @($results)
        allPassed = -not $anyFail
    }

    if ($Json) {
        $payload | ConvertTo-Json -Depth 8 -Compress
    }
    else {
        foreach ($r in $results) {
            $mark = if ($r.passed) { 'PASS' } else { 'FAIL' }
            Write-Host ("[{0}] {1} (exit {2})" -f $mark, $r.name, $r.exitCode)
            if (-not $r.passed -and $r.logTail) {
                Write-Host $r.logTail
            }
        }
    }

    if ($anyFail) {
        exit 1
    }
}
finally {
    Set-Location -LiteralPath $prevPwd.Path
}

exit 0
