#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$env:EQUIPQR_WSL_LAUNCHER_LIB = '1'
. (Join-Path $PSScriptRoot 'Invoke-EquipQrWsl.ps1')

function Assert-Equal {
    param($Actual, $Expected, [string]$Label)
    if ($Actual -ne $Expected) {
        throw "$Label expected [$Expected] but was [$Actual]"
    }
}

$missing = Get-EquipQrWslPlan -WslCommandExists $false -ListText ''
Assert-Equal $missing.Action 'missing-wsl' 'missing wsl action'
Assert-Equal $missing.ExitCode 1 'missing wsl exit'
if ($missing.Message -notmatch 'wsl --install') { throw 'missing wsl message omitted wsl --install' }
if ($missing.Message -notmatch 'https://learn.microsoft.com/en-us/windows/wsl/install') {
    throw 'missing wsl message omitted Microsoft docs'
}

$ubuntu = Get-EquipQrWslPlan -WslCommandExists $true -ListText @'
  NAME            STATE           VERSION
* docker-desktop  Running         2
  Ubuntu-24.04    Stopped         2
'@
Assert-Equal $ubuntu.Action 'launch' 'ubuntu 24.04 action'
Assert-Equal $ubuntu.Distro 'Ubuntu-24.04' 'ubuntu 24.04 distro'
Assert-Equal $ubuntu.ExitCode 0 'ubuntu 24.04 exit'

$fallback = Get-EquipQrWslPlan -WslCommandExists $true -ListText @'
  NAME     STATE    VERSION
* Ubuntu   Running  2
'@
Assert-Equal $fallback.Distro 'Ubuntu' 'ubuntu fallback'

$wsl1 = Get-EquipQrWslPlan -WslCommandExists $true -ListText @'
  NAME     STATE    VERSION
* Ubuntu   Running  1
'@
Assert-Equal $wsl1.Action 'upgrade-wsl2' 'wsl1 action'
if ($wsl1.Message -notmatch 'wsl --set-version Ubuntu 2') { throw 'wsl1 message omitted set-version' }

$none = Get-EquipQrWslPlan -WslCommandExists $true -ListText @'
  NAME             STATE    VERSION
* docker-desktop   Running  2
'@
Assert-Equal $none.Action 'missing-ubuntu' 'missing ubuntu action'
if ($none.Message -notmatch 'wsl --install -d Ubuntu-24.04') { throw 'missing ubuntu message omitted install command' }

$nulls = Get-EquipQrWslPlan -WslCommandExists $true -ListText ("  NAME            STATE           VERSION`0`r`n* Ubuntu-24.04    Running         2`0")
Assert-Equal $nulls.Distro 'Ubuntu-24.04' 'null-stripped list'

Assert-Equal (ConvertTo-WslpathInput 'D:\a\EquipQR\EquipQR') 'D:/a/EquipQR/EquipQR' 'backslash path'
Assert-Equal (ConvertTo-WslpathInput 'C:/src/EquipQR') 'C:/src/EquipQR' 'slash path'

Write-Host 'Invoke-EquipQrWsl tests passed.'
