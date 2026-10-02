#!/usr/bin/env bash
# Optional agent credentials use the same Linux helpers as a developer terminal.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
bash dev/linux/setup.sh
if [[ -n "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]]; then
  bash dev/ops/local-env.sh
  bash dev/ops/render-mcp.sh
fi
