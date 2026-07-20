#!/usr/bin/env bash
# Tear down the Cursor Cloud Agent ephemeral Supabase branch and restore .env.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=cloud-agent/common.sh
source "${REPO_ROOT}/scripts/cloud-agent/common.sh"

cd "$REPO_ROOT"

KEEP_ENV=0
for arg in "$@"; do
  case "$arg" in
    --keep-env) KEEP_ENV=1 ;;
    --help|-h)
      cat <<'EOF'
Usage: bash scripts/cloud-agent-ephemeral-teardown.sh [--keep-env]

  Deletes the session branch recorded in tmp/cloud-agent/ephemeral-stack.json,
  restores .env from the pre-ephemeral backup (unless --keep-env), and removes
  the session state file.
EOF
      exit 0
      ;;
  esac
done

ca_load_supabase_access_token || true

branch_name=""
branch_id=""
project_ref=""
if [[ -f "$STATE_FILE" ]]; then
  branch_name="$(ca_read_state_field branchName 2>/dev/null || true)"
  branch_id="$(ca_read_state_field branchId 2>/dev/null || true)"
  project_ref="$(ca_read_state_field projectRef 2>/dev/null || true)"
fi

if [[ "$project_ref" == "$PARENT_PROJECT_REF" ]]; then
  ca_fail "State file points at parent project — refusing delete."
  exit 1
fi

if [[ -n "$branch_id" ]]; then
  ca_log "Deleting branch id ${branch_id} (${branch_name})..."
  ca_delete_branch_api "$branch_id" >/dev/null 2>&1 || true
fi

if [[ -n "$branch_name" ]]; then
  ca_log "Deleting branch name ${branch_name} via CLI (idempotent)..."
  if npx supabase branches delete "$branch_name" --project-ref "$PARENT_PROJECT_REF" --yes; then
    ca_ok "Deleted branch ${branch_name}"
  else
    ca_warn "Branch delete returned non-zero (may already be gone)"
  fi
else
  ca_warn "No session state found at ${STATE_FILE}; nothing to delete by name."
fi

if [[ "$KEEP_ENV" -eq 0 ]]; then
  ca_restore_env_file
else
  ca_warn "Keeping current .env (--keep-env)"
fi

if [[ -f "$STATE_FILE" ]]; then
  rm -f "$STATE_FILE"
  ca_ok "Removed session state file"
fi

ca_ok "Ephemeral cloud-agent stack teardown complete."
