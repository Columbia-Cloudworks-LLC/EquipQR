#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$DryRun,
    [ValidateSet('Preview', 'staging', 'copilot')]
    [string]$Environment,
    [switch]$OnlyDrifted
)

$ErrorActionPreference = 'Stop'

$repo = 'Columbia-Cloudworks-LLC/EquipQR'
$manifestPath = Join-Path $PSScriptRoot '..\.github\secrets-map.yml'
$vaultUuid = 'tgo2m6qbct5otqeqirjocn3joa'

function Write-Step { param([string]$Message) Write-Host "[op-to-github] $Message" }
function Write-Ok { param([string]$Message) Write-Host "[op-to-github] OK   $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "[op-to-github] WARN $Message" -ForegroundColor Yellow }
function Write-Fail { param([string]$Message) Write-Host "[op-to-github] FAIL $Message" -ForegroundColor Red }

function Invoke-JsonCommand {
    param(
        [string]$Executable,
        [string[]]$Arguments,
        [string]$ErrorContext
    )
    $raw = & $Executable @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$ErrorContext failed (exit $LASTEXITCODE): $raw"
    }
    return ($raw | Out-String)
}

function Get-ManifestObject {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Manifest file not found: $Path"
    }
    if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
        throw "npx is required to parse YAML. Install Node.js or run via dev-start tooling."
    }

    $json = Invoke-JsonCommand `
        -Executable 'npx' `
        -Arguments @('-y', 'js-yaml', $Path) `
        -ErrorContext 'Manifest parse'
    return ($json | ConvertFrom-Json -Depth 100)
}

function Get-ItemUpdatedAtUtc {
    param(
        [string]$OpRef,
        [hashtable]$Cache
    )
    if ($OpRef -notmatch '^op://[^/]+/([^/]+)/[^/]+$') {
        throw "Unsupported op ref format: $OpRef"
    }
    $itemName = $matches[1]
    if ($Cache.ContainsKey($itemName)) {
        return $Cache[$itemName]
    }

    $itemJson = Invoke-JsonCommand `
        -Executable 'op' `
        -Arguments @('item', 'get', $itemName, '--vault', $vaultUuid, '--format', 'json') `
        -ErrorContext "1Password item get ($itemName)"
    $item = $itemJson | ConvertFrom-Json
    if (-not $item.updated_at) {
        throw "1Password item '$itemName' missing updated_at"
    }

    $updated = [DateTime]::Parse($item.updated_at).ToUniversalTime()
    $Cache[$itemName] = $updated
    return $updated
}

function Get-GithubSecretUpdatedAtUtc {
    param(
        [string]$TargetEnvironment,
        [string]$SecretName
    )
    $raw = & gh api "/repos/$repo/environments/$TargetEnvironment/secrets/$SecretName" 2>&1
    if ($LASTEXITCODE -ne 0) {
        $text = ($raw | Out-String)
        if ($text -match '404') {
            return $null
        }
        throw "GitHub environment secret lookup failed for $TargetEnvironment/${SecretName}: $text"
    }

    $obj = ($raw | Out-String) | ConvertFrom-Json
    if (-not $obj.updated_at) {
        return $null
    }
    return [DateTime]::Parse($obj.updated_at).ToUniversalTime()
}

if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
    Write-Fail "1Password CLI 'op' not found on PATH."
    exit 2
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Fail "GitHub CLI 'gh' not found on PATH."
    exit 1
}

$manifest = Get-ManifestObject -Path $manifestPath
if (-not $manifest.environments) {
    throw "Manifest is missing environments."
}

$selectedEnvironments = @()
if ($Environment) {
    if (-not $manifest.environments.PSObject.Properties.Name.Contains($Environment)) {
        throw "Environment '$Environment' was not found in the manifest."
    }
    $selectedEnvironments += $Environment
} else {
    $selectedEnvironments = @($manifest.environments.PSObject.Properties.Name)
}

$itemUpdatedCache = @{}
$missingItemErrors = 0
$applyFailures = 0
$applied = 0
$skipped = 0
$driftDetected = 0

Write-Step "Repository: $repo"
Write-Step "Manifest: $manifestPath"
Write-Step "Mode: $([string]::Join(', ', @($(if ($DryRun) {'dry-run'} else {'apply'}), $(if ($OnlyDrifted) {'only-drifted'} else {'verbose'}))))"

foreach ($envName in $selectedEnvironments) {
    $envConfig = $manifest.environments.$envName
    if (-not $envConfig.secrets) {
        Write-Warn "Environment '$envName' has no secrets list. Skipping."
        continue
    }

    Write-Step "Processing environment: $envName"
    foreach ($secret in $envConfig.secrets) {
        $secretName = [string]$secret.name
        $opRef = [string]$secret.op_ref
        if ([string]::IsNullOrWhiteSpace($secretName) -or [string]::IsNullOrWhiteSpace($opRef)) {
            Write-Warn "Skipping malformed manifest row in '$envName'."
            continue
        }

        $itemUpdated = $null
        $ghUpdated = $null
        $value = $null
        try {
            $valueRaw = & op read $opRef 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "1Password read failed: $valueRaw"
            }
            $value = ($valueRaw | Out-String).Trim()
            if ([string]::IsNullOrWhiteSpace($value)) {
                throw "1Password read returned empty value."
            }

            $itemUpdated = Get-ItemUpdatedAtUtc -OpRef $opRef -Cache $itemUpdatedCache
            $ghUpdated = Get-GithubSecretUpdatedAtUtc -TargetEnvironment $envName -SecretName $secretName
        } catch {
            Write-Fail "$envName/$secretName - $($_.Exception.Message)"
            $missingItemErrors++
            continue
        }

        $isDrifted = ($null -eq $ghUpdated) -or ($itemUpdated -gt $ghUpdated)
        if (-not $isDrifted) {
            $skipped++
            if (-not $OnlyDrifted) {
                Write-Step ("[skip] {0}/{1} (no drift; 1P={2:u}, GH={3:u})" -f $envName, $secretName, $itemUpdated, $ghUpdated)
            }
            continue
        }

        $driftDetected++
        if ($DryRun) {
            Write-Ok ("[would set] {0}/{1} (1P={2:u}, GH={3})" -f $envName, $secretName, $itemUpdated, $(if ($ghUpdated) { $ghUpdated.ToString('u') } else { 'missing' }))
            continue
        }

        $setResult = & gh secret set $secretName --repo $repo --env $envName --body $value 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "$envName/$secretName set failed: $setResult"
            $applyFailures++
            continue
        }

        $applied++
        Write-Ok ("[set] {0}/{1}" -f $envName, $secretName)
    }
}

Write-Host ''
Write-Step "Summary:"
Write-Step "  Drift entries: $driftDetected"
Write-Step "  Applied: $applied"
Write-Step "  Skipped (no drift): $skipped"
Write-Step "  Missing-item errors: $missingItemErrors"
Write-Step "  Apply failures: $applyFailures"

if ($missingItemErrors -gt 0) {
    exit 2
}
if ($applyFailures -gt 0) {
    exit 1
}
exit 0
