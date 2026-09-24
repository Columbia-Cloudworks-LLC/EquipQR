#!/usr/bin/env bash
# Materialize development integration settings; never runs as part of core setup.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
[[ "${1:-}" != --help ]] || { echo 'Usage: local-env.sh [--app-only|--edge-only]'; exit 0; }
mode="${1:-both}"
[[ "$mode" =~ ^(both|--app-only|--edge-only)$ && $# -le 1 ]] || fail 'Invalid arguments.'
need op jq node
private_workspace
cd "$OPS_ROOT"
for kind in app edge; do
  [[ "$mode" != --app-only || "$kind" == app ]] || continue
  [[ "$mode" != --edge-only || "$kind" == edge ]] || continue
  target=.env; [[ "$kind" != edge ]] || target=supabase/functions/.env
  op_item "$kind-env-local-dev" >"$work/item.json"
  op_fields "$work/item.json" >"$work/fields.json"
  jq -r '.notesPlain // ""' "$work/item.json" >"$work/notes.env"
  dotenv_json "$work/notes.env" >"$work/notes.json"
  dotenv_json "$target" >"$work/old.json"
  jq -s '.[0]*.[1]*.[2]' "$work/old.json" "$work/notes.json" "$work/fields.json" >"$work/merged.json"
  if [[ "$kind" == app ]]; then
    jq 'reduce ["SUPABASE_URL","SUPABASE_ANON_KEY","PUBLIC_SITE_URL","PRODUCTION_URL","INTUIT_CLIENT_ID","ENABLE_DEVTOOLS","VAPID_PUBLIC_KEY","GOOGLE_PICKER_API_KEY","GOOGLE_PICKER_APP_ID","GOOGLE_PICKER_CLIENT_ID","GOOGLE_WORKSPACE_CLIENT_ID","HCAPTCHA_SITEKEY"][] as $key (.; if has($key) then .["VITE_"+$key]=.[$key] else . end)' "$work/merged.json" >"$work/$kind.json"
  else
    jq 'with_entries(select(.key|startswith("SUPABASE_")|not)) | .INTUIT_REDIRECT_URI="http://localhost:54321/functions/v1/quickbooks-oauth-callback" | .PUBLIC_SITE_URL="http://localhost:8080" | .GW_OAUTH_REDIRECT_BASE_URL="http://localhost:54321" | .QB_OAUTH_REDIRECT_BASE_URL="http://localhost:54321" | .QBO_USE_SANDBOX="true"' "$work/merged.json" >"$work/$kind.json"
  fi
  json_dotenv "$work/$kind.json" >"$work/$kind.env"
done
if [[ -f "$work/app.env" ]]; then install -m 600 "$work/app.env" .env; fi
if [[ -f "$work/edge.env" ]]; then install -m 600 "$work/edge.env" supabase/functions/.env; fi
echo 'Development configuration synced. Restart the Linux stack to apply it.'
