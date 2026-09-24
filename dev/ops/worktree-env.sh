#!/usr/bin/env bash
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
common="$(git rev-parse --path-format=absolute --git-common-dir)"
canonical="$(dirname "$common")"
[[ "$root" != "$canonical" ]] || { echo 'Already in the canonical checkout.'; exit 0; }
for name in .env .env.local supabase/functions/.env; do
  if [[ -f "$canonical/$name" && ! -e "$root/$name" ]]; then
    mkdir -p "$(dirname "$root/$name")"
    install -m 600 "$canonical/$name" "$root/$name"
    printf 'Copied %s\n' "$name"
  fi
done
echo 'Only one checkout can own the local stack ports at a time.'
