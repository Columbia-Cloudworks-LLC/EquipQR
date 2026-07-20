#!/usr/bin/env bash
# Shared helpers for Cursor Cloud Agent ephemeral Supabase branch lifecycle.
# shellcheck shell=bash

PARENT_PROJECT_REF="${CLOUD_AGENT_SUPABASE_PARENT_REF:-ymxkzronkhwxzcdcbnwq}"
STATE_DIR="${CLOUD_AGENT_STATE_DIR:-${REPO_ROOT}/tmp/cloud-agent}"
STATE_FILE="${CLOUD_AGENT_STATE_FILE:-${STATE_DIR}/ephemeral-stack.json}"
ENV_BACKUP_FILE="${CLOUD_AGENT_ENV_BACKUP:-${STATE_DIR}/.env.pre-ephemeral}"
DEFAULT_TTL_HOURS="${CLOUD_AGENT_BRANCH_TTL_HOURS:-4}"
BRANCH_NAME_PREFIX="${CLOUD_AGENT_BRANCH_PREFIX:-agent}"
# EquipQR Agents vault UUID (spaced names break some op CLI paths).
OP_EQUIPQR_AGENTS_VAULT_ID="${CLOUD_AGENT_OP_VAULT_ID:-tgo2m6qbct5otqeqirjocn3joa}"

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
  token="$(op read "op://${OP_EQUIPQR_AGENTS_VAULT_ID}/supabase-write/SUPABASE_ACCESS_TOKEN" 2>/dev/null || true)"
  token="$(printf '%s' "$token" | tr -d '\r\n')"
  if [[ -z "$token" ]]; then
    ca_fail "Could not read op://${OP_EQUIPQR_AGENTS_VAULT_ID}/supabase-write/SUPABASE_ACCESS_TOKEN"
    return 1
  fi

  export SUPABASE_ACCESS_TOKEN="$token"
  ca_ok "Loaded SUPABASE_ACCESS_TOKEN from 1Password"
}

ca_ensure_state_dir() {
  mkdir -p "$STATE_DIR"
  chmod 700 "$STATE_DIR" 2>/dev/null || true
}

