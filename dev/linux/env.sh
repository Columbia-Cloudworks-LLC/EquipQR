#!/usr/bin/env bash
# Source this file to use the same Linux toolchain in terminals, agents and CI.
EQUIPQR_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EQUIPQR_NODE_VERSION="$(cat "$EQUIPQR_ROOT/.node-version")"
EQUIPQR_NODE_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/equipqr/node-v${EQUIPQR_NODE_VERSION}"
if [[ -x "$EQUIPQR_NODE_HOME/bin/node" ]]; then
  export PATH="$EQUIPQR_NODE_HOME/bin:$PATH"
elif [[ -s "$HOME/.nvm/nvm.sh" ]] && { ! command -v node >/dev/null || [[ "$(node --version)" != "v$EQUIPQR_NODE_VERSION" ]]; }; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh" --no-use
  nvm use "$EQUIPQR_NODE_VERSION" >/dev/null
fi
export PATH="$EQUIPQR_ROOT/node_modules/.bin:$HOME/.local/bin:$PATH"
export NODE_USE_ENV_PROXY="${NODE_USE_ENV_PROXY:-1}"
export NODE_USE_SYSTEM_CA="${NODE_USE_SYSTEM_CA:-1}"
export NO_PROXY="localhost,127.0.0.1,::1${NO_PROXY:+,$NO_PROXY}${no_proxy:+,$no_proxy}"
export no_proxy="$NO_PROXY"
