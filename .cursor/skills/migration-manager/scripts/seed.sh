#!/usr/bin/env bash
# -------------------------------------------------------------------
# seed.sh — Full database reset with ordered seed verification
#
# Usage:  bash .cursor/skills/migration-manager/scripts/seed.sh
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
set -euo pipefail

SEEDS_DIR="supabase/seeds"

# ---------------------------------------------------------------------------
# Required seed files in dependency order (critical files that MUST exist)
# ---------------------------------------------------------------------------
REQUIRED_SEEDS=(
  "00_safeguard.sql"
  "01_auth_users.sql"
  "02_profiles.sql"
  "03_organizations.sql"
  "04_organization_members.sql"
  "05_teams.sql"
  "06_team_members.sql"
  "99_cleanup_trigger_orgs.sql"
)

echo "============================================"
echo "  EquipQR — Database Reset & Seed"
echo "============================================"
echo ""

# ---------------------------------------------------------------------------
# 1. Verify seeds directory exists
# ---------------------------------------------------------------------------
if [ ! -d "$SEEDS_DIR" ]; then
  echo "Error: Seeds directory not found: $SEEDS_DIR"
  echo "  Are you running this from the project root?"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Verify required seed files exist
# ---------------------------------------------------------------------------
echo "Checking required seed files..."
MISSING=0
for seed in "${REQUIRED_SEEDS[@]}"; do
  if [ ! -f "${SEEDS_DIR}/${seed}" ]; then
    echo "  ✗ MISSING: ${seed}"
    MISSING=1
  else
    echo "  ✓ ${seed}"
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Error: Required seed files are missing. Cannot proceed."
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Show all seed files in execution order
# ---------------------------------------------------------------------------
echo ""
echo "Seed files (lexicographic execution order):"
SEED_COUNT=0
for f in "${SEEDS_DIR}"/*.sql; do
  basename "$f"
  SEED_COUNT=$((SEED_COUNT + 1))
done | sort | while read -r name; do
  echo "  → ${name}"
done

echo ""
echo "Total seed files: $(ls -1 "${SEEDS_DIR}"/*.sql 2>/dev/null | wc -l | tr -d ' ')"

# ---------------------------------------------------------------------------
# 4. Verify ordering correctness
# ---------------------------------------------------------------------------
# The Supabase CLI runs seeds in lexicographic order. Ensure our numbering
# produces the correct dependency chain.
echo ""
echo "Verifying dependency order..."

PREV_NUM=-1
ORDER_OK=1
for f in $(ls -1 "${SEEDS_DIR}"/*.sql | sort); do
  BASENAME=$(basename "$f")
  # Extract leading number (e.g., "03" from "03_organizations.sql")
  NUM=$(echo "$BASENAME" | grep -oE '^[0-9]+' || echo "")
  if [ -z "$NUM" ]; then
    echo "  ⚠ File without numeric prefix: ${BASENAME}"
    ORDER_OK=0
    continue
  fi
  # Convert to base-10 integer (strip leading zeros)
  NUM_INT=$((10#$NUM))
  if [ "$NUM_INT" -lt "$PREV_NUM" ]; then
    echo "  ⚠ Out-of-order: ${BASENAME} (${NUM_INT} < ${PREV_NUM})"
    ORDER_OK=0
  fi
  PREV_NUM=$NUM_INT
done

if [ "$ORDER_OK" -eq 1 ]; then
  echo "  ✓ Dependency order verified"
else
  echo ""
  echo "Warning: Seed ordering issues detected. Review before continuing."
fi

# ---------------------------------------------------------------------------
# 5. Run supabase db reset
# ---------------------------------------------------------------------------
echo ""
echo "Running: npx supabase db reset"
echo "  This will DROP all data and re-apply migrations + seeds."
echo ""

npx supabase db reset

RESET_EXIT=$?

if [ "$RESET_EXIT" -eq 0 ]; then
  echo ""
  echo "============================================"
  echo "  ✅ Database reset complete"
  echo "============================================"
  echo ""
  echo "Test accounts available (password: password123):"
  echo "  owner@apex.test    — Apex Construction owner"
  echo "  admin@apex.test    — Apex admin + Amanda's owner"
  echo "  tech@apex.test     — Apex technician"
  echo "  owner@metro.test   — Metro Equipment owner"
  echo "  tech@metro.test    — Metro technician"
  echo "  owner@valley.test  — Valley Landscaping owner"
  echo "  owner@industrial.test — Industrial Rentals owner"
  echo "  multi@equipqr.test — Multi-org user (all 4 business orgs)"
else
  echo ""
  echo "❌ Database reset failed (exit code: ${RESET_EXIT})"
  echo "   Check the output above for errors."
  exit "$RESET_EXIT"
fi
