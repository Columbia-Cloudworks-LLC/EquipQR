<#
.SYNOPSIS
    Copies env files from your canonical EquipQR checkout into the current git worktree.

.DESCRIPTION
    Git worktrees (including Cursor-managed folders) share history but not ignored files.
    Subagents often cannot run 1Password CLI; use a checkout where you already ran
    dev-start.bat (or created .env manually), then run this script from the worktree.

.PARAMETER SourceRoot
    Explicit path to the repo root that has .env (and optionally .env.local, supabase/functions/.env).
    If omitted, uses environment variable EQUIPQR_MAIN_REPO, then auto-detects another worktree
    of the same repo that contains .env and is not under .cursor/worktrees (preferred).

.PARAMETER InstallDeps
    If set, runs npm ci in the target worktree after copying env files.

.PARAMETER UseHardLink
    If set, creates hard links instead of copies so edits stay shared with the source files.
    Requires source and target on the same volume.

.EXAMPLE
    cd C:\Users\viral\.cursor\worktrees\EquipQR\mywt
    powershell -NoProfile -ExecutionPolicy Bypass -File ..\..\..\..\..\EquipQR\scripts\bootstrap-worktree-env.ps1

.EXAMPLE
    .\scripts\bootstrap-worktree-env.ps1 -SourceRoot C:\Users\viral\EquipQR -InstallDeps
#>
[CmdletBinding()]
param(
    [string]$SourceRoot,
    [switch]$InstallDeps,
    [switch]$UseHardLink
)

$ErrorActionPreference = "Stop"

function Get-RepoRootFromGit {
    $top = git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($top)) {
        Write-Error "Not inside a git repository. cd into the worktree and try again."
        exit 1
    }
    return [System.IO.Path]::GetFullPath($top.Trim())
}

function Get-WorktreePathsFromPorcelain {
    $output = git worktree list --porcelain 2>$null
    if ($LASTEXITCODE -ne 0) {
        return @()
    }
    $paths = [System.Collections.Generic.List[string]]::new()
    foreach ($line in $output) {
        if ($line -match '^worktree (.+)$') {
            $paths.Add([System.IO.Path]::GetFullPath($matches[1].Trim()))
        }
    }
    return $paths
}

function Test-CursorScratchWorktree {
    param([string]$Path)
    return $Path -match '[/\\]\.cursor[/\\]worktrees[/\\]'
}

function Resolve-SourceRoot {
    param(
        [string]$TargetRoot,
        [string]$ExplicitSource,
        [string]$EnvMainRepo
    )

    if (-not [string]::IsNullOrWhiteSpace($ExplicitSource)) {
        return [System.IO.Path]::GetFullPath($ExplicitSource)
    }
    if (-not [string]::IsNullOrWhiteSpace($EnvMainRepo)) {
        return [System.IO.Path]::GetFullPath($EnvMainRepo)
    }

    $all = Get-WorktreePathsFromPorcelain
    if ($all.Count -eq 0) {
        return $null
    }

    $candidates = [System.Collections.Generic.List[hashtable]]::new()
    foreach ($p in $all) {
        if ($p -eq $TargetRoot) { continue }
        $envFile = Join-Path $p ".env"
        if (-not (Test-Path -LiteralPath $envFile)) { continue }
        $scratch = Test-CursorScratchWorktree -Path $p
        $candidates.Add(@{ Path = $p; Scratch = $scratch })
    }

    if ($candidates.Count -eq 0) {
        return $null
    }

    $preferred = $candidates | Sort-Object { $_.Scratch }, { $_.Path.Length } | Select-Object -First 1
    return $preferred.Path
}

function Install-EnvFile {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [bool]$HardLink
    )

    if (-not (Test-Path -LiteralPath $SourcePath)) {
        return @{ Ok = $false; Message = "Missing source: $SourcePath" }
    }

    $destDir = Split-Path -Parent $DestPath
    if (-not (Test-Path -LiteralPath $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    if (Test-Path -LiteralPath $DestPath) {
        Remove-Item -LiteralPath $DestPath -Force
    }

    if ($HardLink) {
        try {
            New-Item -ItemType HardLink -Path $DestPath -Target $SourcePath -Force | Out-Null
        }
        catch {
            return @{ Ok = $false; Message = "HardLink failed for $DestPath : $_" }
        }
    }
    else {
        Copy-Item -LiteralPath $SourcePath -Destination $DestPath -Force
    }

    return @{ Ok = $true; Message = $DestPath }
}

$targetRoot = Get-RepoRootFromGit
$resolvedSource = Resolve-SourceRoot -TargetRoot $targetRoot -ExplicitSource $SourceRoot -EnvMainRepo $env:EQUIPQR_MAIN_REPO

if ([string]::IsNullOrWhiteSpace($resolvedSource)) {
    Write-Host @"
No source checkout found with a .env file.

Set the canonical repo explicitly:
  -SourceRoot C:\path\to\EquipQR
or environment variable (User or Machine):
  EQUIPQR_MAIN_REPO=C:\path\to\EquipQR

Refresh secrets in that checkout first (e.g. .\dev-start.bat with 1Password), then re-run this script.
"@
    exit 1
}

if ($resolvedSource -eq $targetRoot) {
    Write-Error "Source and target are the same directory. Run this from a secondary worktree, or use a different -SourceRoot."
    exit 2
}

if (-not (Test-Path -LiteralPath (Join-Path $resolvedSource ".env"))) {
    Write-Error "Source root has no .env: $resolvedSource"
    exit 1
}

Write-Host "Target worktree: $targetRoot"
Write-Host "Source (env):    $resolvedSource"
if ($UseHardLink) {
    Write-Host "Mode:            hard links (same volume as source)"
}
else {
    Write-Host "Mode:            copy"
}

$pairs = @(
    @{ Src = Join-Path $resolvedSource ".env"; Dst = Join-Path $targetRoot ".env" }
    @{ Src = Join-Path $resolvedSource ".env.local"; Dst = Join-Path $targetRoot ".env.local" }
    @{ Src = Join-Path $resolvedSource "supabase\functions\.env"; Dst = Join-Path $targetRoot "supabase\functions\.env" }
)

$failures = 0
foreach ($pair in $pairs) {
    if (-not (Test-Path -LiteralPath $pair.Src)) {
        Write-Host "  skip (no source): $($pair.Src)"
        continue
    }
    $r = Install-EnvFile -SourcePath $pair.Src -DestPath $pair.Dst -HardLink:([bool]$UseHardLink)
    if (-not $r.Ok) {
        Write-Warning $r.Message
        $failures++
    }
    else {
        Write-Host "  ok: $($pair.Dst)"
    }
}

if ($failures -gt 0) {
    Write-Error "One or more env files could not be installed."
    exit 1
}

if ($InstallDeps) {
    Write-Host "Running npm ci in $targetRoot ..."
    Push-Location -LiteralPath $targetRoot
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) {
            Write-Error "npm ci failed with exit code $LASTEXITCODE"
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "Bootstrap complete."
exit 0
