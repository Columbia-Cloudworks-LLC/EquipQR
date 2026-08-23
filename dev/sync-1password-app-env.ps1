param(
    [Alias('EnvironmentId')]
    [string]$Item = "app-env-local-dev"
)

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\sync-1password-dev-envs.ps1" -AppItem $Item -AppOnly
