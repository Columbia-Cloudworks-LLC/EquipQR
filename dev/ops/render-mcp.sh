#!/usr/bin/env bash
# Optional Cursor MCP configuration. Codex plugins are configured separately.
# Credentials are not rendered into the file: Cursor resolves ${env:NAME}
# placeholders from the shell environment at launch.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
[[ "${1:-}" != --help ]] || { echo 'Usage: render-mcp.sh [--skip-gcp]  (GCP: set EQUIPQR_GCP_VIEWER_SA_JSON to the viewer key file)'; exit 0; }
[[ $# == 0 || ( $# == 1 && "$1" == --skip-gcp ) ]] || fail 'Invalid arguments.'
need jq
jq -e '.mcpServers|type=="object"' "$OPS_ROOT/dev/mcp.template.json" >/dev/null
if [[ "${1:-}" != --skip-gcp ]]; then
  key_file="${EQUIPQR_GCP_VIEWER_SA_JSON:-}"
  [[ -n "$key_file" && -f "$key_file" ]] || fail 'Set EQUIPQR_GCP_VIEWER_SA_JSON to the viewer service-account key file, or pass --skip-gcp.'
  jq -e '.type=="service_account"' "$key_file" >/dev/null || fail 'EQUIPQR_GCP_VIEWER_SA_JSON is not a service-account key.'
  mkdir -p "$HOME/.config/gcloud"
  install -m 600 "$key_file" "$HOME/.config/gcloud/equipqr-agent-viewer.json"
fi
for name in TODIAGRAM_API_KEY GITHUB_MCP_READ_TOKEN GITHUB_MCP_WRITE_TOKEN; do
  [[ -n "${!name:-}" ]] || printf 'Note: %s is not exported; its MCP server will not authenticate.\n' "$name" >&2
done
mkdir -p "$HOME/.cursor"
install -m 600 "$OPS_ROOT/dev/mcp.template.json" "$HOME/.cursor/mcp.json"
echo 'Linux MCP configuration installed; credentials resolve from your environment at launch.'
