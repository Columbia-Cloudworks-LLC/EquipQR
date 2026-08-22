# Cursor stdin adapter. Matching and lint spawn live in dev/lint-catalog.mjs.
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
$engine = Join-Path $repoRoot "dev\lint-catalog.mjs"
$stderrFile = [System.IO.Path]::GetTempFileName()
try {
    $ErrorActionPreference = 'Continue'
    $output = & node $engine --mode hook --path $filePath 2>$stderrFile | Out-String
    $code = $LASTEXITCODE
    if ([string]::IsNullOrWhiteSpace($output)) {
        $err = ''
        if (Test-Path -LiteralPath $stderrFile) {
            $err = Get-Content -LiteralPath $stderrFile -Raw -ErrorAction SilentlyContinue
        }
        $detail = if (-not [string]::IsNullOrWhiteSpace($err)) { $err.Trim() } else { 'engine produced no JSON' }
        $payload = @{ continue = $false; agent_message = "lint hook: $detail" } | ConvertTo-Json -Compress
        Write-Output $payload
        exit 1
    }
    Write-Output $output.Trim()
    if ($code -ne 0) { exit 1 }
    exit 0
} finally {
    Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
}
