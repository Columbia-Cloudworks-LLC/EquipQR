param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('github-hosted','self-hosted')]
    [string]$RunnerType
)

$ErrorActionPreference = 'Stop'

$workflowFiles = @(
    ".github/workflows/ci.yml",
    ".github/workflows/versioning.yml",
    ".github/workflows/deploy.yml",
    ".github/workflows/deployment-status.yml",
    ".github/workflows/manual-version-bump.yml"
)

Write-Host "Switching runner type to: $RunnerType" -ForegroundColor Cyan

foreach ($file in $workflowFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($RunnerType -eq 'self-hosted') {
            $content = $content -replace "USE_SELF_HOSTED:\s*'false'", "USE_SELF_HOSTED: 'true'"
            if ($content -notmatch "USE_SELF_HOSTED:") {
                $content = $content -replace "(^env:\s*[\r\n]+)", "$1  USE_SELF_HOSTED: 'true'`r`n"
            }
        } else {
            $content = $content -replace "USE_SELF_HOSTED:\s*'true'", "USE_SELF_HOSTED: 'false'"
            if ($content -notmatch "USE_SELF_HOSTED:") {
                $content = $content -replace "(^env:\s*[\r\n]+)", "$1  USE_SELF_HOSTED: 'false'`r`n"
            }
        }
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Updated $file" -ForegroundColor Green
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "Done. Commit and push to apply changes." -ForegroundColor Cyan

