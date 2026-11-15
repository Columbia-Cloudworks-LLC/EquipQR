#!/usr/bin/env bash
# Capture and review locally; publish (git + gh auth only) is an explicit separate action.
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
  echo 'Usage: pr-evidence.sh capture|review|publish --flow NAME [--spec PATH] [--mobile] [--notes TEXT] [--pr NUMBER]'
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
    rm -f -- "$dir/visual-review.json" "$dir/evidence-markdown.md" "$manifest"
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
  publish)
    # Publishes with git + gh auth only: files go to the orphan evidence branch
    # (never the working branch), then one marker comment per flow is created or updated.
    [[ "$pr" =~ ^[1-9][0-9]*$ ]] || { echo '--pr NUMBER is required.' >&2; exit 2; }
    hash="$(sha256sum "$manifest" | cut -d' ' -f1)"
    jq -e --arg hash "$hash" '.approved==true and .manifestSha256==$hash' "$dir/visual-review.json" >/dev/null || { echo 'Inspect this capture and record review first.' >&2; exit 1; }
    repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
    gh pr view "$pr" --repo "$repo" --json number >/dev/null
    evidence_branch="${PR_EVIDENCE_BRANCH:-pr-evidence}"
    prefix="pr-$pr/$flow"
    stage="$dir/publish"
    rm -rf -- "$stage"; mkdir -p "$stage"
    video="$(jq -er .video "$manifest")"
    [[ -f "$video" ]] || { echo "Demo video missing: $video" >&2; exit 1; }
    cp -- "$video" "$stage/demo.mp4"
    # Inline animated preview: GitHub only plays video from user-attachments, so render a GIF
    # and step down frame rate/width until it fits under the image proxy limit.
    max_gif_bytes="${PR_EVIDENCE_GIF_MAX_BYTES:-5000000}"
    for cfg in '8 960' '6 800' '5 640' '4 480'; do
      read -r fps width <<<"$cfg"
      ffmpeg -loglevel error -y -i "$stage/demo.mp4" -vf "fps=$fps,scale='min($width,iw)':-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 "$stage/demo.gif"
      (($(stat -c %s "$stage/demo.gif") <= max_gif_bytes)) && break
    done
    (($(stat -c %s "$stage/demo.gif") <= max_gif_bytes)) || echo "Warning: demo.gif exceeds $max_gif_bytes bytes and may not render inline." >&2
    while IFS= read -r shot; do
      cp -- "$(jq -r .localPath <<<"$shot")" "$stage/$(jq -r .label <<<"$shot").png"
    done < <(jq -c '.screenshots[]' "$manifest")
    # Root files keep the branch self-describing and stop Vercel from deploying it.
    # shellcheck disable=SC2016 # literal Markdown backticks
    root_readme="$(printf '%s\n' '# PR visual evidence' '' 'Orphan branch holding screenshots and demos posted on pull requests by' '`bash dev/linux/pr-evidence.sh publish`. Files live under `pr-<number>/<flow>/`.' 'A scheduled workflow removes folders of closed PRs and squashes this branch.' 'Do not merge this branch.')"
    root_vercel='{"git":{"deploymentEnabled":false}}'
    pushed=''
    for attempt in 1 2 3; do
      parent=''
      if git ls-remote --exit-code --heads origin "$evidence_branch" >/dev/null; then
        git fetch -q origin "+refs/heads/$evidence_branch:refs/remotes/origin/$evidence_branch"
        parent="$(git rev-parse "refs/remotes/origin/$evidence_branch")"
      fi
      index="$(mktemp)"; rm -f -- "$index"
      export GIT_INDEX_FILE="$index"
      if [[ -n "$parent" ]]; then git read-tree "$parent"; else git read-tree --empty; fi
      git ls-files -z -- "$prefix/" | xargs -0 -r git update-index --force-remove --
      git update-index --add --cacheinfo "100644,$(printf '%s\n' "$root_readme" | git hash-object -w --stdin),README.md"
      git update-index --add --cacheinfo "100644,$(printf '%s\n' "$root_vercel" | git hash-object -w --stdin),vercel.json"
      for file in "$stage"/*; do
        git update-index --add --cacheinfo "100644,$(git hash-object -w -- "$file"),$prefix/${file##*/}"
      done
      tree="$(git write-tree)"
      unset GIT_INDEX_FILE; rm -f -- "$index"
      commit="$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "evidence: PR #$pr $flow")"
      if git push -q origin "$commit:refs/heads/$evidence_branch"; then pushed="$commit"; break; fi
      echo "Push to $evidence_branch was rejected (attempt $attempt); retrying on the latest tip." >&2
    done
    [[ -n "$pushed" ]] || { echo "Could not push to $evidence_branch." >&2; exit 1; }
    # Branch-path URLs survive the cleanup squash; ?v= busts proxy caches on re-publish.
    raw="https://raw.githubusercontent.com/$repo/$evidence_branch/$prefix"
    v="${pushed:0:12}"
    marker="<!-- pr-visual-evidence:$flow -->"
    body="$dir/evidence-markdown.md"
    {
      # shellcheck disable=SC2016 # literal Markdown backticks
      printf '%s\n<!-- pr-visual-evidence -->\n## Visual evidence: `%s`\n\n' "$marker" "$flow"
      jq -r '"Captured from the local dev stack (`\(.baseUrl)`, \(.viewport.width)×\(.viewport.height)) with `\(.spec)` at \(.capturedAt)."' "$manifest"
      printf '\n'
      jq -r '"**Visual review:** \(.notes)"' "$dir/visual-review.json"
      printf '\n### Screenshots\n\n'
      while IFS= read -r label; do
        printf '![%s](%s/%s.png?v=%s)\n\n' "$label" "$raw" "$label" "$v"
      done < <(jq -r '.screenshots[].label' "$manifest")
      printf '### Demo\n\n![%s demo](%s/demo.gif?v=%s)\n\n[Full-resolution MP4](%s/demo.mp4?v=%s)\n' "$flow" "$raw" "$v" "$raw" "$v"
    } >"$body"
    me="$(gh api user --jq .login)"
    existing="$(gh api --paginate "repos/$repo/issues/$pr/comments" --jq ".[] | select(.user.login == \"$me\" and (.body | contains(\"$marker\"))) | .id" | tail -1)"
    if [[ -n "$existing" ]]; then
      gh api -X PATCH "repos/$repo/issues/comments/$existing" -F "body=@$body" --jq .html_url
    else
      gh pr comment "$pr" --repo "$repo" --body-file "$body"
    fi
    echo "Published evidence for PR #$pr: $evidence_branch/$prefix";;
  *) echo "Unknown action: $action" >&2; exit 2;;
esac
