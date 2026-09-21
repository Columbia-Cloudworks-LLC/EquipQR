#Requires -Version 5.1
<#
.SYNOPSIS
  Download homepage-collage harvest files into public/images/marketing.

.DESCRIPTION
  Wikimedia bulk downloads failed under PowerShell Invoke-WebRequest / WebClient
  and succeeded with curl.exe -fsSL -A plus title-regex filtering.

  Query examples:

  Openverse (strip the query string on the original file URL before download):
    curl.exe -fsSL -A "EquipQR collage harvest (github.equipqr.app)" `
      "https://api.openverse.org/v1/images/?q=forklift%20construction&license=cc0,by,by-sa&page_size=20"

  Wikimedia Commons API (title-regex filter on File: results, then Special:FilePath):
    curl.exe -fsSL -A "EquipQR collage harvest (github.equipqr.app)" `
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srsearch=forklift&srlimit=20"

  This script:
  - Uses curl.exe only (never Invoke-WebRequest / WebClient)
  - Sends a descriptive User-Agent
  - Strips query strings from original file URLs
  - Rejects files smaller than the minimum byte size (error pages / empty bodies)

.PARAMETER MinBytes
  Reject downloads smaller than this size. Default 51200 (50 KiB).

.PARAMETER MarketingDir
  Destination directory. Default: <repo>/public/images/marketing

.EXAMPLE
  .\dev\homepage-collage\download-sources.ps1
#>
[CmdletBinding()]
param(
  [int]$MinBytes = 51200,
  [string]$MarketingDir = ''
)

$ErrorActionPreference = 'Stop'

function Get-CollageRepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-StrippedFileUrl {
  param([Parameter(Mandatory = $true)][string]$Url)
  $uri = [Uri]$Url
  return ('{0}://{1}{2}' -f $uri.Scheme, $uri.Authority, $uri.AbsolutePath)
}

function Test-CurlExe {
  $curl = Get-Command -Name 'curl.exe' -ErrorAction SilentlyContinue
  if (-not $curl) {
    throw 'curl.exe is required. Install it and retry. Do not use Invoke-WebRequest for this harvest.'
  }
  return $curl.Source
}

function Save-CollageSource {
  param(
    [Parameter(Mandatory = $true)][string]$CurlPath,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][int]$MinimumBytes
  )

  $cleanUrl = Get-StrippedFileUrl -Url $Url
  $userAgent = 'EquipQR collage harvest (github.equipqr.app)'
  $arguments = @(
    '-fsSL',
    '-A', $userAgent,
    '--output', $Destination,
    $cleanUrl
  )

  $process = Start-Process -FilePath $CurlPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
  if ($process.ExitCode -ne 0) {
    throw "curl.exe failed ($($process.ExitCode)) for $cleanUrl"
  }

  if (-not (Test-Path -LiteralPath $Destination)) {
    throw "download produced no file: $Destination"
  }

  $size = (Get-Item -LiteralPath $Destination).Length
  if ($size -lt $MinimumBytes) {
    Remove-Item -LiteralPath $Destination -Force
    throw "rejected $cleanUrl ($size bytes < $MinimumBytes). Likely an error page or empty body."
  }

  Write-Output "saved $Destination ($size bytes) from $cleanUrl"
}

$repoRoot = Get-CollageRepoRoot
if ([string]::IsNullOrWhiteSpace($MarketingDir)) {
  $MarketingDir = Join-Path $repoRoot 'public\images\marketing'
}

New-Item -ItemType Directory -Path $MarketingDir -Force | Out-Null
$curlPath = Test-CurlExe
$recipePath = Join-Path $PSScriptRoot 'recipe.json'
$recipe = Get-Content -LiteralPath $recipePath -Raw | ConvertFrom-Json
$downloaded = 0

foreach ($column in $recipe.columns) {
  foreach ($tile in $column) {
    if (-not $tile.pageUrl) {
      Write-Warning "skip $($tile.source): recipe has no pageUrl to resolve a file download"
      continue
    }

    $fileName = [string]$tile.source
    $destination = Join-Path $MarketingDir $fileName
    if (Test-Path -LiteralPath $destination) {
      $existing = (Get-Item -LiteralPath $destination).Length
      if ($existing -ge $MinBytes) {
        Write-Output "keep $destination ($existing bytes)"
        continue
      }
    }

    $pageUri = [Uri]$tile.pageUrl
    if ($pageUri.Host -notmatch 'wikimedia\.org$' -and $pageUri.Host -ne 'commons.wikimedia.org') {
      Write-Warning "skip $($tile.source): pageUrl host $($pageUri.Host) is not auto-downloaded; add a Commons FilePath or Openverse original URL"
      continue
    }

    $commonsFile = [Uri]::UnescapeDataString($pageUri.Segments[-1])
    $filePathUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + $commonsFile
    Save-CollageSource -CurlPath $curlPath -Url $filePathUrl -Destination $destination -MinimumBytes $MinBytes
    $downloaded += 1
  }
}

Write-Output "download-sources: saved $downloaded file(s) into $MarketingDir"
Write-Output 'Openverse harvest is manual: query api.openverse.org, copy original URLs, strip ?query, then curl.exe -fsSL -A.'
