#!/usr/bin/env bash
# Query a company connected to the managed local database. Tokens never reach stdout.
set -euo pipefail
set +x
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/../ops/common.sh"
org="${E2E_QB_ORG_ID:-}"; query='select Id, DisplayName from Customer maxresults 5'; status=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --organization-id) org="${2:?}"; shift 2;;
    --query) query="${2:?}"; shift 2;;
    --status-only) status=true; shift;;
    *) fail "Unknown argument: $1";;
  esac
done
[[ -z "$org" || "$org" =~ ^[a-fA-F0-9-]{36}$ ]] || fail 'Invalid organization UUID.'
cd "$OPS_ROOT"
bash dev/linux/dev.sh local-check >/dev/null
private_workspace
npx --no-install supabase status --workdir tmp/linux-stack/runtime -o json > "$work/status"
[[ "$(jq -r '.API_URL' "$work/status")" == http://127.0.0.1:54321 ]] || fail 'Expected managed local Supabase.'
jq -r '"header = \"apikey: \(.SERVICE_ROLE_KEY)\"\nheader = \"Authorization: Bearer \(.SERVICE_ROLE_KEY)\""' "$work/status" > "$work/db-curl"
filter='limit=1'; [[ -z "$org" ]] || filter="organization_id=eq.$org"
base=http://127.0.0.1:54321/rest/v1/quickbooks_credentials
curl -fsS --config "$work/db-curl" "$base?$filter&select=id,organization_id,realm_id,access_token,refresh_token,access_token_expires_at,refresh_token_expires_at" > "$work/rows"
jq -e 'length > 0' "$work/rows" >/dev/null || fail 'Connect QuickBooks in local Integrations first.'
jq '.[0]' "$work/rows" > "$work/credential"
jq '{organization_id,realm_id,access_token_expires_at,refresh_token_expires_at}' "$work/credential"
[[ "$status" != true ]] || exit 0
expiry="$(jq -r '.refresh_token_expires_at' "$work/credential")"
[[ "$(date -d "$expiry" +%s)" -gt "$(date +%s)" ]] || fail 'Refresh token expired. Reconnect QuickBooks.'
expiry="$(jq -r '.access_token_expires_at' "$work/credential")"
if [[ "$(date -d "$expiry" +%s)" -le "$(($(date +%s) + 300))" ]]; then
  dotenv_json supabase/functions/.env > "$work/env"
  jq -e '.INTUIT_CLIENT_ID and .INTUIT_CLIENT_SECRET' "$work/env" >/dev/null || fail 'Configure development Intuit credentials first.'
  jq -r '"header = \"Authorization: Basic \((.INTUIT_CLIENT_ID + ":" + .INTUIT_CLIENT_SECRET) | @base64)\""' "$work/env" > "$work/oauth-curl"
  jq -r '"grant_type=refresh_token&refresh_token=" + (.refresh_token | @uri)' "$work/credential" > "$work/form"
  curl -fsS --config "$work/oauth-curl" --data-binary "@$work/form" https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer > "$work/token"
  jq -e '.access_token and .refresh_token and .expires_in and .x_refresh_token_expires_in' "$work/token" >/dev/null
  jq '{access_token,refresh_token,access_token_expires_at:((now + .expires_in)|todate),refresh_token_expires_at:((now + .x_refresh_token_expires_in)|todate),updated_at:(now|todate)}' "$work/token" > "$work/update"
  id="$(jq -r '.id' "$work/credential")"
  curl -fsS --config "$work/db-curl" -H 'Content-Type: application/json' -X PATCH --data-binary "@$work/update" "$base?id=eq.$id" >/dev/null
  jq -s '.[0] * .[1]' "$work/credential" "$work/update" > "$work/fresh"
else cp "$work/credential" "$work/fresh"; fi
jq -r '"header = \"Authorization: Bearer \(.access_token)\"\nheader = \"Accept: application/json\""' "$work/fresh" > "$work/api-curl"
realm="$(jq -er '.realm_id' "$work/fresh")"
[[ "$realm" =~ ^[0-9]+$ ]] || fail 'Invalid realm ID.'
api="${QBO_API_BASE:-https://sandbox-quickbooks.api.intuit.com}"
[[ "$api" == https://sandbox-quickbooks.api.intuit.com || "$api" == https://quickbooks.api.intuit.com ]] || fail 'Unsupported QBO endpoint.'
curl -fsS --config "$work/api-curl" --get --data-urlencode "query=$query" --data-urlencode 'minorversion=70' "$api/v3/company/$realm/query" | jq .
