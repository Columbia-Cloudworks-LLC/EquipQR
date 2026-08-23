# Local-dev-only storage upload helpers for seed-dev-media.ps1.
# Uses Supabase CLI status keys for nested storage paths (supabase storage cp does not support them).

function Initialize-LocalDevStorageSession {
    param(
        [int]$ApiPort = 54321,
        [int]$RequestTimeoutSec = 30,
        [int]$StorageReadyTimeoutSec = 120
    )

    $envLines = Get-SupabaseStatusEnvLines
    if (-not $envLines) {
        throw 'Could not read Supabase status env output.'
    }

    $anonKey = $null
    $serviceKey = $null
    foreach ($line in @($envLines)) {
        if ($line -match '^ANON_KEY="(.+)"') { $anonKey = $Matches[1] }
        if ($line -match '^SERVICE_ROLE_KEY="(.+)"') { $serviceKey = $Matches[1] }
    }
    if (-not $anonKey -or -not $serviceKey) {
        throw 'Could not parse local Supabase keys from status output.'
    }

    $headers = @{
        apikey        = $anonKey
        Authorization = "Bearer $serviceKey"
    }

    $deadline = (Get-Date).AddSeconds($StorageReadyTimeoutSec)
    $attempt = 0
    Write-Host "       Waiting for Supabase Storage (up to ${StorageReadyTimeoutSec}s)..."
    while ((Get-Date) -lt $deadline) {
        $attempt++
        try {
            Invoke-WebRequest -Method Head -Uri "http://127.0.0.1:$ApiPort/storage/v1/bucket/equipment-note-images" -Headers $headers -TimeoutSec $RequestTimeoutSec -UseBasicParsing -ErrorAction Stop | Out-Null
            Write-Host "       Supabase Storage is ready (attempt $attempt)."
            return $headers
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    throw 'Supabase Storage did not become ready in time.'
}

function Invoke-LocalDevStorageUpload {
    param(
        [string]$Bucket,
        [string]$ObjectPath,
        [string]$FilePath,
        [hashtable]$StorageHeaders,
        [int]$ApiPort = 54321,
        [int]$RequestTimeoutSec = 30
    )

    $encoded = (($ObjectPath -split '/') | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    $uploadUrl = "http://127.0.0.1:$ApiPort/storage/v1/object/$Bucket/$encoded"
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $uploadHeaders = $StorageHeaders.Clone()
    $uploadHeaders['Content-Type'] = Get-ImageContentType $FilePath
    $uploadHeaders['x-upsert'] = 'true'

    Invoke-WithRetry -Label "storage upload $Bucket/$ObjectPath" -Action {
        Invoke-RestMethod -Method Post -Uri $uploadUrl -Headers $uploadHeaders -Body $bytes -TimeoutSec $RequestTimeoutSec | Out-Null
    } | Out-Null
}
