# changelog-stop.ps1 — stop hook for end-of-session changelog reminders
#
# Behavior:
# - Runs when the Cursor agent loop ends.
# - If the session completed and the repo has relevant changes without a
#   corresponding CHANGELOG.md update, it auto-submits a follow-up prompt.
# - Ignores docs and Cursor metadata so plan-only or tooling-only sessions
#   do not trigger unnecessary changelog nags.

$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) {
    Write-Output '{}'
    exit 0
}

try {
    $data = $inputJson | ConvertFrom-Json
} catch {
    Write-Output '{}'
    exit 0
}

if ($data.status -ne 'completed') {
    Write-Output '{}'
    exit 0
}

$loopCount = 0
if ($null -ne $data.loop_count) {
    $loopCount = [int]$data.loop_count
}

# Avoid endless follow-up loops if the agent repeatedly ignores the reminder.
if ($loopCount -ge 2) {
    Write-Output '{}'
    exit 0
}

$gitStatus = cmd /c "git status --porcelain=v1 --untracked-files=all 2>nul" | Out-String
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitStatus)) {
    Write-Output '{}'
    exit 0
}

$changedFiles = @()
foreach ($line in ($gitStatus -split "`r?`n")) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.Length -lt 4) {
        continue
    }

    $pathPart = $line.Substring(3)
    if ($pathPart -match ' -> ') {
        $pathPart = ($pathPart -split ' -> ')[-1]
    }

    $changedFiles += ($pathPart -replace '\\', '/')
}

$changedFiles = $changedFiles | Select-Object -Unique
if (-not $changedFiles -or $changedFiles.Count -eq 0) {
    Write-Output '{}'
    exit 0
}

$changelogTouched = $changedFiles -contains 'CHANGELOG.md'
if ($changelogTouched) {
    Write-Output '{}'
    exit 0
}

$relevantFiles = $changedFiles | Where-Object {
    $_ -ne 'CHANGELOG.md' -and
    $_ -notmatch '^\.cursor/' -and
    $_ -notmatch '^docs/' -and
    $_ -notmatch '^(README|CONTRIBUTING|SUPPORT|SECURITY)\.md$'
}

if (-not $relevantFiles -or $relevantFiles.Count -eq 0) {
    Write-Output '{}'
    exit 0
}

$previewFiles = $relevantFiles | Select-Object -First 8
$previewText = ($previewFiles -join ', ')
$remainingCount = $relevantFiles.Count - $previewFiles.Count
if ($remainingCount -gt 0) {
    $previewText = "$previewText, +$remainingCount more"
}

$followupMessage = if ($loopCount -eq 0) {
    "Before you wrap up, update CHANGELOG.md to reflect this session's changes. Relevant modified files: $previewText. If no changelog entry is needed, explain that explicitly in your final response."
} else {
    "CHANGELOG.md is still unchanged even though this session modified: $previewText. Update CHANGELOG.md now, or explicitly justify why no changelog entry is needed before ending the session."
}

$response = @{
    followup_message = $followupMessage
}

Write-Output ($response | ConvertTo-Json -Compress)
exit 0
