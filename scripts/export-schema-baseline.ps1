# Export production-sourced schema and RLS reference artifacts for agents/reviewers.
# Does not modify migrations or apply schema changes.
#
# Usage:
#   .\scripts\export-schema-baseline.ps1
#   .\scripts\export-schema-baseline.ps1 -SkipSchemaDump
#
# Requires:
#   - npx / Supabase CLI
#   - Linked production project OR prod_db_password in 1Password (EquipQR Agents)

[CmdletBinding()]
param(
    [switch]$SkipSchemaDump,
    [switch]$SkipLink
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Get-OpProdPassword {
    if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
        throw '1Password CLI (op) is required to resolve prod_db_password.'
    }
    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
        $env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    }
    $password = op read 'op://EquipQR Agents/supabase-write/prod_db_password' 2>$null
    if (-not $password) {
        throw 'Could not resolve prod_db_password from 1Password.'
    }
    return $password
}

function Invoke-NpxSupabase {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $previousNativePreference = $null
    if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
        $previousNativePreference = $global:PSNativeCommandUseErrorActionPreference
        $global:PSNativeCommandUseErrorActionPreference = $false
    }
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & npx @Arguments 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            throw "npx supabase $($Arguments -join ' ') failed with exit code $LASTEXITCODE.`n$output"
        }
        return $output
    }
    finally {
        if ($null -ne $previousNativePreference) {
            $global:PSNativeCommandUseErrorActionPreference = $previousNativePreference
        }
        $ErrorActionPreference = $previousErrorAction
    }
}

function ConvertFrom-SupabaseJsonOutput {
    param([Parameter(Mandatory = $true)][string]$Raw)

    $jsonStart = $Raw.IndexOf('{')
    if ($jsonStart -lt 0) {
        throw "Supabase query did not return JSON. Output: $($Raw.Trim())"
    }

    $depth = 0
    $inString = $false
    $escaped = $false
    for ($i = $jsonStart; $i -lt $Raw.Length; $i++) {
        $char = $Raw[$i]
        if ($inString) {
            if ($escaped) {
                $escaped = $false
            }
            elseif ($char -eq '\') {
                $escaped = $true
            }
            elseif ($char -eq '"') {
                $inString = $false
            }
            continue
        }

        if ($char -eq '"') {
            $inString = $true
            continue
        }

        if ($char -eq '{') { $depth++ }
        if ($char -eq '}') {
            $depth--
            if ($depth -eq 0) {
                return ($Raw.Substring($jsonStart, $i - $jsonStart + 1) | ConvertFrom-Json)
            }
        }
    }

    throw 'Supabase query returned malformed JSON payload.'
}

function Invoke-SupabaseJsonQuery {
    param(
        [Parameter(Mandatory = $true)][string]$SqlFile
    )

    $raw = Invoke-NpxSupabase -Arguments @('supabase', 'db', 'query', '--linked', '--output', 'json', '--file', $SqlFile)
    return (ConvertFrom-SupabaseJsonOutput -Raw $raw)
}

if (-not $SkipLink) {
    $prodPassword = Get-OpProdPassword
    Invoke-NpxSupabase -Arguments @(
        'supabase', 'link', '--project-ref', 'ymxkzronkhwxzcdcbnwq',
        '--password', $prodPassword, '--yes'
    ) | Out-Null
}

if (-not $SkipSchemaDump) {
    Write-Host 'Dumping production schema to supabase/schema.sql ...'
    Invoke-NpxSupabase -Arguments @(
        'supabase', 'db', 'dump', '--linked',
        '--schema', 'public',
        '--schema', 'storage',
        '--schema', 'auth',
        '--schema', 'pgmq_public',
        '--file', 'supabase/schema.sql'
    ) | Out-Null
}

Write-Host 'Querying RLS catalog from production ...'
$tableResult = Invoke-SupabaseJsonQuery -SqlFile 'scripts/export-rls-tables.sql'
$policyResult = Invoke-SupabaseJsonQuery -SqlFile 'scripts/export-rls-policies-query.sql'

$generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$schemaPath = Join-Path $repoRoot 'supabase/rls-policies.sql'
$lines = New-Object System.Collections.Generic.List[string]

$lines.Add('-- EquipQR RLS reference baseline (read-only documentation artifact)')
$lines.Add('-- Source: production Supabase project ymxkzronkhwxzcdcbnwq')
$lines.Add("-- Generated (UTC): $generatedAt")
$lines.Add('-- Regenerate: .\scripts\export-schema-baseline.ps1')
$lines.Add('-- Do NOT apply this file directly; use supabase/migrations for changes.')
$lines.Add('')
$lines.Add('-- =============================================================================')
$lines.Add('-- TABLE RLS POSTURE (public, storage, auth)')
$lines.Add('-- =============================================================================')
$lines.Add('')
$lines.Add('-- schema_name | table_name | rls_enabled | rls_forced')

foreach ($row in ($tableResult.rows | Sort-Object schema_name, table_name)) {
    $enabled = if ($row.rls_enabled) { 'true' } else { 'false' }
    $forced = if ($row.rls_forced) { 'true' } else { 'false' }
    $lines.Add("-- $($row.schema_name) | $($row.table_name) | $enabled | $forced")
}

$lines.Add('')
$lines.Add('-- =============================================================================')
$lines.Add('-- POLICIES (public, storage, auth)')
$lines.Add('-- =============================================================================')
$lines.Add('')

foreach ($policy in ($policyResult.rows | Sort-Object schemaname, tablename, policyname)) {
    $roles = if ($policy.roles) { ($policy.roles -join ', ') } else { 'public' }
    $permissive = if ($policy.permissive -eq 'PERMISSIVE') { 'PERMISSIVE' } else { $policy.permissive }
    $lines.Add("-- [$($policy.schemaname).$($policy.tablename)] $($policy.policyname) ($($policy.cmd)) roles=[$roles] $permissive")
    if ($policy.qual) {
        $lines.Add('-- USING:')
        foreach ($qualLine in ($policy.qual -split "`n")) {
            $lines.Add("--   $qualLine")
        }
    }
    if ($policy.with_check) {
        $lines.Add('-- WITH CHECK:')
        foreach ($checkLine in ($policy.with_check -split "`n")) {
            $lines.Add("--   $checkLine")
        }
    }
    $lines.Add('')
}

[System.IO.File]::WriteAllText($schemaPath, ($lines -join "`n") + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Host "Wrote $schemaPath ($($policyResult.rows.Count) policies, $($tableResult.rows.Count) tables inventoried)."
