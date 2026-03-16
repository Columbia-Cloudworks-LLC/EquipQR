param(
    [int]$ApiPort = 54321
)

$baseUrl = "http://127.0.0.1:$ApiPort"
$bucket = "equipment-note-images"
$storagePrefix = "seed/equipment"
$repoRoot = Split-Path $PSScriptRoot
$imageDir = Join-Path $repoRoot "supabase\seed-images\equipment"

if (-not (Test-Path $imageDir)) {
    Write-Host "       No seed images directory found - skipping."
    exit 0
}

$images = @(Get-ChildItem -Path $imageDir -Filter "*.jpg" -File)
if ($images.Count -eq 0) {
    Write-Host "       No .jpg files found in seed-images - skipping."
    exit 0
}

Write-Host "       Found $($images.Count) seed images to upload..."

$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$envLines = & npx supabase status -o env 2>$null
$ErrorActionPreference = $prevEAP

$anonKey = $null
$serviceKey = $null
foreach ($line in $envLines) {
    if ($line -match '^ANON_KEY="(.+)"') { $anonKey = $Matches[1] }
    if ($line -match '^SERVICE_ROLE_KEY="(.+)"') { $serviceKey = $Matches[1] }
}

if (-not $anonKey -or -not $serviceKey) {
    Write-Host "       WARNING: Could not retrieve Supabase keys. Seed images skipped."
    exit 1
}

$uploaded = 0
$updated = 0
$failed = 0

foreach ($img in $images) {
    $uuid = $img.BaseName
    $objectPath = "$storagePrefix/$($img.Name)"
    $uploadUrl = "$baseUrl/storage/v1/object/$bucket/$objectPath"

    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($img.FullName)
        $headers = @{
            "apikey"        = $anonKey
            "Authorization" = "Bearer $serviceKey"
            "Content-Type"  = "image/jpeg"
            "x-upsert"     = "true"
        }
        Invoke-RestMethod -Method Post -Uri $uploadUrl -Headers $headers -Body $fileBytes | Out-Null
        $uploaded++
    }
    catch {
        Write-Host "       WARN: Upload failed for $uuid"
        $failed++
        continue
    }

    $publicUrl = "$baseUrl/storage/v1/object/public/$bucket/$objectPath"
    try {
        $patchHeaders = @{
            "apikey"        = $anonKey
            "Authorization" = "Bearer $serviceKey"
            "Content-Type"  = "application/json"
            "Prefer"        = "return=minimal"
        }
        $body = @{ image_url = $publicUrl } | ConvertTo-Json -Compress
        Invoke-RestMethod -Method Patch -Uri "$baseUrl/rest/v1/equipment?id=eq.$uuid" -Headers $patchHeaders -Body $body | Out-Null
        $updated++
    }
    catch {
        Write-Host "       WARN: DB update failed for $uuid"
        $failed++
    }
}

Write-Host "       Seed images: $uploaded uploaded, $updated records updated, $failed failed (of $($images.Count) total)."
