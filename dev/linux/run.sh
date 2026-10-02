#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev/linux/env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$EQUIPQR_ROOT"
[[ "$(uname -s)" == Linux ]] || { echo 'The developer environment requires Linux.' >&2; exit 1; }
[[ "$(node --version)" == "v$EQUIPQR_NODE_VERSION" ]] || { echo 'Run bash dev/linux/setup.sh first.' >&2; exit 1; }
if [[ $# -eq 0 ]]; then exec bash --noprofile --norc; fi
exec "$@"
