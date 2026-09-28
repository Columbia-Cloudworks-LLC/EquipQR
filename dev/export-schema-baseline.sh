#!/usr/bin/env bash
# Export database schema and RLS reference artifacts (read-only docs).
# Usage: DATABASE_URL='postgresql://...' ./dev/export-schema-baseline.sh

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

# Build both artifacts in a temporary directory; a failed query must leave the
# existing references untouched. psql works with the pinned Supabase dump CLI.
command -v psql >/dev/null || { echo "psql is required" >&2; exit 1; }
output_dir="${SCHEMA_EXPORT_OUTPUT_DIR:-$repo_root/supabase}"
mkdir -p "$output_dir"
export_tmp="$(mktemp -d)"
trap 'rm -rf "$export_tmp"' EXIT

echo "Dumping schema ..."
supabase db dump --db-url "$DATABASE_URL" \
  --schema public --schema storage --schema auth --schema pgmq_public \
  --file "$export_tmp/schema.sql"

run_query_json() {
  local sql_file="$1"
  local output_file="$2"
  # Wrap the catalog SELECT in PostgreSQL JSON, preserving booleans and arrays.
  # ON_ERROR_STOP and a direct call preserve failures instead of parsing help text.
  {
    echo "SELECT json_build_object('rows', COALESCE(json_agg(catalog), '[]'::json)) FROM ("
    sed 's/;[[:space:]]*$//' "$sql_file"
    echo ') AS catalog;'
  } | PGOPTIONS='-c default_transaction_read_only=on' \
    psql --dbname="$DATABASE_URL" -X -q -A -t -v ON_ERROR_STOP=1 > "$output_file"
}

echo "Querying RLS catalog ..."
tables_file="$export_tmp/tables.json"
policies_file="$export_tmp/policies.json"
run_query_json dev/export-rls-tables.sql "$tables_file"
run_query_json dev/export-rls-policies-query.sql "$policies_file"
generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

python3 - "$tables_file" "$policies_file" "$export_tmp/rls-policies.sql" "$generated_at" <<'PY'
import json, sys

tables_path, policies_path, rls_path, generated_at = sys.argv[1:5]
tables = json.load(open(tables_path, encoding='utf-8'))["rows"]
policies = json.load(open(policies_path, encoding='utf-8'))["rows"]

lines = [
    "-- EquipQR RLS reference baseline (read-only documentation artifact)",
    "-- Source: production Supabase project ymxkzronkhwxzcdcbnwq",
    f"-- Generated (UTC): {generated_at}",
    "-- Regenerate: bash dev/export-schema-baseline.sh",
    "-- Do NOT apply this file directly; use supabase/migrations for changes.",
    "",
    "-- =============================================================================",
    "-- TABLE RLS POSTURE (public, storage, auth)",
    "-- =============================================================================",
    "",
    "-- schema_name | table_name | rls_enabled | rls_forced",
]

for row in sorted(tables, key=lambda r: (r["schema_name"], r["table_name"])):
    enabled = "true" if row["rls_enabled"] else "false"
    forced = "true" if row["rls_forced"] else "false"
    lines.append(
        f'-- {row["schema_name"]} | {row["table_name"]} | {enabled} | {forced}'
    )

lines.extend([
    "",
    "-- =============================================================================",
    "-- POLICIES (public, storage, auth)",
    "-- =============================================================================",
    "",
])

for policy in sorted(policies, key=lambda p: (p["schemaname"], p["tablename"], p["policyname"])):
    roles = ", ".join(policy.get("roles") or ["public"])
    permissive = policy.get("permissive") or "PERMISSIVE"
    lines.append(
        f'-- [{policy["schemaname"]}.{policy["tablename"]}] {policy["policyname"]} '
        f'({policy["cmd"]}) roles=[{roles}] {permissive}'
    )
    qual = policy.get("qual")
    if qual:
        lines.append("-- USING:")
        for line in qual.splitlines():
            lines.append(f"--   {line}")
    with_check = policy.get("with_check")
    if with_check:
        lines.append("-- WITH CHECK:")
        for line in with_check.splitlines():
            lines.append(f"--   {line}")
    lines.append("")

with open(rls_path, "w", encoding="utf-8", newline="\n") as handle:
    handle.write("\n".join(lines) + "\n")

print(f"Wrote {rls_path} ({len(policies)} policies, {len(tables)} tables inventoried).")
PY

mv "$export_tmp/schema.sql" "$output_dir/schema.sql"
mv "$export_tmp/rls-policies.sql" "$output_dir/rls-policies.sql"
echo "Schema and RLS baseline export complete."
