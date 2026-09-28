#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
[[ $# == 3 ]] || fail 'Usage: local-storage.sh BUCKET OBJECT FILE'
cd "$OPS_ROOT"
bash dev/linux/dev.sh local-check >/dev/null
private_workspace
npx --no-install supabase status --workdir tmp/linux-stack/runtime -o json > "$work/status"
SUPABASE_URL="$(jq -er '.API_URL' "$work/status")"
SUPABASE_SERVICE_ROLE_KEY="$(jq -er '.SERVICE_ROLE_KEY' "$work/status")"
[[ "$SUPABASE_URL" == http://127.0.0.1:54321 ]] || fail 'Expected the managed local backend.'
export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
npx --no-install tsx dev/upload-screenshot.ts "$3" "$2" "$1"
