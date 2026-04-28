#!/usr/bin/env bash
# EquipQR Cursor Cloud frontend bootstrap (Linux)
#
# Purpose:
# - prepare env files when 1Password service-account auth is available
# - preinstall Node dependencies for this checkout
# - verify Vite/frontend prerequisites before agent sessions begin

set -euo pipefail

log() { echo "  [cloud-frontend-setup] $*"; }
ok() { echo "  [cloud-frontend-setup] OK   $*"; }
warn() { echo "  [cloud-frontend-setup] WARN $*"; }
fail() { echo "  [cloud-frontend-setup] FAIL $*"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log "Repo root: $REPO_ROOT"

log "[1/6] Checking Node.js and npm..."
if ! command -v node >/dev/null 2>&1; then
    fail "node is not installed or not on PATH."
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    fail "npm is not installed or not on PATH."
    exit 1
fi
ok "node $(node -v)"
ok "npm v$(npm -v)"

if ! node -e "const p=require('./package.json'); const [maj,min]=process.versions.node.split('.').map(Number); const ok=((maj===20&&min>=17)||(maj>20&&maj<22?false:(maj>22||(maj===22&&min>=9)))); if(!ok){ console.error('Node version does not satisfy package.json engines.node: ' + p.engines.node + '; found ' + process.versions.node); process.exit(1);}"; then
    fail "Installed Node version does not satisfy package.json engines.node."
    exit 1
fi
ok "Node version satisfies package.json engines.node"

log "[2/6] Running optional cloud env bootstrap..."
if [[ -f "scripts/agent-bootstrap.sh" ]]; then
    if [[ -n "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]]; then
        if bash "scripts/agent-bootstrap.sh"; then
            ok "agent-bootstrap completed"
        else
            warn "agent-bootstrap failed; continuing with existing checkout files"
        fi
    else
        warn "OP_SERVICE_ACCOUNT_TOKEN not set; skipping agent-bootstrap"
    fi
else
    warn "scripts/agent-bootstrap.sh not found; skipping env bootstrap"
fi

log "[3/6] Installing Node dependencies (npm ci)..."
npm ci --no-audit --no-fund
ok "npm ci completed"

log "[4/6] Verifying Vite prerequisites..."
if ! node -e "const pkg=require('./package.json'); const dev=pkg.scripts && pkg.scripts.dev; if (!dev) { console.error('Missing npm script: dev'); process.exit(1);} if (!/vite/.test(dev)) { console.error('npm script dev must invoke vite. Found: ' + dev); process.exit(1);}"; then
    fail "Vite dev script prerequisite check failed."
    exit 1
fi

if ! npm exec vite -- --version >/dev/null 2>&1; then
    fail "Vite CLI is not available after npm ci."
    exit 1
fi
ok "Vite CLI is installed and npm run dev is configured"

log "[5/6] Verifying required frontend env values..."
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -n "${VITE_SUPABASE_URL:-}" && -n "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
        {
            echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}"
            echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}"
        } > "$ENV_FILE"
        chmod 600 "$ENV_FILE" || true
        ok "Created .env from injected environment variables"
    else
        fail ".env not found and fallback env vars are unavailable."
        fail "Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        exit 1
    fi
fi

SUPABASE_URL_VALUE="$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | tail -n1 | cut -d'=' -f2- || true)"
SUPABASE_ANON_VALUE="$(grep -E '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | tail -n1 | cut -d'=' -f2- || true)"

if [[ -z "$SUPABASE_URL_VALUE" || -z "$SUPABASE_ANON_VALUE" ]]; then
    fail ".env is missing required VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY values."
    exit 1
fi
ok "Required frontend env keys are present"

log "[6/6] Frontend bootstrap complete."
ok "Cloud VM is ready for frontend development (start with: npm run dev)"
