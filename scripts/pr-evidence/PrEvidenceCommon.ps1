#Requires -Version 5.1
# Shared helpers for scripts/pr-evidence/*.ps1 (dot-source only). ASCII-only for PS 5.1.

function Get-PrEvidenceScriptDirectory {
    return Split-Path -Parent $MyInvocation.ScriptName
}

function Get-PrEvidenceRepoRoot {
    $prevNative = $null
    if (Get-Variable -Name 'PSNativeCommandUseErrorActionPreference' -ErrorAction SilentlyContinue) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $top = & git rev-parse --show-toplevel 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Not inside a git repository: $top"
        }
        return $top.Trim()
    }
    finally {
        $ErrorActionPreference = $prevEap
        if ($null -ne $prevNative) {
            $PSNativeCommandUseErrorActionPreference = $prevNative
        }
    }
}

function Assert-PrEvidenceCommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found on PATH: $Name"
    }
}

function Invoke-PrEvidenceNative {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$Arguments = @()
    )

    $prevEap = $ErrorActionPreference
    $prevNative = $null
    if (Get-Variable -Name 'PSNativeCommandUseErrorActionPreference' -ErrorAction SilentlyContinue) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }

    $ErrorActionPreference = 'Continue'
    try {
        $out = (& $FilePath @Arguments 2>&1 | Out-String).TrimEnd()
        return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Text = $out }
    }
    finally {
        $ErrorActionPreference = $prevEap
        if ($null -ne $prevNative) {
            $PSNativeCommandUseErrorActionPreference = $prevNative
        }
    }
}

function Get-PrEvidenceBranchSlug {
    param([string]$Branch = '')

    if ([string]::IsNullOrWhiteSpace($Branch)) {
        $result = Invoke-PrEvidenceNative -FilePath 'git' -Arguments @('rev-parse', '--abbrev-ref', 'HEAD')
        if ($result.ExitCode -ne 0) {
            throw "git rev-parse --abbrev-ref HEAD failed: $($result.Text)"
        }
        $Branch = $result.Text.Trim()
    }

    $slug = ($Branch.ToLower() -replace '[^a-z0-9-]+', '-' -replace '-+', '-' -replace '^-|-$', '')
    if ([string]::IsNullOrWhiteSpace($slug)) {
        return 'preview'
    }
    return $slug
}

function Set-PrEvidenceUploadEnvironment {
    $token = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw 'OP_SERVICE_ACCOUNT_TOKEN (User scope) is required to upload PR evidence to preview Supabase Storage.'
    }
    $env:OP_SERVICE_ACCOUNT_TOKEN = $token

    Assert-PrEvidenceCommandExists 'op'

    $urlRead = Invoke-PrEvidenceNative -FilePath 'op' -Arguments @(
        'read', 'op://EquipQR Agents/app-env-preview-public/VITE_SUPABASE_URL'
    )
    if ($urlRead.ExitCode -ne 0) {
        throw "op read VITE_SUPABASE_URL failed: $($urlRead.Text)"
    }

    $keyRead = Invoke-PrEvidenceNative -FilePath 'op' -Arguments @(
        'read', 'op://EquipQR Agents/edge-env-preview-secrets/SUPABASE_SERVICE_ROLE_KEY'
    )
    if ($keyRead.ExitCode -ne 0) {
        throw "op read SUPABASE_SERVICE_ROLE_KEY failed: $($keyRead.Text)"
    }

    $env:SUPABASE_URL = $urlRead.Text.Trim()
    $env:SUPABASE_SERVICE_ROLE_KEY = $keyRead.Text.Trim()
}

function Test-PrEvidenceLocalStack {
    param([string]$BaseUrl = 'http://localhost:8080')

    $probeScript = @"
import { evaluateLocalStack } from './scripts/lib/e2e-stack-preflight.mjs';
const result = await evaluateLocalStack({ appUrl: '$BaseUrl' });
console.log(JSON.stringify(result));
"@

    $repoRoot = Get-PrEvidenceRepoRoot
    $tempScript = Join-Path $env:TEMP ("pr-evidence-probe-{0}.mjs" -f ([guid]::NewGuid().ToString('N')))
    Set-Content -LiteralPath $tempScript -Value $probeScript -Encoding utf8

    try {
        Push-Location -LiteralPath $repoRoot
        $result = Invoke-PrEvidenceNative -FilePath 'node' -Arguments @($tempScript)
        if ($result.ExitCode -ne 0) {
            throw "Stack probe failed: $($result.Text)"
        }
        $parsed = $result.Text | ConvertFrom-Json
        return [pscustomobject]@{
            AppReady = [bool]$parsed.appReady
            SupabaseReady = [bool]$parsed.supabaseReady
        }
    }
    finally {
        Pop-Location
        if (Test-Path -LiteralPath $tempScript) {
            Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
        }
    }
}

function Convert-PrEvidenceWebmToGif {
    param(
        [Parameter(Mandatory)][string]$WebmPath,
        [Parameter(Mandatory)][string]$GifPath
    )

    Assert-PrEvidenceCommandExists 'ffmpeg'

    $webmFull = if ([System.IO.Path]::IsPathRooted($WebmPath)) { $WebmPath } else { Join-Path (Get-PrEvidenceRepoRoot) $WebmPath }
    $gifFull = if ([System.IO.Path]::IsPathRooted($GifPath)) { $GifPath } else { Join-Path (Get-PrEvidenceRepoRoot) $GifPath }

    if (-not (Test-Path -LiteralPath $webmFull)) {
        throw "WebM not found for GIF conversion: $webmFull"
    }

    $gifDir = Split-Path -Parent $gifFull
    if (-not (Test-Path -LiteralPath $gifDir)) {
        New-Item -ItemType Directory -Path $gifDir -Force | Out-Null
    }

    $args = @(
        '-y',
        '-i', $webmFull,
        '-vf', 'fps=10,scale=960:-1:flags=lanczos',
        $gifFull
    )

    $result = Invoke-PrEvidenceNative -FilePath 'ffmpeg' -Arguments $args
    if ($result.ExitCode -ne 0) {
        throw "ffmpeg GIF conversion failed: $($result.Text)"
    }
}

function Find-PrEvidenceWebm {
    param([Parameter(Mandatory)][string]$SearchRoot)

    $files = @(Get-ChildItem -LiteralPath $SearchRoot -Recurse -Filter 'video.webm' -File -ErrorAction SilentlyContinue)
    if ($files.Count -eq 0) {
        return $null
    }
    return $files[0].FullName
}
