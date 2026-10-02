#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev/linux/env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
if ! command -v node >/dev/null || [[ "$(node --version)" != "v$EQUIPQR_NODE_VERSION" ]]; then
  echo "Run bash dev/linux/setup.sh first (Node $EQUIPQR_NODE_VERSION required)." >&2
  exit 1
fi
cd "$EQUIPQR_ROOT"
mkdir -p tmp/linux-stack
exec flock -n -E 75 tmp/linux-stack/lifecycle.lock node dev/linux/stack.mjs "${@:-start}"
