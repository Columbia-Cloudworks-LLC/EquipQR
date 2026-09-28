#!/usr/bin/env bash
# Install only. Start servers in the agent phase after setup secrets are removed.
set -euo pipefail
set +x
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
export EQUIPQR_BACKEND=hosted
export EQUIPQR_DEV_SUPABASE_URL=https://uzvtxxvgjzstndbyrwxg.supabase.co
# Public browser key, not a service-role credential.
export EQUIPQR_DEV_SUPABASE_ANON_KEY=sb_publishable_G6d2ctxU047S-FCjh0TFqA_Qd_vwWCB
umask 077
touch .env.local
sed -i '/^EQUIPQR_BACKEND=/d; /^EQUIPQR_DEV_SUPABASE_URL=/d; /^EQUIPQR_DEV_SUPABASE_ANON_KEY=/d' .env.local
cat >> .env.local <<EOF
EQUIPQR_BACKEND=$EQUIPQR_BACKEND
EQUIPQR_DEV_SUPABASE_URL=$EQUIPQR_DEV_SUPABASE_URL
EQUIPQR_DEV_SUPABASE_ANON_KEY=$EQUIPQR_DEV_SUPABASE_ANON_KEY
EOF
if [[ -f tmp/linux-stack/processes.json ]]; then bash dev/linux/dev.sh stop; fi
bash dev/linux/setup.sh
echo 'Agent phase: bash dev/linux/dev.sh start'
