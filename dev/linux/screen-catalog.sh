#!/usr/bin/env bash
# Capture the mobile screen catalog against the local dev stack and build the gallery.
#
#   bash dev/linux/screen-catalog.sh [--device "Pixel 7"] [--flow id[,id]] [--persona owner|technician|anonymous]
#                                    [--no-reset] [--workers N] [--scale N] [--clock ISO|real] [--live-maps]
#                                    [--headed] [--serve]
#
# By default the local database is reset first so every run starts from the same seed data.
set -euo pipefail
cd "$(dirname "$0")/../.."

device="${SCREEN_CATALOG_DEVICE:-Pixel 7}" flows="" personas="" reset=true workers="${SCREEN_CATALOG_WORKERS:-2}"
scale="${SCREEN_CATALOG_SCALE:-2}" clock="${SCREEN_CATALOG_CLOCK:-}" headed=false serve=false
usage() { sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; }
while (($#)); do
  case "$1" in
    --device) device="$2"; shift;;
    --flow) flows="$2"; shift;;
    --persona) personas="$2"; shift;;
    --no-reset) reset=false;;
    --workers) workers="$2"; shift;;
    --scale) scale="$2"; shift;;
    --clock) clock="$2"; shift;;
    --live-maps) export SCREEN_CATALOG_LIVE_MAPS=1;;
    --headed) headed=true;;
    --serve) serve=true;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2;;
  esac
  shift
done
[[ "$workers" =~ ^[1-9][0-9]*$ ]] || { echo '--workers must be a positive integer.' >&2; exit 2; }

slug="$(printf '%s' "$device" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g;s/^-|-$//g')"
out="tmp/screen-catalog/$slug"
export SCREEN_CATALOG_DEVICE="$device" SCREEN_CATALOG_WORKERS="$workers" SCREEN_CATALOG_SCALE="$scale"
export SCREEN_CATALOG_OUT="$out" SCREEN_CATALOG_FLOWS="$flows" SCREEN_CATALOG_PERSONAS="$personas"
[[ -z "$clock" ]] || export SCREEN_CATALOG_CLOCK="$clock"
# Rows written by the reset carry this run's wall-clock time; the capture masks them.
SCREEN_CATALOG_RUN_STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export SCREEN_CATALOG_RUN_STARTED

mkdir -p tmp/playwright/auth tmp/screen-catalog
exec 8>tmp/playwright/regression.lock
flock -n -E 75 8 || { echo 'Another Playwright run holds tmp/playwright/regression.lock.' >&2; exit 75; }

# dev.sh refuses reset outside the disposable local stack.
if $reset; then bash dev/linux/dev.sh reset; else bash dev/linux/dev.sh start; fi
bash dev/linux/dev.sh local-check

# A full run replaces the previous catalog for this device; filtered runs update in place.
if [[ -z "$flows$personas" ]]; then rm -rf "$out"; fi

args=(test --config=playwright.screen-catalog.config.ts)
if $headed; then args+=(--headed); fi
result=0
node_modules/.bin/playwright "${args[@]}" || result=$?

node_modules/.bin/tsx dev/screen-catalog/build-gallery.ts "$out" || result=$?
if ((result != 0)); then
  echo "Some screens failed to capture; they are marked in the gallery with the error and a screenshot of the failure state." >&2
fi
if $serve; then exec node dev/screen-catalog/serve.mjs "$out"; fi
echo "Open: file://$(pwd)/$out/index.html   (or: npm run screens:serve)"
exit "$result"
