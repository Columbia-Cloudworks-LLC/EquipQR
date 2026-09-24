#!/usr/bin/env bash
# Compatibility alias; implementation lives in the canonical Linux scripts.
set -euo pipefail
exec bash "$(dirname "${BASH_SOURCE[0]}")/dev.sh" start "$@"
