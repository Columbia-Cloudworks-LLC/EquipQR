# Linux script migration

All developer and administrative entrypoints run in Bash on Ubuntu 24.04.
The only Windows entrypoint is `dev/equipqr.bat`, a WSL launcher.
Use [Linux development](linux-development.md) for installation and lifecycle.
Use [Bash workflow commands](linux-workflows.md) for current arguments; legacy
PowerShell flags are not supported. Entries below identify retired filenames,
not runnable commands.

Windows file-lock repair, Docker Desktop reset, port reservation, and duplicate
process launchers are retired. Native Linux Docker and managed process identities
replace them. Qodo-specific parsers are retired with the discontinued Qodo workflow;
the general PR review/thread collector remains. Shared PowerShell helper modules
and their runtime tests are replaced by Bash helpers and offline contract tests.
Media startup seeds committed fixtures; custom uploads use `local-storage.sh`.
Google OAuth setup accepts explicit development credentials instead of copying
production OAuth secrets into a development vault.

| Previous file | Current Bash entrypoint or disposition |
| --- | --- |
| `.cursor/hooks/changelog-stop.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `.cursor/hooks/guard-migrations.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `.cursor/hooks/lint-on-edit.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `.cursor/hooks/run-tests.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `.cursor/hooks/strict-type-check.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `.cursor/hooks/sync-types.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/Invoke-EquipQrWsl.Tests.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/Invoke-EquipQrWsl.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/Invoke-LocalDevStorageUpload.ps1` | `dev/ops/local-storage.sh` |
| `dev/Invoke-SafeNpmCi.ps1` | `dev/linux/setup.sh` |
| `dev/Release-EquipQrNodeModuleLocks.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/bootstrap-local-google-auth.ps1` | `dev/ops/bootstrap-google-auth.sh` |
| `dev/bootstrap-worktree-env.ps1` | `dev/ops/worktree-env.sh` |
| `dev/db/New-SupabaseMigration.ps1` | `dev/linux/migration-new.sh` |
| `dev/dev-docs.ps1` | `dev/linux/dev.sh start` |
| `dev/dev-edge-functions.ps1` | `dev/linux/dev.sh start` |
| `dev/dev-setup-cursor-mcp.ps1` | `dev/ops/render-mcp.sh` |
| `dev/dev-start.ps1` | `dev/linux/dev.sh start` |
| `dev/dev-stop.ps1` | `dev/linux/dev.sh stop` |
| `dev/dev-vite.ps1` | `dev/linux/dev.sh start` |
| `dev/docs-media/Bootstrap-DocsMediaBucket.ps1` | `dev/docs-media/workflow.sh verify` |
| `dev/docs-media/Publish-DocsMedia.ps1` | `dev/docs-media/workflow.sh publish` |
| `dev/e2e/Load-GoogleBusinessEnv.ps1` | `dev/e2e/env.sh google-business` |
| `dev/e2e/Load-GoogleE2eEnv.ps1` | `dev/e2e/env.sh google-local` |
| `dev/e2e/Load-GoogleLocalAuthEnv.ps1` | `dev/e2e/env.sh google-local` |
| `dev/e2e/Load-QuickBooksDeveloperEnv.ps1` | `dev/e2e/env.sh quickbooks-developer` |
| `dev/e2e/Load-QuickBooksDeveloperStorageEnv.ps1` | `dev/e2e/env.sh quickbooks-developer-storage` |
| `dev/e2e/Load-QuickBooksLocalAuthEnv.ps1` | `dev/e2e/env.sh quickbooks-local` |
| `dev/export-schema-baseline.ps1` | `dev/export-schema-baseline.sh` |
| `dev/itil/Get-ItilIssueContext.ps1` | `dev/itil/workflow.sh context` |
| `dev/itil/ItIlCommon.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/itil/ItIlLogic.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/itil/New-ItilPreviewPr.ps1` | `dev/itil/workflow.sh create-pr` |
| `dev/itil/Publish-ItilArtifact.ps1` | `dev/itil/workflow.sh publish` |
| `dev/itil/Publish-ItilImplementationFollowup.ps1` | `dev/itil/workflow.sh followup` |
| `dev/itil/Start-ItilIssueBranch.ps1` | `dev/itil/workflow.sh start-branch` |
| `dev/itil/Update-ItilChangeRecordComment.ps1` | `dev/itil/workflow.sh update-change` |
| `dev/itil/tests/Run-ItilWorkflowTests.ps1` | `dev/tests/workflows.sh` |
| `dev/op-item-mutate.ps1` | `dev/ops/op-item.sh` |
| `dev/op-mcp-doctor.ps1` | `dev/ops/doctor.sh` |
| `dev/op-to-github.ps1` | `dev/ops/github-secrets.sh` |
| `dev/op/columbia-cloudworks-agents-vault.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/pr-evidence/Complete-PrEvidenceVisualReview.ps1` | `dev/linux/pr-evidence.sh review` |
| `dev/pr-evidence/Invoke-PrEvidence.ps1` | `dev/linux/pr-evidence.sh` |
| `dev/pr-evidence/Invoke-PrEvidenceCapture.ps1` | `dev/linux/pr-evidence.sh capture` |
| `dev/pr-evidence/PrEvidenceCommon.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/pr-evidence/Publish-PrEvidence.ps1` | `dev/linux/pr-evidence.sh upload` |
| `dev/pr-feedback/Get-PrChecks.ps1` | `dev/pr-feedback/workflow.sh checks` |
| `dev/pr-feedback/Get-PrContext.ps1` | `dev/pr-feedback/workflow.sh context` |
| `dev/pr-feedback/Get-PrFeedbackThreads.ps1` | `dev/pr-feedback/workflow.sh threads` |
| `dev/pr-feedback/Get-PrQodoFindings.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/pr-feedback/Get-PrQodoFixPr.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/pr-feedback/Get-PrReviewBodies.ps1` | `dev/pr-feedback/workflow.sh reviews` |
| `dev/pr-feedback/Invoke-PrVerification.ps1` | `dev/pr-feedback/workflow.sh verify` |
| `dev/pr-feedback/PrFeedbackCommon.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/pr-feedback/PrFeedbackLogic.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/pr-feedback/Publish-PrFeedbackResponses.ps1` | `dev/pr-feedback/workflow.sh publish` |
| `dev/pr-feedback/tests/Run-PrFeedbackSmoke.ps1` | `dev/tests/workflows.sh` |
| `dev/pr-feedback/tests/Run-PrFeedbackTests.ps1` | `dev/tests/workflows.sh` |
| `dev/qbo/Connect-QboBrowserSession.ps1` | `dev/e2e/env.sh qbo-browser` |
| `dev/qbo/Invoke-QboQuery.ps1` | `dev/qbo/query.sh` |
| `dev/qbo/QboLocalEnv.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/render-mcp-config.ps1` | `dev/ops/render-mcp.sh` |
| `dev/reserve-supabase-ports.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/reset-docker-desktop.ps1` | `Retired implementation detail or Windows-only repair; use the shared Linux setup.` |
| `dev/run-user-regression.ps1` | `dev/linux/user-regression.sh` |
| `dev/seed-dev-media.ps1` | `dev/linux/dev.sh start` |
| `dev/setup-billing-exemptions.ps1` | `dev/setup-billing-exemptions.sh` |
| `dev/stop-dev-and-e2e.ps1` | `dev/linux/dev.sh stop` |
| `dev/switch-runner-type.ps1` | `dev/ops/runner-type.sh` |
| `dev/sync-1password-app-env.ps1` | `dev/ops/local-env.sh --app-only` |
| `dev/sync-1password-dev-envs.ps1` | `dev/ops/local-env.sh` |
| `dev/sync-1password-edge-env.ps1` | `dev/ops/local-env.sh --edge-only` |
| `dev/sync-local-supabase-auth-env.ps1` | `dev/ops/bootstrap-google-auth.sh` |
| `dev/sync-local-supabase-env.ps1` | `dev/ops/local-env.sh` |
| `dev/sync-supabase-secrets-from-1password.ps1` | `dev/ops/supabase-secrets.sh` |
| `dev/sync-vercel-from-1password.ps1` | `dev/ops/vercel-env.sh` |
