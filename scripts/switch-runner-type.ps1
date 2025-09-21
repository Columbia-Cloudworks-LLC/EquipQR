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
        # No longer edit files to flip; prefer repo variable via gh CLI if present.
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Updated $file" -ForegroundColor Green
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

# Try to toggle repo variable if gh is available
if (Get-Command gh -ErrorAction SilentlyContinue) {
    try {
        $value = if ($RunnerType -eq 'self-hosted') { 'true' } else { 'false' }
        gh variable set USE_SELF_HOSTED -b $value | Out-Null
        Write-Host "Set repository variable USE_SELF_HOSTED=$value via gh" -ForegroundColor Cyan
    } catch {
        Write-Host "Could not set repo variable via gh: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "gh CLI not found. Set repository variable USE_SELF_HOSTED manually in GitHub Settings." -ForegroundColor Yellow
}

Write-Host "Done. Commit and push to apply changes." -ForegroundColor Cyan

