#Requires -Version 5.1
<#
.SYNOPSIS
  Windows launcher for the EquipQR Linux development runtime.

.DESCRIPTION
  Detects WSL2 and Ubuntu, then runs the same bash entrypoint used by
  Codespaces and native Linux. Does not install Windows features or reboot.
#>
[CmdletBinding()]
param(
    [ValidateSet('start', 'stop')]
    [string]$Command = 'start',

    [switch]$Force,
    [switch]$PrepareOnly,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest = @()
)

$ErrorActionPreference = 'Stop'

function Repair-WslCliText {
    param([AllowNull()][string]$Raw)
    if ([string]::IsNullOrEmpty($Raw)) {
        return ''
    }
    return ($Raw -replace "`0", '').Trim()
}

function Get-EquipQrWslPlan {
    param(
        [bool]$WslCommandExists,
        [AllowNull()][string]$ListText
    )

    if (-not $WslCommandExists) {
        return @{
            ExitCode = 1
            Action = 'missing-wsl'
            Distro = ''
            Message = @(
                'WSL is not installed. EquipQR on Windows runs inside WSL2 Ubuntu 24.04.'
                'Install it with the current Microsoft command, then open a new terminal:'
                '  wsl --install'
                'Documentation: https://learn.microsoft.com/en-us/windows/wsl/install'
            ) -join [Environment]::NewLine
        }
    }

    $text = Repair-WslCliText $ListText
    if ([string]::IsNullOrWhiteSpace($text)) {
        return @{
            ExitCode = 1
            Action = 'missing-wsl'
            Distro = ''
            Message = @(
                'wsl.exe did not list any distributions.'
                'Install Ubuntu 24.04 with:'
                '  wsl --install -d Ubuntu-24.04'
                'Documentation: https://learn.microsoft.com/en-us/windows/wsl/install'
            ) -join [Environment]::NewLine
        }
    }

    $distros = @()
    foreach ($line in ($text -split '\r?\n')) {
        $trimmed = $line.Trim()
        if ($trimmed -match '^(?i)NAME\s+STATE\s+VERSION') {
            continue
        }
        if ($trimmed -match '^\*?\s*(\S+)\s+\S+\s+(\d+)\s*$') {
            $distros += @{
                Name = $Matches[1]
                Version = [int]$Matches[2]
            }
        }
    }

    $preferred = @('Ubuntu-24.04', 'Ubuntu')
    foreach ($name in $preferred) {
        $match = $distros | Where-Object { $_.Name -eq $name } | Select-Object -First 1
        if ($null -eq $match) {
            continue
        }
        if ($match.Version -ne 2) {
            return @{
                ExitCode = 1
                Action = 'upgrade-wsl2'
                Distro = $name
                Message = @(
                    "WSL distribution '$name' is version $($match.Version). EquipQR requires WSL2."
                    'Convert it, then rerun this launcher:'
                    "  wsl --set-version $name 2"
                    'This launcher will not convert the distribution for you.'
                    'Documentation: https://learn.microsoft.com/en-us/windows/wsl/basic-commands'
                ) -join [Environment]::NewLine
            }
        }
        return @{
            ExitCode = 0
            Action = 'launch'
            Distro = $name
            Message = "Using WSL2 distribution $name."
        }
    }

    return @{
        ExitCode = 1
        Action = 'missing-ubuntu'
        Distro = ''
        Message = @(
            'WSL is installed, but Ubuntu 24.04 (or Ubuntu) is not.'
            'Install the supported distribution with:'
            '  wsl --install -d Ubuntu-24.04'
            'Then clone EquipQR inside that distribution at ~/src/EquipQR.'
            'Documentation: https://learn.microsoft.com/en-us/windows/wsl/install'
        ) -join [Environment]::NewLine
    }
}

function ConvertTo-WslpathInput {
    param([Parameter(Mandatory = $true)][string]$WindowsPath)
    # wsl.exe treats backslashes as escapes, so D:\a\EquipQR becomes D:aEquipQR.
    return ($WindowsPath -replace '\\', '/')
}

function Get-BashArguments {
    $bashArgs = @()
    if ($Force) {
        $bashArgs += '--force'
    }
    if ($Command -eq 'start' -and $PrepareOnly) {
        $bashArgs += '--prepare-only'
    }
    foreach ($extra in @($Rest)) {
        if ([string]::IsNullOrWhiteSpace($extra)) {
            continue
        }
        switch -Regex ($extra) {
            '^(?i)(-h|--help|/\?|/help)$' { return @('--help') }
            '^(?i)(-Force|--force|/Force)$' { $bashArgs += '--force'; continue }
            '^(?i)(-PrepareOnly|--prepare-only|/PrepareOnly)$' { $bashArgs += '--prepare-only'; continue }
            default {
                throw "Unknown argument: $extra"
            }
        }
    }
    return $bashArgs
}

if ($env:EQUIPQR_WSL_LAUNCHER_LIB -ne '1') {

$repoRoot = Split-Path -Parent $PSScriptRoot
$bashScript = if ($Command -eq 'stop') { 'dev/linux/dev-stop.sh' } else { 'dev/linux/dev-start.sh' }
$bashArgs = @(Get-BashArguments)

$wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
$plan = Get-EquipQrWslPlan -WslCommandExists ($null -ne $wsl) -ListText ''
if ($null -ne $wsl) {
    $list = & wsl.exe --list --verbose 2>&1 | Out-String
    $plan = Get-EquipQrWslPlan -WslCommandExists $true -ListText $list
}

if ($plan.Action -ne 'launch') {
    Write-Host $plan.Message
    exit $plan.ExitCode
}

Write-Host $plan.Message
$wslpathInput = ConvertTo-WslpathInput $repoRoot
$linuxRepo = (& wsl.exe -d $plan.Distro -- wslpath -u $wslpathInput | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($linuxRepo)) {
    Write-Host "Could not map '$repoRoot' into WSL distribution $($plan.Distro)."
    exit 1
}
if ($linuxRepo -like '/mnt/*') {
    Write-Host "WARNING: This checkout is on the Windows filesystem ($linuxRepo)."
    Write-Host 'The supported path is a clone on the Linux filesystem, for example ~/src/EquipQR.'
    Write-Host 'Continuing with this checkout.'
}

$quotedRepo = $linuxRepo.Replace("'", "'\''")
$remote = "cd '$quotedRepo' && bash $bashScript"
if ($bashArgs.Count -gt 0) {
    $remote = "$remote $($bashArgs -join ' ')"
}

& wsl.exe -d $plan.Distro -- bash -lc $remote
exit $LASTEXITCODE

}
