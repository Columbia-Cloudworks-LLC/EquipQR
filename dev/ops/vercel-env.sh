#!/usr/bin/env bash
# Presence check matches the legacy contract. Never reports value parity.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
apply=false environment=all
while (($#)); do
  case "$1" in --check) apply=false;; --apply) apply=true;; --environment) environment="${2:?}"; shift;;
    --help) echo 'Usage: vercel-env.sh [--environment preview|production|all] [--check|--apply]'; exit 0;;
    *) fail "Unknown argument: $1";; esac; shift
done
[[ "$environment" =~ ^(preview|production|all)$ ]] || fail 'Invalid environment.'
need op jq curl
private_workspace
token="${VERCEL_TOKEN:-$(op read "op://$OP_VAULT/vercel-write/VERCEL_TOKEN")}"
printf 'header = "Authorization: Bearer %s"\n' "$token" >"$work/auth.conf"
team=team_78VeGDURoofThjZNJOKEBpP5 project=prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA
envs=("$environment"); [[ "$environment" != all ]] || envs=(preview production)
drift=0
vars=(SUPABASE_URL SUPABASE_ANON_KEY HCAPTCHA_SITEKEY SUPER_ADMIN_ORG_ID INTUIT_CLIENT_ID GOOGLE_WORKSPACE_CLIENT_ID GOOGLE_PICKER_API_KEY GOOGLE_PICKER_APP_ID GOOGLE_MAPS_API_KEY VAPID_PUBLIC_KEY)
for target in "${envs[@]}"; do
  item=app-env-preview-public; [[ "$target" != production ]] || item=app-env-prod-public
  op_item "$item" >"$work/item.json"
  op_fields "$work/item.json" >"$work/fields.json"
  curl -fsS --config "$work/auth.conf" "https://api.vercel.com/v9/projects/$project/env?teamId=$team" >"$work/remote.json"
  for name in "${vars[@]}"; do
    key="VITE_$name"
    jq -e --arg key "$key" --arg bare "$name" '(.[$key] // .[$bare]) | select(.!=null and .!="")' "$work/fields.json" >"$work/value.json" || fail "Vault field missing: $key"
    jq --arg key "$key" --arg target "$target" '[.envs[]|select(.key==$key and (.target|index($target)) and (.gitBranch==null))][0] // null' "$work/remote.json" >"$work/current.json"
    if ! $apply; then
      if jq -e '.!=null' "$work/current.json" >/dev/null; then echo "$target/$key: PRESENT (presence only)"; else echo "$target/$key: MISSING"; drift=1; fi
      continue
    fi
    id="$(jq -r '.id // empty' "$work/current.json")"
    if [[ -n "$id" ]]; then
      jq --slurpfile value "$work/value.json" '{value:$value[0],target:(.target|map(select(.!="staging")))}' "$work/current.json" >"$work/body.json"
      curl -fsS --config "$work/auth.conf" -H 'Content-Type: application/json' -X PATCH --data-binary @"$work/body.json" "https://api.vercel.com/v9/projects/$project/env/$id?teamId=$team" >"$work/result.json"
    else
      jq -n --arg key "$key" --arg target "$target" --slurpfile value "$work/value.json" '{key:$key,value:$value[0],type:"encrypted",target:[$target]}' >"$work/body.json"
      curl -fsS --config "$work/auth.conf" -H 'Content-Type: application/json' -X POST --data-binary @"$work/body.json" "https://api.vercel.com/v10/projects/$project/env?teamId=$team" >"$work/result.json"
    fi
    echo "$target/$key: APPLIED"
  done
done
exit "$drift"
