param(
    [string]$ConfigPath = "supabase\config.toml",
    [string]$EnvOutPath = "$env:TEMP\equipqr-supabase-ports.env"
)

$ErrorActionPreference = "Stop"

function Get-ExcludedPortRanges {
    $ranges = @()
    $output = netsh interface ipv4 show excludedportrange protocol=tcp 2>$null
    foreach ($line in $output) {
        if ($line -match "^\s*(\d+)\s+(\d+)\s*(\*?)\s*$") {
            $ranges += [pscustomobject]@{
                Start = [int]$matches[1]
                End   = [int]$matches[2]
            }
        }
    }
    return $ranges
}

function Test-PortExcluded {
    param(
        [int]$Port,
        [object[]]$ExcludedRanges
    )
    foreach ($range in $ExcludedRanges) {
        if ($Port -ge $range.Start -and $Port -le $range.End) {
            return $true
        }
    }
    return $false
}

function Test-PortListening {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn -and $conn.Count -gt 0)
}

function Get-SectionPort {
    param([string]$Content, [string]$Section, [string]$Key)
    $sectionEscaped = [regex]::Escape($Section)
    $keyEscaped = [regex]::Escape($Key)
    $pattern = "(?ms)\[$sectionEscaped\][^\[]*?\b$keyEscaped\s*=\s*(\d+)"
    $match = [regex]::Match($Content, $pattern)
    if ($match.Success) { return [int]$match.Groups[1].Value }
    return $null
}

function Set-SectionPort {
    param(
        [string]$Content,
        [string]$Section,
        [string]$Key,
        [int]$Value
    )
    $sectionEscaped = [regex]::Escape($Section)
    $keyEscaped = [regex]::Escape($Key)
    $pattern = "(?ms)(\[$sectionEscaped\][^\[]*?\b$keyEscaped\s*=\s*)\d+"
    if (-not [regex]::IsMatch($Content, $pattern)) {
        throw "Missing [$Section] $Key entry in $ConfigPath"
    }
    $replacement = {
        param($match)
        return $match.Groups[1].Value + $Value
    }
    return [regex]::Replace($Content, $pattern, $replacement, 1)
}

function Write-EnvFile {
    param([string]$Path, $Ports)
    $lines = @()
    foreach ($entry in $Ports.GetEnumerator()) {
        $lines += "$($entry.Key)=$($entry.Value)"
    }
    Set-Content -LiteralPath $Path -Value $lines -Encoding ASCII
}

$resolvedConfigPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $ConfigPath))
if (-not (Test-Path -LiteralPath $resolvedConfigPath)) {
    throw "Config file not found: $resolvedConfigPath"
}

$content = Get-Content -LiteralPath $resolvedConfigPath -Raw
$excludedRanges = Get-ExcludedPortRanges

# Read ports currently in config.toml
$currentPorts = [ordered]@{
    SUPABASE_API_PORT       = Get-SectionPort -Content $content -Section "api"      -Key "port"
    SUPABASE_DB_PORT        = Get-SectionPort -Content $content -Section "db"       -Key "port"
    SUPABASE_DB_SHADOW_PORT = Get-SectionPort -Content $content -Section "db"       -Key "shadow_port"
    SUPABASE_STUDIO_PORT    = Get-SectionPort -Content $content -Section "studio"   -Key "port"
    SUPABASE_INBUCKET_PORT  = Get-SectionPort -Content $content -Section "inbucket" -Key "port"
    SUPABASE_ANALYTICS_PORT = Get-SectionPort -Content $content -Section "analytics" -Key "port"
}

# Check if any current port is in a Windows-excluded range.
# "Listening" is NOT a problem here — it just means Supabase is already running,
# which dev-start.bat handles by detecting the healthy API and skipping startup.
$blockedByWindows = @()
foreach ($entry in $currentPorts.GetEnumerator()) {
    if ($null -ne $entry.Value -and (Test-PortExcluded -Port $entry.Value -ExcludedRanges $excludedRanges)) {
        $blockedByWindows += "$($entry.Key)=$($entry.Value)"
    }
}

if ($blockedByWindows.Count -eq 0) {
    # Current ports are usable — no config change needed.
    # If Supabase is already running on them, dev-start.bat will detect the healthy
    # API listener and skip the start step entirely (true idempotency).
    Write-EnvFile -Path $EnvOutPath -Ports $currentPorts
    exit 0
}

Write-Host "       Windows has reserved ports: $($blockedByWindows -join ', '). Selecting a safe port block..."

# Find the first block where every port is neither Windows-excluded NOR already
# listening by a different process (since we're choosing a brand-new block here).
$basePorts = [ordered]@{
    SUPABASE_API_PORT       = 58121
    SUPABASE_DB_PORT        = 58122
    SUPABASE_DB_SHADOW_PORT = 58120
    SUPABASE_STUDIO_PORT    = 58123
    SUPABASE_INBUCKET_PORT  = 58124
    SUPABASE_ANALYTICS_PORT = 58127
}

$selectedPorts = $null
$lastIssues = @()

for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $offset = $attempt * 100
    $candidate = [ordered]@{}
    foreach ($entry in $basePorts.GetEnumerator()) {
        $candidate[$entry.Key] = [int]$entry.Value + $offset
    }

    $issues = @()
    foreach ($entry in $candidate.GetEnumerator()) {
        if (Test-PortExcluded -Port $entry.Value -ExcludedRanges $excludedRanges) {
            $issues += "$($entry.Key):$($entry.Value):excluded"
        } elseif (Test-PortListening -Port $entry.Value) {
            $issues += "$($entry.Key):$($entry.Value):listening"
        }
    }

    if ($issues.Count -eq 0) {
        $selectedPorts = $candidate
        break
    }

    $lastIssues = $issues
}

if ($null -eq $selectedPorts) {
    Write-Error "Unable to find an available Supabase port block after 60 attempts. Last issues: $($lastIssues -join ', ')"
    exit 1
}

$content = Set-SectionPort -Content $content -Section "api"       -Key "port"        -Value $selectedPorts["SUPABASE_API_PORT"]
$content = Set-SectionPort -Content $content -Section "db"        -Key "port"        -Value $selectedPorts["SUPABASE_DB_PORT"]
$content = Set-SectionPort -Content $content -Section "db"        -Key "shadow_port" -Value $selectedPorts["SUPABASE_DB_SHADOW_PORT"]
$content = Set-SectionPort -Content $content -Section "studio"    -Key "port"        -Value $selectedPorts["SUPABASE_STUDIO_PORT"]
$content = Set-SectionPort -Content $content -Section "inbucket"  -Key "port"        -Value $selectedPorts["SUPABASE_INBUCKET_PORT"]
$content = Set-SectionPort -Content $content -Section "analytics" -Key "port"        -Value $selectedPorts["SUPABASE_ANALYTICS_PORT"]

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($resolvedConfigPath, $content, $utf8NoBom)

Write-Host "       Ports updated in config.toml to safe block: API $($selectedPorts["SUPABASE_API_PORT"]), DB $($selectedPorts["SUPABASE_DB_PORT"])"
Write-EnvFile -Path $EnvOutPath -Ports $selectedPorts

exit 0
