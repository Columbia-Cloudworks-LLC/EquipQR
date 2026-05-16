# PR feedback automation (PowerShell)

Use these scripts from the repo root to replace long `gh` / `git` command chains in `.cursor/skills/address-pr-feedback/SKILL.md`.

| Script | Purpose |
| --- | --- |
| `Get-PrContext.ps1` | PR metadata, owner/repo slug, dirty-tree preflight |
| `Get-PrFeedbackThreads.ps1` | GraphQL review threads → `workingSet` / `outdatedOpenSet` |
| `Get-PrReviewBodies.ps1` | Top-level PR reviews (bodies / states) |
| `Invoke-PrVerification.ps1` | `npm run lint` → TypeScript → `npm test` → `npm run build` |
| `Publish-PrFeedbackResponses.ps1` | Deferred issues, inline replies, top-level PR comment |
| `Get-PrChecks.ps1` | `gh pr checks` |

Shared: `PrFeedbackCommon.ps1` (dot-sourced), `PrFeedbackLogic.ps1` (classification helpers).

## Examples

```powershell
# Current branch PR — JSON for agents
.\scripts\pr-feedback\Get-PrContext.ps1 -Json

# Thread sets for triage
.\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -Json | Set-Content .\tmp\threads.json -Encoding utf8

# Local gates (same order as address-pr-feedback / raise skills)
.\scripts\pr-feedback\Invoke-PrVerification.ps1

# Post responses (dry-run prints intent only)
.\scripts\pr-feedback\Publish-PrFeedbackResponses.ps1 -DryRun `
  -ThreadRepliesFile .\tmp\replies.json `
  -SummaryBodyFile .\tmp\pr-feedback-response.md

# CI spot-check
.\scripts\pr-feedback\Get-PrChecks.ps1
```

## JSON manifests for `Publish-PrFeedbackResponses.ps1`

**Thread replies** (`replies.json`):

```json
[
  { "inReplyTo": 1234567890, "body": "Fixed — added test for edge case." }
]
```

Use `databaseId` from GraphQL review thread comments as `inReplyTo`.

**Deferred issues** (`deferred.json`):

```json
[
  { "title": "Deferred from PR #123: foo", "bodyFile": "D:\\temp\\issue-body.md" },
  { "title": "Another item", "body": "## Context\n..." }
]
```

## Tests

From repo root:

```powershell
.\scripts\pr-feedback\tests\Run-PrFeedbackTests.ps1
.\scripts\pr-feedback\tests\Run-PrFeedbackSmoke.ps1
```
