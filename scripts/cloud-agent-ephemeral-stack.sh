#!/usr/bin/env bash
# EquipQR Cursor Cloud Agent — ephemeral Supabase branch + Vite
#
# Creates a session-scoped hosted Supabase Database Branch (Management API +
# git_branch=preview so migrations deploy), applies a cloud-safe Quick Login
# seed (Auth Admin API), rewrites VITE_SUPABASE_*, then starts Vite on :8080.
#
# Non-goals: Docker / local supabase start on the cloud VM.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=cloud-agent/common.sh
source "${REPO_ROOT}/scripts/cloud-agent/common.sh"

cd "$REPO_ROOT"

SKIP_VITE=0
FORCE_NEW=0
for arg in "$@"; do
  case "$arg" in
    --skip-vite) SKIP_VITE=1 ;;
    --force-new) FORCE_NEW=1 ;;
    --help|-h)
      cat <<'EOF'
Usage: bash scripts/cloud-agent-ephemeral-stack.sh [--skip-vite] [--force-new]

  --skip-vite   Create/seed/rewrite env only (do not exec npm run dev)
  --force-new   Ignore reusable session state and create a new branch
EOF
      exit 0
      ;;
  esac
done

ca_log "Repo root: $REPO_ROOT"
ca_log "Parent project: $PARENT_PROJECT_REF (git_branch=${CLOUD_AGENT_GIT_BRANCH})"

ca_require_cmd node
ca_require_cmd npm
ca_require_cmd curl
ca_require_cmd npx

ca_load_supabase_access_token
ca_ensure_state_dir

reuse_existing=0
existing_name=""
if [[ "$FORCE_NEW" -eq 0 && -f "$STATE_FILE" ]]; then
  existing_ref="$(ca_read_state_field projectRef 2>/dev/null || true)"
  existing_name="$(ca_read_state_field branchName 2>/dev/null || true)"
  existing_url="$(ca_read_state_field apiUrl 2>/dev/null || true)"
  expires_at="$(ca_read_state_field expiresAt 2>/dev/null || true)"
  now_epoch="$(date -u +%s)"
  exp_epoch=0
  if [[ -n "$expires_at" ]]; then
    exp_epoch="$(node -e "const d=Date.parse(process.argv[1]); process.stdout.write(String(Number.isFinite(d)?Math.floor(d/1000):0))" "$expires_at")"
  fi
  if [[ -n "$existing_ref" && -n "$existing_name" && -n "$existing_url" && "$exp_epoch" -gt "$now_epoch" ]]; then
    if ca_assert_branch_ref_safe "$existing_ref" "$existing_url"; then
      list_json="$(ca_list_branches_api)"
      if status_json="$(ca_find_branch_json "$existing_name" "$list_json" 2>/dev/null)"; then
        if ca_branch_is_healthy_json "$status_json"; then
          reuse_existing=1
          ca_ok "Reusing healthy branch ${existing_name} (${existing_ref})"
        fi
      fi
    fi
  fi
fi

cleanup_stale_agent_branches() {
  ca_log "Scanning for stale ${BRANCH_NAME_PREFIX}-* branches (TTL ${DEFAULT_TTL_HOURS}h)..."
  local list_json
  list_json="$(ca_list_branches_api)"
  LIST_JSON="$list_json" TTL_HOURS="$DEFAULT_TTL_HOURS" PREFIX="$BRANCH_NAME_PREFIX" KEEP_NAME="${existing_name:-}" \
    node --input-type=module -e '
import { normalizeBranchList } from "./scripts/cloud-agent/seed-quick-login.mjs";
const raw = JSON.parse(process.env.LIST_JSON || "[]");
const branches = normalizeBranchList(raw);
const ttlMs = Number(process.env.TTL_HOURS) * 3600 * 1000;
const prefix = process.env.PREFIX;
const keep = process.env.KEEP_NAME || "";
const now = Date.now();
for (const b of branches) {
  const name = String(b.name || "");
  if (!name.startsWith(prefix + "-")) continue;
  if (name === keep) continue;
  const created = Date.parse(b.created_at || b.createdAt || 0);
  if (!created || now - created < ttlMs) continue;
  process.stdout.write(`${b.id || ""}\t${name}\n`);
}
' | while IFS=$'\t' read -r stale_id stale_name; do
    [[ -z "$stale_name" ]] && continue
    ca_assert_safe_agent_branch_name "$stale_name" || continue
    ca_warn "Deleting stale branch: $stale_name"
    if [[ -n "$stale_id" ]]; then
      ca_delete_branch_api "$stale_id" >/dev/null 2>&1 || true
    fi
    npx supabase branches delete "$stale_name" --project-ref "$PARENT_PROJECT_REF" --yes >/dev/null 2>&1 || true
  done
}

