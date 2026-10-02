#!/usr/bin/env bash
# Read-only digest verification by default; writing requires --apply.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
apply=false item='' ref=''
while (($#)); do
  case "$1" in
    --check) apply=false;; --apply) apply=true;;
    --op-item) item="${2:?}"; shift;; --project-ref) ref="${2:?}"; shift;;
    --help) echo 'Usage: supabase-secrets.sh --op-item edge-env-prod-secrets [--check|--apply]'; exit 0;;
    *) fail "Unknown argument: $1";;
  esac; shift
done
[[ -n "$item" ]] || { [[ "$ref" == ymxkzronkhwxzcdcbnwq ]] && item=edge-env-prod-secrets; }
[[ "$item" == edge-env-prod-secrets ]] || fail 'An explicitly allowlisted edge item is required.'
need op jq supabase sha256sum
private_workspace
op_item "$item" >"$work/item.json"
actual="$(op_field "$work/item.json" ProjectRef)"
[[ "$actual" == ymxkzronkhwxzcdcbnwq && ( -z "$ref" || "$ref" == "$actual" ) ]] || fail 'ProjectRef does not match the item allowlist.'
op_fields "$work/item.json" >"$work/fields.json"
required='["RESEND_API_KEY","HCAPTCHA_SECRET_KEY","TOKEN_ENCRYPTION_KEY","KDF_SALT","INTUIT_CLIENT_ID","INTUIT_CLIENT_SECRET","GOOGLE_WORKSPACE_CLIENT_ID","GOOGLE_WORKSPACE_CLIENT_SECRET","GOOGLE_MAPS_SERVER_KEY","GOOGLE_MAPS_BROWSER_KEY","GOOGLE_MAPS_MAP_ID","VAPID_PUBLIC_KEY","VAPID_PRIVATE_KEY","VAPID_SUBJECT","PUBLIC_SITE_URL"]'
optional='["GITHUB_PAT","GITHUB_WEBHOOK_SECRET","PRODUCTION_URL","SUPER_ADMIN_ORG_ID","GW_OAUTH_REDIRECT_BASE_URL","QB_OAUTH_REDIRECT_BASE_URL"]'
jq -e --argjson required "$required" --argjson optional "$optional" '
  . as $all | all($required[]; . as $key | if (($all[$key] // "")|length)==0 then error("Missing required " + $key) else true end)
' "$work/fields.json" >/dev/null || fail 'Required secret validation failed.'
# Validate all values before any write. No values are included in diagnostics.
jq --argjson required "$required" --argjson optional "$optional" 'with_entries(select(.key as $k | ($required+$optional)|index($k)))' "$work/fields.json" >"$work/secrets.json"
jq -e '
  def weak: ascii_downcase | test("abcdefghijklmnopqrstuvwxyz|0123456789|qwertyuiop|password|secret");
  to_entries | all(.[];
    .key as $key | .value as $v |
    if ($v|test("^\\s*$|^(test|placeholder|todo|tbd|changeme|replace-me|dummy|none|null)$|\\b(placeholder|changeme|replace-me|todo|lorem|asdf|xxx)\\b";"i")) then error("Placeholder: " + $key)
    elif ($key=="TOKEN_ENCRYPTION_KEY" or $key=="KDF_SALT") and (($v|utf8bytelength)<32 or ($v|weak) or (($v|explode|unique|length)/($v|length)<0.3)) then error("Weak key: " + $key)
    elif $key=="VAPID_PRIVATE_KEY" and ($v|length)<40 then error("Invalid VAPID_PRIVATE_KEY")
    else true end)
' "$work/secrets.json" >/dev/null
SUPABASE_ACCESS_TOKEN="$(op read "op://$OP_VAULT/supabase-write/SUPABASE_ACCESS_TOKEN")"
export SUPABASE_ACCESS_TOKEN
if $apply; then
  json_dotenv "$work/secrets.json" >"$work/edge.env"
  supabase secrets set --project-ref "$actual" --env-file "$work/edge.env"
else
  supabase secrets list --project-ref "$actual" -o json >"$work/remote.json"
  drift=0
  while IFS= read -r key; do
    expected="$(jq -jr --arg key "$key" '.[$key]' "$work/secrets.json" | sha256sum | cut -d' ' -f1)"
    remote="$(jq -r --arg key "$key" '[.[]|select(.name==$key)|(.digest // .value // "")][0] // "" | ascii_downcase | sub("^sha256:";"")' "$work/remote.json")"
    if [[ "$expected" == "$remote" ]]; then echo "$key: MATCH"; else echo "$key: DRIFT"; drift=1; fi
  done < <(jq -r 'keys[]' "$work/secrets.json")
  exit "$drift"
fi
