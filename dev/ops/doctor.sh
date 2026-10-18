#!/usr/bin/env bash
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
need bash git node npm jq curl gh
node --version
gh auth status
if [[ -f "$HOME/.cursor/mcp.json" ]]; then jq -e '.mcpServers|type=="object"' "$HOME/.cursor/mcp.json" >/dev/null; fi
echo 'Linux operational tooling and configured sessions are available.'
