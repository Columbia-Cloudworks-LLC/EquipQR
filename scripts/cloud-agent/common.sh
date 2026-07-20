#!/usr/bin/env bash
# Shared helpers for Cursor Cloud Agent ephemeral Supabase branch lifecycle.
# shellcheck shell=bash

PARENT_PROJECT_REF="${CLOUD_AGENT_SUPABASE_PARENT_REF:-ymxkzronkhwxzcdcbnwq}"
STATE_DIR="${CLOUD_AGENT_STATE_DIR:-${REPO_ROOT}/tmp/cloud-agent}"
STATE_FILE="${CLOUD_AGENT_STATE_FILE:-${STATE_DIR}/ephemeral-stack.json}"
ENV_BACKUP_FILE="${CLOUD_AGENT_ENV_BACKUP:-${STATE_DIR}/.env.pre-ephemeral}"
DEFAULT_TTL_HOURS="${CLOUD_AGENT_BRANCH_TTL_HOURS:-4}"
BRANCH_NAME_PREFIX="${CLOUD_AGENT_BRANCH_PREFIX:-agent}"

ca_log() { echo "  [cloud-agent] $*"; }
ca_ok() { echo "  [cloud-agent] OK   $*"; }
ca_warn() { echo "  [cloud-agent] WARN $*"; }
ca_fail() { echo "  [cloud-agent] FAIL $*"; }

ca_require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    ca_fail "Required command not found: $1"
    return 1
  fi
}

ca_load_supabase_access_token() {
  if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    return 0
  fi

  if [[ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]]; then
    ca_fail "SUPABASE_ACCESS_TOKEN is unset and OP_SERVICE_ACCOUNT_TOKEN is unavailable."
    ca_fail "Set SUPABASE_ACCESS_TOKEN (or OP_SERVICE_ACCOUNT_TOKEN for 1Password read)."
    return 1
  fi

  if ! command -v op >/dev/null 2>&1; then
    ca_fail "1Password CLI (op) is required to load SUPABASE_ACCESS_TOKEN."
    return 1
  fi

  local token
  token="$(op read "op://EquipQR Agents/supabase-write/SUPABASE_ACCESS_TOKEN" 2>/dev/null || true)"
  token="$(printf '%s' "$token" | tr -d '\r\n')"
  if [[ -z "$token" ]]; then
    ca_fail "Could not read op://EquipQR Agents/supabase-write/SUPABASE_ACCESS_TOKEN"
    return 1
  fi

  export SUPABASE_ACCESS_TOKEN="$token"
  ca_ok "Loaded SUPABASE_ACCESS_TOKEN from 1Password"
}

ca_ensure_state_dir() {
  mkdir -p "$STATE_DIR"
  chmod 700 "$STATE_DIR" 2>/dev/null || true
}

ca_session_slug() {
  local raw
  raw="${CURSOR_AGENT_ID:-${CLOUD_AGENT_SESSION_ID:-}}"
  if [[ -z "$raw" ]]; then
    raw="$(hostname | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | cut -c1-24)"
    raw="${raw}-$(date -u +%Y%m%d%H%M%S)"
  fi
  raw="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | cut -c1-40)"
  printf '%s-%s' "$BRANCH_NAME_PREFIX" "$raw"
}

ca_write_state() {
  local json="$1"
  ca_ensure_state_dir
  printf '%s\n' "$json" >"$STATE_FILE"
  chmod 600 "$STATE_FILE" 2>/dev/null || true
}

ca_read_state_field() {
  local field="$1"
  if [[ ! -f "$STATE_FILE" ]]; then
    return 1
  fi
  node -e '
const fs = require("fs");
const state = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const value = state[process.argv[2]];
if (value === undefined || value === null || value === "") process.exit(2);
process.stdout.write(String(value));
' "$STATE_FILE" "$field"
}

ca_backup_env_file() {
  local env_file="${REPO_ROOT}/.env"
  ca_ensure_state_dir
  if [[ -f "$env_file" && ! -f "$ENV_BACKUP_FILE" ]]; then
    cp "$env_file" "$ENV_BACKUP_FILE"
    chmod 600 "$ENV_BACKUP_FILE" 2>/dev/null || true
    ca_ok "Backed up .env to ${ENV_BACKUP_FILE}"
  fi
}

ca_restore_env_file() {
  local env_file="${REPO_ROOT}/.env"
  if [[ -f "$ENV_BACKUP_FILE" ]]; then
    mv "$ENV_BACKUP_FILE" "$env_file"
    chmod 600 "$env_file" 2>/dev/null || true
    ca_ok "Restored .env from pre-ephemeral backup"
  fi
}

