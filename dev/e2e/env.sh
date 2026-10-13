#!/usr/bin/env bash
# Credentials come from the caller's environment and stay in the child process; never print them.
set -euo pipefail
set +x
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/../ops/common.sh"
profile="${1:?Usage: env.sh PROFILE COMMAND [ARGS...]}"; shift
cd "$OPS_ROOT"
case "$profile" in
  google-local)
    export E2E_REAL_AUTH_BASE_URL="${E2E_REAL_AUTH_BASE_URL:-http://localhost:8080}"
    export E2E_REAL_AUTH_STORAGE_STATE="${E2E_REAL_AUTH_STORAGE_STATE:-tmp/playwright/auth/google-workspace-local.json}"
    export E2E_GOOGLE_DOCS_WORK_ORDER_ID="${E2E_GOOGLE_DOCS_WORK_ORDER_ID:-d00e8400-e29b-41d4-a716-446655440002}";;
  quickbooks-local)
    export E2E_REAL_AUTH_BASE_URL="${E2E_REAL_AUTH_BASE_URL:-http://localhost:8080}"
    export E2E_QB_LOCAL_AUTH_STORAGE_STATE="${E2E_QB_LOCAL_AUTH_STORAGE_STATE:-tmp/playwright/auth/quickbooks-local.json}"
    export E2E_QB_ORG_ID="${E2E_QB_ORG_ID:-057f571c-0107-4ef2-b095-ac4fb21a7288}"
    export E2E_QBO_WORK_ORDER_ID="${E2E_QBO_WORK_ORDER_ID:-f3720510-beeb-4787-9e81-480e6439ac69}";;
  quickbooks-developer-storage)
    export E2E_QB_DEVELOPER_AUTH_STORAGE_STATE="${E2E_QB_DEVELOPER_AUTH_STORAGE_STATE:-tmp/playwright/auth/quickbooks-developer-local.json}";;
  google-business)
    : "${GOOGLE_BUSINESS_EMAIL:?Export GOOGLE_BUSINESS_EMAIL and GOOGLE_BUSINESS_PASSWORD in your shell first.}"
    : "${GOOGLE_BUSINESS_PASSWORD:?Export GOOGLE_BUSINESS_PASSWORD in your shell first.}"
    export GOOGLE_BUSINESS_EMAIL GOOGLE_BUSINESS_PASSWORD
    export GOOGLE_BUSINESS_TOTP_SECRET="${GOOGLE_BUSINESS_TOTP_SECRET:-}" GOOGLE_BUSINESS_BACKUP_CODES="${GOOGLE_BUSINESS_BACKUP_CODES:-}";;
  quickbooks-developer|qbo-browser)
    : "${QUICKBOOKS_DEVELOPER_EMAIL:?Export QUICKBOOKS_DEVELOPER_EMAIL and QUICKBOOKS_DEVELOPER_PASSWORD in your shell first.}"
    : "${QUICKBOOKS_DEVELOPER_PASSWORD:?Export QUICKBOOKS_DEVELOPER_PASSWORD in your shell first.}"
    export QUICKBOOKS_DEVELOPER_EMAIL QUICKBOOKS_DEVELOPER_PASSWORD
    export QUICKBOOKS_DEVELOPER_TOTP_SECRET="${QUICKBOOKS_DEVELOPER_TOTP_SECRET:-}"
    if [[ "$profile" == qbo-browser ]]; then
      export QBO_USERNAME="$QUICKBOOKS_DEVELOPER_EMAIL" QBO_PASSWORD="$QUICKBOOKS_DEVELOPER_PASSWORD"
      export QBO_TARGET_URL="${QBO_TARGET_URL:-https://qbo.intuit.com/app/homepage}"
      set -- node dev/qbo/qbo-browser-signin.mjs "$@"
    fi;;
  *) fail "Unknown integration profile: $profile";;
esac
[[ $# -gt 0 ]] || fail 'Provide a command to run with this environment.'
exec bash dev/linux/run.sh "$@"
