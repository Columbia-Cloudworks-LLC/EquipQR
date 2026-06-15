param(
    [Alias('EnvironmentId')]
    [string]$Item = "edge-env-local-dev",
    [int]$ApiPort = 54321
)

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\sync-1password-dev-envs.ps1" -EdgeItem $Item -ApiPort $ApiPort -EdgeOnly
