# Bash workflow commands

Run these commands from the repository in Linux after `source dev/linux/env.sh`.
All scripts use Bash, ordinary Linux commands, and the repository's Node tools.
There is no PowerShell dependency. See [setup](linux-development.md) and the
[migration map](linux-script-migration.md) for previous filenames.

## Administrative tools

Core app startup needs no vendor login. Optional administration requires the
Linux `op` and `gh` CLIs authenticated with the access tier described in
[agent secrets and access](agent-secrets-and-access.md). Supply service-account
credentials through the process environment; do not commit or print them.
Repository, Supabase, and Vercel mutations require appropriate vendor permissions.

```bash
bash dev/ops/doctor.sh
bash dev/ops/local-env.sh                  # app and Edge development configuration
bash dev/ops/local-env.sh --app-only
bash dev/ops/local-env.sh --edge-only
bash dev/ops/render-mcp.sh                 # optional Cursor configuration
bash dev/ops/worktree-env.sh               # copy missing ignored development env files
bash dev/ops/github-secrets.sh --check     # timestamp drift only
bash dev/ops/vercel-env.sh --check         # variable presence only
bash dev/ops/supabase-secrets.sh --op-item edge-env-prod-secrets --check
``\

The three secret synchronization commands are read-only by default. Use `--apply\
only for an authorized synchronization. Supabase compares SHA-256 digests and
validates the production project/item allowlist before writing. The committed fanout manifest is empty because GitHub Environments are now the
configuration source of truth. An explicitly supplied `--manifest FILE` supports
authorized legacy fanout without reviving it in CI. GitHub timestamp
checks and Vercel presence checks do not prove value equality.
`op-item.sh create|edit` accepts native `op item` arguments and requires the
write-tier token `OP_SAT_EquipQR`; `--dry-run` performs no mutation.
`runner-type.sh hosted|self-hosted` selects GitHub's hosted Linux runners or an
explicitly Linux-labelled self-hosted runner.

## ITIL and PR workflows

```bash
bash dev/itil/workflow.sh context --issue 123
bash dev/itil/workflow.sh validate --issue 123 --type ChangeRecord --body-file tmp/change.md
bash dev/itil/workflow.sh start-branch --issue 123 --branch codex/issue-123
bash dev/itil/workflow.sh create-pr --issue 123 --branch codex/issue-123 --title 'Fix issue' --body-file tmp/pr.md
bash dev/itil/workflow.sh publish --issue 123 --type ServiceRequest --body-file tmp/request.md --dry-run
bash dev/itil/workflow.sh update-change --issue 123 --comment-id 456 --body-file tmp/change.md
bash dev/itil/workflow.sh followup --issue 123 --pr 789 --change-record-url 'https://github.com/OWNER/REPO/issues/123#issuecomment-456' --verification-file tmp/verification.txt
bash dev/pr-feedback/workflow.sh context --pr 789
bash dev/pr-feedback/workflow.sh checks --pr 789
bash dev/pr-feedback/workflow.sh reviews --pr 789
bash dev/pr-feedback/workflow.sh threads --pr 789
bash dev/pr-feedback/workflow.sh verify
``\

Artifact publishing requires authorization. `--dry-run` validates without posting.
PR feedback publishing accepts `--replies-file`, `--issues-file`, and
`--summary-file`; review the complete files first. Replies contain `inReplyTo`
and `body`; deferred issues contain `title` and `body` or `bodyFile`.
Publishing does not merge a PR or resolve review threads automatically.

## Browser evidence and integrations

```bash
bash dev/linux/user-regression.sh --suite critical --headless
bash dev/linux/pr-evidence.sh capture --flow example
bash dev/linux/pr-evidence.sh review --flow example --notes 'Reviewed screenshots and video.'
bash dev/linux/pr-evidence.sh upload --flow example
bash dev/linux/pr-evidence.sh comment --flow example --pr 789
bash dev/docs-media/workflow.sh verify
bash dev/docs-media/workflow.sh publish tmp/pr-evidence/example/manifest.json example desktop
bash dev/ops/local-storage.sh equipment-images object.png /path/to/image.png
bash dev/e2e/env.sh google-local npx playwright test --config playwright.user.config.ts --project google-oauth-local
bash dev/e2e/env.sh quickbooks-local npx playwright test --config playwright.user.config.ts --project quickbooks-local
bash dev/e2e/env.sh quickbooks-developer-storage COMMAND
bash dev/e2e/env.sh quickbooks-developer COMMAND
bash dev/e2e/env.sh google-business COMMAND
bash dev/e2e/env.sh qbo-browser
bash dev/qbo/query.sh --status-only
bash dev/qbo/query.sh --query 'select Id, DisplayName from Customer maxresults 5'
``\

Integration profiles wrap a child command; they do not print credentials or modify
the parent shell. Override storage-state paths and IDs with the named E2E environment
variables documented in the integration guides. `QBO_TARGET_URL` selects the browser
destination. The query helper reads only the managed local database and defaults
to the Intuit sandbox. `QBO_API_BASE` can explicitly select the production Intuit API
for an authorized read using a locally connected production company.

For local Google OAuth, provide development `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID\
and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, then run
`bash dev/ops/bootstrap-google-auth.sh`. Restart the stack afterward.
The bootstrap never retrieves production OAuth credentials.

Evidence uploads require explicitly supplied destination credentials. Capture,
visual review, upload, and posting are separate commands. A manifest hash prevents
uploading or posting a newly captured artifact under an earlier visual approval.
The local fixture suites refuse hosted mode; cloud integration checks need the
hosted development account and data rather than local seed identities.
