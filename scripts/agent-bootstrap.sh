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

render_dotenv_item 'app-env-local-dev'  "${REPO_ROOT}/.env"
render_dotenv_item 'edge-env-local-dev' "${REPO_ROOT}/supabase/functions/.env"

# ──────────────────────────────────────────────────────────────────────────────
# 4. Render GCP service-account JSON for gcloud MCP
# ──────────────────────────────────────────────────────────────────────────────
log "[4/5] Rendering GCP SA JSON for gcloud MCP..."

GCP_KEY_DIR="${HOME}/.config/gcloud"
GCP_KEY_PATH="${GCP_KEY_DIR}/equipqr-agent-viewer.json"

if op item get 'gcp-viewer' --vault "$OP_VAULT" --format json >/dev/null 2>&1; then
    mkdir -p "$GCP_KEY_DIR"
    if op read "op://${OP_VAULT}/gcp-viewer/credential" > "$GCP_KEY_PATH" 2>/dev/null; then
        chmod 600 "$GCP_KEY_PATH"
        if python3 -c "import json,sys; json.load(open('$GCP_KEY_PATH'))" 2>/dev/null \
            || node -e "JSON.parse(require('fs').readFileSync('$GCP_KEY_PATH','utf8'))" 2>/dev/null; then
            ok "GCP SA JSON written and validated: ${GCP_KEY_PATH}"
        else
            warn "GCP SA JSON written but not valid JSON. Re-paste the JSON into the gcp-viewer/credential field."
        fi
    else
        warn "op read of gcp-viewer/credential failed. SA JSON not written."
    fi
else
    warn "1Password item 'gcp-viewer' not found in EquipQR Agents vault. gcloud MCP will fail until Phase 1.5 is complete."
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
