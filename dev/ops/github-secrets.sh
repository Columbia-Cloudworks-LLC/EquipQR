#!/usr/bin/env bash
# Timestamp-based drift detection retains the existing manifest contract.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
apply=false environment=Preview
manifest="$OPS_ROOT/.github/secrets-map.yml"
while (($#)); do
  case "$1" in --apply) apply=true;; --dry-run|--check|--only-drifted) :;; --environment) environment="${2:?}"; shift;;
    --manifest) manifest="${2:?}"; shift;;
    --help) echo 'Usage: github-secrets.sh [--manifest YAML] [--environment Preview] [--apply]'; exit 0;;
    *) fail "Unknown argument: $1";; esac; shift
done
[[ "$environment" == Preview ]] || fail 'Only the manifest Preview environment is supported.'
need op gh jq node
private_workspace
node "$OPS_ROOT/dev/ops/read-yaml.mjs" "$manifest" >"$work/manifest.json"
if jq -e '.environments == {}' "$work/manifest.json" >/dev/null; then
  if $apply; then fail 'No fanout configured: GitHub Environments are the source of truth.'; fi
  echo 'No fanout configured: GitHub Environments are the source of truth.'; exit 0
fi
jq -e --arg env "$environment" '.environments[$env].secrets | type == "array" and length > 0' "$work/manifest.json" >/dev/null || fail 'Invalid or empty manifest.'
gh secret list --repo "$GITHUB_REPOSITORY" --env "$environment" --json name,updatedAt >"$work/remote.json"
while IFS= read -r row; do
  name="$(jq -er .name <<<"$row")"; reference="$(jq -er .op_ref <<<"$row")"
  [[ "$reference" =~ ^op://[^/]+/([^/]+)/[^/]+$ ]] || fail "Invalid manifest reference for $name"
  item="${BASH_REMATCH[1]}"
  op_item "$item" >"$work/item.json"
  updated="$(jq -er .updated_at "$work/item.json")"
  remote="$(jq -r --arg name "$name" '[.[]|select(.name==$name)|.updatedAt][0] // "1970-01-01T00:00:00Z"' "$work/remote.json")"
  if (( $(date -d "$updated" +%s) <= $(date -d "$remote" +%s) )); then echo "$environment/$name: unchanged"; continue; fi
  if $apply; then
    op read "$reference" >"$work/value"
    [[ -s "$work/value" ]] || fail "Empty value: $name"
    gh secret set "$name" --repo "$GITHUB_REPOSITORY" --env "$environment" <"$work/value"
  else echo "$environment/$name: would update"; fi
done < <(jq -ce --arg env "$environment" '.environments[$env].secrets[]' "$work/manifest.json")
