#!/usr/bin/env bash
# Shared Bash helpers. Never enable xtrace when loading operational credentials.
set -euo pipefail
set +x
OPS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=dev/linux/env.sh
source "$OPS_ROOT/dev/linux/env.sh"
OP_VAULT=tgo2m6qbct5otqeqirjocn3joa
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-Columbia-Cloudworks-LLC/EquipQR}"
export PATH="$OPS_ROOT/node_modules/.bin:$PATH"
fail() { printf '%s\n' "$*" >&2; exit 1; }
need() { local tool; for tool; do command -v "$tool" >/dev/null || fail "Missing Linux tool: $tool"; done; }
private_workspace() {
  umask 077
  work="$(mktemp -d "${TMPDIR:-/tmp}/equipqr-ops.XXXXXXXX")"
  trap 'rm -rf -- "$work"' EXIT
}
op_item() { op item get "$1" --vault "${2:-$OP_VAULT}" --format json; }
op_field() {
  jq -er --arg key "$2" '[.fields[]? | select((.label|ascii_upcase)==($key|ascii_upcase)) | .value | select(.!=null and .!="")] | first // error("Required vault field missing: " + $key)' "$1"
}
op_fields() {
  jq '[.fields[]? | select(.label|test("^[A-Za-z][A-Za-z0-9_]*$")) | select(.value!=null and .value!="") | {key:(.label|ascii_upcase),value:.value}] | from_entries' "$1"
}
dotenv_json() {
  # Parse dotenv with Node's standard parser; never execute an env file as Bash.
  node --input-type=module - "$1" <<'JS'
import fs from 'node:fs';
import {parseEnv} from 'node:util';
const file=process.argv[2];
console.log(JSON.stringify(fs.existsSync(file)?parseEnv(fs.readFileSync(file,'utf8')):{}));
JS
}
json_dotenv() { jq -r 'to_entries | sort_by(.key)[] | "\(.key)=\(.value|tojson)"' "$1"; }
github_repo() { gh repo view --json nameWithOwner --jq .nameWithOwner; }
