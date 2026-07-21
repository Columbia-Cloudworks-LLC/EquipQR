<#
.SYNOPSIS
  Upload local seed images into Supabase Storage and wire DB references after db reset.

.DESCRIPTION
  Supports drop zones under supabase/seed-images/:
    equipment/     — {equipment-uuid}.{jpg|png|webp|gif} sets equipment.image_url (display photo)
    drop/          — any images; auto-assigned to display slots, equipment notes, and work orders
    work-orders/   — {work-order-uuid}.{ext} attaches to the WO via a seed note + work_order_images row
    organizations/ — {organization-uuid}.{ext} uploads to organization-logos and sets organizations.logo
    teams/         — {team-uuid}.{ext} uploads to team-images and sets teams.image_url (canonical path)

  Equipment / note / WO / team images store canonical private-bucket paths (never signed URLs).
  Organization logos store the public object URL (matches production uploadOrganizationLogo).
  Runs automatically as step 5b in dev-start.bat -Force.
#>
param(
    [int]$ApiPort = 54321,
    [int]$RequestTimeoutSec = 30,
    [int]$StorageReadyTimeoutSec = 120,
    [int]$SupabaseStatusTimeoutSec = 45,
    [int]$MaxRetries = 3,
    [string]$PublicStorageHost = '127.0.0.1'
)

$ErrorActionPreference = 'Stop'

$repoRoot = if ($PSScriptRoot) {
    (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
} else {
    (Get-Location).Path
}

$configText = Get-Content (Join-Path $repoRoot 'supabase\config.toml') -Raw
if ($configText -notmatch '(?m)^project_id\s*=\s*"([^"]+)"') {
    throw 'Could not resolve project_id from supabase/config.toml for local DB container name.'
}
$DbContainer = "supabase_db_$($Matches[1])"
$seedRoot = Join-Path $repoRoot 'supabase\seed-images'
$equipmentDir = Join-Path $seedRoot "equipment"
$dropDir = Join-Path $seedRoot "drop"
$workOrdersDir = Join-Path $seedRoot "work-orders"
$organizationsDir = Join-Path $seedRoot "organizations"
$teamsDir = Join-Path $seedRoot "teams"

# owner@apex.test — stable uploader for local seed media
$SeedUploaderId = 'bb0e8400-e29b-41d4-a716-446655440001'
# Fixture orgs from supabase/seeds/99_cleanup_trigger_orgs.sql (seed queries scope tenants)
$SeedOrganizationIds = @(
    '660e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440003'
)
$ImageExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.gif')

function Escape-SqlLiteral {
    param([string]$Value)
    if ($null -eq $Value) { return '' }
    return $Value.Replace("'", "''")
}

$SeedOrganizationIdsSql = ($SeedOrganizationIds | ForEach-Object { "'" + (Escape-SqlLiteral $_) + "'" }) -join ','

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

function Invoke-PsqlRaw {
    param(
        [string]$Sql,
        [switch]$TuplesOnly
    )
    $dockerArgs = @('exec', $DbContainer, 'psql', '-U', 'postgres', '-d', 'postgres')
    if ($TuplesOnly) {
        $dockerArgs += @('-t', '-A')
    }
    $dockerArgs += @('-c', $Sql)
    $output = & docker @dockerArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed (exit $LASTEXITCODE): $output"
    }
    return ($output | Out-String)
}

function Invoke-PsqlScalar {
    param([string]$Sql)
    return (Invoke-PsqlRaw -Sql $Sql -TuplesOnly).Trim()
}

