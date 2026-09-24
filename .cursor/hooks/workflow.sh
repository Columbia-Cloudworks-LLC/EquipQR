#!/usr/bin/env bash
# Cursor adapters use the same Linux toolchain as terminal and cloud tasks.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=dev/linux/env.sh
source "$ROOT/dev/linux/env.sh"
cd "$ROOT"
action="${1:?Hook action required}"
payload="$(cat)"
if ! jq -e 'type == "object"' <<< "$payload" >/dev/null 2>&1; then
  if [[ "$action" == lint-on-edit ]]; then
    echo '{"continue":false,"agent_message":"Lint hook requires a JSON payload."}'; exit 1
  fi
  echo '{"continue":true}'; exit 0
fi
file="$(jq -r '.path // .file_path // empty' <<< "$payload")"
file="${file#"$ROOT/"}"
case "$action" in
  guard-migrations)
    if [[ "$file" == supabase/migrations/*.sql ]] && git ls-files --error-unmatch -- "$file" >/dev/null 2>&1; then
      echo '{"continue":true,"agent_message":"This migration is tracked. Do not edit applied migrations; create a new migration."}'
    else echo '{"continue":true}'; fi;;
  changelog-stop)
    if jq -e '.status == "completed" and (.loop_count // 0) < 2' <<< "$payload" >/dev/null &&
      ! git status --porcelain -- CHANGELOG.md | grep -q . &&
      git status --porcelain -- src supabase | grep -q .; then
      echo '{"followup_message":"Add a short CHANGELOG.md Unreleased bullet for user-visible changes, or state why no changelog is needed."}'
    else echo '{}'; fi;;
  lint-on-edit)
    [[ -f "$file" ]] || { echo '{"continue":true}'; exit 0; }
    exec node dev/lint-catalog.mjs --mode hook --path "$file";;
  strict-type-check)
    [[ "$file" == *.ts || "$file" == *.tsx ]] || exit 0
    [[ -f "$file" ]] || exit 0
    python3 - "$file" <<'PY'
import pathlib,re,sys
for number,line in enumerate(pathlib.Path(sys.argv[1]).read_text().splitlines(),1):
    if line.lstrip().startswith(('//','/*','*')):
        continue
    if re.search(r':\s*any\b',line):
        raise SystemExit(f'{sys.argv[1]}:{number}: explicit any is not allowed; use a specific type or unknown.')
PY
    npm run type-check >&2;;
  run-tests)
    [[ "$file" == src/*.ts || "$file" == src/*.tsx ]] || exit 0
    [[ "$file" == *.test.* || "$file" == *.spec.* ]] && exit 0
    npx --no-install vitest related --run --passWithNoTests "$file" >&2;;
  sync-types)
    [[ "$file" == supabase/migrations/*.sql ]] || exit 0
    bash dev/linux/dev.sh local-check >/dev/null
    tmp="$(mktemp)"; trap 'rm -f -- "$tmp"' EXIT
    npx --no-install supabase gen types typescript --local --workdir tmp/linux-stack/runtime > "$tmp"
    # Do not replace a valid type file with a CLI banner or an error response.
    python3 - "$tmp" src/integrations/supabase/types.ts <<'PY'
import pathlib, re, sys
raw = pathlib.Path(sys.argv[1]).read_text()
match = re.search(r'(?ms)^export type .*^} as const\s*$', raw)
if not match:
    raise SystemExit('Generated types lack expected anchors; existing types retained.')
destination = pathlib.Path(sys.argv[2])
temporary = destination.with_suffix('.ts.tmp')
temporary.write_text(match.group().rstrip() + '\n')
temporary.replace(destination)
PY
    ;;
  *) echo "Unknown hook: $action" >&2; exit 2;;
esac
