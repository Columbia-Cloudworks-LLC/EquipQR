#!/usr/bin/env bash
# Use op's native argument interface with closed stdin to avoid agent pipe hangs.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
if [[ "${1:-}" == --help || $# == 0 ]]; then
  echo 'Usage: op-item.sh [--dry-run] create|edit [op item arguments]'
  echo 'Requires OP_SAT_EquipQR. Pass --template FILE for sensitive bulk edits.'
  exit 0
fi
dry=false; if [[ "$1" == --dry-run ]]; then dry=true; shift; fi
action="${1:?}"; shift
[[ "$action" == create || "$action" == edit ]] || fail 'Expected create or edit.'
need op timeout
if $dry; then echo "Validated operation: op item $action (arguments and secret values withheld)"; exit 0; fi
: "${OP_SAT_EquipQR:?Write-tier 1Password service account required.}"
OP_SERVICE_ACCOUNT_TOKEN="$OP_SAT_EquipQR" timeout --kill-after=5 120 op item "$action" --vault "$OP_VAULT" "$@" </dev/null >/dev/null
echo 'Vault operation completed.'
