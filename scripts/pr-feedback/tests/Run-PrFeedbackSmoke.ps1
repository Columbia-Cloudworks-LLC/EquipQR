#Requires -Version 5.1
# Syntax check all scripts under scripts/pr-feedback and run unit tests.

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pfDir = Resolve-Path (Join-Path $here '..')

function Test-ParseFile {
    param([string]$Path)
    $errs = $null
    $tok = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tok, [ref]$errs)
    if ($errs -and $errs.Count -gt 0) {
        foreach ($e in $errs) {
            Write-Host ("PARSE FAIL {0}: {1}" -f $Path, $e.Message)
        }
        throw "Parse errors in $Path"
    }
}

Get-ChildItem -LiteralPath $pfDir -Filter '*.ps1' -File | ForEach-Object {
    Test-ParseFile -Path $_.FullName
    Write-Host ("Syntax OK: {0}" -f $_.Name)
}

& (Join-Path $here 'Run-PrFeedbackTests.ps1')
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Smoke: OK"
exit 0
