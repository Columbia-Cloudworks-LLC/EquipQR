<#
.SYNOPSIS
  Upload local seed images into Supabase Storage and wire DB references after db reset.

.DESCRIPTION
  Supports three drop zones under supabase/seed-images/:
    equipment/  — {equipment-uuid}.{jpg|png|webp|gif} sets equipment.image_url (display photo)
    drop/       — any images; auto-assigned to display slots, equipment notes, and work orders
    work-orders/ — {work-order-uuid}.{ext} attaches to the WO via a seed note + work_order_images row

  Canonical private-bucket paths are stored in Postgres (never public/signed URLs).
  Runs automatically as step 5b in dev-start.bat -Force.
#>
param(
    [int]$ApiPort = 54321
)

$ErrorActionPreference = 'Stop'

$repoRoot = if ($PSScriptRoot) {
    (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
} else {
    (Get-Location).Path
}

$baseUrl = "http://127.0.0.1:$ApiPort"
$seedRoot = Join-Path $repoRoot 'supabase\seed-images'
$equipmentDir = Join-Path $seedRoot "equipment"
$dropDir = Join-Path $seedRoot "drop"
$workOrdersDir = Join-Path $seedRoot "work-orders"

# owner@apex.test — stable uploader for local seed media
$SeedUploaderId = 'bb0e8400-e29b-41d4-a716-446655440001'
$ImageExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.gif')

function Get-ImageFiles([string]$Directory) {
    if (-not (Test-Path $Directory)) { return @() }
    return @(
        Get-ChildItem -Path $Directory -File |
            Where-Object { $ImageExtensions -contains $_.Extension.ToLower() }
    )
}

function Get-ImageContentType([string]$Path) {
    switch ([IO.Path]::GetExtension($Path).ToLower()) {
        '.png' { return 'image/png' }
        '.webp' { return 'image/webp' }
        '.gif' { return 'image/gif' }
        default { return 'image/jpeg' }
    }
}

function Get-SupabaseKeys() {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $envLines = & npx supabase status -o env 2>$null
    $ErrorActionPreference = $prevEAP

    $anonKey = $null
    $serviceKey = $null
    foreach ($line in $envLines) {
        if ($line -match '^ANON_KEY="(.+)"') { $anonKey = $Matches[1] }
        if ($line -match '^SERVICE_ROLE_KEY="(.+)"') { $serviceKey = $Matches[1] }
    }
    return @{ Anon = $anonKey; Service = $serviceKey }
}

function Invoke-StorageUpload {
    param(
        [string]$Bucket,
        [string]$ObjectPath,
        [string]$FilePath,
        [hashtable]$Headers
    )
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $uploadUrl = "$baseUrl/storage/v1/object/$Bucket/$ObjectPath"
    $uploadHeaders = $Headers.Clone()
    $uploadHeaders['Content-Type'] = Get-ImageContentType $FilePath
    $uploadHeaders['x-upsert'] = 'true'
    Invoke-RestMethod -Method Post -Uri $uploadUrl -Headers $uploadHeaders -Body $bytes | Out-Null
}

function Invoke-RestPatch {
    param(
        [string]$Table,
        [string]$Filter,
        [hashtable]$Body,
        [hashtable]$Headers
    )
    $json = $Body | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Patch -Uri "$baseUrl/rest/v1/$Table$Filter" -Headers $Headers -Body $json | Out-Null
}

function Invoke-RestInsert {
    param(
        [string]$Table,
        [object]$Body,
        [hashtable]$Headers
    )
    $json = if ($Body -is [array]) { $Body | ConvertTo-Json -Compress } else { $Body | ConvertTo-Json -Compress }
    $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/rest/v1/$Table" -Headers $Headers -Body $json
    return $response
}

function Invoke-RestSelect {
    param(
        [string]$Table,
        [string]$Query,
        [hashtable]$Headers
    )
    return Invoke-RestMethod -Method Get -Uri "$baseUrl/rest/v1/$Table$Query" -Headers $Headers
}

if (-not (Test-Path $seedRoot)) {
    Write-Host "       No supabase/seed-images directory - skipping dev media seed."
    exit 0
}

$equipmentImages = Get-ImageFiles $equipmentDir
$dropImages = Get-ImageFiles $dropDir
$workOrderImages = Get-ImageFiles $workOrdersDir

$equipmentCount = @($equipmentImages).Count
$dropCount = @($dropImages).Count
$workOrderCount = @($workOrderImages).Count

if ($equipmentCount -eq 0 -and $dropCount -eq 0 -and $workOrderCount -eq 0) {
    Write-Host "       No seed images found - skipping dev media seed."
    exit 0
}

Write-Host "       Seeding dev media ($equipmentCount equipment, $dropCount drop, $workOrderCount work-order files) from $equipmentDir..."

$keys = Get-SupabaseKeys
if (-not $keys.Anon -or -not $keys.Service) {
    Write-Host "       WARNING: Could not retrieve Supabase keys. Dev media seed skipped."
    exit 1
}

$restHeaders = @{
    apikey        = $keys.Anon
    Authorization = "Bearer $($keys.Service)"
    'Content-Type' = 'application/json'
    Prefer        = 'return=representation'
}
$storageHeaders = @{
    apikey        = $keys.Anon
    Authorization = "Bearer $($keys.Service)"
}

$stats = @{
    DisplayUpdated = 0
    NoteImages     = 0
    WorkOrderImages = 0
    Failed         = 0
}

function Get-OrCreateEquipmentSeedNote {
    param(
        [string]$EquipmentId,
        [hashtable]$Headers
    )
    $existing = Invoke-RestSelect -Table 'equipment_notes' -Query "?select=id&equipment_id=eq.$EquipmentId&order=created_at.asc&limit=1" -Headers $Headers
    if ($existing -and $existing.Count -gt 0) {
        return $existing[0].id
    }

    $noteId = [guid]::NewGuid().ToString()
    $note = @{
        id           = $noteId
        equipment_id = $EquipmentId
        author_id    = $SeedUploaderId
        content      = 'Auto-created seed note for local dev media.'
        is_private   = $false
    }
    Invoke-RestInsert -Table 'equipment_notes' -Body $note -Headers $Headers | Out-Null
    return $noteId
}

function Set-EquipmentDisplayImage {
    param(
        [string]$EquipmentId,
        [string]$FilePath,
        [string]$FileName,
        [hashtable]$RestHeaders,
        [hashtable]$StorageHeaders
    )
    $noteId = Get-OrCreateEquipmentSeedNote -EquipmentId $EquipmentId -Headers $RestHeaders
    $objectPath = "$SeedUploaderId/$EquipmentId/$noteId/$FileName"
    Invoke-StorageUpload -Bucket 'equipment-note-images' -ObjectPath $objectPath -FilePath $FilePath -Headers $StorageHeaders
    Invoke-RestPatch -Table 'equipment' -Filter "?id=eq.$EquipmentId" -Body @{ image_url = $objectPath } -Headers $RestHeaders

    $imageRow = @{
        equipment_note_id = $noteId
        file_name         = $FileName
        file_url          = $objectPath
        file_size         = (Get-Item $FilePath).Length
        mime_type         = (Get-ImageContentType $FilePath)
        uploaded_by       = $SeedUploaderId
    }
    Invoke-RestInsert -Table 'equipment_note_images' -Body $imageRow -Headers $RestHeaders | Out-Null
}

# ── Phase 1: explicit equipment display images ─────────────────────────────
foreach ($img in $equipmentImages) {
    $equipmentId = $img.BaseName
    if ($equipmentId -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') {
        Write-Host "       WARN: Skipping equipment file with non-UUID name: $($img.Name)"
        $stats.Failed++
        continue
    }

    try {
        Set-EquipmentDisplayImage -EquipmentId $equipmentId -FilePath $img.FullName -FileName $img.Name -RestHeaders $restHeaders -StorageHeaders $storageHeaders
        $stats.DisplayUpdated++
    }
    catch {
        Write-Host "       WARN: Equipment display seed failed for $($img.Name)"
        $stats.Failed++
    }
}

# ── Phase 2: work-order folder overrides ───────────────────────────────────
foreach ($img in $workOrderImages) {
    $workOrderId = $img.BaseName
    if ($workOrderId -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') {
        Write-Host "       WARN: Skipping work-order file with non-UUID name: $($img.Name)"
        $stats.Failed++
        continue
    }

    try {
        $noteId = [guid]::NewGuid().ToString()
        $objectPath = "$SeedUploaderId/$workOrderId/$noteId/seed-$($img.Name)"
        Invoke-StorageUpload -Bucket 'work-order-images' -ObjectPath $objectPath -FilePath $img.FullName -Headers $storageHeaders

        $note = @{
            id             = $noteId
            work_order_id  = $workOrderId
            author_id      = $SeedUploaderId
            content        = 'Seed photo attached for local media testing.'
            hours_worked   = 0
            is_private     = $false
        }
        Invoke-RestInsert -Table 'work_order_notes' -Body $note -Headers $restHeaders | Out-Null

        $imageRow = @{
            work_order_id = $workOrderId
            note_id       = $noteId
            file_name     = $img.Name
            file_url      = $objectPath
            file_size     = $img.Length
            mime_type     = (Get-ImageContentType $img.FullName)
            uploaded_by   = $SeedUploaderId
            description   = 'Local dev seed image'
        }
        Invoke-RestInsert -Table 'work_order_images' -Body $imageRow -Headers $restHeaders | Out-Null
        $stats.WorkOrderImages++
    }
    catch {
        Write-Host "       WARN: Work-order seed failed for $($img.Name)"
        $stats.Failed++
    }
}

# ── Phase 3: distribute drop/ images ───────────────────────────────────────
if ($dropImages.Count -gt 0) {
    $patchMinimal = $restHeaders.Clone()
    $patchMinimal['Prefer'] = 'return=minimal'

    $equipmentNeedingDisplay = @(
        Invoke-RestSelect -Table 'equipment' -Query '?select=id&image_url=is.null&order=id.asc&limit=50' -Headers $restHeaders
    )
    $equipmentNotes = @(
        Invoke-RestSelect -Table 'equipment_notes' -Query '?select=id,equipment_id&order=created_at.asc&limit=40' -Headers $restHeaders
    )
    $workOrders = @(
        Invoke-RestSelect -Table 'work_orders' -Query '?select=id&status=in.(in_progress,assigned,accepted)&order=created_at.asc&limit=20' -Headers $restHeaders
    )

    $displayQueue = [System.Collections.Generic.Queue[string]]::new()
    foreach ($row in $equipmentNeedingDisplay) { $displayQueue.Enqueue($row.id) }

    $noteQueue = [System.Collections.Generic.Queue[object]]::new()
    foreach ($row in $equipmentNotes) { $noteQueue.Enqueue($row) }

    $woQueue = [System.Collections.Generic.Queue[string]]::new()
    foreach ($row in $workOrders) { $woQueue.Enqueue($row.id) }

    $dropIndex = 0
    foreach ($img in $dropImages) {
        $target = $dropIndex % 3
        $dropIndex++

        try {
            if ($target -eq 0 -and $displayQueue.Count -gt 0) {
                $equipmentId = $displayQueue.Dequeue()
                $dropName = "drop-$($img.Name)"
                Set-EquipmentDisplayImage -EquipmentId $equipmentId -FilePath $img.FullName -FileName $dropName -RestHeaders $restHeaders -StorageHeaders $storageHeaders
                $stats.DisplayUpdated++
                continue
            }

            if ($target -eq 1 -and $noteQueue.Count -gt 0) {
                $note = $noteQueue.Dequeue()
                $objectPath = "$SeedUploaderId/$($note.equipment_id)/$($note.id)/seed-drop-$($img.Name)"
                Invoke-StorageUpload -Bucket 'equipment-note-images' -ObjectPath $objectPath -FilePath $img.FullName -Headers $storageHeaders
                $imageRow = @{
                    equipment_note_id = $note.id
                    file_name         = $img.Name
                    file_url          = $objectPath
                    file_size         = $img.Length
                    mime_type         = (Get-ImageContentType $img.FullName)
                    uploaded_by       = $SeedUploaderId
                }
                Invoke-RestInsert -Table 'equipment_note_images' -Body $imageRow -Headers $restHeaders | Out-Null
                $stats.NoteImages++
                continue
            }

            if ($woQueue.Count -gt 0) {
                $workOrderId = $woQueue.Dequeue()
                $noteId = [guid]::NewGuid().ToString()
                $objectPath = "$SeedUploaderId/$workOrderId/$noteId/seed-drop-$($img.Name)"
                Invoke-StorageUpload -Bucket 'work-order-images' -ObjectPath $objectPath -FilePath $img.FullName -Headers $storageHeaders
                $note = @{
                    id            = $noteId
                    work_order_id = $workOrderId
                    author_id     = $SeedUploaderId
                    content       = 'Drop-folder seed photo for local media testing.'
                    hours_worked  = 0
                    is_private    = $false
                }
                Invoke-RestInsert -Table 'work_order_notes' -Body $note -Headers $restHeaders | Out-Null
                $imageRow = @{
                    work_order_id = $workOrderId
                    note_id       = $noteId
                    file_name     = $img.Name
                    file_url      = $objectPath
                    file_size     = $img.Length
                    mime_type     = (Get-ImageContentType $img.FullName)
                    uploaded_by   = $SeedUploaderId
                    description   = 'Local dev drop-folder seed'
                }
                Invoke-RestInsert -Table 'work_order_images' -Body $imageRow -Headers $restHeaders | Out-Null
                $stats.WorkOrderImages++
            }
        }
        catch {
            Write-Host "       WARN: Drop image seed failed for $($img.Name)"
            $stats.Failed++
        }
    }
}

Write-Host "       Dev media seed: $($stats.DisplayUpdated) display, $($stats.NoteImages) equipment-note, $($stats.WorkOrderImages) work-order images, $($stats.Failed) failed."

if ($stats.Failed -gt 0) { exit 1 }
exit 0
