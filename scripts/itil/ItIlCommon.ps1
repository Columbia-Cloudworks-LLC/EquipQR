#Requires -Version 5.1
# Shared helpers for scripts/itil/*.ps1 (dot-source only). ASCII-only for PS 5.1.

function Get-ItilScriptDirectory {
    param([string]$InvocationPath = $MyInvocation.ScriptName)
    return Split-Path -Parent $InvocationPath
}

function Get-ItilRepoRootFromGit {
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

function Assert-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found on PATH: $Name"
    }
}

<#
.SYNOPSIS
  Run gh with stderr from native tools treated as non-terminating so $LASTEXITCODE is reliable (PS 5.1 + PS 7+).
#>
function Invoke-ItilGh {
    param(
        [Parameter(Mandatory)][string[]]$Arguments
    )
    $prevEap = $ErrorActionPreference
    $prevNative = $null
    if (Get-Variable -Name 'PSNativeCommandUseErrorActionPreference' -ErrorAction SilentlyContinue) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }
    $ErrorActionPreference = 'Continue'
    try {
        & gh @Arguments 2>&1
        return $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $prevEap
        if ($null -ne $prevNative) {
            $PSNativeCommandUseErrorActionPreference = $prevNative
        }
    }
}

function Invoke-ItilGhJson {
    param(
        [Parameter(Mandatory)][string[]]$Arguments
    )
    $raw = $null
    $exit = 0
    $prevEap = $ErrorActionPreference
    $prevNative = $null
    if (Get-Variable -Name 'PSNativeCommandUseErrorActionPreference' -ErrorAction SilentlyContinue) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }
    $ErrorActionPreference = 'Continue'
    try {
        $raw = & gh @Arguments 2>&1 | Out-String
        $exit = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $prevEap
        if ($null -ne $prevNative) {
            $PSNativeCommandUseErrorActionPreference = $prevNative
        }
    }
    return [pscustomobject]@{ ExitCode = $exit; Raw = $raw.Trim() }
}

function Get-ItilGhOwnerRepoSlug {
    $r = Invoke-ItilGhJson @('repo', 'view', '--json', 'owner,name')
    if ($r.ExitCode -ne 0) {
        throw "gh repo view failed: $($r.Raw)"
    }
    $j = $r.Raw | ConvertFrom-Json
    return "$($j.owner.login)/$($j.name)"
}

function Split-ItilOwnerRepo {
    param([Parameter(Mandatory)][string]$Slug)
    $parts = $Slug -split '/', 2
    if ($parts.Count -ne 2) {
        throw "Expected owner/name slug, got: $Slug"
    }
    return [pscustomobject]@{ Owner = $parts[0]; Repo = $parts[1] }
}

function Write-ItilUtf8NoBomFile {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Content
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}
