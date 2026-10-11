# EquipQR GitHub Actions workflows

GitHub is the source of truth for automation and deployment configuration. Workflows read `secrets.*` and `vars.*`. They do not load 1Password at runtime.

## Environments

| Environment | Branch policy | What belongs there |
| --- | --- | --- |
| `preview` | `preview` | Preview Edge and integration secrets |
| `production` | `main` | Production Edge secrets, production database password, production Supabase and Vercel tokens |

`production-release-readiness.yml` is the job that declares `environment: production`. It runs on pushes to `main`. Pull-request jobs do not receive that environment.

`SUPABASE_ACCESS_TOKEN` also remains a repository secret so schema drift checks on same-repo pull requests can read production migration history without receiving the production database password. Fork pull requests do not receive repository secrets.

`secrets-fanout.yml` and `secrets-drift-check.yml` declare `environment: preview` and fail if a preview secret or variable is empty. They do not print values. `GITHUB_TOKEN` cannot list environment secret names. `dev/ci/check-github-environment-names.mjs` is the admin-token name inventory used outside Actions.

## Intentional 1Password exceptions

Human logins (`quickbooks-developer`, `google-login`, `Oracle`) and personal MCP credentials (`gcp-read`, `gcp-editor`, `datadog-prod`, `figma`, `context7`, `todiagram`) are not copied into GitHub. GitHub Actions uses `GITHUB_TOKEN` instead of the `github-write` or `github-read` personal access tokens.

`bash dev/ops/local-env.sh`, `bash dev/ops/vercel-env.sh`, and `bash dev/ops/supabase-secrets.sh` stay in the tree as rollback until `main` no longer needs them. Active workflows do not call them.

The repository secret `OP_SERVICE_ACCOUNT_TOKEN` must stay until this change is on `main`. Deleting it earlier breaks the current production workflows. Do not delete 1Password vault items.

`production-release-readiness.yml` is the only workflow that declares `environment: production`. A push to `main` applies migrations, promotes Vercel, and deploys Edge Functions. A manual run defaults to `dry-run`, which only checks that the production environment injects credentials and that Supabase and Vercel accept them.

## Issue automation

`issue-triage.yml` and `issue-comment-handler.yml` keep the issue backlog labeled for daily review. Both load `.github/scripts/issue-automation.js` through `actions/github-script`, need only `issues: write` (plus `contents: read` for a sparse checkout of `.github/scripts`), and share a per-issue concurrency group so they never race on labels. GitHub runs `issues` and `issue_comment` workflows from the default branch, so changes take effect after they reach `main`.

Every write is idempotent. Labels are created on first use, adding a label that is present or removing one that is missing never fails the run, and the needs-info checklist comment is updated in place instead of reposted.

Run the tests with `node --test .github/scripts/issue-automation.test.js`.

### Label scheme

| Label | Applied when |
| --- | --- |
| `area:database` | Supabase, migrations, RLS, schemas, Postgres, edge or database functions, RPCs, `supabase/migrations` or `supabase/functions` paths |
| `area:work-orders` | Work orders, PM checklists or templates, preventive maintenance |
| `area:fleet-map` | Fleet map, map view, Google Maps, geolocation, GPS |
| `area:equipment` | Equipment, QR codes, asset tags, forklifts |
| `area:billing` | Stripe, invoices, subscriptions, billing |
| `area:ci` | Vitest, Playwright, GitHub Actions, `.github/workflows`, CI, E2E, migration validator, flaky tests |
| `status:needs-info` | A bug report is missing reproduction steps or logs |
| `status:needs-triage` | A bug report is complete, or the reporter answered a needs-info request |
| `status:needs-investigation` | A maintainer ran `/investigate` |
| `status:ready-for-dev` | A maintainer ran `/ready` or `/unblock` |
| `status:blocked` | A maintainer ran `/block` |
| `status:in-progress` | Set by maintainers. Removed from newly opened issues |

Area labels come from keywords and file paths in the title and body. Empty issue-form fields (`_No response_`) are ignored. Area labels are only ever added, so a maintainer's correction is never undone.

### Triage rules (`issues: opened, edited`)

- An issue is a bug report if it has the `bug` label, a `[Bug]` or `bug:` title prefix, or a "Steps to reproduce" form field.
- On open, a bug report missing reproduction steps (a filled form field or a numbered list) or logs (a filled log/error/screenshot field, code block, screenshot, or error text) gets `status:needs-info` and a checklist comment naming what is missing. A complete bug report gets `status:needs-triage`.
- On open, `status:in-progress` and `status:blocked` are removed.
- On edit, only issues in `status:needs-info` change status. When the missing details are added, the issue moves to `status:needs-triage`.
- Closed issues are skipped.

### Comment rules (`issue_comment: created`)

Pull request comments and bot comments are ignored. When the issue author comments on an issue in `status:needs-info`, it moves to `status:needs-triage`.

Slash commands must be on the first line of the comment. Only users with `write`, `maintain`, or `admin` permission can run them. The bot reacts 👍 when a command is applied and 😕 when the commenter is not authorized.

| Command | Effect |
| --- | --- |
| `/ready` | Removes `status:needs-triage`, `status:needs-info`, and `status:needs-investigation`. Adds `status:ready-for-dev`. |
| `/block <reason>` | Adds `status:blocked`, removes `status:ready-for-dev`, and posts a blocker record with the reason, who raised it, when, and the next action. |
| `/unblock` | Removes `status:blocked`. Adds `status:ready-for-dev`. |
| `/investigate` | Adds `status:needs-investigation`. |
