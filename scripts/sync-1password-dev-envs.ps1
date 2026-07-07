param(
    [Alias('AppEnvironmentId')]
    [string]$AppItem = "app-env-local-dev",
    [Alias('EdgeEnvironmentId')]
    [string]$EdgeItem = "edge-env-local-dev",
    [int]$ApiPort = 54321,
    [switch]$AppOnly,
    [switch]$EdgeOnly
)

$ErrorActionPreference = "Stop"

if ($AppOnly -and $EdgeOnly) {
    Write-Host "       ERROR: Use at most one of -AppOnly and -EdgeOnly."
    exit 2
}

if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
    $userScopeToken = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    if ($userScopeToken) {
        $env:OP_SERVICE_ACCOUNT_TOKEN = $userScopeToken
    }
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

function Read-OpItemEnvLines {
    param([string]$Item)

    $opOutput = & op item get $Item --vault "EquipQR Agents" --format json 2>$null
    if ($LASTEXITCODE -ne 0) {
        return @{ Ok = $false; ExitCode = $LASTEXITCODE; Lines = @(); Reason = 'op item get failed' }
    }

    $itemJson = ($opOutput -join [Environment]::NewLine)
    try {
        $opItem = $itemJson | ConvertFrom-Json
    } catch {
        return @{ Ok = $false; ExitCode = 1; Lines = @(); Reason = 'op item JSON parse failed' }
    }

    $lines = [System.Collections.Generic.List[string]]::new()

    if ($opItem.notesPlain) {
        foreach ($line in ($opItem.notesPlain -split '\r?\n')) {
            if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
            if ($line -match '^\s*[A-Za-z][A-Za-z0-9_]*\s*=') {
                $lines.Add($line)
            }
        }
    }

    foreach ($field in @($opItem.fields)) {
        if (-not $field.label -or $null -eq $field.value) { continue }
        $key = ([string]$field.label).Trim()
        if ($key -notmatch '^[A-Za-z][A-Za-z0-9_]*$') { continue }

        $value = [string]$field.value
        if ([string]::IsNullOrWhiteSpace($value)) { continue }

        $lines.Add("$($key.ToUpperInvariant())=$value")
    }

    if ($lines.Count -eq 0) {
        return @{ Ok = $false; ExitCode = 1; Lines = @(); Reason = 'no env-like fields found on item' }
    }

    return @{ Ok = $true; ExitCode = 0; Lines = $lines.ToArray(); Reason = 'ok' }
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
        "PUBLIC_SITE_URL"          = "VITE_PUBLIC_SITE_URL"
        "PRODUCTION_URL"           = "VITE_PRODUCTION_URL"
        "INTUIT_CLIENT_ID"         = "VITE_INTUIT_CLIENT_ID"
        "ENABLE_DEVTOOLS"          = "VITE_ENABLE_DEVTOOLS"
        "VAPID_PUBLIC_KEY"         = "VITE_VAPID_PUBLIC_KEY"
        "GOOGLE_PICKER_API_KEY"    = "VITE_GOOGLE_PICKER_API_KEY"
        "GOOGLE_PICKER_APP_ID"     = "VITE_GOOGLE_PICKER_APP_ID"
        "GOOGLE_PICKER_CLIENT_ID"  = "VITE_GOOGLE_PICKER_CLIENT_ID"
        "GOOGLE_WORKSPACE_CLIENT_ID" = "VITE_GOOGLE_WORKSPACE_CLIENT_ID"
        # Without this mirror the local frontend never renders the hCaptcha
        # widget while the local edge runtime enforces it (secret present in
        # edge-env-local-dev), so public-form submits 400 with
        # "CAPTCHA verification is required" (#1164 full-suite verification).
        "HCAPTCHA_SITEKEY"         = "VITE_HCAPTCHA_SITEKEY"
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
    $read = Read-OpItemEnvLines -Item $AppItem
    if (-not $read.Ok) {
        Write-Host "       WARNING: Could not read app item '$AppItem' (exit $($read.ExitCode)): $($read.Reason)."
        $anyFailure = $true
    } else {
        $result = [ordered]@{}
        if (Test-Path -LiteralPath $targetPath) {
            $existingLines = Get-Content -LiteralPath $targetPath
            Add-EnvLines -Result $result -Lines $existingLines -Overwrite $false
        }
        $opLines = $read.Lines
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

    $read = Read-OpItemEnvLines -Item $EdgeItem
    if (-not $read.Ok) {
        Write-Host "       WARNING: Could not read edge item '$EdgeItem' (exit $($read.ExitCode)): $($read.Reason)."
        $anyFailure = $true
    } else {
        $result = [ordered]@{}
        if (Test-Path -LiteralPath $targetPath) {
            $existingLines = Get-Content -LiteralPath $targetPath
            Add-EnvLines -Result $result -Lines $existingLines -Overwrite $false
        }
        $opLines = $read.Lines
        Add-EnvLines -Result $result -Lines $opLines -Overwrite $true

        $result['INTUIT_REDIRECT_URI'] = $localQbRedirect
        if (-not $result.Contains('PUBLIC_SITE_URL')) {
            $result['PUBLIC_SITE_URL'] = 'http://localhost:8080'
        }

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
