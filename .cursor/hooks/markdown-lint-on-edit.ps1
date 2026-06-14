# markdown-lint-on-edit.ps1 — afterFileEdit hook for .md/.mdc files
# Runs markdownlint-cli2 on the edited file and blocks the agent until lint is clean.

$inputJson = [Console]::In.ReadToEnd()
$data = $inputJson | ConvertFrom-Json
$filePath = $data.path

if ($filePath -notmatch "\.(md|mdc)$") {
    Write-Output '{ "continue": true }'
    exit 0
}

if (-not (Test-Path -LiteralPath $filePath)) {
    Write-Output '{ "continue": true }'
    exit 0
}

$cliPath = Join-Path (Get-Location) "node_modules\markdownlint-cli2\markdownlint-cli2-bin.mjs"
if (-not (Test-Path -LiteralPath $cliPath)) {
    $response = @{
        continue      = $false
        agent_message = "markdownlint-cli2 is not installed. Run npm install (or npm ci) so the markdown lint hook can enforce .md/.mdc quality."
    }
    Write-Output ($response | ConvertTo-Json -Depth 5)
    exit 1
}

Write-Host "Markdown linting $filePath..."
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
try {
    $lintOutput = (
        & node $cliPath --no-globs $filePath 2>&1
    ) | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { $_ } } | Out-String
    $lintExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $prevErrorAction
}

if ($lintExitCode -ne 0) {
    $errorSummary = (
        ($lintOutput -split "`r?`n" |
            Where-Object {
                $line = $_.Trim()
                $line -ne "" -and
                $line -notmatch '^(At |\+ |CategoryInfo|FullyQualifiedErrorId|npx\.cmd :)'
            }) |
            Select-Object -First 25
    ) -join "`n"

    $response = @{
        continue      = $false
        agent_message = "markdownlint failed on $filePath. Fix all markdown lint violations before continuing.`n`n$errorSummary"
    }

    Write-Output ($response | ConvertTo-Json -Depth 5)
    exit 1
}

Write-Output '{ "continue": true }'
exit 0
