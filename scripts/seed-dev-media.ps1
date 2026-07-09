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
    [int]$ApiPort = 54321,
    [string]$AnonKey,
    [string]$ServiceRoleKey,
    [int]$RequestTimeoutSec = 30,
    [int]$StorageReadyTimeoutSec = 120,
    [int]$SupabaseStatusTimeoutSec = 45,
    [int]$MaxRetries = 3
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
# Fixture orgs from supabase/seeds/99_cleanup_trigger_orgs.sql (service-role queries must scope tenants)
$SeedOrganizationIds = @(
    '660e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440003'
)
$SeedOrganizationFilter = 'organization_id=in.(' + ($SeedOrganizationIds -join ',') + ')'
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

function Invoke-WithRetry {
    param(
        [scriptblock]$Action,
        [string]$Label,
        [int]$Retries = $MaxRetries
    )
    for ($attempt = 1; $attempt -le $Retries; $attempt++) {
        try {
            return & $Action
        }
        catch {
            if ($attempt -ge $Retries) { throw }
            Start-Sleep -Seconds ([Math]::Min(8, $attempt * 2))
        }
    }
}

function Get-SupabaseStatusEnvLines {
    param([int]$TimeoutSec = $SupabaseStatusTimeoutSec)
    $job = Start-Job -ArgumentList $repoRoot -ScriptBlock {
        param($Root)
        Set-Location -LiteralPath $Root
        & npx supabase status -o env 2>$null
    }
    $completed = Wait-Job -Job $job -Timeout $TimeoutSec
    if (-not $completed) {
        Stop-Job -Job $job -Force -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        return $null
    }
    $lines = @(Receive-Job -Job $job)
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    return $lines
}

function Get-SupabaseKeys {
    param(
        [string]$PassedAnon,
        [string]$PassedService
    )
    if ($PassedAnon -and $PassedService) {
        return @{ Anon = $PassedAnon; Service = $PassedService }
    }

    $envLines = Get-SupabaseStatusEnvLines
    if (-not $envLines) {
        return @{ Anon = $null; Service = $null }
    }

    $anonKey = $null
    $serviceKey = $null
    foreach ($line in $envLines) {
        if ($line -match '^ANON_KEY="(.+)"') { $anonKey = $Matches[1] }
        if ($line -match '^SERVICE_ROLE_KEY="(.+)"') { $serviceKey = $Matches[1] }
    }
    return @{ Anon = $anonKey; Service = $serviceKey }
}

