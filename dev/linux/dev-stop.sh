#!/usr/bin/env bash
# Stop Vite, docs, Edge Functions serve, and the local Supabase Docker stack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
LOG_DIR="$ROOT/tmp/dev-logs"
FAILED=0

usage() {
  cat <<'EOF'
Usage: bash dev/linux/dev-stop.sh

Stops background dev processes started by dev/linux/dev-start.sh and runs supabase stop.
EOF
}

for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0 ;;
    --force|-Force)
      echo "Linux stop always stops the local Supabase containers. Docker Engine itself is left running."
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

stop_pid() {
  local name="$1"
  local pid_file="$LOG_DIR/${name}.pid"
  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi
  local pid
  pid="$(cat "$pid_file" || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || FAILED=1
    local i=0
    while [[ "$i" -lt 20 ]] && kill -0 "$pid" 2>/dev/null; do
      sleep 0.5
      i=$((i + 1))
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || FAILED=1
    fi
  fi
  rm -f "$pid_file"
}

stop_pid vite
stop_pid docs
stop_pid edge-functions

if command -v npx >/dev/null 2>&1 && [[ -d node_modules ]]; then
  npx supabase stop || FAILED=1
else
  echo "Supabase CLI is not installed yet; skipped supabase stop."
fi

if [[ "$FAILED" -ne 0 ]]; then
  echo "FAIL: one or more stop steps failed." >&2
  exit 1
fi
echo "EquipQR dev stack stopped."
