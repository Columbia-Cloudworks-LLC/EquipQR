#!/usr/bin/env bash
# Exercise secret validation and digest parity against fake CLIs, never real services.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$tmp/repo/dev/ops" "$tmp/repo/dev/linux" "$tmp/bin"
cp "$ROOT/dev/ops/"{common,supabase-secrets}.sh "$tmp/repo/dev/ops/"
cp "$ROOT/dev/linux/env.sh" "$tmp/repo/dev/linux/"
cp "$ROOT/.node-version" "$tmp/repo/.node-version"
export FIXTURE_DIR="$tmp" PATH="$tmp/bin:$PATH"
python3 - "$tmp" <<'PY'
import base64,hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1])
names='RESEND_API_KEY HCAPTCHA_SECRET_KEY TOKEN_ENCRYPTION_KEY KDF_SALT INTUIT_CLIENT_ID INTUIT_CLIENT_SECRET GOOGLE_WORKSPACE_CLIENT_ID GOOGLE_WORKSPACE_CLIENT_SECRET GOOGLE_MAPS_SERVER_KEY GOOGLE_MAPS_BROWSER_KEY GOOGLE_MAPS_MAP_ID VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT PUBLIC_SITE_URL'.split()
values={name:base64.b64encode(hashlib.sha256(('fixture-'+name).encode()).digest()).decode() for name in names}
fields=[{'label':key,'value':value} for key,value in values.items()]
fields.append({'label':'ProjectRef','value':'ymxkzronkhwxzcdcbnwq'})
(root/'item.json').write_text(json.dumps({'fields':fields}))
(root/'remote.json').write_text(json.dumps([{'name':key,'digest':hashlib.sha256(value.encode()).hexdigest()} for key,value in values.items()]))
PY
cat > "$tmp/bin/op" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in item) cat "$FIXTURE_DIR/item.json";; read) echo fixture-token;; *) exit 90;; esac
SH
cat > "$tmp/bin/supabase" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$1 $2" >> "$FIXTURE_DIR/calls"
case "$2" in
  list) cat "$FIXTURE_DIR/remote.json";;
  set)
    file="${@: -1}"
    [[ -f "$file" && "$(stat -c '%a' "$file")" == 600 ]]
    printf '%s\n' "$file" > "$FIXTURE_DIR/env-path";;
  *) exit 91;;
esac
SH
chmod +x "$tmp/bin/"*
script="$tmp/repo/dev/ops/supabase-secrets.sh"
bash "$script" --op-item edge-env-prod-secrets --check > "$tmp/output"
[[ "$(grep -c MATCH "$tmp/output")" == 15 ]]
if grep -q 'secrets set' "$tmp/calls"; then echo 'Read-only check wrote secrets' >&2; exit 1; fi
jq '.[0].digest="mismatch"' "$tmp/remote.json" > "$tmp/changed"
mv "$tmp/changed" "$tmp/remote.json"
if bash "$script" --op-item edge-env-prod-secrets --check > "$tmp/output"; then echo 'Digest drift was accepted' >&2; exit 1; fi
grep -q DRIFT "$tmp/output"
bash "$script" --op-item edge-env-prod-secrets --apply > "$tmp/output"
grep -q 'secrets set' "$tmp/calls"
[[ ! -e "$(cat "$tmp/env-path")" ]] || { echo 'Secret temp file was retained' >&2; exit 1; }
rm "$tmp/calls"
jq '(.fields[] | select(.label=="ProjectRef").value)="another-project"' "$tmp/item.json" > "$tmp/changed"
mv "$tmp/changed" "$tmp/item.json"
if bash "$script" --op-item edge-env-prod-secrets --apply > "$tmp/output" 2>&1; then exit 1; fi
[[ ! -e "$tmp/calls" ]] || { echo 'Allowlist failed before remote access' >&2; exit 1; }
echo 'Secret sync contracts passed with mock services.'