function Wait-ForStorageReady {
    param(
        [string]$Anon,
        [string]$Service,
        [int]$TimeoutSec = $StorageReadyTimeoutSec
    )
    $headers = @{
        apikey        = $Anon
        Authorization = "Bearer $Service"
    }
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $attempt = 0
    Write-Host "       Waiting for Supabase Storage (up to ${TimeoutSec}s)..."
    while ((Get-Date) -lt $deadline) {
        $attempt++
        try {
            $probeUrl = "$baseUrl/storage/v1/bucket/equipment-note-images"
            Invoke-WebRequest -Method Head -Uri $probeUrl -Headers $headers -TimeoutSec $RequestTimeoutSec -UseBasicParsing -ErrorAction Stop | Out-Null
            Write-Host "       Supabase Storage is ready (attempt $attempt)."
            return $true
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

function Get-ResponseHeaderValue {
    param(
        $Response,
        [string]$HeaderName
    )
    if ($null -eq $Response -or $null -eq $Response.Headers) { return $null }
    $value = $Response.Headers[$HeaderName]
    if ($null -eq $value) { $value = $Response.Headers[$HeaderName.ToLower()] }
    if ($value -is [array]) { return $value[0] }
    return $value
}

function Get-EncodedStorageObjectPath([string]$ObjectPath) {
    return (($ObjectPath -split '/') | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
}

function Get-StorageObjectUrl {
    param(
        [string]$Bucket,
        [string]$ObjectPath,
        [ValidateSet('object', 'object/sign')]
        [string]$Verb = 'object'
    )
    $encoded = Get-EncodedStorageObjectPath $ObjectPath
    return "$baseUrl/storage/v1/$Verb/$Bucket/$encoded"
}

function Invoke-RestSelectAll {
    param(
        [string]$Table,
        [string]$BaseQuery,
        [hashtable]$Headers,
        [int]$PageSize = 1000
    )
    $all = [System.Collections.Generic.List[object]]::new()
    $offset = 0
    while ($true) {
        $sep = if ($BaseQuery -match '\?') { '&' } else { '?' }
        $pageQuery = "$BaseQuery${sep}limit=$PageSize&offset=$offset"
        $raw = Invoke-RestSelect -Table $Table -Query $pageQuery -Headers $Headers
        if ($null -eq $raw) { break }
        $batch = @($raw)
        if ($batch.Count -eq 0) { break }
        $all.AddRange($batch)
        if ($batch.Count -lt $PageSize) { break }
        $offset += $PageSize
    }
    return @($all)
}

function Invoke-StorageUpload {
    param(
        [string]$Bucket,
        [string]$ObjectPath,
        [string]$FilePath,
        [hashtable]$Headers
    )
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $uploadUrl = Get-StorageObjectUrl -Bucket $Bucket -ObjectPath $ObjectPath
    $uploadHeaders = $Headers.Clone()
    $uploadHeaders['Content-Type'] = Get-ImageContentType $FilePath
    $uploadHeaders['x-upsert'] = 'true'
    Invoke-WithRetry -Label "storage upload $Bucket/$ObjectPath" -Action {
        Invoke-RestMethod -Method Post -Uri $uploadUrl -Headers $uploadHeaders -Body $bytes -TimeoutSec $RequestTimeoutSec | Out-Null
    } | Out-Null
}

function Invoke-RestPatch {
    param(
        [string]$Table,
        [string]$Filter,
        [hashtable]$Body,
        [hashtable]$Headers
    )
    $json = $Body | ConvertTo-Json -Compress
    Invoke-WithRetry -Label "patch $Table$Filter" -Action {
        Invoke-RestMethod -Method Patch -Uri "$baseUrl/rest/v1/$Table$Filter" -Headers $Headers -Body $json -TimeoutSec $RequestTimeoutSec | Out-Null
    } | Out-Null
}

function Invoke-RestInsert {
    param(
        [string]$Table,
        [object]$Body,
        [hashtable]$Headers
    )
    $json = if ($Body -is [array]) { $Body | ConvertTo-Json -Compress } else { $Body | ConvertTo-Json -Compress }
    return Invoke-WithRetry -Label "insert $Table" -Action {
        Invoke-RestMethod -Method Post -Uri "$baseUrl/rest/v1/$Table" -Headers $Headers -Body $json -TimeoutSec $RequestTimeoutSec
    }
}

function Invoke-RestSelect {
    param(
        [string]$Table,
        [string]$Query,
        [hashtable]$Headers
    )
    return Invoke-WithRetry -Label "select $Table" -Action {
        Invoke-RestMethod -Method Get -Uri "$baseUrl/rest/v1/$Table$Query" -Headers $Headers -TimeoutSec $RequestTimeoutSec
    }
}

if (-not (Test-Path $seedRoot)) {
    Write-Host "       No supabase/seed-images directory - skipping dev media seed."
    exit 0
}

$allEquipmentImages = Get-ImageFiles $equipmentDir
$dropImages = Get-ImageFiles $dropDir
$workOrderImages = Get-ImageFiles $workOrdersDir

$uuidPattern = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$uuidEquipmentImages = @($allEquipmentImages | Where-Object { $_.BaseName -match $uuidPattern })
$genericEquipmentImages = @($allEquipmentImages | Where-Object { $_.BaseName -notmatch $uuidPattern })
# Human-readable filenames in equipment/ are display backfill photos.
$displayBackfillPool = @($genericEquipmentImages + $dropImages)

$uuidCount = $uuidEquipmentImages.Count
$backfillCount = $displayBackfillPool.Count
$dropOnlyCount = @($dropImages).Count
$workOrderCount = @($workOrderImages).Count

if ($uuidCount -eq 0 -and $backfillCount -eq 0 -and $workOrderCount -eq 0) {
    Write-Host "       No seed images found - skipping dev media seed."
    exit 0
}

Write-Host "       Seeding dev media ($uuidCount uuid-mapped, $backfillCount display backfill, $dropOnlyCount drop-only, $workOrderCount work-order)..."

$keys = Get-SupabaseKeys -PassedAnon $AnonKey -PassedService $ServiceRoleKey
if (-not $keys.Anon -or -not $keys.Service) {
    Write-Host "       WARNING: Could not retrieve Supabase keys. Dev media seed skipped."
    exit 1
}

if (-not (Wait-ForStorageReady -Anon $keys.Anon -Service $keys.Service)) {
    Write-Host "       WARNING: Supabase Storage did not become ready in time. Dev media seed skipped."
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
    SkippedMissingEquipment = 0
}

function Test-EquipmentExists {
    param(
        [string]$EquipmentId,
        [hashtable]$Headers
    )
    $rows = @(Invoke-RestSelect -Table 'equipment' -Query "?select=id&id=eq.$EquipmentId&$SeedOrganizationFilter&limit=1" -Headers $Headers)
    return $rows.Count -gt 0
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

# ── Phase 1: explicit equipment display images (UUID filenames) ────────────
$phase1Index = 0
foreach ($img in $uuidEquipmentImages) {
    $phase1Index++
    $equipmentId = $img.BaseName

    if (-not (Test-EquipmentExists -EquipmentId $equipmentId -Headers $restHeaders)) {
        Write-Host "       WARN: No equipment row for $($img.Name) - skipped."
        $stats.SkippedMissingEquipment++
        continue
    }

    try {
        Set-EquipmentDisplayImage -EquipmentId $equipmentId -FilePath $img.FullName -FileName $img.Name -RestHeaders $restHeaders -StorageHeaders $storageHeaders
        $stats.DisplayUpdated++
        if ($phase1Index % 5 -eq 0 -or $phase1Index -eq $uuidEquipmentImages.Count) {
            Write-Host "       Phase 1 progress: $phase1Index / $($uuidEquipmentImages.Count) uuid-mapped images"
        }
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

function Get-EquipmentIdsMissingDisplay {
    param([hashtable]$Headers)
    $rows = Invoke-RestSelectAll -Table 'equipment' -BaseQuery "?select=id&image_url=is.null&$SeedOrganizationFilter&order=id.asc" -Headers $Headers
    return @($rows | ForEach-Object { $_.id })
}

function Get-EquipmentRowsWithDisplayImage {
    param([hashtable]$Headers)
    return Invoke-RestSelectAll -Table 'equipment' -BaseQuery "?select=id,image_url&image_url=not.is.null&$SeedOrganizationFilter&order=id.asc" -Headers $Headers
}

function Test-StorageObjectExists {
    param(
        [string]$Bucket,
        [string]$ObjectPath,
        [hashtable]$Headers
    )
    if (-not $ObjectPath -or -not $ObjectPath.Trim()) { return $false }
    $checkUrl = Get-StorageObjectUrl -Bucket $Bucket -ObjectPath $ObjectPath
    try {
        Invoke-WebRequest -Method Head -Uri $checkUrl -Headers $Headers -TimeoutSec $RequestTimeoutSec -UseBasicParsing | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# ── Phase 3: drop/ folder only — round-robin display, notes, and work orders ─
if ($dropImages.Count -gt 0) {
    $equipmentNeedingDisplay = @(Get-EquipmentIdsMissingDisplay -Headers $restHeaders)
    $equipmentNotes = @(
        Invoke-RestSelect -Table 'equipment_notes' -Query "?select=id,equipment_id,equipment!inner(organization_id)&equipment.organization_id=in.($($SeedOrganizationIds -join ','))&order=created_at.asc&limit=100" -Headers $restHeaders
    )
    $workOrders = @(
        Invoke-RestSelect -Table 'work_orders' -Query "?select=id&$SeedOrganizationFilter&status=in.(in_progress,assigned,accepted)&order=created_date.asc&limit=40" -Headers $restHeaders
    )

    $displayQueue = [System.Collections.Generic.Queue[string]]::new()
    foreach ($equipmentId in $equipmentNeedingDisplay) { $displayQueue.Enqueue($equipmentId) }

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
            $err = $_.Exception.Message
            Write-Host "       WARN: Backfill/drop image seed failed for $($img.Name) ($err)"
            $stats.Failed++
        }
    }
}

# ── Phase 4: cyclic display backfill for remaining equipment ───────────────
if ($displayBackfillPool.Count -gt 0) {
    $remainingIds = @(Get-EquipmentIdsMissingDisplay -Headers $restHeaders)
    if ($remainingIds.Count -gt 0) {
        Write-Host "       Backfilling $($remainingIds.Count) equipment without display images (cycling $($displayBackfillPool.Count) photos)..."
        $poolIndex = 0
        foreach ($equipmentId in $remainingIds) {
            $img = $displayBackfillPool[$poolIndex % $displayBackfillPool.Count]
            $poolIndex++
            try {
                $backfillName = "backfill-$poolIndex-$($img.Name)"
                Set-EquipmentDisplayImage -EquipmentId $equipmentId -FilePath $img.FullName -FileName $backfillName -RestHeaders $restHeaders -StorageHeaders $storageHeaders
                $stats.DisplayUpdated++
            }
            catch {
                $err = $_.Exception.Message
                Write-Host "       WARN: Display backfill failed for equipment $equipmentId ($err)"
                $stats.Failed++
            }
        }
    }
}

# ── Phase 5: repair display paths whose storage object is missing ───────────
if ($displayBackfillPool.Count -gt 0) {
    $rowsWithDisplay = @(Get-EquipmentRowsWithDisplayImage -Headers $restHeaders)
    $broken = @(
        $rowsWithDisplay | Where-Object {
            $path = $_.image_url
            if (-not $path) { return $true }
            -not (Test-StorageObjectExists -Bucket 'equipment-note-images' -ObjectPath $path -Headers $storageHeaders)
        }
    )
    if ($broken.Count -gt 0) {
        Write-Host "       Repairing $($broken.Count) equipment display image(s) with missing storage objects..."
        $poolIndex = 0
        foreach ($row in $broken) {
            $img = $displayBackfillPool[$poolIndex % $displayBackfillPool.Count]
            $poolIndex++
            try {
                $repairName = "repair-$poolIndex-$($img.Name)"
                Set-EquipmentDisplayImage -EquipmentId $row.id -FilePath $img.FullName -FileName $repairName -RestHeaders $restHeaders -StorageHeaders $storageHeaders
                $stats.DisplayUpdated++
            }
            catch {
                $err = $_.Exception.Message
                Write-Host "       WARN: Display repair failed for equipment $($row.id) ($err)"
                $stats.Failed++
            }
        }
    }
}

$verifyHeaders = $restHeaders.Clone()
$verifyHeaders['Prefer'] = 'count=exact'
try {
    $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/rest/v1/equipment?select=id&image_url=not.is.null&$SeedOrganizationFilter&limit=1" -Headers $verifyHeaders -Method Get -UseBasicParsing -TimeoutSec $RequestTimeoutSec
    $withDisplay = 0
    $contentRange = Get-ResponseHeaderValue -Response $verifyResponse -HeaderName 'Content-Range'
    if ($contentRange -match '/(\d+)$') {
        $withDisplay = [int]$Matches[1]
    }
}
catch {
    Write-Host "       WARN: Could not verify seeded display image count ($($_.Exception.Message))."
    $withDisplay = -1
}

Write-Host "       Dev media seed: $($stats.DisplayUpdated) display, $($stats.NoteImages) equipment-note, $($stats.WorkOrderImages) work-order images, $($stats.Failed) failed, $($stats.SkippedMissingEquipment) uuid files without matching equipment."
Write-Host "       Verified: $withDisplay equipment row(s) now have image_url set."

if ($stats.Failed -gt 0) { exit 1 }
exit 0
