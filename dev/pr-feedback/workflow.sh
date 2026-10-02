#!/usr/bin/env bash
# GraphQL variable names must remain literal.
# shellcheck disable=SC2016
# Read-only inspection by default. Publishing is a separate explicit subcommand.
# shellcheck source=dev/ops/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/../ops/common.sh"
action="${1:-help}"; (($#==0)) || shift
pr='' replies='' issues='' summary='' dry=false
while (($#)); do
  case "$1" in --pr) pr="${2:?}"; shift;; --replies-file) replies="${2:?}"; shift;;
    --issues-file) issues="${2:?}"; shift;; --summary-file) summary="${2:?}"; shift;;
    --dry-run) dry=true;; *) fail "Unknown argument: $1";; esac; shift
done
if [[ "$action" == help ]]; then
  echo 'Usage: workflow.sh context|checks|reviews|threads|verify|publish --pr NUMBER [--replies-file JSON] [--issues-file JSON] [--summary-file MARKDOWN] [--dry-run]'
  exit 0
fi
if [[ "$action" == verify ]]; then exec bash "$OPS_ROOT/dev/linux/verify.sh"; fi
[[ "$pr" =~ ^[1-9][0-9]*$ ]] || fail '--pr NUMBER is required.'
need gh jq
case "$action" in
  context) gh pr view "$pr" --repo "$GITHUB_REPOSITORY" --json number,title,url,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,body;;
  checks) gh pr checks "$pr" --repo "$GITHUB_REPOSITORY" --json name,state,bucket,link,workflow;;
  reviews) gh api --paginate "repos/$GITHUB_REPOSITORY/pulls/$pr/reviews" | jq -s 'add';;
  threads)
    private_workspace
    owner="${GITHUB_REPOSITORY%/*}"; repo="${GITHUB_REPOSITORY#*/}"
    query='query($owner:String!,$repo:String!,$pr:Int!,$endCursor:String){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviewThreads(first:100,after:$endCursor){pageInfo{hasNextPage endCursor}nodes{id isResolved isOutdated}}}}}'
    gh api graphql --paginate -f query="$query" -f owner="$owner" -f repo="$repo" -F pr="$pr" >"$work/pages.json"
    jq -se 'if any(.[];.errors) then error("Review thread query failed") else map(.data.repository.pullRequest.reviewThreads.nodes)|add end' "$work/pages.json" >"$work/threads.json"
    while IFS= read -r thread; do
      id="$(jq -r .id <<<"$thread")"
      query='query($id:ID!,$endCursor:String){node(id:$id){...on PullRequestReviewThread{comments(first:100,after:$endCursor){pageInfo{hasNextPage endCursor}nodes{databaseId body author{login} path line originalLine}}}}}'
      gh api graphql --paginate -f query="$query" -f id="$id" >"$work/comments.json"
      jq -s --argjson thread "$thread" 'if any(.[];.errors) then error("Thread comments query failed") else $thread+{comments:(map(.data.node.comments.nodes)|add)} end' "$work/comments.json" >>"$work/all.json"
    done < <(jq -c '.[]' "$work/threads.json")
    touch "$work/all.json"
    jq -s '{totalThreads:length,workingSet:map(select(.isResolved==false and .isOutdated==false)),outdatedOpenSet:map(select(.isResolved==false and .isOutdated==true))}' "$work/all.json";;
  publish)
    [[ -n "$replies$issues$summary" ]] || fail 'Specify at least one input file.'
    private_workspace
    if [[ -n "$replies" ]]; then jq -e 'type=="array" and all(.[];(.inReplyTo|type)=="number" and .inReplyTo>0 and (.body|type)=="string" and (.body|length)>0)' "$replies" >/dev/null; fi
    if [[ -n "$issues" ]]; then jq -e 'type=="array" and all(.[];(.title|length)>0 and ((.body // .bodyFile // "")|length)>0)' "$issues" >/dev/null; fi
    if [[ -n "$issues" ]]; then
      while IFS= read -r file; do [[ -f "$file" ]] || fail "Issue body file missing: $file"; done < <(jq -r '.[] | select(.body == null) | .bodyFile' "$issues")
    fi
    [[ -z "$summary" || -f "$summary" ]] || fail 'Summary file missing.'
    if $dry; then echo 'Publish inputs validated; no remote writes.'; exit 0; fi
    if [[ -n "$issues" ]]; then
      while IFS= read -r row; do
        if jq -e '.body!=null' <<<"$row" >/dev/null; then jq -r .body <<<"$row" >"$work/body.md";
        else cp -- "$(jq -r .bodyFile <<<"$row")" "$work/body.md"; fi
        gh issue create --repo "$GITHUB_REPOSITORY" --title "$(jq -r .title <<<"$row")" --body-file "$work/body.md"
      done < <(jq -c '.[]' "$issues")
    fi
    if [[ -n "$replies" ]]; then
      while IFS= read -r row; do
        jq '{body,in_reply_to:.inReplyTo}' <<<"$row" >"$work/reply.json"
        gh api "repos/$GITHUB_REPOSITORY/pulls/$pr/comments" -X POST --input "$work/reply.json" --jq .html_url
      done < <(jq -c '.[]' "$replies")
    fi
    if [[ -n "$summary" ]]; then gh pr comment "$pr" --repo "$GITHUB_REPOSITORY" --body-file "$summary"; fi;;
  *) fail "Unknown action: $action";;
esac
