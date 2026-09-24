#!/usr/bin/env bash
# Common setup for WSL2 and Linux cloud environments.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
missing=false
for tool in curl git jq rg python3 unzip xz flock gcc shellcheck ffmpeg gh op; do
  command -v "$tool" >/dev/null || missing=true
done
if $missing; then
  if [[ "$EUID" == 0 ]]; then bash dev/linux/install-system.sh
  elif sudo -n true 2>/dev/null; then sudo bash dev/linux/install-system.sh
  else echo 'Install system prerequisites once: sudo bash dev/linux/install-system.sh' >&2; exit 1; fi
fi
mkdir -p tmp/linux-stack
exec 9>tmp/linux-stack/lifecycle.lock
flock -n -E 75 9
NODE_VERSION="$(cat .node-version)"
NODE_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/equipqr/node-v${NODE_VERSION}"
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
  nvm use "$NODE_VERSION" >/dev/null 2>&1 || true
fi
if [[ -x "$NODE_HOME/bin/node" ]]; then export PATH="$NODE_HOME/bin:$PATH"; fi
if ! command -v node >/dev/null || [[ "$(node --version)" != "v$NODE_VERSION" ]]; then
  case "$(uname -m)" in x86_64) arch=x64;; aarch64) arch=arm64;; *) echo 'Unsupported architecture' >&2; exit 1;; esac
  download="$(mktemp -d)"
  filename="node-v${NODE_VERSION}-linux-${arch}.tar.xz"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${filename}" -o "$download/$filename"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o "$download/SHASUMS256.txt"
  (cd "$download"; grep "  ${filename}$" SHASUMS256.txt | sha256sum -c -)
  mkdir -p "$NODE_HOME"
  tar -xJf "$download/$filename" -C "$NODE_HOME" --strip-components=1
  rm -- "$download/$filename" "$download/SHASUMS256.txt"
  rmdir -- "$download"
  export PATH="$NODE_HOME/bin:$PATH"
fi
# shellcheck source=dev/linux/env.sh
source dev/linux/env.sh
bash dev/linux/install-deno.sh
if [[ -f tmp/linux-stack/processes.json ]]; then
  echo 'Stop the stack before installing dependencies: bash dev/linux/dev.sh stop' >&2
  exit 1
fi
npm ci --no-audit --no-fund
npm --prefix docs ci --no-audit --no-fund
# Install OS browser libraries only when needed, allowing ordinary WSL users
# to rerun setup without an interactive elevation prompt.
if [[ "$EUID" == 0 ]] || sudo -n true 2>/dev/null; then
  npx --no-install playwright install --with-deps chromium
else
  npx --no-install playwright install chromium
fi
# Fail setup immediately if the installed browser cannot run (for example, a
# fresh non-root host still needs Playwright's OS libraries installed with sudo).
node --input-type=module <<'JS'
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
await browser.close();
JS
if [[ "${EQUIPQR_BACKEND:-local}" != hosted ]] && ! docker info >/dev/null 2>&1; then
  echo 'Dependencies installed. Docker Engine must be available before startup.' >&2
  echo 'On Ubuntu: sudo bash dev/linux/install-docker.sh; then open a new shell.' >&2
  exit 1
fi
echo 'Setup complete. Start with bash dev/linux/dev.sh start'
