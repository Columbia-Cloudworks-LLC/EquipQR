#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  hosted|github-hosted) value=false;; self-hosted) value=true;;
  *) echo 'Usage: runner-type.sh github-hosted|self-hosted (Linux runners only)' >&2; exit 2;;
esac
gh variable set USE_SELF_HOSTED --body "$value"
