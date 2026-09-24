#!/usr/bin/env bash
# Development OAuth credentials must be supplied explicitly; never copy production secrets.
set -euo pipefail
set +x
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
[[ -n "${SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID:-}" && -n "${SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET:-}" ]] || fail 'Supply the development Google OAuth client ID and secret in the process environment.'
cd "$OPS_ROOT"
umask 077
node --input-type=module <<'JS'
import fs from 'node:fs';
const file='.env.local';
const names=['SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID','SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET'];
const previous=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
const lines=previous.split(/\r?\n/).filter(line=>!names.some(name=>new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(line)));
fs.writeFileSync(file,[...lines,...names.map(name=>`${name}=${JSON.stringify(process.env[name])}`)].join('\n')+'\n',{mode:0o600});
JS
echo 'Development Google OAuth configuration saved. Restart the local stack to apply it.'
