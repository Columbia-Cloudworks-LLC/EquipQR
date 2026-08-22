# Cursor stdin adapter. Matching and lint spawn live in scripts/lint-catalog.mjs.
$inputJson = [Console]::In.ReadToEnd()
try {
    $filePath = ($inputJson | ConvertFrom-Json).path
} catch {
    Write-Output '{ "continue": false, "agent_message": "lint hook: invalid stdin JSON" }'
    exit 1
}
if (-not $filePath -or -not (Test-Path -LiteralPath $filePath)) {
    Write-Output '{ "continue": true }'
    exit 0
}
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$engine = Join-Path $repoRoot "scripts\lint-catalog.mjs"
$ErrorActionPreference = 'SilentlyContinue'
$output = & node $engine --mode hook --path $filePath | Out-String
$code = $LASTEXITCODE
if ([string]::IsNullOrWhiteSpace($output)) {
    Write-Output '{ "continue": false, "agent_message": "lint hook: engine produced no JSON" }'
    exit 1
}
Write-Output $output.Trim()
if ($code -ne 0) { exit 1 }
exit 0
