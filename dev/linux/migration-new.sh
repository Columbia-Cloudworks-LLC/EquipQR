#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev/linux/env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$EQUIPQR_ROOT"
[[ $# == 1 && "$1" =~ ^[a-z][a-z0-9_]*$ ]] || { echo 'Usage: npm run db:migration:new -- snake_case_name' >&2; exit 2; }
# Supabase reads SQL from stdin. Close it so agent terminals cannot hang.
timeout --signal=TERM --kill-after=5 30 node_modules/.bin/supabase migration new "$1" </dev/null
