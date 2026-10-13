#!/usr/bin/env bash
# Agent credentials come from the agent platform's environment, never a vault CLI.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
bash dev/linux/setup.sh
