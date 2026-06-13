# lint-on-edit.ps1 — afterFileEdit hook for .ts/.tsx files
# Runs ESLint on the edited file and blocks the agent until lint is clean.

$inputJson = [Console]::In.ReadToEnd()
$data = $inputJson | ConvertFrom-Json
$filePath = $data.path

# Only check TypeScript / TSX source files
if ($filePath -notmatch "\.(ts|tsx)$") {
    Write-Output '{ "continue": true }'
    exit 0
}

# Skip ambient declaration files
if ($filePath -match "\.d\.tsx?$") {
    Write-Output '{ "continue": true }'
    exit 0
}

if (-not (Test-Path -LiteralPath $filePath)) {
    Write-Output '{ "continue": true }'
    exit 0
}

Write-Host "Linting $filePath..."
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
try {
    # Run ESLint via node directly; SilentlyContinue avoids NativeCommandError wrappers on stderr.
    $eslintOutput = (
        & node "node_modules/eslint/bin/eslint.js" $filePath --no-ignore --max-warnings 0 --format stylish 2>&1
    ) | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { $_ } } | Out-String
    $eslintExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $prevErrorAction
}

if ($eslintExitCode -ne 0) {
    $errorSummary = (
        ($eslintOutput -split "`r?`n" |
            Where-Object {
                $line = $_.Trim()
                $line -ne "" -and
                $line -notmatch '^(At |\+ |CategoryInfo|FullyQualifiedErrorId|npx\.cmd :)'
            }) |
            Select-Object -First 20
    ) -join "`n"

    $response = @{
        continue      = $false
        agent_message = "ESLint failed on $filePath. Fix all lint errors and warnings before continuing.`n`n$errorSummary"
    }

    Write-Output ($response | ConvertTo-Json -Depth 5)
    exit 1
}

Write-Output '{ "continue": true }'
exit 0