cleanup_stale_agent_branches

branch_name=""
branch_id=""
project_ref=""
api_url=""
anon_key=""
service_role_key=""

if [[ "$reuse_existing" -eq 1 ]]; then
  branch_name="$(ca_read_state_field branchName)"
  branch_id="$(ca_read_state_field branchId 2>/dev/null || true)"
  project_ref="$(ca_read_state_field projectRef)"
  api_url="$(ca_read_state_field apiUrl)"
else
  branch_name="$(ca_session_slug)"
  ca_log "Creating ephemeral branch via Management API: $branch_name"
  create_raw="$(ca_create_branch_api "$branch_name")"
  create_json="$(ca_extract_json "$create_raw")"
  project_ref="$(echo "$create_json" | node -e '
const j=JSON.parse(require("fs").readFileSync(0,"utf8"));
const ref=j.project_ref||j.projectRef||j.ref;
if(!ref){ console.error("create response missing project_ref"); process.exit(1);}
process.stdout.write(String(ref));
')"
  branch_id="$(echo "$create_json" | node -e '
const j=JSON.parse(require("fs").readFileSync(0,"utf8"));
process.stdout.write(String(j.id||""));
')"
  ca_ok "Branch created (project_ref=${project_ref})"

  ca_log "Waiting for branch migrations/functions to deploy..."
  healthy=0
  failed=0
  for _ in $(seq 1 90); do
    list_json="$(ca_list_branches_api)"
    if get_json="$(ca_find_branch_json "$branch_name" "$list_json" 2>/dev/null)"; then
      if ca_branch_is_healthy_json "$get_json"; then
        healthy=1
        break
      fi
      rc=$?
      if [[ "$rc" -eq 2 ]]; then
        failed=1
        ca_fail "Branch entered failed status: $(echo "$get_json" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(j.status||""))')"
        break
      fi
    fi
    sleep 10
  done
  if [[ "$failed" -eq 1 ]]; then
    exit 1
  fi
  if [[ "$healthy" -ne 1 ]]; then
    ca_fail "Timed out waiting for branch ${branch_name} to become FUNCTIONS_DEPLOYED."
    exit 1
  fi
  ca_ok "Branch is healthy (FUNCTIONS_DEPLOYED)"

  api_url="https://${project_ref}.supabase.co"
fi

ca_assert_branch_ref_safe "$project_ref" "$api_url"

ca_log "Fetching branch API keys..."
creds_raw="$(npx supabase branches get "$branch_name" --project-ref "$PARENT_PROJECT_REF" --output json 2>/dev/null || true)"
creds_json="$(ca_extract_json "$creds_raw" 2>/dev/null || true)"
if [[ -n "$creds_json" ]]; then
  eval "$(echo "$creds_json" | node -e '
const fs = require("fs");
const j = JSON.parse(fs.readFileSync(0, "utf8"));
const anon = j.SUPABASE_ANON_KEY || j.anon_key;
const service = j.SUPABASE_SERVICE_ROLE_KEY || j.service_role_key;
const url = j.SUPABASE_URL || j.api_url;
const q = (s) => "'"'"'" + String(s).replace(/'"'"'/g, "'"'"'\"'"'"'\"'"'"'") + "'"'"'";
if (url) process.stdout.write("api_url=" + q(url) + "\n");
if (anon) process.stdout.write("anon_key=" + q(anon) + "\n");
if (service) process.stdout.write("service_role_key=" + q(service) + "\n");
')"
fi

