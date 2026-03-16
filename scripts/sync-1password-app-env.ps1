param(
    [string]$EnvironmentId = "ylilu4hpf6nq6bfm5ykg6nh2kq"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$targetPath = Join-Path $workspaceRoot ".env"

$opOutput = & op environment read $EnvironmentId 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "       WARNING: op environment read failed (exit $LASTEXITCODE)."
    exit 1
}

$opRaw = ($opOutput -join [Environment]::NewLine).Trim()
if ([string]::IsNullOrWhiteSpace($opRaw)) {
    Write-Host "       WARNING: 1Password environment returned empty output."
    exit 1
}

$result = [ordered]@{}

function Add-EnvLines {
    param([string[]]$Lines, [bool]$Overwrite)
    foreach ($line in $Lines) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        if ($line -match '^\s*([A-Z0-9_]+)\s*=(.*)$') {
            $k = $matches[1]; $v = $matches[2]
            if ($Overwrite -or -not $result.Contains($k)) {
                $result[$k] = $v
            }
        }
    }
}

if (Test-Path -LiteralPath $targetPath) {
    $existingLines = Get-Content -LiteralPath $targetPath
    Add-EnvLines -Lines $existingLines -Overwrite $false
}

$opLines = $opRaw -split '\r?\n'
Add-EnvLines -Lines $opLines -Overwrite $true

$outputLines = [System.Collections.Generic.List[string]]::new()
foreach ($key in $result.Keys) {
    $outputLines.Add("$key=$($result[$key])")
}

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText(
    $targetPath,
    (($outputLines -join [Environment]::NewLine) + [Environment]::NewLine),
    $utf8NoBom
)

Write-Host "       Synced $($result.Keys.Count) keys from 1Password into .env"
exit 0
