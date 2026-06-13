#Requires -Version 5.1
<#
.SYNOPSIS
  Deprecated alias for Load-GoogleLocalAuthEnv.ps1.

.EXAMPLE
  . .\scripts\e2e\Load-GoogleE2eEnv.ps1
#>
. (Join-Path $PSScriptRoot 'Load-GoogleLocalAuthEnv.ps1') @args
