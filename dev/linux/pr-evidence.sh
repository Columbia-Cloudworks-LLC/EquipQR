#!/usr/bin/env bash
# Capture and review locally; upload and commenting are explicit separate actions.
set -euo pipefail
set +x
# shellcheck source=dev/linux/env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$EQUIPQR_ROOT"
action="${1:-help}"; (($# == 0)) || shift
flow='' spec=e2e/pr-evidence/smoke-dashboard.spec.ts base=http://localhost:8080 notes='' pr=''
mobile=false skip=false
while (($#)); do
  case "$1" in
    --flow) flow="${2:?}"; shift;;
    --spec) spec="${2:?}"; shift;;
    --base-url) base="${2:?}"; shift;;
    --notes) notes="${2:?}"; shift;;
    --pr) pr="${2:?}"; shift;;
    --mobile) mobile=true;;
    --skip-stack-start) skip=true;;
    *) echo "Unknown option: $1" >&2; exit 2;;
  esac
  shift
done
if [[ "$action" == help ]]; then
  echo 'Usage: pr-evidence.sh capture|review|upload|comment --flow NAME [--spec PATH] [--mobile] [--notes TEXT] [--pr NUMBER]'
  exit 0
fi
[[ "$flow" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo '--flow must be a lowercase slug.' >&2; exit 2; }
dir="tmp/pr-evidence/$flow"
manifest="$dir/manifest.json"
mkdir -p "$dir"
exec 8>"$dir/action.lock"
flock -n -E 75 8
case "$action" in
  capture)
    [[ -f "$spec" ]] || { echo "Spec not found: $spec" >&2; exit 1; }
    if ! $skip; then bash dev/linux/dev.sh start; fi
    bash dev/linux/dev.sh status
    export PR_EVIDENCE_FLOW="$flow" PR_EVIDENCE_SPEC="$spec" PR_EVIDENCE_BASE_URL="$base"
    export PR_EVIDENCE_VIEWPORT_WIDTH=1920 PR_EVIDENCE_VIEWPORT_HEIGHT=1080
    if $mobile; then export PR_EVIDENCE_VIEWPORT_WIDTH=390 PR_EVIDENCE_VIEWPORT_HEIGHT=844; fi
    project='pr-evidence'
    if grep -q '@real-auth' "$spec"; then
      project='pr-evidence-real-auth'
      : "${E2E_REAL_AUTH_STORAGE_STATE:?Supply a Linux path to captured development auth state.}"
    else
      bash dev/linux/dev.sh local-check
    fi
    # Invalidate review before any new capture, including failed runs.
    rm -f -- "$dir/visual-review.json" "$dir/upload-complete.sha256" "$manifest"
    mkdir -p "$dir/screenshots"
    # Remove only previous screenshots within this validated flow directory.
    find "$dir/screenshots" -maxdepth 1 -type f -name '*.png' -delete
    if [[ "$spec" == *getting-started-onboarding* ]]; then
      bash dev/linux/dev.sh local-check
      node_modules/.bin/tsx dev/pr-evidence/reset-fresh-start-onboarding.ts
    fi
    node_modules/.bin/playwright test "$spec" --config=playwright.pr-evidence.config.ts --project="$project"
    video="$(find "$dir/playwright-output" -type f -name video.webm -printf '%s\t%p\n' | sort -nr | head -1 | cut -f2-)"
    [[ -n "$video" ]] || { echo 'Capture produced no video.' >&2; exit 1; }
    ffmpeg -loglevel error -y -i "$video" -vf 'scale=trunc(iw/2)*2:trunc(ih/2)*2' -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an -movflags +faststart "$dir/demo.mp4"
    shots="$(find "$dir/screenshots" -maxdepth 1 -type f -name '*.png' -print | sort | jq -Rsc 'split("\n") | map(select(length>0) | {localPath:.,label:(split("/")[-1]|rtrimstr(".png"))})')"
    jq -en --arg flow "$flow" --arg spec "$spec" --arg base "$base" --arg date "$(date -u +%FT%TZ)" --arg video "$dir/demo.mp4" --argjson shots "$shots" \
      --argjson width "$PR_EVIDENCE_VIEWPORT_WIDTH" --argjson height "$PR_EVIDENCE_VIEWPORT_HEIGHT" \
      'if ($shots|length)==0 then error("No evidence screenshots") else {flow:$flow,spec:$spec,baseUrl:$base,capturedAt:$date,viewport:{width:$width,height:$height},screenshots:$shots,video:$video} end' >"$manifest"
    printf '%s\n' 'Inspect each screenshot and the video. Check framing, overflow, controls, and sensitive data before recording review.' >"$dir/visual-review-checklist.md"
    echo "Captured: $manifest";;
  review)
    [[ -n "$notes" ]] || { echo '--notes is required after visual inspection.' >&2; exit 2; }
    jq -e '.screenshots|length>0' "$manifest" >/dev/null
    jq --arg notes "$notes" --arg hash "$(sha256sum "$manifest" | cut -d' ' -f1)" --arg date "$(date -u +%FT%TZ)" \
      '{approved:true,flow,notes:$notes,manifestSha256:$hash,reviewedAt:$date,screenshotCount:(.screenshots|length),screenshots}' "$manifest" >"$dir/visual-review.json"
    echo "Review recorded: $dir/visual-review.json";;
  upload|comment)
    hash="$(sha256sum "$manifest" | cut -d' ' -f1)"
    jq -e --arg hash "$hash" '.approved==true and .manifestSha256==$hash' "$dir/visual-review.json" >/dev/null || { echo 'Inspect this capture and record review first.' >&2; exit 1; }
    if [[ "$action" == comment ]]; then
      [[ "$pr" =~ ^[1-9][0-9]*$ && -f "$dir/evidence-markdown.md" ]] || { echo 'Upload first, then supply --pr NUMBER.' >&2; exit 2; }
      [[ -f "$dir/upload-complete.sha256" && "$(cat "$dir/upload-complete.sha256")" == "$hash" ]] || { echo 'Upload all assets for the current capture first.' >&2; exit 1; }
      gh pr comment "$pr" --body-file "$dir/evidence-markdown.md"
      exit 0
    fi
    : "${SUPABASE_URL:?Set the explicitly authorized evidence storage URL.}"
    : "${SUPABASE_SERVICE_ROLE_KEY:?Set the evidence upload credential in the Linux environment.}"
    branch="$(git branch --show-current | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9-]+/-/g')"
    rm -f -- "$dir/upload-complete.sha256"
    printf '<!-- pr-visual-evidence -->\n## Visual evidence\n\n' >"$dir/evidence-markdown.md"
    while IFS= read -r shot; do
      file="$(jq -r .localPath <<<"$shot")"; label="$(jq -r .label <<<"$shot")"
      response="$(OUTPUT_JSON=true node_modules/.bin/tsx dev/upload-screenshot.ts "$file" "pr-evidence/$branch/$flow-$label.png" landing-page-images)"
      url="$(jq -er 'select(.success==true).publicUrl' <<<"$response")"
      printf '![%s](%s)\n\n' "$label" "$url" >>"$dir/evidence-markdown.md"
    done < <(jq -c '.screenshots[]' "$manifest")
    video="$(jq -er .video "$manifest")"
    if response="$(OUTPUT_JSON=true node_modules/.bin/tsx dev/upload-github-asset.ts "$video" --repo Columbia-Cloudworks-LLC/EquipQR)"; then
      jq -er 'select(.success==true).markdownLine' <<<"$response" >>"$dir/evidence-markdown.md"
    else
      response="$(OUTPUT_JSON=true node_modules/.bin/tsx dev/upload-screenshot.ts "$video" "pr-evidence/$branch/$flow-demo.mp4" landing-page-videos)"
      url="$(jq -er 'select(.success==true).publicUrl' <<<"$response")"
      printf '[Flow demo (MP4)](%s)\n' "$url" >>"$dir/evidence-markdown.md"
    fi
    printf '%s\n' "$hash" >"$dir/upload-complete.sha256"
    echo "Uploaded evidence: $dir/evidence-markdown.md";;
  *) echo "Unknown action: $action" >&2; exit 2;;
esac
