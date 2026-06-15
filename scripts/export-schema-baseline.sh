#!/usr/bin/env bash
# Export preview-sourced schema and RLS reference artifacts (read-only docs).
# Usage: DATABASE_URL='postgresql://...' ./scripts/export-schema-baseline.sh

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "Dumping production schema to supabase/schema.sql ..."
supabase db dump --db-url "$DATABASE_URL" \
  --schema public \
  --schema storage \
  --schema auth \
  --schema pgmq_public \
  --file supabase/schema.sql

extract_json_object() {
  python - "$1" <<'PY'
import sys
raw = open(sys.argv[1], encoding='utf-8').read()
start = raw.find('{')
if start < 0:
    raise SystemExit('No JSON object found in Supabase query output')
depth = 0
in_string = False
escaped = False
for i, ch in enumerate(raw[start:], start):
    if in_string:
        if escaped:
            escaped = False
        elif ch == '\\':
            escaped = True
        elif ch == '"':
            in_string = False
        continue
    if ch == '"':
        in_string = True
        continue
    if ch == '{':
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            open(sys.argv[1], 'w', encoding='utf-8').write(raw[start:i + 1])
            break
else:
    raise SystemExit('Malformed JSON object in Supabase query output')
PY
}

run_query_json() {
  local sql_file="$1"
  local tmp_out
  tmp_out="$(mktemp)"
  supabase db query --db-url "$DATABASE_URL" --output json --file "$sql_file" >"$tmp_out" 2>/dev/null || true
  extract_json_object "$tmp_out"
  echo "$tmp_out"
}

echo "Querying RLS catalog ..."
tables_file="$(run_query_json scripts/export-rls-tables.sql)"
policies_file="$(run_query_json scripts/export-rls-policies-query.sql)"
generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

python - "$tables_file" "$policies_file" "supabase/rls-policies.sql" "$generated_at" <<'PY'
import json, sys

tables_path, policies_path, rls_path, generated_at = sys.argv[1:5]
tables = json.load(open(tables_path, encoding='utf-8'))["rows"]
policies = json.load(open(policies_path, encoding='utf-8'))["rows"]

lines = [
    "-- EquipQR RLS reference baseline (read-only documentation artifact)",
    "-- Source: preview Supabase project olsdirkvvfegvclbpgrg",
    f"-- Generated (UTC): {generated_at}",
    "-- Regenerate: ./scripts/export-schema-baseline.sh (CI) or .\\scripts\\export-schema-baseline.ps1 (Windows)",
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

rm -f "$tables_file" "$policies_file"
echo "Schema and RLS baseline export complete."
