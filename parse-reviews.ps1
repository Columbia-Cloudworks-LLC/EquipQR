$json = Get-Content 'C:\Users\viral\.cursor\projects\c-Users-viral-EquipQR\agent-tools\09e20d67-a65a-4edd-86ab-30272acb2872.txt' | ConvertFrom-Json

Write-Host "=== UNRESOLVED COMMENTS (Needs Action) ===" -ForegroundColor Red
$unresolved = $json.reviewThreads | Where-Object { $_.IsResolved -eq $false -and $_.IsOutdated -eq $false }
foreach ($thread in $unresolved) {
    $comment = $thread.Comments.Nodes[0]
    Write-Host "`nFile: $($comment.Path) (Line: $($comment.Line))" -ForegroundColor Yellow
    Write-Host "Author: $($comment.Author.Login)"
    Write-Host "Comment: $($comment.Body)"
    Write-Host "URL: $($comment.URL)"
}

Write-Host "`n=== UNRESOLVED BUT OUTDATED (Verify Relevance) ===" -ForegroundColor Yellow
$outdated = $json.reviewThreads | Where-Object { $_.IsResolved -eq $false -and $_.IsOutdated -eq $true }
foreach ($thread in $outdated) {
    $comment = $thread.Comments.Nodes[0]
    Write-Host "`nFile: $($comment.Path) (Line: $($comment.Line))" -ForegroundColor Yellow
    Write-Host "Author: $($comment.Author.Login)"
    Write-Host "Comment: $($comment.Body)"
    Write-Host "URL: $($comment.URL)"
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Green
Write-Host "Unresolved (needs action): $($unresolved.Count)"
Write-Host "Unresolved but outdated: $($outdated.Count)"
Write-Host "Total unresolved: $($unresolved.Count + $outdated.Count)"
