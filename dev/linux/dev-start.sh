#!/usr/bin/env bash
# Start the EquipQR local stack on Linux: Supabase, Edge Functions, docs, and Vite.
# Database reset runs only with --force.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

API_PORT=54321
LOG_DIR="$ROOT/tmp/dev-logs"
FORCE=0
PREPARE_ONLY=0

usage() {
  cat <<'EOF'
Usage: bash dev/linux/dev-start.sh [--force] [--prepare-only]

  --force         Reset the local database (migrations and seeds) after Supabase is up.
                  This is destructive and never runs unless you pass this flag.
  --prepare-only  Install dependencies, start Supabase, sync local env, then exit
                  before Edge Functions, docs, and Vite.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --force|-Force) FORCE=1 ;;
    --prepare-only|-PrepareOnly) PREPARE_ONLY=1 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

mkdir -p "$LOG_DIR"

bash "$ROOT/dev/linux/bootstrap.sh"

http_ok() {
  local url="$1"
  local code
  code="$(curl --silent --output /dev/null --max-time 5 --write-out '%{http_code}' "$url" 2>/dev/null || true)"
  if [[ -z "$code" || "$code" == "000" ]]; then
    echo "000"
  else
    echo "$code"
  fi
}

port_listening() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{print $4}' | grep -Eq "(^|:)${port}$"
    return
  fi
  return 1
}

wait_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-45}"
  local i=0
  while [[ "$i" -lt "$attempts" ]]; do
    local code
    code="$(http_ok "$url")"
    if [[ "$code" =~ ^[234] ]]; then
      echo "$label is ready ($code)."
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "FAIL: $label did not become ready at $url." >&2
  return 1
}

start_background() {
  local name="$1"
  shift
  local pid_file="$LOG_DIR/${name}.pid"
  if [[ -f "$pid_file" ]]; then
    local old_pid
    old_pid="$(cat "$pid_file" || true)"
    if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
      echo "$name already running (pid $old_pid)."
      return 0
    fi
  fi
  echo "Starting $name..."
  nohup "$@" >"$LOG_DIR/${name}.log" 2>&1 &
  echo $! >"$pid_file"
}

echo "Starting local Supabase (logflare and vector excluded)."
if curl --silent --show-error --output /dev/null --max-time 3 "http://127.0.0.1:${API_PORT}/rest/v1/"; then
  echo "Supabase API is already responding."
else
  npx supabase start -x logflare -x vector
fi

if ! curl --silent --show-error --output /dev/null --max-time 10 "http://127.0.0.1:${API_PORT}/rest/v1/"; then
  echo "FAIL: Supabase API is not reachable on port ${API_PORT}." >&2
  exit 1
fi

if [[ "$FORCE" -eq 1 ]]; then
  echo "Resetting the local database because --force was passed."
  npx supabase db reset
  echo "Regenerating local TypeScript types."
  npx supabase gen types typescript --local >"$LOG_DIR/database.types.ts"
  mv "$LOG_DIR/database.types.ts" "$ROOT/src/integrations/supabase/types.ts"
else
  echo "Leaving the local database in place. Pass --force to reset migrations and seeds."
fi

node "$ROOT/dev/linux/sync-local-supabase-env.mjs"

if [[ "$PREPARE_ONLY" -eq 1 ]]; then
  echo "Prepare-only finished. Edge Functions, docs, and Vite were not started."
  exit 0
fi

if [[ ! -f "$ROOT/supabase/functions/.env" ]]; then
  echo "FAIL: supabase/functions/.env was not created." >&2
  exit 1
fi

start_background edge-functions npx supabase functions serve --env-file "$ROOT/supabase/functions/.env" --no-verify-jwt
sleep 2
kong_name="$(docker ps --filter 'name=supabase_kong_' --format '{{.Names}}')"
kong_name="${kong_name%%$'\n'*}"
if [[ -n "$kong_name" ]]; then
  docker restart "$kong_name" >/dev/null
  echo "Restarted $kong_name so function routes use the current edge runtime."
fi

if port_listening 5174 && [[ "$(http_ok http://127.0.0.1:5174/)" =~ ^[234] ]]; then
  echo "Docs already running."
else
  start_background docs npm run docs:dev
  wait_http "http://127.0.0.1:5174/" "Docs"
fi

if port_listening 8080 && [[ "$(http_ok http://127.0.0.1:8080/)" == "200" ]]; then
  echo "Vite already running."
else
  start_background vite npm run dev
  wait_http "http://127.0.0.1:8080/" "Vite"
fi

echo "EquipQR dev stack"
echo "  Supabase API   http://127.0.0.1:54321"
echo "  Supabase Studio http://127.0.0.1:54323"
echo "  Mailpit        http://127.0.0.1:54324"
echo "  Docs           http://127.0.0.1:5174"
echo "  Frontend       http://127.0.0.1:8080"
wait_http "http://127.0.0.1:${API_PORT}/rest/v1/" "Supabase API" 5
wait_http "http://127.0.0.1:54323/" "Supabase Studio" 15
echo "Local database is the Docker Supabase stack for this checkout. It is not the production project."