if [[ -z "${anon_key:-}" || -z "${service_role_key:-}" ]]; then
  keys_json="$(ca_fetch_project_keys "$project_ref")"
  eval "$(printf '%s' "$keys_json" | node "${REPO_ROOT}/scripts/cloud-agent/seed-quick-login.mjs" --print-keys)"
fi

if [[ -z "${anon_key:-}" || -z "${service_role_key:-}" ]]; then
  ca_fail "Could not resolve anon/service_role keys for ${project_ref}"
  exit 1
fi
ca_ok "Resolved branch anon + service_role keys"

ca_log "Applying cloud-safe Quick Login seed..."
# Pass privileged keys via env (not argv — visible in `ps` / shell history).
export CLOUD_AGENT_SUPABASE_URL="$api_url"
export CLOUD_AGENT_SUPABASE_SERVICE_ROLE_KEY="$service_role_key"
export CLOUD_AGENT_SUPABASE_PROJECT_REF="$project_ref"
# Password contract matches DevQuickLogin.tsx / local seeds when unset.
export CLOUD_AGENT_QUICK_LOGIN_PASSWORD="${CLOUD_AGENT_QUICK_LOGIN_PASSWORD:-${VITE_DEV_TEST_PASSWORD:-password123}}"
node "${REPO_ROOT}/scripts/cloud-agent/seed-quick-login.mjs"
unset CLOUD_AGENT_SUPABASE_SERVICE_ROLE_KEY
ca_ok "Quick Login seed applied"

ca_backup_env_file
ca_upsert_env_key "${REPO_ROOT}/.env" "VITE_SUPABASE_URL" "$api_url"
ca_upsert_env_key "${REPO_ROOT}/.env" "VITE_SUPABASE_ANON_KEY" "$anon_key"
ca_upsert_env_key "${REPO_ROOT}/.env" "SUPABASE_URL" "$api_url"
ca_upsert_env_key "${REPO_ROOT}/.env" "SUPABASE_ANON_KEY" "$anon_key"
ca_ok "Wrote branch VITE_SUPABASE_* into .env"

created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
expires_at="$(node -e "const d=new Date(Date.now()+Number(process.argv[1])*3600e3); process.stdout.write(d.toISOString().replace(/\\.\\d{3}Z$/,'Z'))" "$DEFAULT_TTL_HOURS")"

ca_write_state "$(node -e '
const state = {
  branchName: process.argv[1],
  branchId: process.argv[2] || null,
  projectRef: process.argv[3],
  apiUrl: process.argv[4],
  parentProjectRef: process.argv[5],
  gitBranch: process.argv[6],
  createdAt: process.argv[7],
  expiresAt: process.argv[8],
  primaryPersona: "owner@apex.test",
};
process.stdout.write(JSON.stringify(state, null, 2));
' "$branch_name" "$branch_id" "$project_ref" "$api_url" "$PARENT_PROJECT_REF" "$CLOUD_AGENT_GIT_BRANCH" "$created_at" "$expires_at")"

ca_ok "Session state: $STATE_FILE"
ca_log "Quick Login persona: owner@apex.test against ${api_url}"
ca_log "Password: same contract as DevQuickLogin / local seeds (override via CLOUD_AGENT_QUICK_LOGIN_PASSWORD)"
ca_log "Teardown: bash scripts/cloud-agent-ephemeral-teardown.sh"

if [[ "$SKIP_VITE" -eq 1 ]]; then
  ca_ok "Skipping Vite (--skip-vite). Start with: npm run dev"
  exit 0
fi

ca_log "Starting Vite on :8080..."
exec npm run dev
