# -------------------------------------------------------------------
# draft.ps1 — Scaffold a new Supabase migration file
#
# Usage:  .\.cursor\skills\migration-manager\scripts\draft.ps1 <snake_case_name>
# Example: .\.cursor\skills\migration-manager\scripts\draft.ps1 add_invoice_status_column
#
# Creates: supabase\migrations\YYYYMMDDHHmmss_<name>.sql
# -------------------------------------------------------------------
param(
    [Parameter(Mandatory = $false, Position = 0)]
    [string]$Name
)

$ErrorActionPreference = "Stop"

$MigrationsDir = "supabase\migrations"

if (-not $Name) {
    Write-Host "Usage: .\.cursor\skills\migration-manager\scripts\draft.ps1 <snake_case_name>"
    Write-Host "Example: .\.cursor\skills\migration-manager\scripts\draft.ps1 add_invoice_status_column"
    exit 1
}

# Validate snake_case (lowercase letters, digits, underscores, must start with letter)
if ($Name -notmatch '^[a-z][a-z0-9_]*$') {
    Write-Host "Error: Name must be snake_case (lowercase letters, digits, underscores)."
    Write-Host "  Got: $Name"
    exit 1
}

# Generate timestamp in UTC (YYYYMMDDHHmmss)
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")

$Filename = "${Timestamp}_${Name}.sql"
$Filepath = Join-Path $MigrationsDir $Filename

# Ensure migrations directory exists
if (-not (Test-Path $MigrationsDir)) {
    New-Item -ItemType Directory -Path $MigrationsDir -Force | Out-Null
}

# Check for collision
if (Test-Path $Filepath) {
    Write-Host "Error: File already exists: $Filepath"
    exit 1
}

# Scaffold the file with a helpful header
$Template = @"
-- =====================================================
-- Migration: $Name
-- Created:   $Timestamp
-- =====================================================
-- Description:
--   TODO: Describe what this migration does.
--
-- Checklist:
--   [ ] RLS enabled on new tables
--   [ ] RLS policies added for new tables
--   [ ] IF NOT EXISTS on CREATE TABLE / CREATE INDEX
--   [ ] CREATE OR REPLACE on functions / views
--   [ ] No hardcoded UUIDs in INSERTs
--   [ ] Destructive ops wrapped with -- DESTRUCTIVE: comment
-- =====================================================

"@

$Template | Set-Content -Path $Filepath -Encoding UTF8

Write-Host "Created: $Filepath"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Write your migration SQL in the file above"
Write-Host "  2. Lint:  python .cursor/skills/migration-manager/scripts/lint.py $Filepath"
Write-Host "  3. Apply: npx supabase db reset"