# Resolve Quick Login password from env or existing .env (no hardcoded default).
# Sets RESOLVED_QUICK_LOGIN_PASSWORD and exports CLOUD_AGENT_QUICK_LOGIN_PASSWORD + VITE_DEV_TEST_PASSWORD.
ca_resolve_quick_login_password() {
  local resolved="${CLOUD_AGENT_QUICK_LOGIN_PASSWORD:-${VITE_DEV_TEST_PASSWORD:-}}"
  if [[ -z "$resolved" && -f "${REPO_ROOT}/.env" ]]; then
    resolved="$(
      grep -E '^VITE_DEV_TEST_PASSWORD=' "${REPO_ROOT}/.env" 2>/dev/null \
        | head -n 1 \
        | cut -d= -f2- \
        | tr -d '\r' \
        || true
    )"
    # Strip optional surrounding quotes from .env values.
    if [[ "$resolved" == \"*\" && "$resolved" == *\" ]]; then
      resolved="${resolved:1:${#resolved}-2}"
    elif [[ "$resolved" == \'*\' && "$resolved" == *\' ]]; then
      resolved="${resolved:1:${#resolved}-2}"
    fi
  fi
  if [[ -z "$resolved" ]]; then
    ca_fail "Set CLOUD_AGENT_QUICK_LOGIN_PASSWORD or VITE_DEV_TEST_PASSWORD (or VITE_DEV_TEST_PASSWORD in .env)."
    return 1
  fi
  RESOLVED_QUICK_LOGIN_PASSWORD="$resolved"
  export CLOUD_AGENT_QUICK_LOGIN_PASSWORD="$resolved"
  export VITE_DEV_TEST_PASSWORD="$resolved"
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

ca_require_supabase_access_token() {
  if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    ca_fail "SUPABASE_ACCESS_TOKEN is unset"
    return 1
  fi
}

# Avoid indefinite hangs on stalled Management API requests.
CA_CURL_CONNECT_TIMEOUT="${CLOUD_AGENT_CURL_CONNECT_TIMEOUT:-15}"
CA_CURL_MAX_TIME="${CLOUD_AGENT_CURL_MAX_TIME:-60}"

ca_management_get() {
  local path="$1"
  ca_require_supabase_access_token || return 1
  curl -sS \
    --connect-timeout "$CA_CURL_CONNECT_TIMEOUT" \
    --max-time "$CA_CURL_MAX_TIME" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://api.supabase.com/v1${path}"
}

ca_management_post() {
  local path="$1"
  local body="$2"
  ca_require_supabase_access_token || return 1
  curl -sS \
    --connect-timeout "$CA_CURL_CONNECT_TIMEOUT" \
    --max-time "$CA_CURL_MAX_TIME" \
    -X POST \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "https://api.supabase.com/v1${path}"
}

ca_management_delete() {
  local path="$1"
  ca_require_supabase_access_token || return 1
  curl -sS \
    --connect-timeout "$CA_CURL_CONNECT_TIMEOUT" \
    --max-time "$CA_CURL_MAX_TIME" \
    -X DELETE \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://api.supabase.com/v1${path}"
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
  printf '%s' "$list_json" | node "${REPO_ROOT}/scripts/cloud-agent/seed-quick-login.mjs" --find-branch "$branch_name"
}

ca_assert_safe_agent_branch_name() {
  local branch_name="$1"
  local expected_prefix="${BRANCH_NAME_PREFIX}-"
  # Literal prefix match — never interpolate BRANCH_NAME_PREFIX into a regex.
  if [[ "$branch_name" != "${expected_prefix}"* ]]; then
    ca_fail "Refusing branch name outside ${BRANCH_NAME_PREFIX}-* namespace: ${branch_name}"
    return 1
  fi
  local suffix="${branch_name#"$expected_prefix"}"
  if [[ -z "$suffix" || ! "$suffix" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
    ca_fail "Refusing branch name with invalid suffix under ${BRANCH_NAME_PREFIX}-*: ${branch_name}"
    return 1
  fi
}

# Positive integer hours in [1, 168]. Invalid values fail closed (no mass delete).
ca_validate_ttl_hours() {
  local ttl="${1:-$DEFAULT_TTL_HOURS}"
  if [[ ! "$ttl" =~ ^[1-9][0-9]*$ ]]; then
    ca_fail "CLOUD_AGENT_BRANCH_TTL_HOURS must be an integer from 1 to 168 (got: ${ttl})"
    return 1
  fi
  if (( ttl < 1 || ttl > 168 )); then
    ca_fail "CLOUD_AGENT_BRANCH_TTL_HOURS must be an integer from 1 to 168 (got: ${ttl})"
    return 1
  fi
  DEFAULT_TTL_HOURS="$ttl"
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
  PROJECT_REF="$project_ref" API_URL="$api_url" \
    node --input-type=module -e '
import { assertBranchSafeTarget } from "./scripts/cloud-agent/seed-quick-login.mjs";
try {
  assertBranchSafeTarget({
    projectRef: process.env.PROJECT_REF,
    apiUrl: process.env.API_URL,
  });
} catch (error) {
  console.error(String(error.message || error));
  process.exit(1);
}
' || {
    ca_fail "Branch target failed safety checks for ${project_ref} / ${api_url}"
    return 1
  }
}

# Supabase CLI may print spinner/progress on stdout before JSON.
# Parse via stdin only — never write CLI credential payloads to disk.
ca_extract_json() {
  local raw="$1"
  (
    cd "$REPO_ROOT"
    printf '%s' "$raw" | node scripts/cloud-agent/seed-quick-login.mjs --extract-cli-json -
  )
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
