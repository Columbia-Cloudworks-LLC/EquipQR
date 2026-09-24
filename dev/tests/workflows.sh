#!/usr/bin/env bash
# Offline contract checks: no vendor credentials, network, or real publishing.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
mkdir "$tmp/bin"
export CALL_LOG="$tmp/calls"
cat > "$tmp/bin/gh" <<'SH'
#!/usr/bin/env bash
echo called >> "$CALL_LOG"
exit 99
SH
chmod +x "$tmp/bin/gh"
export PATH="$tmp/bin:$PATH"
expect_failure() { if "$@" > "$tmp/output" 2>&1; then printf 'Expected failure: %s\n' "$*" >&2; exit 1; fi; }
printf '# Change Record\n\n## Short Description\nLinux tooling.\n' > "$tmp/valid.md"
printf 'Not an artifact\n' > "$tmp/invalid.md"
bash dev/itil/workflow.sh validate --issue 12 --body-file "$tmp/valid.md"
expect_failure bash dev/itil/workflow.sh publish --issue 12 --body-file "$tmp/invalid.md"
expect_failure bash dev/itil/workflow.sh context --issue '12;touch /tmp/not-allowed'
expect_failure bash dev/itil/workflow.sh create-pr --issue 12 --branch preview --title test --body-file "$tmp/valid.md" --dry-run
expect_failure bash dev/itil/workflow.sh nonsense --issue 12 --dry-run
bash dev/itil/workflow.sh publish --issue 12 --body-file "$tmp/valid.md" --dry-run
expect_failure bash dev/ops/supabase-secrets.sh --op-item unapproved --apply
expect_failure bash dev/ops/github-secrets.sh --environment Production --apply
expect_failure bash dev/e2e/env.sh unknown true
[[ ! -e "$CALL_LOG" ]] || { echo 'Validation unexpectedly invoked GitHub.' >&2; exit 1; }
printf '{"path":"missing-file.ts"}' | bash .cursor/hooks/workflow.sh lint-on-edit | jq -e '.continue == true' >/dev/null
if printf invalid | bash .cursor/hooks/workflow.sh lint-on-edit > "$tmp/hook.json"; then exit 1; fi
jq -e '.continue == false' "$tmp/hook.json" >/dev/null
bash dev/e2e/env.sh google-local bash -c '[[ "$E2E_REAL_AUTH_BASE_URL" == http://localhost:8080 && -n "$E2E_REAL_AUTH_STORAGE_STATE" ]]'
# Reject extra Windows entrypoints and runtime dispatch, including untracked files.
python3 - <<'PY'
from pathlib import Path
import subprocess
paths = set(subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z']).decode().split('\0'))
for name in paths:
    p = Path(name)
    if not p.is_file(): continue
    if p.suffix.lower() in ('.ps1', '.psm1', '.psd1', '.cmd', '.bat') and name != 'dev/equipqr.bat':
        raise SystemExit(f'Unexpected Windows entrypoint: {name}')
    if p.suffix in ('.sh', '.mjs', '.yml', '.yaml') and name.startswith(('dev/', '.github/', '.cursor/hooks/')):
        text = p.read_text()
        if any(token in text for token in ('powershell' + '.exe', 'shell: ' + 'pwsh', 'invoke-' + 'powershell.mjs')):
            raise SystemExit(f'Unexpected Windows runtime: {name}')
print('Linux workflow contracts passed.')
PY
bash dev/tests/secret-sync.sh
