#!/usr/bin/env bash
# ITIL authoring and GitHub operations, invoked only for authorized publishing.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/../ops/common.sh"
action="${1:-help}"; (($#==0)) || shift
issue='' body='' type=ChangeRecord label='' branch='' title='' comment='' verification='' record='' pr=''
dry=false
while (($#)); do
  case "$1" in
    --issue) issue="${2:?}"; shift;; --body-file) body="${2:?}"; shift;;
    --type) type="${2:?}"; shift;; --label) label="${2:?}"; shift;;
    --branch) branch="${2:?}"; shift;; --title) title="${2:?}"; shift;;
    --comment-id) comment="${2:?}"; shift;; --verification-file) verification="${2:?}"; shift;;
    --change-record-url) record="${2:?}"; shift;; --pr) pr="${2:?}"; shift;;
    --dry-run) dry=true;; *) fail "Unknown argument: $1";;
  esac; shift
done
if [[ "$action" == help ]]; then
  echo 'Usage: workflow.sh context|validate|start-branch|create-pr|publish|update-change|followup --issue NUMBER [--body-file FILE] [--type ServiceRequest|ChangeRecord] [--branch NAME] [--title TEXT] [--dry-run]'
  exit 0
fi
case "$issue" in
  \#*) issue="${issue#\#}";;
  https://github.com/*/issues/*) issue="${issue##*/}";;
esac
[[ "$issue" =~ ^[1-9][0-9]*$ ]] || fail 'Supply one issue number, #number, or GitHub issue URL.'
case "$action" in
  validate|publish|update-change)
    [[ -f "$body" ]] || fail 'A body file is required.'
    case "$type" in
      ServiceRequest) grep -Eq '^##[[:space:]]+Service Request' "$body" || fail 'Missing Service Request header.';;
      ChangeRecord)
        if ! grep -Eq '^#[[:space:]]+Change Record' "$body" || ! grep -Eq '^##[[:space:]]+Short Description' "$body"; then
          fail 'Missing Change Record or Short Description header.'
        fi;;
      *) fail 'Unknown artifact type.';;
    esac
    [[ "$action" != validate ]] || { echo 'Artifact validated.'; exit 0; };;
esac
case "$action" in
  context|publish) :;;
  start-branch) [[ -n "$branch" ]] || fail '--branch required'; git check-ref-format --branch "$branch" >/dev/null;;
  create-pr) [[ -n "$title" && -f "$body" && -n "$branch" && "$branch" != main && "$branch" != preview ]] || fail 'Feature branch, title, and body required.';;
  update-change) [[ "$comment" =~ ^[1-9][0-9]*$ ]] || fail '--comment-id required';;
  followup) [[ -f "$verification" && -n "$record" && "$pr" =~ ^[1-9][0-9]*$ ]] || fail 'Verification file, Change Record URL and PR required.';;
  *) fail "Unknown action: $action";;
esac
if $dry; then echo "Validated $action for issue #$issue; no remote or Git changes."; exit 0; fi
need gh git jq
case "$action" in
  context)
    gh issue view "$issue" --repo "$GITHUB_REPOSITORY" --json number,title,url,state,labels,assignees,author,body,comments;;
  start-branch)
    [[ -n "$branch" ]] || fail 'An explicit --branch is required.'
    git check-ref-format --branch "$branch" >/dev/null
    [[ -z "$(git status --porcelain)" ]] || fail 'Commit or stash the working tree before switching branches.'
    git fetch origin preview
    if git show-ref --verify --quiet "refs/heads/$branch"; then git switch "$branch"; git rebase origin/preview;
    else git switch -c "$branch" origin/preview; fi;;
  create-pr)
    [[ -n "$title" && -f "$body" && -n "$branch" && "$(git branch --show-current)" == "$branch" ]] || fail 'Title, body file and current branch are required.'
    [[ "$branch" != main && "$branch" != preview ]] || fail 'Use a feature branch.'
    git push -u origin "$branch"
    gh pr create --repo "$GITHUB_REPOSITORY" --base preview --head "$branch" --title "$title" --body-file "$body";;
  publish)
    if [[ -n "$label" ]]; then
      gh label list --repo "$GITHUB_REPOSITORY" --limit 1000 --json name | jq -e --arg label "$label" 'any(.[];.name==$label)' >/dev/null || fail 'Requested label does not exist.'
    fi
    gh issue comment "$issue" --repo "$GITHUB_REPOSITORY" --body-file "$body"
    if [[ -n "$label" ]]; then
      gh issue edit "$issue" --repo "$GITHUB_REPOSITORY" --add-label "$label"
    fi;;
  update-change)
    [[ "$comment" =~ ^[1-9][0-9]*$ ]] || fail '--comment-id is required.'
    gh api "repos/$GITHUB_REPOSITORY/issues/comments/$comment" --jq .issue_url | grep -Eq "/issues/$issue$" || fail 'Comment belongs to another issue.'
    jq -n --rawfile body "$body" '{body:$body}' | gh api "repos/$GITHUB_REPOSITORY/issues/comments/$comment" -X PATCH --input - --jq .html_url;;
  followup)
    [[ -f "$verification" && -n "$record" && "$pr" =~ ^[1-9][0-9]*$ ]] || fail 'Supply --verification-file, --change-record-url and --pr.'
    private_workspace
    sha="$(git rev-parse HEAD)"; branch="$(git branch --show-current)"
    gh pr view "$pr" --repo "$GITHUB_REPOSITORY" --json url,title,state,baseRefName >"$work/pr.json"
    jq -e '.baseRefName == "preview"' "$work/pr.json" >/dev/null || fail 'Expected a PR targeting preview.'
    {
      # shellcheck disable=SC2016
      printf '### Implemented — Issue #%s\n\nImplemented in commit [`%s`](https://github.com/%s/commit/%s) on branch `%s`.\n\nChange Record: %s\n\n' "$issue" "${sha:0:7}" "$GITHUB_REPOSITORY" "$sha" "$branch" "$record"
      jq -r '"PR: ["+.title+"]("+.url+")\n"' "$work/pr.json"
      printf '**Issue status:** %s\n\n```bash\n' "$(jq -r 'if .state=="MERGED" then "Merged into `preview`." else "Fixed when this PR merges into `preview`." end' "$work/pr.json")"
      cat "$verification"; printf '\n```\n\n**Deviations:** None.\n'
    } >"$work/body.md"
    gh issue comment "$issue" --repo "$GITHUB_REPOSITORY" --body-file "$work/body.md";;
  *) fail "Unknown action: $action";;
esac
