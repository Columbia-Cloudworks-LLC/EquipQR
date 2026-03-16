param(
    [int]$ApiPort = 54321
)

$ErrorActionPreference = "Stop"

function Write-ManagedBlock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$BlockLines,
        [Parameter()]
        [bool]$CreateIfMissing = $false,
        [Parameter()]
        [string[]]$KeysToReplace = @()
    )

    if (-not (Test-Path -LiteralPath $FilePath)) {
        if (-not $CreateIfMissing) {
            return
        }
        $initialContent = ""
    } else {
        $initialContent = Get-Content -LiteralPath $FilePath -Raw
    }

    $startMarker = "# >>> EQUIPQR LOCAL SUPABASE OVERRIDES >>>"
    $endMarker = "# <<< EQUIPQR LOCAL SUPABASE OVERRIDES <<<"
    $escapedStart = [regex]::Escape($startMarker)
    $escapedEnd = [regex]::Escape($endMarker)
    $blockPattern = "(?s)\r?\n?$escapedStart.*?$escapedEnd\r?\n?"

    $contentWithoutBlock = [regex]::Replace($initialContent, $blockPattern, "")

    foreach ($key in $KeysToReplace) {
        $escapedKey = [regex]::Escape($key)
        $contentWithoutBlock = [regex]::Replace($contentWithoutBlock, "(?m)^\s*$escapedKey\s*=.*(?:\r?\n)?", "")
    }

    $contentWithoutBlock = $contentWithoutBlock.TrimEnd("`r", "`n")

    $block = @(
        $startMarker
        $BlockLines
        $endMarker
    ) -join [Environment]::NewLine

    $newContent = if ([string]::IsNullOrWhiteSpace($contentWithoutBlock)) {
        $block + [Environment]::NewLine
    } else {
        $contentWithoutBlock + [Environment]::NewLine + [Environment]::NewLine + $block + [Environment]::NewLine
    }

    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($FilePath, $newContent, $utf8NoBom)
}

$localSupabaseBaseUrl = "http://localhost:$ApiPort"
$quickbooksRedirectUri = "$localSupabaseBaseUrl/functions/v1/quickbooks-oauth-callback"

$workspaceRoot = (Get-Location).Path
$viteLocalEnvPath = Join-Path $workspaceRoot ".env.local"
$edgeEnvPath = Join-Path $workspaceRoot "supabase\functions\.env"

Write-ManagedBlock -FilePath $viteLocalEnvPath -CreateIfMissing $true -BlockLines @(
    "VITE_SUPABASE_URL=$localSupabaseBaseUrl"
    "SUPABASE_URL=$localSupabaseBaseUrl"
    "INTUIT_REDIRECT_URI=$quickbooksRedirectUri"
    "QB_OAUTH_REDIRECT_BASE_URL=$localSupabaseBaseUrl"
    "VITE_QB_OAUTH_REDIRECT_BASE_URL=$localSupabaseBaseUrl"
    "GW_OAUTH_REDIRECT_BASE_URL=$localSupabaseBaseUrl"
    "VITE_GW_OAUTH_REDIRECT_BASE_URL=$localSupabaseBaseUrl"
) -KeysToReplace @(
    "VITE_SUPABASE_URL"
    "SUPABASE_URL"
    "INTUIT_REDIRECT_URI"
    "QB_OAUTH_REDIRECT_BASE_URL"
    "VITE_QB_OAUTH_REDIRECT_BASE_URL"
    "GW_OAUTH_REDIRECT_BASE_URL"
    "VITE_GW_OAUTH_REDIRECT_BASE_URL"
)

Write-ManagedBlock -FilePath $edgeEnvPath -CreateIfMissing $false -BlockLines @(
    "INTUIT_REDIRECT_URI=$quickbooksRedirectUri"
    "QB_OAUTH_REDIRECT_BASE_URL=$localSupabaseBaseUrl"
    "GW_OAUTH_REDIRECT_BASE_URL=$localSupabaseBaseUrl"
) -KeysToReplace @(
    "SUPABASE_URL"
    "INTUIT_REDIRECT_URI"
    "QB_OAUTH_REDIRECT_BASE_URL"
    "GW_OAUTH_REDIRECT_BASE_URL"
)

Write-Host "       Updated local env overrides for Supabase API port $ApiPort."
