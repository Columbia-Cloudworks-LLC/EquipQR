# EquipQR

EquipQR is a multi-tenant fleet maintenance app for equipment QR codes, work orders, preventative maintenance, inventory, and field teams. The stack is React, TypeScript, Vite, Supabase, and TanStack Query. Operators use [equipqr.app](https://equipqr.app); the Help Center is [equipqr.info](https://equipqr.info). Agents work on Windows with PowerShell; the local stack is `.\dev\dev-start.bat`. This file is an index only — open the one official document that matches the task.

## References

| Topic | Document |
| --- | --- |
| Secrets, vaults, access tiers | [docs/ops/agent-secrets-and-access.md](docs/ops/agent-secrets-and-access.md) |
| Git, deploy, preview → main | [docs/ops/git-and-deploy.md](docs/ops/git-and-deploy.md), [.cursor/rules/branching.mdc](.cursor/rules/branching.mdc) |
| Changelog | [.cursor/rules/changelog.mdc](.cursor/rules/changelog.mdc) |
| Local stack | [.cursor/rules/dev-stack-lifecycle.mdc](.cursor/rules/dev-stack-lifecycle.mdc), [docs/ops/local-supabase-development.md](docs/ops/local-supabase-development.md) |
| Cloud Agents | [docs/ops/cloud-agent-ephemeral-stack.md](docs/ops/cloud-agent-ephemeral-stack.md) |
| Migrations | [docs/ops/migrations.md](docs/ops/migrations.md), [docs/ops/migration-rules-quick-reference.md](docs/ops/migration-rules-quick-reference.md) |
| Google Workspace | [docs/ops/google-workspace.md](docs/ops/google-workspace.md) |
| QuickBooks | [docs/ops/quickbooks-oauth.md](docs/ops/quickbooks-oauth.md) |
| Playwright real auth | [docs/ops/playwright-real-auth-integrations.md](docs/ops/playwright-real-auth-integrations.md) |
| GCP / Workspace admin | [docs/ops/cloud-admin-access.md](docs/ops/cloud-admin-access.md) |
| Docs site, PWA, media | [docs/ops/deployment.md](docs/ops/deployment.md) |
| Edge Functions | [docs/edge-functions/auth-patterns.md](docs/edge-functions/auth-patterns.md) |
| Invitation / signup email | [docs/ops/auth-signup-email-workflow.md](docs/ops/auth-signup-email-workflow.md) |
| Product conventions | [docs/technical/product-conventions.md](docs/technical/product-conventions.md) |
| Permissions / inventory RBAC | [docs/guides/permissions.md](docs/guides/permissions.md) |
| Setup, npm install | [docs/technical/setup.md](docs/technical/setup.md) |
| Lint / coding standards | [docs/technical/standards.md](docs/technical/standards.md) |
| Testing, PII in captures | [docs/technical/testing-guidelines.md](docs/technical/testing-guidelines.md) |
| Async CSV exports | [docs/technical/async-export-jobs.md](docs/technical/async-export-jobs.md) |
| Local E2E before push | [.cursor/rules/local-verify-before-preview-push.mdc](.cursor/rules/local-verify-before-preview-push.mdc) |
| PR open → merge | [.cursor/rules/pr-merge-ready-workflow.mdc](.cursor/rules/pr-merge-ready-workflow.mdc) |
| PR visual evidence | [.cursor/rules/pr-visual-evidence.mdc](.cursor/rules/pr-visual-evidence.mdc) |
| PR CI gate | [.cursor/rules/pr-ci-gate-before-open.mdc](.cursor/rules/pr-ci-gate-before-open.mdc) |
| Fallow before commit | [.cursor/rules/fallow-before-commit.mdc](.cursor/rules/fallow-before-commit.mdc) |
| Git / PowerShell | [.cursor/rules/git-powershell.mdc](.cursor/rules/git-powershell.mdc) |
| Workflow artifacts | [.cursor/rules/workflow-artifacts.mdc](.cursor/rules/workflow-artifacts.mdc) |
| Browser (Cursor only) | [.cursor/rules/cursor-browser-only.mdc](.cursor/rules/cursor-browser-only.mdc) |
| Handbook maintenance | [docs/README.md](docs/README.md) (Agent handbook) |
| Implement an issue | [.cursor/skills/itil-issue-resolver/SKILL.md](.cursor/skills/itil-issue-resolver/SKILL.md) |
| PR feedback | [.cursor/skills/address-pr-feedback/SKILL.md](.cursor/skills/address-pr-feedback/SKILL.md) |
