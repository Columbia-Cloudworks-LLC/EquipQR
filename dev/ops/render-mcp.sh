#!/usr/bin/env bash
# Optional Cursor MCP configuration. Codex plugins are configured separately.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
[[ "${1:-}" != --help ]] || { echo 'Usage: render-mcp.sh [--skip-gcp]'; exit 0; }
[[ $# == 0 || ( $# == 1 && "$1" == --skip-gcp ) ]] || fail 'Invalid arguments.'
need op jq
private_workspace
op inject -i "$OPS_ROOT/dev/mcp.template.json" -o "$work/mcp.json" >/dev/null
jq -e '.mcpServers|type=="object"' "$work/mcp.json" >/dev/null
if grep -q 'op://' "$work/mcp.json"; then fail 'Unresolved vault references.'; fi
if [[ "${1:-}" != --skip-gcp ]]; then
  found=false
  for ref in gcp-read/SERVICE_ACCOUNT_JSON gcp-read/credential gcp-viewer/credential; do
    if op read "op://$OP_VAULT/$ref" >"$work/gcp.json" 2>/dev/null && jq -e '.type=="service_account"' "$work/gcp.json" >/dev/null; then found=true; break; fi
  done
  $found || fail 'GCP viewer service account is unavailable; use --skip-gcp when not needed.'
  mkdir -p "$HOME/.config/gcloud"
  install -m 600 "$work/gcp.json" "$HOME/.config/gcloud/equipqr-agent-viewer.json"
fi
mkdir -p "$HOME/.cursor"
install -m 600 "$work/mcp.json" "$HOME/.cursor/mcp.json"
echo 'Linux MCP configuration rendered; credential values were not logged.'
