#!/usr/bin/env bash
# Shared preflight for GitHub Actions Supabase secrets drift checks.
# Usage: supabase-secrets-drift-preflight.sh <scope_label> <project_ref> <item1> <item2>
# Env: OP_SERVICE_ACCOUNT_TOKEN, OP_VAULT (EquipQR Agents vault id)

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <scope_label> <supabase_project_ref> <item1> <item2>" >&2
  exit 2
fi

scope_label="$1"
project_ref="$2"
item1="$3"
item2="$4"

: "${OP_VAULT:?OP_VAULT must be set}"

if ! op account get >/dev/null 2>&1; then
  echo "::error::1Password CLI is not authenticated or unavailable. Cannot run ${scope_label} Supabase drift check."
  exit 1
fi

SKIP_REASON=''
require_item_or_mark_skip() {
  local item_name="$1"
  local scope="$2"
  local err_file
  err_file="$(mktemp)"
  if op item get "$item_name" --vault "$OP_VAULT" --format json >/dev/null 2>"$err_file"; then
    rm -f "$err_file"
    return 0
  fi
  local err_output
  err_output="$(tr '\n' ' ' <"$err_file")"
  rm -f "$err_file"
  if echo "$err_output" | grep -Eiq 'not found|does not exist|isn.t an item|unknown object type|404'; then
    SKIP_REASON="$item_name"
    echo "::warning::Skipping ${scope} Supabase drift check. 1Password item '$item_name' is missing."
    return 0
  fi
  echo "::error::Unable to access 1Password item '$item_name' for ${scope} Supabase drift check: $err_output"
  exit 1
}

require_item_or_mark_skip "$item1" "$scope_label"
if [ -z "$SKIP_REASON" ]; then
  require_item_or_mark_skip "$item2" "$scope_label"
fi
if [ -z "$SKIP_REASON" ]; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/sync-supabase-secrets-from-1password.ps1 -Check -ProjectRef "$project_ref"
fi
