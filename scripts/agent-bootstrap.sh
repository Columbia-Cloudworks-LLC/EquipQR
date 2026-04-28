#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# EquipQR — Cursor Cloud Agent bootstrap (Linux)
#
# Runs once per cold-boot of a Cursor Cloud Agent VM (called from
# .cursor/environment.json `install` hook). Idempotent.
#
# Responsibilities:
#   1. Verify OP_SERVICE_ACCOUNT_TOKEN is set (planted in Phase 2.2 via the
#      Cursor Cloud Agent dashboard).
#   2. Install 1Password CLI (`op`) via APT if missing.
#   3. Render the local app .env and supabase/functions/.env from the
#      EquipQR Agents 1Password vault.
#   4. Render the GCP service-account JSON for the gcloud MCP.
#   5. Pre-warm `npx @google-cloud/gcloud-mcp` so first MCP invocation is fast.
#
# Failure mode: the script logs every missing prerequisite but does NOT exit
# non-zero unless OP_SERVICE_ACCOUNT_TOKEN is missing or `op` install fails.
# This lets the agent VM boot to a usable state even before Phase 1 is fully
# complete (vendor credentials minted) — partial functionality > total failure.
# ──────────────────────────────────────────────────────────────────────────────
set -uo pipefail

log()  { echo "  [agent-bootstrap] $*"; }
ok()   { echo "  [agent-bootstrap] OK   $*"; }
warn() { echo "  [agent-bootstrap] WARN $*"; }
fail() { echo "  [agent-bootstrap] FAIL $*"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log "Repo root: $REPO_ROOT"
log "User: $(whoami)  Host: $(hostname)"

# ──────────────────────────────────────────────────────────────────────────────
# 1. Verify OP_SERVICE_ACCOUNT_TOKEN
# ──────────────────────────────────────────────────────────────────────────────
log "[1/5] Verifying OP_SERVICE_ACCOUNT_TOKEN..."
if [[ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]]; then
    fail "OP_SERVICE_ACCOUNT_TOKEN is not set."
    fail "  Set it as a Cursor Cloud Agent secret at:"
    fail "    https://cursor.com/dashboard/cloud-agents → Secrets tab → Add Secret"
    fail "  Name: OP_SERVICE_ACCOUNT_TOKEN  | Value: the ops_... token from Phase 0.3"
    exit 1
fi

if [[ "${OP_SERVICE_ACCOUNT_TOKEN}" != ops_* ]]; then
    warn "OP_SERVICE_ACCOUNT_TOKEN does not start with 'ops_' — verify it is a service-account token, not a user session token."
fi
ok "OP_SERVICE_ACCOUNT_TOKEN present (length: ${#OP_SERVICE_ACCOUNT_TOKEN})"

# ──────────────────────────────────────────────────────────────────────────────
# 2. Install 1Password CLI
# ──────────────────────────────────────────────────────────────────────────────
log "[2/5] Ensuring 1Password CLI is installed..."

if command -v op >/dev/null 2>&1; then
    OP_VERSION="$(op --version 2>&1 | head -1)"
    ok "op already installed: ${OP_VERSION}"
else
    log "Installing op CLI via APT..."

    if ! command -v sudo >/dev/null 2>&1; then
        SUDO=""
    else
        SUDO="sudo"
    fi

    if ! command -v gpg >/dev/null 2>&1; then
        log "Installing gpg prerequisite..."
        $SUDO apt-get update -qq && $SUDO apt-get install -y -qq gpg curl
    fi

    ARCH="$(dpkg --print-architecture)"
    log "Detected architecture: $ARCH"

    curl -sS https://downloads.1password.com/linux/keys/1password.asc \
        | $SUDO gpg --dearmor --yes --output /usr/share/keyrings/1password-archive-keyring.gpg

    echo "deb [arch=$ARCH signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/$ARCH stable main" \
        | $SUDO tee /etc/apt/sources.list.d/1password.list > /dev/null

    $SUDO mkdir -p /etc/debsig/policies/AC2D62742012EA22/
    curl -sS https://downloads.1password.com/linux/debian/debsig/1password.pol \
        | $SUDO tee /etc/debsig/policies/AC2D62742012EA22/1password.pol > /dev/null

    $SUDO mkdir -p /usr/share/debsig/keyrings/AC2D62742012EA22
    curl -sS https://downloads.1password.com/linux/keys/1password.asc \
        | $SUDO gpg --dearmor --yes --output /usr/share/debsig/keyrings/AC2D62742012EA22/debsig.gpg

    $SUDO apt-get update -qq
    if ! $SUDO apt-get install -y -qq 1password-cli; then
        fail "apt install 1password-cli failed."
        exit 1
    fi
    OP_VERSION="$(op --version 2>&1 | head -1)"
    ok "op installed: ${OP_VERSION}"
fi

# Sanity check: can we hit the 1Password API with this token?
if ! op whoami >/dev/null 2>&1; then
    warn "op whoami failed. Token may be invalid or revoked. Continuing — env rendering will surface details."
else
    OP_USER="$(op whoami 2>&1 | grep -E '^URL|^User|^Account|ServiceAccount' | head -3 | tr '\n' ' ')"
    ok "Authenticated as: ${OP_USER}"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 3. Render local app .env from EquipQR Agents vault
# ──────────────────────────────────────────────────────────────────────────────
log "[3/5] Rendering .env files from EquipQR Agents vault..."

OP_VAULT='tgo2m6qbct5otqeqirjocn3joa'  # EquipQR Agents

env_file_value() {
    local file_path="$1"
    local key="$2"

    grep -E "^${key}=" "$file_path" | tail -n1 | cut -d'=' -f2- || true
}

remove_env_key() {
    local file_path="$1"
    local key="$2"
    local tmp_path

    tmp_path="$(mktemp)"
    grep -v -E "^${key}=" "$file_path" > "$tmp_path" || true
    mv "$tmp_path" "$file_path"
}

sync_app_vite_mirrors() {
    local target_path="$1"
    local set_count=0
    local source_key
    local target_key
    local value

    local mappings=(
        "SUPABASE_URL:VITE_SUPABASE_URL"
        "SUPABASE_ANON_KEY:VITE_SUPABASE_ANON_KEY"
        "PRODUCTION_URL:VITE_PRODUCTION_URL"
        "INTUIT_CLIENT_ID:VITE_INTUIT_CLIENT_ID"
        "QB_OAUTH_REDIRECT_BASE_URL:VITE_QB_OAUTH_REDIRECT_BASE_URL"
        "ENABLE_DEVTOOLS:VITE_ENABLE_DEVTOOLS"
        "ENABLE_QUICKBOOKS:VITE_ENABLE_QUICKBOOKS"
        "VAPID_PUBLIC_KEY:VITE_VAPID_PUBLIC_KEY"
        "GOOGLE_PICKER_API_KEY:VITE_GOOGLE_PICKER_API_KEY"
        "GOOGLE_PICKER_APP_ID:VITE_GOOGLE_PICKER_APP_ID"
        "GOOGLE_PICKER_CLIENT_ID:VITE_GOOGLE_PICKER_CLIENT_ID"
    )

    for mapping in "${mappings[@]}"; do
        source_key="${mapping%%:*}"
        target_key="${mapping##*:}"
        value="$(env_file_value "$target_path" "$source_key")"
        remove_env_key "$target_path" "$target_key"
        if [[ -n "$value" ]]; then
            printf '%s=%s\n' "$target_key" "$value" >> "$target_path"
            set_count=$((set_count + 1))
        fi
    done

    ok "Mirrored ${set_count}/${#mappings[@]} VITE_* keys from canonical app keys"
}

render_section_item() {
    local item_name="$1"
    local target_path="$2"
    local section_label="$3"
    local item_json
    local target_tmp

    item_json="$(mktemp)"
    target_tmp="$(mktemp)"

    if ! op item get "$item_name" --vault "$OP_VAULT" --format json > "$item_json" 2>/dev/null; then
        rm -f "$item_json" "$target_tmp"
        warn "1Password item '${item_name}' not found in EquipQR Agents vault."
        warn "  Skipping ${target_path}."
        return 1
    fi

    if ! SECTION_LABEL="$section_label" node -e '
const fs = require("fs");
const item = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const sectionLabel = process.env.SECTION_LABEL;
const lines = [];

for (const field of item.fields || []) {
  if (!field.section || field.section.label !== sectionLabel) continue;
  if (!field.label || !/^[A-Z][A-Z0-9_]*$/.test(field.label)) continue;
  if (field.value === undefined || field.value === null || field.value === "") continue;
  lines.push(`${field.label}=${String(field.value).replace(/\r?\n/g, "\\n")}`);
}

process.stdout.write(lines.join("\n"));
if (lines.length > 0) process.stdout.write("\n");
' "$item_json" > "$target_tmp"; then
        rm -f "$item_json" "$target_tmp"
        warn "Could not parse fields from '${item_name}' section '${section_label}'."
        return 1
    fi

    if [[ ! -s "$target_tmp" ]]; then
        rm -f "$item_json" "$target_tmp"
        warn "Item '${item_name}' has no populated env fields in section '${section_label}'."
        return 1
    fi

    mkdir -p "$(dirname "$target_path")"
    mv "$target_tmp" "$target_path"
    chmod 600 "$target_path"
    rm -f "$item_json"

    local lines
    lines="$(grep -cE '^[A-Z][A-Z0-9_]*=' "$target_path" || echo 0)"
    ok "Rendered ${target_path} from '${item_name}' section '${section_label}' (${lines} env keys)"
    return 0
}

render_dotenv_item() {
    local item_name="$1"
    local target_path="$2"
    local field_name="${3:-dotenv}"

    if op item get "$item_name" --vault "$OP_VAULT" --format json >/dev/null 2>&1; then
        local content
        content="$(op read "op://${OP_VAULT}/${item_name}/${field_name}" 2>/dev/null || true)"
        if [[ -z "$content" ]]; then
            warn "Item '${item_name}' exists but field '${field_name}' is empty or missing. Skipping ${target_path}."
            return 1
        fi
        mkdir -p "$(dirname "$target_path")"
        printf '%s\n' "$content" > "$target_path"
        chmod 600 "$target_path"
        local lines
        lines="$(grep -cE '^[A-Z][A-Z0-9_]*=' "$target_path" || echo 0)"
        ok "Rendered ${target_path} (${lines} env keys)"
        return 0
    else
        warn "1Password item '${item_name}' not found in EquipQR Agents vault."
        warn "  Create it (item type: API Credential) with a multi-line custom field named '${field_name}' containing the dotenv content."
        warn "  Skipping ${target_path}."
        return 1
    fi
}

if render_section_item 'app-env-local-dev' "${REPO_ROOT}/.env" '.env'; then
    sync_app_vite_mirrors "${REPO_ROOT}/.env"
elif render_dotenv_item 'app-env-local-dev' "${REPO_ROOT}/.env"; then
    sync_app_vite_mirrors "${REPO_ROOT}/.env"
else
    warn "App .env was not rendered. Frontend setup requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from another source."
fi

if ! render_section_item 'edge-env-local-dev' "${REPO_ROOT}/supabase/functions/.env" './supabase/functions/.env'; then
    if ! render_dotenv_item 'edge-env-local-dev' "${REPO_ROOT}/supabase/functions/.env"; then
        warn "Edge Function .env was not rendered."
    fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Render GCP service-account JSON for gcloud MCP
# ──────────────────────────────────────────────────────────────────────────────
log "[4/5] Rendering GCP SA JSON for gcloud MCP..."

GCP_KEY_DIR="${HOME}/.config/gcloud"
GCP_KEY_PATH="${GCP_KEY_DIR}/equipqr-agent-viewer.json"
GCP_ITEM_NAME=""

if op item get 'gcp-read' --vault "$OP_VAULT" --format json >/dev/null 2>&1; then
    GCP_ITEM_NAME="gcp-read"
elif op item get 'gcp-viewer' --vault "$OP_VAULT" --format json >/dev/null 2>&1; then
    GCP_ITEM_NAME="gcp-viewer"
fi

if [[ -n "$GCP_ITEM_NAME" ]]; then
    mkdir -p "$GCP_KEY_DIR"
    if op read "op://${OP_VAULT}/${GCP_ITEM_NAME}/credential" > "$GCP_KEY_PATH" 2>/dev/null; then
        chmod 600 "$GCP_KEY_PATH"
        if python3 -c "import json,sys; json.load(open('$GCP_KEY_PATH'))" 2>/dev/null \
            || node -e "JSON.parse(require('fs').readFileSync('$GCP_KEY_PATH','utf8'))" 2>/dev/null; then
            ok "GCP SA JSON written from '${GCP_ITEM_NAME}' and validated: ${GCP_KEY_PATH}"
        else
            warn "GCP SA JSON written but not valid JSON. Re-paste the JSON into the ${GCP_ITEM_NAME}/credential field."
        fi
    else
        warn "op read of ${GCP_ITEM_NAME}/credential failed. SA JSON not written."
    fi
else
    warn "Neither 1Password item 'gcp-read' nor legacy item 'gcp-viewer' was found in EquipQR Agents vault. gcloud MCP will fail until the viewer service-account JSON is present."
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5. Pre-warm npx packages used by stdio MCPs
# ──────────────────────────────────────────────────────────────────────────────
log "[5/5] Pre-warming npx-based MCP packages..."

if command -v npx >/dev/null 2>&1; then
    log "  Pre-fetching @google-cloud/gcloud-mcp..."
    if npx -y @google-cloud/gcloud-mcp --version >/dev/null 2>&1; then
        ok "@google-cloud/gcloud-mcp is cached"
    else
        warn "@google-cloud/gcloud-mcp pre-fetch returned non-zero (may be normal for stdio servers)"
    fi
else
    warn "npx not on PATH. Stdio MCPs requiring node/npx will fail."
fi

echo ""
ok "Cursor Cloud Agent bootstrap complete."
echo "  Next: 'npm ci' and the configured start command will run automatically."
exit 0
