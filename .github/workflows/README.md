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

`dev/sync-1password-dev-envs.ps1`, `dev/sync-vercel-from-1password.ps1`, and `dev/sync-supabase-secrets-from-1password.ps1` stay in the tree as rollback until `main` no longer needs them. Active workflows do not call them.

The repository secret `OP_SERVICE_ACCOUNT_TOKEN` must stay until this change is on `main`. Deleting it earlier breaks the current production workflows. Do not delete 1Password vault items.

`production-release-readiness.yml` is the only workflow that declares `environment: production`. A push to `main` applies migrations, promotes Vercel, and deploys Edge Functions. A manual run defaults to `dry-run`, which only checks that the production environment injects credentials and that Supabase and Vercel accept them.
