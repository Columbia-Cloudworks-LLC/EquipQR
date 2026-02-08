#!/usr/bin/env bash
# -------------------------------------------------------------------
# draft.sh — Scaffold a new Supabase migration file
#
# Usage:  bash .cursor/skills/migration-manager/scripts/draft.sh <snake_case_name>
# Example: bash .cursor/skills/migration-manager/scripts/draft.sh add_invoice_status_column
#
# Creates: supabase/migrations/YYYYMMDDHHmmss_<name>.sql
# -------------------------------------------------------------------
set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"

if [ -z "${1:-}" ]; then
  echo "Usage: bash $0 <snake_case_name>"
  echo "Example: bash $0 add_invoice_status_column"
  exit 1
fi

NAME="$1"

# Validate snake_case (lowercase letters, digits, underscores)
if ! echo "$NAME" | grep -qE '^[a-z][a-z0-9_]*$'; then
  echo "Error: Name must be snake_case (lowercase letters, digits, underscores)."
  echo "  Got: $NAME"
  exit 1
fi

# Generate timestamp in UTC (YYYYMMDDHHmmss)
TIMESTAMP=$(date -u +"%Y%m%d%H%M%S")

FILENAME="${TIMESTAMP}_${NAME}.sql"
FILEPATH="${MIGRATIONS_DIR}/${FILENAME}"

# Ensure migrations directory exists
mkdir -p "$MIGRATIONS_DIR"

# Check for collision (extremely unlikely but be safe)
if [ -f "$FILEPATH" ]; then
  echo "Error: File already exists: $FILEPATH"
  exit 1
fi

# Scaffold the file with a helpful header
cat > "$FILEPATH" << 'SQLEOF'
-- =====================================================
-- Migration: MIGRATION_NAME
-- Created:   MIGRATION_TIMESTAMP
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

SQLEOF

# Replace placeholders
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS sed
  sed -i '' "s/MIGRATION_NAME/${NAME}/g" "$FILEPATH"
  sed -i '' "s/MIGRATION_TIMESTAMP/${TIMESTAMP}/g" "$FILEPATH"
else
  # Linux / Git Bash / WSL sed
  sed -i "s/MIGRATION_NAME/${NAME}/g" "$FILEPATH"
  sed -i "s/MIGRATION_TIMESTAMP/${TIMESTAMP}/g" "$FILEPATH"
fi

echo "Created: $FILEPATH"
echo ""
echo "Next steps:"
echo "  1. Write your migration SQL in the file above"
echo "  2. Lint:  python .cursor/skills/migration-manager/scripts/lint.py $FILEPATH"
echo "  3. Apply: npx supabase db reset"
