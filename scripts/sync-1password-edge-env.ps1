param(
    [string]$EnvironmentId = "f4rdrusaoxvzwngz2jxs7vy7ye",
    [int]$ApiPort = 54321
)

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\sync-1password-dev-envs.ps1" -EdgeEnvironmentId $EnvironmentId -ApiPort $ApiPort -EdgeOnly
