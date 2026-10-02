#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev/linux/env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$EQUIPQR_ROOT"
npm run test:linux
npm run verify:node-policy
npm run verify:docs-index
npm run verify:root-layout
npm run lint:all
npm run type-check
npm run test:ci
npm run build
npm run verify:spa-routing
echo 'Linux verification passed. Run the relevant browser/database tests for behavior changes.'
