param(
    [int]$ApiPort = 54321
)

$ErrorActionPreference = "Stop"

$baseUrl = "http://127.0.0.1:$ApiPort"
$bucket = "equipment-note-images"
$storagePrefx = "seed/equipment"
$imageDir = Join-Path (Split-Path $PSScriptRoot) "supabase\seed-images\equipment"

if (-not (Test-Path $imageDir)) {
    Write-Host "       No seed images directory found at $imageDir — skipping."
    exit 0
}

$images = Get-ChildItem -Path $imageDir -Filter "*.jpg" -File
if ($images.Count -eq 0) {
    Write-Host "       No .jpg files found in $imageDir — skipping."
    exit 0
}

# Retrieve keys from the running Supabase instance.
# Temporarily relax error handling because npx supabase status writes
# informational warnings (e.g. "Stopped services") to stderr which
# PowerShell 5.1 treats as terminating errors under $ErrorActionPreference=Stop.
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$envOutput = & npx supabase status -o env 2>$null
$ErrorActionPreference = $prevEAP

$anonKey = ($envOutput | Select-String '^ANON_KEY="(.+)"$').Matches.Groups[1].Value
$serviceKey = ($envOutput | Select-String '^SERVICE_ROLE_KEY="(.+)"$').Matches.Groups[1].Value

if (-not $anonKey -or -not $serviceKey) {
    Write-Host "       WARNING: Could not retrieve Supabase keys. Seed images skipped."
    exit 1
}

$uploaded = 0
$updated = 0
$failed = 0

foreach ($img in $images) {
    $uuid = $img.BaseName
    $storagePath = "$storagePrefx/$($img.Name)"
    $uploadUrl = "$baseUrl/storage/v1/object/$bucket/$storagePath"

    $fileBytes = [System.IO.File]::ReadAllBytes($img.FullName)
    $headers = @{
        "apikey"        = $anonKey
        "Authorization" = "Bearer $serviceKey"
        "Content-Type"  = "image/jpeg"
        "x-upsert"     = "true"
    }

    try {
        Invoke-RestMethod -Method Post -Uri $uploadUrl -Headers $headers -Body $fileBytes | Out-Null
        $uploaded++
    } catch {
        Write-Host "       WARN: Upload failed for $uuid — $($_.Exception.Message)"
        $failed++
        continue
    }

    $publicUrl = "$baseUrl/storage/v1/object/public/$bucket/$storagePath"
    $patchHeaders = @{
        "apikey"        = $anonKey
        "Authorization" = "Bearer $serviceKey"
        "Content-Type"  = "application/json"
        "Prefer"        = "return=minimal"
    }
    $body = @{ image_url = $publicUrl } | ConvertTo-Json -Compress

    try {
        Invoke-RestMethod -Method Patch `
            -Uri "$baseUrl/rest/v1/equipment?id=eq.$uuid" `
            -Headers $patchHeaders -Body $body | Out-Null
        $updated++
    } catch {
        Write-Host "       WARN: DB update failed for $uuid — $($_.Exception.Message)"
        $failed++
    }
}

Write-Host "       Seed images: $uploaded uploaded, $updated equipment records updated, $failed failed (of $($images.Count) images)."
