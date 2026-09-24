#!/usr/bin/env bash
# Credentials stay in the child process; never source or print vault content.
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
    need op
    vault='mrviyowmjwrxv7syobdlhnmawa'; item='ukvy6bzwb2ikq5cfeambgcq5u4'
    GOOGLE_BUSINESS_EMAIL="$(op read "op://$vault/$item/username")"
    GOOGLE_BUSINESS_PASSWORD="$(op read "op://$vault/$item/password")"
    GOOGLE_BUSINESS_TOTP_SECRET="$(op read "op://$vault/$item/totp" 2>/dev/null || true)"
    GOOGLE_BUSINESS_BACKUP_CODES="$(op read "op://$vault/$item/backup_codes" 2>/dev/null || true)"
    export GOOGLE_BUSINESS_EMAIL GOOGLE_BUSINESS_PASSWORD GOOGLE_BUSINESS_TOTP_SECRET GOOGLE_BUSINESS_BACKUP_CODES;;
  quickbooks-developer|qbo-browser)
    need op
    QUICKBOOKS_DEVELOPER_EMAIL="$(op read 'op://EquipQR Agents/62ng22yntivrjdt25gmsjqrin4/username')"
    QUICKBOOKS_DEVELOPER_PASSWORD="$(op read 'op://EquipQR Agents/62ng22yntivrjdt25gmsjqrin4/password')"
    QUICKBOOKS_DEVELOPER_OTP="$(op read 'op://EquipQR Agents/62ng22yntivrjdt25gmsjqrin4/one-time password' 2>/dev/null || true)"
    export QUICKBOOKS_DEVELOPER_EMAIL QUICKBOOKS_DEVELOPER_PASSWORD QUICKBOOKS_DEVELOPER_OTP
    if [[ "$profile" == qbo-browser ]]; then
      export QBO_USERNAME="$QUICKBOOKS_DEVELOPER_EMAIL" QBO_PASSWORD="$QUICKBOOKS_DEVELOPER_PASSWORD"
      export QBO_TARGET_URL="${QBO_TARGET_URL:-https://qbo.intuit.com/app/homepage}"
      set -- node dev/qbo/qbo-browser-signin.mjs "$@"
    fi;;
  *) fail "Unknown integration profile: $profile";;
esac
[[ $# -gt 0 ]] || fail 'Provide a command to run with this environment.'
exec bash dev/linux/run.sh "$@"
