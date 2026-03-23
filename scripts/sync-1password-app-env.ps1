param(
    [string]$EnvironmentId = "ylilu4hpf6nq6bfm5ykg6nh2kq"
)

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\sync-1password-dev-envs.ps1" -AppEnvironmentId $EnvironmentId -AppOnly
