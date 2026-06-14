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
        'read', 'op://EquipQR Agents/app-env-preview-public/SUPABASE_URL'
    )
    if ($urlRead.ExitCode -ne 0) {
        throw "op read SUPABASE_URL failed: $($urlRead.Text)"
    }

    $keyRead = Invoke-PrEvidenceNative -FilePath 'op' -Arguments @(
        'read', 'op://EquipQR Agents/supabase-write/preview_service_role_key'
    )
    if ($keyRead.ExitCode -ne 0) {
        throw "op read preview_service_role_key failed: $($keyRead.Text)"
    }

    $env:SUPABASE_URL = $urlRead.Text.Trim()
    $env:SUPABASE_SERVICE_ROLE_KEY = $keyRead.Text.Trim()
}

function Test-PrEvidenceLocalStack {
    param([string]$BaseUrl = 'http://localhost:8080')

    $repoRoot = Get-PrEvidenceRepoRoot
    $preflightModule = Join-Path $repoRoot 'scripts\lib\e2e-stack-preflight.mjs'
    if (-not (Test-Path -LiteralPath $preflightModule)) {
        throw "Stack preflight module not found: $preflightModule"
    }
    $preflightUrl = ([System.Uri]::new((Resolve-Path -LiteralPath $preflightModule).Path)).AbsoluteUri

    $probeScript = @"
import { evaluateLocalStack } from '$preflightUrl';
const result = await evaluateLocalStack({ appUrl: '$BaseUrl' });
console.log(JSON.stringify(result));
"@

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

function Get-PrEvidenceVideoDimensions {
    param([Parameter(Mandatory)][string]$VideoPath)

    Assert-PrEvidenceCommandExists 'ffprobe'

    $result = Invoke-PrEvidenceNative -FilePath 'ffprobe' -Arguments @(
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=p=0:s=x',
        $VideoPath
    )

    if ($result.ExitCode -ne 0) {
        throw "ffprobe failed for ${VideoPath}: $($result.Text)"
    }

    $parts = $result.Text.Trim() -split 'x'
    if ($parts.Count -ne 2) {
        throw "Unexpected ffprobe dimensions for ${VideoPath}: $($result.Text)"
    }

    return [pscustomobject]@{
        Width  = [int]$parts[0]
        Height = [int]$parts[1]
    }
}

function Get-PrEvidenceRecordingViewport {
    param(
        [switch]$MobileViewport
    )

    $repoRoot = Get-PrEvidenceRepoRoot
    $modulePath = Join-Path $repoRoot 'scripts\lib\recording-quality.mjs'
    if (-not (Test-Path -LiteralPath $modulePath)) {
        throw "Recording quality module not found: $modulePath"
    }
    $moduleUrl = ([System.Uri]::new((Resolve-Path -LiteralPath $modulePath).Path)).AbsoluteUri
    $exportName = if ($MobileViewport) { 'MOBILE_RECORDING_VIEWPORT' } else { 'RECORDING_VIEWPORT' }

    $script = @"
import { $exportName } from '$moduleUrl';
console.log(JSON.stringify($exportName));
"@

    $tempScript = Join-Path $env:TEMP ("pr-evidence-viewport-{0}.mjs" -f ([guid]::NewGuid().ToString('N')))
    Set-Content -LiteralPath $tempScript -Value $script -Encoding utf8

    try {
        $result = Invoke-PrEvidenceNative -FilePath 'node' -Arguments @($tempScript)
        if ($result.ExitCode -ne 0) {
            throw "Recording viewport lookup failed: $($result.Text)"
        }
        return ($result.Text.Trim() | ConvertFrom-Json)
    }
    finally {
        if (Test-Path -LiteralPath $tempScript) {
            Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
        }
    }
}

function Get-PrEvidenceGifFfmpegFilter {
    param(
        [Parameter(Mandatory)][int]$InputWidth,
        [Parameter(Mandatory)][int]$InputHeight,
        [int]$ViewportWidth = 0,
        [int]$ViewportHeight = 0
    )

    Assert-PrEvidenceCommandExists 'node'

    if ($ViewportWidth -le 0) {
        $ViewportWidth = [int]($env:PR_EVIDENCE_VIEWPORT_WIDTH)
        if ($ViewportWidth -le 0) { $ViewportWidth = 1920 }
    }
    if ($ViewportHeight -le 0) {
        $ViewportHeight = [int]($env:PR_EVIDENCE_VIEWPORT_HEIGHT)
        if ($ViewportHeight -le 0) { $ViewportHeight = 1080 }
    }

    $repoRoot = Get-PrEvidenceRepoRoot
    $modulePath = Join-Path $repoRoot 'scripts\lib\pr-evidence-video.mjs'
    if (-not (Test-Path -LiteralPath $modulePath)) {
        throw "PR evidence video helper not found: $modulePath"
    }
    $moduleUrl = ([System.Uri]::new((Resolve-Path -LiteralPath $modulePath).Path)).AbsoluteUri

    $script = @"
import { buildPrEvidenceGifFfmpegFilter, resolvePrEvidenceGifOutputWidth } from '$moduleUrl';
const viewport = { width: $ViewportWidth, height: $ViewportHeight };
const fps = viewport.width < 768 ? 6 : 15;
console.log(buildPrEvidenceGifFfmpegFilter($InputWidth, $InputHeight, viewport, resolvePrEvidenceGifOutputWidth(viewport), fps));
"@

    $tempScript = Join-Path $env:TEMP ("pr-evidence-filter-{0}.mjs" -f ([guid]::NewGuid().ToString('N')))
    Set-Content -LiteralPath $tempScript -Value $script -Encoding utf8

    try {
        $result = Invoke-PrEvidenceNative -FilePath 'node' -Arguments @($tempScript)
        if ($result.ExitCode -ne 0) {
            throw "PR evidence GIF filter build failed: $($result.Text)"
        }
        return $result.Text.Trim()
    }
    finally {
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
    Assert-PrEvidenceCommandExists 'ffprobe'
    Assert-PrEvidenceCommandExists 'node'

    $webmFull = if ([System.IO.Path]::IsPathRooted($WebmPath)) { $WebmPath } else { Join-Path (Get-PrEvidenceRepoRoot) $WebmPath }
    $gifFull = if ([System.IO.Path]::IsPathRooted($GifPath)) { $GifPath } else { Join-Path (Get-PrEvidenceRepoRoot) $GifPath }

    if (-not (Test-Path -LiteralPath $webmFull)) {
        throw "WebM not found for GIF conversion: $webmFull"
    }

    $gifDir = Split-Path -Parent $gifFull
    if (-not (Test-Path -LiteralPath $gifDir)) {
        New-Item -ItemType Directory -Path $gifDir -Force | Out-Null
    }

    $dimensions = Get-PrEvidenceVideoDimensions -VideoPath $webmFull
    $videoFilter = Get-PrEvidenceGifFfmpegFilter -InputWidth $dimensions.Width -InputHeight $dimensions.Height
    $paletteColors = if ([int]($env:PR_EVIDENCE_VIEWPORT_WIDTH) -gt 0 -and [int]($env:PR_EVIDENCE_VIEWPORT_WIDTH) -lt 768) { 96 } else { 256 }
    $paletteFilter = "$videoFilter,split[s0][s1];[s0]palettegen=max_colors=$paletteColors[p];[s1][p]paletteuse=dither=bayer"

    Write-Host ("[PR evidence] GIF crop from {0}x{1} using filter: {2}" -f $dimensions.Width, $dimensions.Height, $paletteFilter)

    $args = @(
        '-y',
        '-i', $webmFull,
        '-vf', $paletteFilter,
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
