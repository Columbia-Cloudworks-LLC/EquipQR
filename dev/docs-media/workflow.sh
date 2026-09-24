#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/../ops/common.sh"
cd "$OPS_ROOT"
action="${1:-verify}"; shift || true
case "$action" in
  verify)
    url="${1:-${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}}"
    [[ "$url" == https://* || "$url" == http://127.0.0.1:* ]] || fail 'Provide the Supabase URL.'
    status="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' -I "${url%/}/storage/v1/object/public/docs-media/")"
    [[ "$status" == 200 || "$status" == 404 ]] || fail "Public endpoint returned $status"
    echo 'Public endpoint reachable. The database migration provisions the bucket; an empty object path may return 404.';;
  publish)
    [[ $# == 3 ]] || fail 'Usage: workflow.sh publish MANIFEST COLLECTION desktop|mobile'
    manifest="$1"; collection="$2"; variant="$3"
    [[ "$collection" =~ ^[a-z0-9][a-z0-9-]*$ && "$variant" =~ ^(desktop|mobile)$ ]] || fail 'Invalid collection or variant.'
    [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] || fail 'Explicit upload credentials required.'
    jq -e '.video and (.screenshots | type == "array")' "$manifest" >/dev/null
    private_workspace
    jq '[.screenshots[] | {kind:"screenshot", label, localPath}] + [{kind:"video",label:"demo",localPath:.video}]' "$manifest" > "$work/assets"
    while IFS= read -r file; do [[ -f "$file" ]] || fail "Missing artifact: $file"; done < <(jq -r '.[].localPath' "$work/assets")
    while IFS= read -r asset; do
      label="$(jq -r '.label' <<< "$asset")"; file="$(jq -r '.localPath' <<< "$asset")"
      kind="$(jq -r '.kind' <<< "$asset")"; ext=png; [[ "$kind" != video ]] || ext=mp4
      object="$(npx --no-install tsx dev/docs-media/print-storage-path.ts "$collection" "$variant" "$label" "$ext")"
      OUTPUT_JSON=true npx --no-install tsx dev/upload-screenshot.ts "$file" "$object" docs-media > "$work/result"
      jq -e '.success == true' "$work/result" >/dev/null
      jq --arg label "$label" --arg kind "$kind" '{kind:$kind,label:$label,publicUrl,storagePath}' "$work/result" >> "$work/results"
    done < <(jq -c '.[]' "$work/assets")
    out="tmp/docs-media/$collection"; mkdir -p "$out"
    jq -s --arg collection "$collection" --arg variant "$variant" '{collection:$collection,variant:$variant,uploads:.}' "$work/results" > "$out/$variant-upload-results.json"
    jq -r '.uploads[] | if .kind == "video" then .publicUrl else "![\(.label)](\(.publicUrl))" end' "$out/$variant-upload-results.json" > "$out/$variant.md"
    echo "Published artifacts; markdown: $out/$variant.md";;
  *) fail 'Use verify or publish.';;
esac