function Invoke-PsqlLines {
    param([string]$Sql)
    $result = Invoke-PsqlRaw -Sql $Sql -TuplesOnly
    @($result -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
}

function Invoke-PsqlNonQuery {
    param(
        [string]$Sql,
        [string]$Label = 'psql execute'
    )
    Invoke-WithRetry -Label $Label -Action {
        Invoke-PsqlRaw -Sql $Sql | Out-Null
    } | Out-Null
}

. (Join-Path $PSScriptRoot 'Invoke-LocalDevStorageUpload.ps1')

function Get-OrCreateEquipmentSeedNote {
    param([string]$EquipmentId)
    $equipmentIdSql = Escape-SqlLiteral $EquipmentId
    $existing = @(Invoke-PsqlLines "SELECT id FROM equipment_notes WHERE equipment_id = '$equipmentIdSql' ORDER BY created_at ASC LIMIT 1")
    if ($existing.Count -gt 0) {
        return [string]$existing[0]
    }

    $noteId = [guid]::NewGuid().ToString()
    $noteIdSql = Escape-SqlLiteral $noteId
    $contentSql = Escape-SqlLiteral 'Auto-created seed note for local dev media.'
    $sql = @"
INSERT INTO equipment_notes (id, equipment_id, author_id, content, is_private)
VALUES ('$noteIdSql', '$equipmentIdSql', '$SeedUploaderId', '$contentSql', false)
"@
    Invoke-PsqlNonQuery -Sql $sql -Label "insert equipment_notes for $EquipmentId"
    return $noteId
}

function Set-EquipmentDisplayImage {
    param(
        [string]$EquipmentId,
        [string]$FilePath,
        [string]$FileName,
        [hashtable]$StorageHeaders
    )
    $noteId = Get-OrCreateEquipmentSeedNote -EquipmentId $EquipmentId
    $objectPath = "$SeedUploaderId/$EquipmentId/$noteId/$FileName"
    Invoke-LocalDevStorageUpload -Bucket 'equipment-note-images' -ObjectPath $objectPath -FilePath $FilePath -StorageHeaders $StorageHeaders -ApiPort $ApiPort -RequestTimeoutSec $RequestTimeoutSec

    $equipmentIdSql = Escape-SqlLiteral $EquipmentId
    $objectPathSql = Escape-SqlLiteral $objectPath
    Invoke-PsqlNonQuery -Sql "UPDATE equipment SET image_url = '$objectPathSql' WHERE id = '$equipmentIdSql'" -Label "update equipment image_url"

    $noteIdSql = Escape-SqlLiteral $noteId
    $fileNameSql = Escape-SqlLiteral $FileName
    $mimeTypeSql = Escape-SqlLiteral (Get-ImageContentType $FilePath)
    $fileSize = (Get-Item $FilePath).Length
    $imageSql = @"
INSERT INTO equipment_note_images (equipment_note_id, file_name, file_url, file_size, mime_type, uploaded_by)
VALUES ('$noteIdSql', '$fileNameSql', '$objectPathSql', $fileSize, '$mimeTypeSql', '$SeedUploaderId')
"@
    Invoke-PsqlNonQuery -Sql $imageSql -Label "insert equipment_note_images"
}

function Get-EquipmentIdsMissingDisplay {
    $lines = Invoke-PsqlLines @"
SELECT id FROM equipment
WHERE image_url IS NULL
  AND organization_id IN ($SeedOrganizationIdsSql)
ORDER BY id ASC
"@
    return @($lines)
}

function Get-EquipmentRowsWithDisplayImage {
    $lines = Invoke-PsqlLines @"
SELECT id, image_url FROM equipment
WHERE image_url IS NOT NULL
  AND organization_id IN ($SeedOrganizationIdsSql)
ORDER BY id ASC
"@
    return @($lines | ForEach-Object {
        $parts = $_ -split '\|', 2
        [PSCustomObject]@{
            id        = $parts[0]
            image_url = if ($parts.Count -gt 1) { $parts[1] } else { $null }
        }
    })
}

function Test-StorageObjectExists {
    param(
        [string]$Bucket,
        [string]$ObjectPath
    )
    if (-not $ObjectPath -or -not $ObjectPath.Trim()) { return $false }
    $bucketSql = Escape-SqlLiteral $Bucket
    $pathSql = Escape-SqlLiteral $ObjectPath
    $sql = "SELECT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id = '$bucketSql' AND name = '$pathSql')"
    return (Invoke-PsqlScalar $sql) -eq 't'
}

function Insert-WorkOrderSeedNote {
    param(
        [string]$NoteId,
        [string]$WorkOrderId,
        [string]$Content
    )
    $noteIdSql = Escape-SqlLiteral $NoteId
    $workOrderIdSql = Escape-SqlLiteral $WorkOrderId
    $contentSql = Escape-SqlLiteral $Content
    $sql = @"
INSERT INTO work_order_notes (id, work_order_id, author_id, content, hours_worked, is_private)
SELECT '$noteIdSql', wo.id, '$SeedUploaderId', '$contentSql', 0, false
FROM work_orders wo
WHERE wo.id = '$workOrderIdSql'
  AND wo.organization_id IN ($SeedOrganizationIdsSql)
"@
    Invoke-PsqlNonQuery -Sql $sql -Label "insert work_order_notes"
}

function Insert-WorkOrderImageRow {
    param(
        [string]$WorkOrderId,
        [string]$NoteId,
        [string]$FileName,
        [string]$ObjectPath,
        [long]$FileSize,
        [string]$MimeType,
        [string]$Description
    )
    $workOrderIdSql = Escape-SqlLiteral $WorkOrderId
    $noteIdSql = Escape-SqlLiteral $NoteId
    $fileNameSql = Escape-SqlLiteral $FileName
    $objectPathSql = Escape-SqlLiteral $ObjectPath
    $mimeTypeSql = Escape-SqlLiteral $MimeType
    $descriptionSql = Escape-SqlLiteral $Description
    $sql = @"
INSERT INTO work_order_images (work_order_id, note_id, file_name, file_url, file_size, mime_type, uploaded_by, description)
SELECT wo.id, '$noteIdSql', '$fileNameSql', '$objectPathSql', $FileSize, '$mimeTypeSql', '$SeedUploaderId', '$descriptionSql'
FROM work_orders wo
WHERE wo.id = '$workOrderIdSql'
  AND wo.organization_id IN ($SeedOrganizationIdsSql)
"@
    Invoke-PsqlNonQuery -Sql $sql -Label "insert work_order_images"
}

function Insert-EquipmentNoteImageRow {
    param(
        [string]$EquipmentNoteId,
        [string]$FileName,
        [string]$ObjectPath,
        [long]$FileSize,
        [string]$MimeType
    )
    $noteIdSql = Escape-SqlLiteral $EquipmentNoteId
    $fileNameSql = Escape-SqlLiteral $FileName
    $objectPathSql = Escape-SqlLiteral $ObjectPath
    $mimeTypeSql = Escape-SqlLiteral $MimeType
    $sql = @"
INSERT INTO equipment_note_images (equipment_note_id, file_name, file_url, file_size, mime_type, uploaded_by)
VALUES ('$noteIdSql', '$fileNameSql', '$objectPathSql', $FileSize, '$mimeTypeSql', '$SeedUploaderId')
"@
    Invoke-PsqlNonQuery -Sql $sql -Label "insert equipment_note_images"
}

if (-not (Test-Path $seedRoot)) {
    Write-Host "       No supabase/seed-images directory - skipping dev media seed."
    exit 0
}

$allEquipmentImages = Get-ImageFiles $equipmentDir
$dropImages = Get-ImageFiles $dropDir
$workOrderImages = Get-ImageFiles $workOrdersDir
$organizationImages = Get-ImageFiles $organizationsDir
$teamImages = Get-ImageFiles $teamsDir

$uuidPattern = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$uuidEquipmentImages = @($allEquipmentImages | Where-Object { $_.BaseName -match $uuidPattern })
$genericEquipmentImages = @($allEquipmentImages | Where-Object { $_.BaseName -notmatch $uuidPattern })
# Human-readable filenames in equipment/ are display backfill photos.
$displayBackfillPool = @($genericEquipmentImages + $dropImages)
$uuidOrganizationImages = @($organizationImages | Where-Object { $_.BaseName -match $uuidPattern })
$uuidTeamImages = @($teamImages | Where-Object { $_.BaseName -match $uuidPattern })

$uuidCount = $uuidEquipmentImages.Count
$backfillCount = $displayBackfillPool.Count
$dropOnlyCount = @($dropImages).Count
$workOrderCount = @($workOrderImages).Count
$orgLogoCount = $uuidOrganizationImages.Count
$teamImageCount = $uuidTeamImages.Count

if ($uuidCount -eq 0 -and $backfillCount -eq 0 -and $workOrderCount -eq 0 -and $orgLogoCount -eq 0 -and $teamImageCount -eq 0) {
    Write-Host "       No seed images found - skipping dev media seed."
    exit 0
}

Write-Host "       Seeding dev media ($uuidCount uuid-mapped, $backfillCount display backfill, $dropOnlyCount drop-only, $workOrderCount work-order, $orgLogoCount org logos, $teamImageCount team images)..."

Write-Host "       Resolving local Supabase keys for storage uploads (timeout-bound)..."
try {
    $StorageHeaders = Initialize-LocalDevStorageSession -ApiPort $ApiPort -RequestTimeoutSec $RequestTimeoutSec -StorageReadyTimeoutSec $StorageReadyTimeoutSec
}
catch {
    Write-Host "       WARNING: $($_.Exception.Message) Dev media seed skipped."
    exit 1
}

$stats = @{
    DisplayUpdated = 0
    NoteImages     = 0
    WorkOrderImages = 0
    OrgLogos       = 0
    TeamImages     = 0
    Failed         = 0
    SkippedMissingEquipment = 0
    SkippedMissingWorkOrder = 0
    SkippedMissingOrganization = 0
    SkippedMissingTeam = 0
}

Write-Host "       Loading fixture-scoped equipment and work-order IDs..."
$SeedScopeEquipmentIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$equipmentScopeLines = Invoke-WithRetry -Label 'load seed-scoped equipment ids' -Action {
    @(Invoke-PsqlLines "SELECT id FROM equipment WHERE organization_id IN ($SeedOrganizationIdsSql)")
}
foreach ($equipmentId in $equipmentScopeLines) {
    [void]$SeedScopeEquipmentIds.Add($equipmentId)
}
$SeedScopeWorkOrderIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$workOrderScopeLines = Invoke-WithRetry -Label 'load seed-scoped work-order ids' -Action {
    @(Invoke-PsqlLines "SELECT id FROM work_orders WHERE organization_id IN ($SeedOrganizationIdsSql)")
}
foreach ($workOrderId in $workOrderScopeLines) {
    [void]$SeedScopeWorkOrderIds.Add($workOrderId)
}

# ── Phase 1: explicit equipment display images (UUID filenames) ────────────
$phase1Index = 0
foreach ($img in $uuidEquipmentImages) {
    $phase1Index++
    $equipmentId = $img.BaseName

    if (-not $SeedScopeEquipmentIds.Contains($equipmentId)) {
        Write-Host "       WARN: No equipment row for $($img.Name) - skipped."
        $stats.SkippedMissingEquipment++
        continue
    }

    try {
        Set-EquipmentDisplayImage -EquipmentId $equipmentId -FilePath $img.FullName -FileName $img.Name -StorageHeaders $StorageHeaders
        $stats.DisplayUpdated++
        if ($phase1Index % 5 -eq 0 -or $phase1Index -eq $uuidEquipmentImages.Count) {
            Write-Host "       Phase 1 progress: $phase1Index / $($uuidEquipmentImages.Count) uuid-mapped images"
        }
    }
    catch {
        Write-Host "       WARN: Equipment display seed failed for $($img.Name) ($($_.Exception.Message))"
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

    if (-not $SeedScopeWorkOrderIds.Contains($workOrderId)) {
        Write-Host "       WARN: No in-scope work order for $($img.Name) - skipped."
        $stats.SkippedMissingWorkOrder++
        continue
    }

    try {
        $noteId = [guid]::NewGuid().ToString()
        $objectPath = "$SeedUploaderId/$workOrderId/$noteId/seed-$($img.Name)"
        Invoke-LocalDevStorageUpload -Bucket 'work-order-images' -ObjectPath $objectPath -FilePath $img.FullName -StorageHeaders $StorageHeaders -ApiPort $ApiPort -RequestTimeoutSec $RequestTimeoutSec

        Insert-WorkOrderSeedNote -NoteId $noteId -WorkOrderId $workOrderId -Content 'Seed photo attached for local media testing.'
        Insert-WorkOrderImageRow -WorkOrderId $workOrderId -NoteId $noteId -FileName $img.Name -ObjectPath $objectPath `
            -FileSize $img.Length -MimeType (Get-ImageContentType $img.FullName) -Description 'Local dev seed image'
        $stats.WorkOrderImages++
    }
    catch {
        Write-Host "       WARN: Work-order seed failed for $($img.Name)"
        $stats.Failed++
    }
}

# ── Phase 3: drop/ folder only — round-robin display, notes, and work orders ─
if ($dropImages.Count -gt 0) {
    $equipmentNeedingDisplay = @(Get-EquipmentIdsMissingDisplay)
    $equipmentNoteLines = Invoke-PsqlLines @"
SELECT en.id, en.equipment_id
FROM equipment_notes en
INNER JOIN equipment e ON e.id = en.equipment_id
WHERE e.organization_id IN ($SeedOrganizationIdsSql)
ORDER BY en.created_at ASC
LIMIT 100
"@
    $equipmentNotes = @($equipmentNoteLines | ForEach-Object {
        $parts = $_ -split '\|', 2
        [PSCustomObject]@{
            id           = $parts[0]
            equipment_id = if ($parts.Count -gt 1) { $parts[1] } else { $null }
        }
    })
    $workOrderIds = @(Invoke-PsqlLines @"
SELECT id FROM work_orders
WHERE organization_id IN ($SeedOrganizationIdsSql)
  AND status IN ('in_progress', 'assigned', 'accepted')
ORDER BY created_date ASC
LIMIT 40
"@)

    $displayQueue = [System.Collections.Generic.Queue[string]]::new()
    foreach ($equipmentId in $equipmentNeedingDisplay) { $displayQueue.Enqueue($equipmentId) }

    $noteQueue = [System.Collections.Generic.Queue[object]]::new()
    foreach ($row in $equipmentNotes) { $noteQueue.Enqueue($row) }

    $woQueue = [System.Collections.Generic.Queue[string]]::new()
    foreach ($workOrderId in $workOrderIds) { $woQueue.Enqueue($workOrderId) }

    $dropIndex = 0
    foreach ($img in $dropImages) {
        $target = $dropIndex % 3
        $dropIndex++

        try {
            if ($target -eq 0 -and $displayQueue.Count -gt 0) {
                $equipmentId = $displayQueue.Dequeue()
                $dropName = "drop-$($img.Name)"
                Set-EquipmentDisplayImage -EquipmentId $equipmentId -FilePath $img.FullName -FileName $dropName -StorageHeaders $StorageHeaders
                $stats.DisplayUpdated++
                continue
            }

            if ($target -eq 1 -and $noteQueue.Count -gt 0) {
                $note = $noteQueue.Dequeue()
                $objectPath = "$SeedUploaderId/$($note.equipment_id)/$($note.id)/seed-drop-$($img.Name)"
                Invoke-LocalDevStorageUpload -Bucket 'equipment-note-images' -ObjectPath $objectPath -FilePath $img.FullName -StorageHeaders $StorageHeaders -ApiPort $ApiPort -RequestTimeoutSec $RequestTimeoutSec
                Insert-EquipmentNoteImageRow -EquipmentNoteId $note.id -FileName $img.Name -ObjectPath $objectPath `
                    -FileSize $img.Length -MimeType (Get-ImageContentType $img.FullName)
                $stats.NoteImages++
                continue
            }

            if ($woQueue.Count -gt 0) {
                $workOrderId = $woQueue.Dequeue()
                $noteId = [guid]::NewGuid().ToString()
                $objectPath = "$SeedUploaderId/$workOrderId/$noteId/seed-drop-$($img.Name)"
                Invoke-LocalDevStorageUpload -Bucket 'work-order-images' -ObjectPath $objectPath -FilePath $img.FullName -StorageHeaders $StorageHeaders -ApiPort $ApiPort -RequestTimeoutSec $RequestTimeoutSec
                Insert-WorkOrderSeedNote -NoteId $noteId -WorkOrderId $workOrderId -Content 'Drop-folder seed photo for local media testing.'
                Insert-WorkOrderImageRow -WorkOrderId $workOrderId -NoteId $noteId -FileName $img.Name -ObjectPath $objectPath `
                    -FileSize $img.Length -MimeType (Get-ImageContentType $img.FullName) -Description 'Local dev drop-folder seed'
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
    $remainingIds = @(Get-EquipmentIdsMissingDisplay)
    if ($remainingIds.Count -gt 0) {
        Write-Host "       Backfilling $($remainingIds.Count) equipment without display images (cycling $($displayBackfillPool.Count) photos)..."
        $poolIndex = 0
        foreach ($equipmentId in $remainingIds) {
            $img = $displayBackfillPool[$poolIndex % $displayBackfillPool.Count]
            $poolIndex++
            try {
                $backfillName = "backfill-$poolIndex-$($img.Name)"
                Set-EquipmentDisplayImage -EquipmentId $equipmentId -FilePath $img.FullName -FileName $backfillName -StorageHeaders $StorageHeaders
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
    $rowsWithDisplay = @(Get-EquipmentRowsWithDisplayImage)
    $broken = @(
        $rowsWithDisplay | Where-Object {
            $path = $_.image_url
            if (-not $path) { return $true }
            -not (Test-StorageObjectExists -Bucket 'equipment-note-images' -ObjectPath $path)
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
                Set-EquipmentDisplayImage -EquipmentId $row.id -FilePath $img.FullName -FileName $repairName -StorageHeaders $StorageHeaders
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

# ── Phase 6: organization logos (public bucket + organizations.logo URL) ────
if ($uuidOrganizationImages.Count -gt 0) {
    Write-Host "       Seeding $($uuidOrganizationImages.Count) organization logo(s)..."
    foreach ($img in $uuidOrganizationImages) {
        $orgId = $img.BaseName.ToLower()
        $exists = (Invoke-PsqlScalar "SELECT EXISTS(SELECT 1 FROM organizations WHERE id = '$orgId')") -eq 't'
        if (-not $exists) {
            Write-Host "       WARN: No organization row for logo file $($img.Name); skipping."
            $stats.SkippedMissingOrganization++
            continue
        }
        try {
            $ext = $img.Extension.TrimStart('.').ToLower()
            if ($ext -eq 'jpeg') { $ext = 'jpg' }
            $objectPath = "$orgId/logo.$ext"
            Invoke-LocalDevStorageUpload -Bucket 'organization-logos' -ObjectPath $objectPath -FilePath $img.FullName -StorageHeaders $StorageHeaders -ApiPort $ApiPort -RequestTimeoutSec $RequestTimeoutSec
            $publicUrl = "http://$PublicStorageHost`:$ApiPort/storage/v1/object/public/organization-logos/$objectPath"
            $publicUrlSql = Escape-SqlLiteral $publicUrl
            Invoke-PsqlNonQuery -Sql "UPDATE organizations SET logo = '$publicUrlSql', updated_at = NOW() WHERE id = '$orgId'" -Label "update organizations.logo $orgId"
            $stats.OrgLogos++
        }
        catch {
            Write-Host "       WARN: Organization logo seed failed for $orgId ($($_.Exception.Message))"
            $stats.Failed++
        }
    }
}

# ── Phase 7: team images (private-path storage + teams.image_url) ────────────
if ($uuidTeamImages.Count -gt 0) {
    Write-Host "       Seeding $($uuidTeamImages.Count) team image(s)..."
    foreach ($img in $uuidTeamImages) {
        $teamId = $img.BaseName.ToLower()
        $orgId = (Invoke-PsqlScalar "SELECT organization_id::text FROM teams WHERE id = '$teamId' LIMIT 1")
        if (-not $orgId) {
            Write-Host "       WARN: No team row for image file $($img.Name); skipping."
            $stats.SkippedMissingTeam++
            continue
        }
        try {
            $ext = $img.Extension.TrimStart('.').ToLower()
            if ($ext -eq 'jpeg') { $ext = 'jpg' }
            $objectPath = "$orgId/$teamId/image.$ext"
            Invoke-LocalDevStorageUpload -Bucket 'team-images' -ObjectPath $objectPath -FilePath $img.FullName -StorageHeaders $StorageHeaders -ApiPort $ApiPort -RequestTimeoutSec $RequestTimeoutSec
            $objectPathSql = Escape-SqlLiteral $objectPath
            Invoke-PsqlNonQuery -Sql "UPDATE teams SET image_url = '$objectPathSql', updated_at = NOW() WHERE id = '$teamId'" -Label "update teams.image_url $teamId"
            $stats.TeamImages++
        }
        catch {
            Write-Host "       WARN: Team image seed failed for $teamId ($($_.Exception.Message))"
            $stats.Failed++
        }
    }
}

try {
    $withDisplay = [int](Invoke-PsqlScalar @"
SELECT COUNT(*) FROM equipment
WHERE image_url IS NOT NULL
  AND organization_id IN ($SeedOrganizationIdsSql)
"@)
}
catch {
    Write-Host "       WARN: Could not verify seeded display image count ($($_.Exception.Message))."
    $withDisplay = -1
}

Write-Host "       Dev media seed: $($stats.DisplayUpdated) display, $($stats.NoteImages) equipment-note, $($stats.WorkOrderImages) work-order, $($stats.OrgLogos) org logos, $($stats.TeamImages) team images, $($stats.Failed) failed, $($stats.SkippedMissingEquipment) uuid files without matching equipment, $($stats.SkippedMissingWorkOrder) work-order files without in-scope target, $($stats.SkippedMissingOrganization) org logos without matching org, $($stats.SkippedMissingTeam) team images without matching team."
Write-Host "       Verified: $withDisplay equipment row(s) now have image_url set."

if ($stats.Failed -gt 0) { exit 1 }
exit 0
