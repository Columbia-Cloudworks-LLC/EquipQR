#!/usr/bin/env bash
# Remove pr-<n>/ folders for PRs closed more than PR_EVIDENCE_RETENTION_DAYS ago from the
# evidence branch, then collapse its history to one commit so removed media stops costing
# repo space. Open PRs keep their folders. DRY_RUN=true prints the plan without pushing.
set -euo pipefail
branch="${PR_EVIDENCE_BRANCH:-pr-evidence}"
days="${PR_EVIDENCE_RETENTION_DAYS:-14}"
dry_run="${DRY_RUN:-false}"
[[ "$days" =~ ^[0-9]+$ ]] || { echo 'PR_EVIDENCE_RETENTION_DAYS must be a whole number.' >&2; exit 2; }
repo="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
if ! git ls-remote --exit-code --heads origin "$branch" >/dev/null; then
  echo "No $branch branch; nothing to prune."
  exit 0
fi
git fetch -q origin "+refs/heads/$branch:refs/remotes/origin/$branch"
tip="$(git rev-parse "refs/remotes/origin/$branch")"
cutoff="$(date -u -d "-$days days" +%s)"
index="$(mktemp)"; rm -f -- "$index"
export GIT_INDEX_FILE="$index"
trap 'rm -f -- "$index"' EXIT
git read-tree "$tip"
removed=0
while IFS= read -r dir; do
  [[ "$dir" =~ ^pr-([1-9][0-9]*)$ ]] || continue
  number="${BASH_REMATCH[1]}"
  if ! closed="$(gh api "repos/$repo/pulls/$number" --jq '.closed_at // empty')"; then
    echo "Skipping $dir: could not read PR #$number." >&2
    continue
  fi
  [[ -n "$closed" ]] || continue
  (($(date -u -d "$closed" +%s) < cutoff)) || continue
  echo "Removing $dir (PR #$number closed $closed)"
  git ls-files -z -- "$dir/" | xargs -0 -r git update-index --force-remove --
  removed=$((removed + 1))
done < <(git ls-tree -d --name-only "$tip")
tree="$(git write-tree)"
commits="$(git rev-list --count "$tip")"
if ((removed == 0 && commits == 1)); then
  echo 'Nothing to remove and history is already a single commit.'
  exit 0
fi
squashed="$(git commit-tree "$tree" -m "evidence: prune closed PRs (retention ${days}d)")"
echo "Removed $removed folder(s); collapsing $commits commit(s) into $squashed."
if [[ "$dry_run" == true ]]; then
  echo 'DRY_RUN=true: not pushing.'
  exit 0
fi
# The lease fails the push if a publish landed after the fetch; the next run retries.
git push --force-with-lease="refs/heads/$branch:$tip" origin "$squashed:refs/heads/$branch"
