param(
    [string]$AppEnvironmentId = "ylilu4hpf6nq6bfm5ykg6nh2kq",
    [string]$EdgeEnvironmentId = "f4rdrusaoxvzwngz2jxs7vy7ye",
    [int]$ApiPort = 54321,
    [switch]$AppOnly,
    [switch]$EdgeOnly
)

$ErrorActionPreference = "Stop"

if ($AppOnly -and $EdgeOnly) {
    Write-Host "       ERROR: Use at most one of -AppOnly and -EdgeOnly."
    exit 2
}

$doApp = $true
$doEdge = $true
if ($AppOnly) { $doEdge = $false }
if ($EdgeOnly) { $doApp = $false }

$workspaceRoot = Split-Path -Parent $PSScriptRoot

function Add-EnvLines {
    param(
        [System.Collections.Specialized.OrderedDictionary]$Result,
        [string[]]$Lines,
        [bool]$Overwrite
    )
    foreach ($line in $Lines) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        if ($line -match '^\s*([A-Z0-9_]+)\s*=(.*)$') {
            $k = $matches[1]; $v = $matches[2]
            if ($Overwrite -or -not $Result.Contains($k)) {
                $Result[$k] = $v
            }
        }
    }
}

function Read-OpEnvironmentRaw {
    param([string]$EnvironmentId)
    $opOutput = & op environment read $EnvironmentId 2>$null
    if ($LASTEXITCODE -ne 0) {
        return @{ Ok = $false; ExitCode = $LASTEXITCODE; Raw = $null }
    }
    $opRaw = ($opOutput -join [Environment]::NewLine).Trim()
    if ([string]::IsNullOrWhiteSpace($opRaw)) {
        return @{ Ok = $false; ExitCode = 1; Raw = $null }
    }
    return @{ Ok = $true; ExitCode = 0; Raw = $opRaw }
}

function Write-EnvFile {
    param(
        [string]$Path,
        [System.Collections.Specialized.OrderedDictionary]$Result
    )
    $outputLines = [System.Collections.Generic.List[string]]::new()
    foreach ($key in $Result.Keys) {
        $outputLines.Add("$key=$($Result[$key])")
    }
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText(
        $Path,
        (($outputLines -join [Environment]::NewLine) + [Environment]::NewLine),
        $utf8NoBom
    )
}

function Sync-AppViteMirrors {
    param([System.Collections.Specialized.OrderedDictionary]$Result)

    $mirrorMap = [ordered]@{
        "SUPABASE_URL"             = "VITE_SUPABASE_URL"
        "SUPABASE_ANON_KEY"        = "VITE_SUPABASE_ANON_KEY"
        "PRODUCTION_URL"           = "VITE_PRODUCTION_URL"
        "INTUIT_CLIENT_ID"         = "VITE_INTUIT_CLIENT_ID"
        "QB_OAUTH_REDIRECT_BASE_URL" = "VITE_QB_OAUTH_REDIRECT_BASE_URL"
        "ENABLE_DEVTOOLS"          = "VITE_ENABLE_DEVTOOLS"
        "ENABLE_QUICKBOOKS"        = "VITE_ENABLE_QUICKBOOKS"
        "ENABLE_QB_PDF_ATTACHMENT" = "VITE_ENABLE_QB_PDF_ATTACHMENT"
        "VAPID_PUBLIC_KEY"         = "VITE_VAPID_PUBLIC_KEY"
        "GOOGLE_PICKER_API_KEY"    = "VITE_GOOGLE_PICKER_API_KEY"
        "GOOGLE_PICKER_APP_ID"     = "VITE_GOOGLE_PICKER_APP_ID"
        "GOOGLE_PICKER_CLIENT_ID"  = "VITE_GOOGLE_PICKER_CLIENT_ID"
    }

    $setCount = 0
    foreach ($sourceKey in $mirrorMap.Keys) {
        $targetKey = $mirrorMap[$sourceKey]
        if ($Result.Contains($targetKey)) {
            $Result.Remove($targetKey) | Out-Null
        }
        if ($Result.Contains($sourceKey)) {
            $Result[$targetKey] = $Result[$sourceKey]
            $setCount++
        }
    }

    return @{ SetCount = $setCount; Total = $mirrorMap.Count }
}

$anyFailure = $false

if ($doApp) {
    $targetPath = Join-Path $workspaceRoot ".env"
    $read = Read-OpEnvironmentRaw -EnvironmentId $AppEnvironmentId
    if (-not $read.Ok) {
        Write-Host "       WARNING: op environment read failed for app env (exit $($read.ExitCode))."
        $anyFailure = $true
    } else {
        $result = [ordered]@{}
        if (Test-Path -LiteralPath $targetPath) {
            $existingLines = Get-Content -LiteralPath $targetPath
            Add-EnvLines -Result $result -Lines $existingLines -Overwrite $false
        }
        $opLines = $read.Raw -split '\r?\n'
        Add-EnvLines -Result $result -Lines $opLines -Overwrite $true
        $mirrorStats = Sync-AppViteMirrors -Result $result
        Write-EnvFile -Path $targetPath -Result $result
        Write-Host "       Synced $($result.Keys.Count) keys from 1Password into .env"
        Write-Host "       Mirrored $($mirrorStats.SetCount)/$($mirrorStats.Total) VITE_* keys from canonical app keys."
    }
}

if ($doEdge) {
    $targetPath = Join-Path $workspaceRoot "supabase\functions\.env"
    $localSupabaseUrl = "http://localhost:$ApiPort"
    $localQbRedirect = "$localSupabaseUrl/functions/v1/quickbooks-oauth-callback"

    $read = Read-OpEnvironmentRaw -EnvironmentId $EdgeEnvironmentId
    if (-not $read.Ok) {
        Write-Host "       WARNING: op environment read failed for edge env (exit $($read.ExitCode))."
        $anyFailure = $true
    } else {
        $result = [ordered]@{}
        if (Test-Path -LiteralPath $targetPath) {
            $existingLines = Get-Content -LiteralPath $targetPath
            Add-EnvLines -Result $result -Lines $existingLines -Overwrite $false
        }
        $opLines = $read.Raw -split '\r?\n'
        Add-EnvLines -Result $result -Lines $opLines -Overwrite $true

        $result['INTUIT_REDIRECT_URI'] = $localQbRedirect
        $result['QB_OAUTH_REDIRECT_BASE_URL'] = $localSupabaseUrl
        $result['GW_OAUTH_REDIRECT_BASE_URL'] = $localSupabaseUrl

        $reservedKeys = [System.Collections.Generic.List[string]]::new()
        foreach ($key in $result.Keys) {
            if ($key -like 'SUPABASE_*') { $reservedKeys.Add($key) }
        }
        foreach ($key in $reservedKeys) {
            $result.Remove($key) | Out-Null
        }
        if ($reservedKeys.Count -gt 0) {
            Write-Host "       Stripped $($reservedKeys.Count) SUPABASE_* key(s) (auto-injected by CLI)."
        }

        Write-EnvFile -Path $targetPath -Result $result
        Write-Host "       Synced $($result.Keys.Count) keys from 1Password into supabase\functions\.env"
    }
}

if ($anyFailure) { exit 1 }
exit 0
