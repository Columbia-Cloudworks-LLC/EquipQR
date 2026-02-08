# -------------------------------------------------------------------
# seed.ps1 — Full database reset with ordered seed verification
#
# Usage:  .\.cursor\skills\migration-manager\scripts\seed.ps1
#
# Wraps `npx supabase db reset` and verifies seed files exist and
# will execute in the correct dependency order:
#
#   00  Safeguard (env check)
#   01  Auth users
#   02  Profiles
#   03  Organizations
#   04  Organization members
#   05  Teams
#   06  Team members
#   07+ Domain data (equipment, work orders, inventory, etc.)
#   17-26  PM templates, compatibility rules, load-test data
#   99  Cleanup trigger-created orgs
# -------------------------------------------------------------------
$ErrorActionPreference = "Stop"

$SeedsDir = "supabase\seeds"

# ---------------------------------------------------------------------------
# Required seed files in dependency order (critical files that MUST exist)
# ---------------------------------------------------------------------------
$RequiredSeeds = @(
    "00_safeguard.sql",
    "01_auth_users.sql",
    "02_profiles.sql",
    "03_organizations.sql",
    "04_organization_members.sql",
    "05_teams.sql",
    "06_team_members.sql",
    "99_cleanup_trigger_orgs.sql"
)

Write-Host "============================================"
Write-Host "  EquipQR - Database Reset & Seed"
Write-Host "============================================"
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Verify seeds directory exists
# ---------------------------------------------------------------------------
if (-not (Test-Path $SeedsDir)) {
    Write-Host "Error: Seeds directory not found: $SeedsDir"
    Write-Host "  Are you running this from the project root?"
    exit 1
}

# ---------------------------------------------------------------------------
# 2. Verify required seed files exist
# ---------------------------------------------------------------------------
Write-Host "Checking required seed files..."
$Missing = $false
foreach ($seed in $RequiredSeeds) {
    $seedPath = Join-Path $SeedsDir $seed
    if (-not (Test-Path $seedPath)) {
        Write-Host "  X MISSING: $seed"
        $Missing = $true
    } else {
        Write-Host "  + $seed"
    }
}

if ($Missing) {
    Write-Host ""
    Write-Host "Error: Required seed files are missing. Cannot proceed."
    exit 1
}

# ---------------------------------------------------------------------------
# 3. Show all seed files in execution order
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "Seed files (lexicographic execution order):"

$seedFiles = Get-ChildItem -Path $SeedsDir -Filter "*.sql" | Sort-Object Name
foreach ($f in $seedFiles) {
    Write-Host "  -> $($f.Name)"
}

Write-Host ""
Write-Host "Total seed files: $($seedFiles.Count)"

# ---------------------------------------------------------------------------
# 4. Verify ordering correctness
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "Verifying dependency order..."

$PrevNum = -1
$OrderOk = $true

foreach ($f in $seedFiles) {
    $basename = $f.Name
    # Extract leading number (e.g., "03" from "03_organizations.sql")
    if ($basename -match '^(\d+)') {
        $numInt = [int]$Matches[1]
        if ($numInt -lt $PrevNum) {
            Write-Host "  ! Out-of-order: $basename ($numInt < $PrevNum)"
            $OrderOk = $false
        }
        $PrevNum = $numInt
    } else {
        Write-Host "  ! File without numeric prefix: $basename"
        $OrderOk = $false
    }
}

if ($OrderOk) {
    Write-Host "  + Dependency order verified"
} else {
    Write-Host ""
    Write-Host "Warning: Seed ordering issues detected. Review before continuing."
}

# ---------------------------------------------------------------------------
# 5. Run supabase db reset
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "Running: npx supabase db reset"
Write-Host "  This will DROP all data and re-apply migrations + seeds."
Write-Host ""

npx supabase db reset

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================"
    Write-Host "  Database reset complete"
    Write-Host "============================================"
    Write-Host ""
    Write-Host "Test accounts available (password: password123):"
    Write-Host "  owner@apex.test       - Apex Construction owner"
    Write-Host "  admin@apex.test       - Apex admin + Amanda's owner"
    Write-Host "  tech@apex.test        - Apex technician"
    Write-Host "  owner@metro.test      - Metro Equipment owner"
    Write-Host "  tech@metro.test       - Metro technician"
    Write-Host "  owner@valley.test     - Valley Landscaping owner"
    Write-Host "  owner@industrial.test - Industrial Rentals owner"
    Write-Host "  multi@equipqr.test    - Multi-org user (all 4 business orgs)"
} else {
    Write-Host ""
    Write-Host "Database reset failed (exit code: $LASTEXITCODE)"
    Write-Host "   Check the output above for errors."
    exit $LASTEXITCODE
}
