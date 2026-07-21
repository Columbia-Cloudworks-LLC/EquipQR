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
has_token=0
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  has_token=1
fi

branch_name=""
branch_id=""
project_ref=""
parent_ref=""
remote_delete_attempted=0
if [[ -f "$STATE_FILE" ]]; then
  branch_name="$(ca_read_state_field branchName 2>/dev/null || true)"
  branch_id="$(ca_read_state_field branchId 2>/dev/null || true)"
  project_ref="$(ca_read_state_field projectRef 2>/dev/null || true)"
  parent_ref="$(ca_read_state_field parentProjectRef 2>/dev/null || true)"
fi

if [[ -z "$branch_name" && -z "$branch_id" ]]; then
  ca_warn "No session state found at ${STATE_FILE}; nothing to delete remotely."
  remote_delete_attempted=1
elif [[ "$has_token" -ne 1 ]]; then
  ca_warn "SUPABASE_ACCESS_TOKEN unset — skipping remote branch delete; keeping session state for a later credentialed teardown."
else
  skip_remote=0
  if [[ -z "$project_ref" ]]; then
    ca_warn "State file missing projectRef — skipping remote delete; continuing local cleanup."
    skip_remote=1
  elif [[ "$project_ref" == "$PARENT_PROJECT_REF" ]]; then
    ca_warn "State file points at parent/production project — skipping remote delete; continuing local cleanup."
    skip_remote=1
  elif [[ -n "$parent_ref" && "$parent_ref" != "$PARENT_PROJECT_REF" ]]; then
    ca_warn "State parentProjectRef (${parent_ref}) does not match ${PARENT_PROJECT_REF} — skipping remote delete."
    skip_remote=1
  elif [[ -n "$branch_name" ]] && ! ca_assert_safe_agent_branch_name "$branch_name"; then
    ca_warn "Branch name failed agent-* safety check — skipping remote delete."
    skip_remote=1
  fi

  if [[ "$skip_remote" -eq 0 ]]; then
    remote_delete_attempted=1
    list_json="$(ca_list_branches_api 2>/dev/null || echo '[]')"
    if [[ -n "$branch_name" ]]; then
      if live_json="$(ca_find_branch_json "$branch_name" "$list_json" 2>/dev/null)"; then
        live_ref="$(echo "$live_json" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(j.project_ref||""))')"
        live_id="$(echo "$live_json" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(j.id||""))')"
        if [[ -n "$live_ref" && "$live_ref" != "$project_ref" ]]; then
          ca_warn "Live branch project_ref (${live_ref}) does not match state (${project_ref}) — skipping remote delete."
          skip_remote=1
          remote_delete_attempted=0
        elif [[ -n "$branch_id" && -n "$live_id" && "$branch_id" != "$live_id" ]]; then
          ca_warn "Live branch id (${live_id}) does not match state (${branch_id}) — skipping remote delete."
          skip_remote=1
          remote_delete_attempted=0
        else
          branch_id="${branch_id:-$live_id}"
        fi
      else
        ca_warn "Branch ${branch_name} not found in live list (may already be deleted)."
      fi
    fi
  fi

  if [[ "$skip_remote" -eq 0 ]]; then
    if [[ -n "$branch_id" ]]; then
      ca_log "Deleting branch id ${branch_id} (${branch_name})..."
      ca_delete_branch_api "$branch_id" >/dev/null 2>&1 || true
    elif [[ -n "$branch_name" ]]; then
      ca_log "Deleting branch name ${branch_name} via CLI..."
      if npx supabase branches delete "$branch_name" --project-ref "$PARENT_PROJECT_REF" --yes; then
        ca_ok "Deleted branch ${branch_name}"
      else
        ca_warn "Branch delete returned non-zero (may already be gone)"
      fi
    fi
  fi
fi

if [[ "$KEEP_ENV" -eq 0 ]]; then
  ca_restore_env_file
else
  ca_warn "Keeping current .env (--keep-env)"
fi

if [[ "$remote_delete_attempted" -eq 1 && -f "$STATE_FILE" ]]; then
  rm -f "$STATE_FILE"
  ca_ok "Removed session state file"
elif [[ -f "$STATE_FILE" ]]; then
  ca_warn "Kept session state at ${STATE_FILE} (remote delete was skipped)."
fi

ca_ok "Ephemeral cloud-agent stack teardown complete."
