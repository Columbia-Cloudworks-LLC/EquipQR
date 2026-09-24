#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev/linux/env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$EQUIPQR_ROOT"
suite=critical viewport=desktop profile=test base=http://localhost:8080 overlay='' title=''
headed=false headless=false watch=false record=false reset=false skip=false debug=false dry=false
slow=-1 stage=-1 pause=-1
extra=()
while (($#)); do
  case "$1" in
    --suite) suite="${2:?}"; shift;;
    --viewport) viewport="${2:?}"; shift;;
    --profile) profile="${2:?}"; shift;;
    --base-url) base="${2:?}"; shift;;
    --overlay) overlay="${2:?}"; shift;;
    --title) title="${2:?}"; shift;;
    --slow-mo) slow="${2:?}"; shift;;
    --stage-pause) stage="${2:?}"; shift;;
    --watch-pause) pause="${2:?}"; shift;;
    --headed) headed=true;;
    --headless) headless=true;;
    --watch) watch=true;;
    --record) record=true;;
    --reset) reset=true;;
    --skip-stack-start) skip=true;;
    --debug) debug=true;;
    --dry-run) dry=true;;
    --help) echo 'Usage: user-regression.sh [--suite critical|full|all] [--viewport desktop|mobile|both] [--profile test|watch|demo] [--reset] [--headless|--headed] [--watch] [--record] [--dry-run] [-- Playwright options]'; exit 0;;
    --) shift; extra=("$@"); break;;
    *) echo "Unknown option: $1" >&2; exit 2;;
  esac
  shift
done
case "$suite:$viewport:$profile" in
  critical:*|full:*|all:*) ;; *) echo 'Invalid suite' >&2; exit 2;;
esac
[[ "$viewport" =~ ^(desktop|mobile|both)$ && "$profile" =~ ^(test|watch|demo)$ && "$overlay" =~ ^(none|debug|marketing)?$ ]] || { echo 'Invalid run configuration' >&2; exit 2; }
for value in "$slow" "$stage" "$pause"; do [[ "$value" =~ ^(-1|[0-9]+)$ ]] || { echo 'Pacing values must be nonnegative integers.' >&2; exit 2; }; done
if $watch && [[ "$profile" == test ]]; then profile=watch; fi
if [[ "$profile" != test ]]; then watch=true; fi
[[ -n "$overlay" ]] || { if [[ "$profile" == demo ]]; then overlay=marketing; else overlay=none; fi; }
if [[ "$profile" == demo ]]; then record=true; fi
if ((slow < 0)); then if [[ "$profile" == demo ]]; then slow=200; else slow=0; fi; fi
if ((stage < 0)); then if [[ "$profile" == demo ]]; then stage=1500; elif $watch; then stage=1000; else stage=0; fi; fi
if ((pause < 0)); then if [[ "$profile" == demo ]]; then pause=6000; elif $watch; then pause=5000; else pause=0; fi; fi
# Full fixture suites require the disposable local backend. No automatic reset.
if [[ "$suite" != critical ]] && ! $reset && ! $dry; then
  echo 'Full/all suites require --reset (disposable local database only).' >&2; exit 2
fi
mkdir -p tmp/playwright/auth
exec 8>tmp/playwright/regression.lock
flock -n -E 75 8
if ! $dry; then
  # The launcher resolves .env files and refuses reset/fixture tests in hosted mode.
  if $reset; then bash dev/linux/dev.sh reset; elif ! $skip; then bash dev/linux/dev.sh start; fi
  bash dev/linux/dev.sh local-check
  bash dev/linux/dev.sh status
fi
viewports=("$viewport"); [[ "$viewport" != both ]] || viewports=(desktop mobile)
result=0
for view in "${viewports[@]}"; do
  token="$(printf '%s' "$view-$profile-$overlay-$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9-]+/-/g;s/-+/-/g;s/-$//')"
  jq --arg base "$base" --arg profile "$profile" --arg view "$view" --arg overlay "$overlay" --arg title "$title" --arg output "tmp/playwright/test-results/$token" \
    --argjson record "$record" --argjson slow "$slow" --argjson stage "$stage" --argjson pause "$pause" '
    .baseURL=$base | .runProfile=$profile | .viewportMode=$view | .overlayMode=$overlay | .recordingTitle=$title |
    .outputDir=$output | .recordAllVideos=($record or .recordAllVideos) | .annotateVideos=($overlay=="debug") |
    .actionOverlay=($overlay=="marketing") | .actionCue=(.actionCue or $profile=="demo") |
    .videoSize=(if $view=="mobile" then .mobileViewport else .desktopViewport end) |
    .slowMoMs=$slow | .stagePauseMs=$stage | .watchPauseMs=$pause | .source="dev/linux/user-regression.sh"
  ' e2e/user/run-config.defaults.json >tmp/playwright/run-config.json
  args=(test --config=playwright.user.config.ts)
  if [[ "$suite" == all ]]; then args+=(--project=setup --project=critical --project=full); else args+=("--project=$suite"); fi
  if ! $headless && { $headed || $watch; }; then args+=(--headed); fi
  if $debug; then args+=(--debug); fi
  if $dry; then printf '%q ' playwright "${args[@]}" "${extra[@]}"; printf '\n';
  else node_modules/.bin/playwright "${args[@]}" "${extra[@]}" || result=$?; fi
done
exit "$result"
