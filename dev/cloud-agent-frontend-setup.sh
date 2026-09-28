#!/usr/bin/env bash
# Shared dependencies; the separately authorized branch provisioner selects a backend.
set -euo pipefail
export EQUIPQR_BACKEND=hosted
exec bash "$(dirname "${BASH_SOURCE[0]}")/linux/setup.sh"
