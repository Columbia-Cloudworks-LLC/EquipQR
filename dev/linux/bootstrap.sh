#!/usr/bin/env bash
# Idempotent EquipQR Linux setup: Node policy, npm ci, local env template, Playwright.
# Does not reset the database and does not print secret values.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
Usage: bash dev/linux/bootstrap.sh [--check]

Installs Linux development prerequisites for Codespaces, WSL2, and native Ubuntu 24.04.
Safe to rerun. Does not reset the local database.

  --check   Validate Node, npm, and Docker, then exit without installing.
EOF
}

CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

echo "EquipQR Linux bootstrap"
echo "Repository: $ROOT"

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  node dev/linux/prereq.mjs
  exit 0
fi

node dev/linux/prereq.mjs

install_powershell() {
  if command -v pwsh >/dev/null 2>&1; then
    echo "PowerShell (pwsh) already installed."
    return 0
  fi
  echo "Installing PowerShell so existing repository scripts run on Linux."
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required to install PowerShell. See https://learn.microsoft.com/en-us/powershell/scripting/install/install-ubuntu" >&2
    exit 1
  fi
  local version_id
  version_id="$(. /etc/os-release && echo "$VERSION_ID")"
  local deb
  deb="$(mktemp /tmp/packages-microsoft-prod.XXXXXX.deb)"
  local deb_url="https://packages.microsoft.com/config/ubuntu/${version_id}/packages-microsoft-prod.deb"
  if command -v wget >/dev/null 2>&1; then
    wget -q "$deb_url" -O "$deb"
  else
    curl -fsSL "$deb_url" -o "$deb"
  fi
  sudo dpkg -i "$deb"
  rm -f "$deb"
  sudo apt-get update
  sudo apt-get install -y powershell
}

needs_npm_ci() {
  local prefix="$1"
  local lock="${prefix}/package-lock.json"
  local installed="${prefix}/node_modules/.package-lock.json"
  local stamp="${prefix}/node_modules/.cache/equipqr-node-major"
  local current
  current="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ ! -d "${prefix}/node_modules" || ! -f "$installed" || ! -f "$stamp" ]]; then
    return 0
  fi
  if [[ "$(cat "$stamp")" != "$current" ]]; then
    return 0
  fi
  if [[ "$lock" -nt "$installed" ]]; then
    return 0
  fi
  return 1
}

run_npm_ci() {
  local prefix="$1"
  echo "npm ci in ${prefix}"
  if [[ "$prefix" == "." ]]; then
    npm ci --prefer-offline --no-audit
  else
    npm ci --prefix "$prefix" --prefer-offline --no-audit
  fi
}

install_powershell

if needs_npm_ci "."; then
  run_npm_ci "."
  mkdir -p node_modules/.cache
  node -p 'process.versions.node.split(".")[0]' > node_modules/.cache/equipqr-node-major
else
  echo "node_modules matches package-lock.json and the running Node major."
fi

if [[ -f docs/package-lock.json ]]; then
  if needs_npm_ci "docs"; then
    run_npm_ci "docs"
    mkdir -p docs/node_modules/.cache
    node -p 'process.versions.node.split(".")[0]' > docs/node_modules/.cache/equipqr-node-major
  else
    echo "docs/node_modules matches docs/package-lock.json and the running Node major."
  fi
fi

if [[ ! -f .env && -f .env.example ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Local Supabase overrides are written to .env.local when the stack starts."
elif [[ -f .env ]]; then
  echo ".env already exists; left it unchanged."
else
  echo "FAIL: .env.example is missing, so a local env file cannot be created." >&2
  exit 1
fi

# node_modules survives a Codespaces rebuild, but apt packages and the browser
# download do not. A stamp inside node_modules would skip a required reinstall.
playwright_runtime_ready() {
  local browser_root="${PLAYWRIGHT_BROWSERS_PATH:-${HOME}/.cache/ms-playwright}"
  compgen -G "${browser_root}/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell" >/dev/null \
    && { [[ -e /usr/lib/x86_64-linux-gnu/libglib-2.0.so.0 ]] || [[ -e /lib/x86_64-linux-gnu/libglib-2.0.so.0 ]]; }
}

if playwright_runtime_ready; then
  echo "Playwright Chromium already installed."
else
  echo "Installing Playwright Chromium and its operating-system libraries."
  if ! command -v npx >/dev/null 2>&1; then
    echo "npx is not on PATH. Install Node from package.json engines.node and rerun." >&2
    exit 1
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is unavailable. Run: sudo env PATH=\"\$PATH\" npx playwright install-deps chromium && npx playwright install chromium" >&2
    exit 1
  fi
  # sudo drops the Node feature PATH, so pass it through explicitly.
  sudo env "PATH=$PATH" npx playwright install-deps chromium
  npx playwright install chromium
fi

echo "Bootstrap finished. Start the stack with: bash dev/linux/dev-start.sh"