ca_upsert_env_key() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  if [[ -f "$env_file" ]]; then
    grep -v -E "^${key}=" "$env_file" >"$tmp" || true
  fi
  printf '%s=%s\n' "$key" "$value" >>"$tmp"
  mv "$tmp" "$env_file"
  chmod 600 "$env_file" 2>/dev/null || true
}

ca_management_get() {
  local path="$1"
  curl -sS \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://api.supabase.com/v1${path}"
}

ca_management_post() {
  local path="$1"
  local body="$2"
  curl -sS \
    -X POST \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "https://api.supabase.com/v1${path}"
}

ca_management_delete() {
  local path="$1"
  curl -sS \
    -X DELETE \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://api.supabase.com/v1${path}"
}

ca_fetch_project_keys() {
  local project_ref="$1"
  ca_management_get "/projects/${project_ref}/api-keys?reveal=true"
}

# Prefer Management API create with git_branch so migrations deploy (CLI-only
# creates often land in MIGRATIONS_FAILED without a git association).
CLOUD_AGENT_GIT_BRANCH="${CLOUD_AGENT_GIT_BRANCH:-preview}"

ca_create_branch_api() {
  local branch_name="$1"
  local body
  body="$(BRANCH_NAME="$branch_name" GIT_BRANCH="$CLOUD_AGENT_GIT_BRANCH" node -e '
const body = {
  branch_name: process.env.BRANCH_NAME,
  git_branch: process.env.GIT_BRANCH,
  persistent: false,
  with_data: false,
};
process.stdout.write(JSON.stringify(body));
')"
  ca_management_post "/projects/${PARENT_PROJECT_REF}/branches" "$body"
}

ca_list_branches_api() {
  ca_management_get "/projects/${PARENT_PROJECT_REF}/branches"
}

ca_find_branch_json() {
  local branch_name="$1"
  local list_json="$2"
  BRANCH_NAME="$branch_name" node -e '
const list = JSON.parse(process.argv[1] || "[]");
const branches = Array.isArray(list) ? list : (list.branches || []);
const match = branches.find((b) => b.name === process.env.BRANCH_NAME);
if (!match) process.exit(2);
process.stdout.write(JSON.stringify(match));
' "$list_json"
}

ca_delete_branch_api() {
  local branch_id="$1"
  if [[ -z "$branch_id" ]]; then
    return 1
  fi
  # DELETE /v1/branches/{id} — not /projects/{ref}/branches (that disables branching).
  ca_management_delete "/branches/${branch_id}"
}

ca_assert_branch_ref_safe() {
  local project_ref="$1"
  local api_url="${2:-}"
  if [[ "$project_ref" == "$PARENT_PROJECT_REF" ]]; then
    ca_fail "Refusing to seed or rewrite env for parent/production project (${PARENT_PROJECT_REF})."
    return 1
  fi
  if [[ "$api_url" == *"supabase.equipqr.app"* ]]; then
    ca_fail "Refusing to target production custom domain supabase.equipqr.app."
    return 1
  fi
}

# Supabase CLI may print spinner/progress on stdout before JSON.
# Use a repo-relative path so Windows node.exe (invoked from Git Bash) can read it.
ca_extract_json() {
  local raw="$1"
  local tmp_rel="tmp/cloud-agent/cli-json-$$.txt"
  local tmp_abs="${REPO_ROOT}/${tmp_rel}"
  ca_ensure_state_dir
  printf '%s' "$raw" >"$tmp_abs"
  (
    cd "$REPO_ROOT"
    node scripts/cloud-agent/seed-quick-login.mjs --extract-cli-json "$tmp_rel"
  )
  local rc=$?
  rm -f "$tmp_abs"
  return "$rc"
}

ca_branch_is_healthy_json() {
  local json="$1"
  echo "$json" | node -e '
const fs = require("fs");
const raw = fs.readFileSync(0, "utf8");
const j = JSON.parse(raw);
const status = String(j.status || "").toUpperCase();
const preview = String(j.preview_project_status || "").toUpperCase();
if (status.includes("MIGRATIONS_FAILED") || status.includes("FATAL")) {
  process.exit(2);
}
const ok =
  status === "FUNCTIONS_DEPLOYED" ||
  (preview === "ACTIVE_HEALTHY" &&
    (status === "FUNCTIONS_DEPLOYED" ||
      status === "ACTIVE_HEALTHY" ||
      status === "ACTIVE"));
process.exit(ok ? 0 : 1);
'
}
