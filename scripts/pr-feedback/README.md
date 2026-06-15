# PR feedback automation (PowerShell)

Use these scripts from the repo root to replace long `gh` / `git` command chains in `.cursor/skills/address-pr-feedback/SKILL.md`.

| Script | Purpose |
| --- | --- |
| `Get-PrContext.ps1` | PR metadata, owner/repo slug, dirty-tree preflight |
| `Get-PrChecks.ps1` | `gh pr checks` — `-Json` for pass/fail/pending summary; `-Watch` to block until checks finish |
| `Get-PrFeedbackThreads.ps1` | GraphQL review threads → `workingSet` / `outdatedOpenSet` |
| `Get-PrReviewBodies.ps1` | Top-level PR reviews (bodies / states) |
| `Get-PrQodoFindings.ps1` | Qodo persistent **Code Review** parent comment — open vs struck-through findings |
| `Invoke-PrVerification.ps1` | Full local gate: `npm run lint` → TypeScript → `npm test` → `npm run build` (use sparingly on large suites; targeted PR feedback prefers lint + `tsc` + scoped `npm test -- <path>` — see `.cursor/skills/address-pr-feedback/SKILL.md` Step 5) |
| `Publish-PrFeedbackResponses.ps1` | Deferred issues, inline replies, top-level PR comment |

Shared: `PrFeedbackCommon.ps1` (dot-sourced), `PrFeedbackLogic.ps1` (classification helpers).

## Examples

```powershell
# Current branch PR — JSON for agents
.\scripts\pr-feedback\Get-PrContext.ps1 -Json

# Thread sets for triage
.\scripts\pr-feedback\Get-PrFeedbackThreads.ps1 -Json | Set-Content .\tmp\threads.json -Encoding utf8

# CI gate — wait if pending, fix if failed before comment triage
.\scripts\pr-feedback\Get-PrChecks.ps1 -Json
.\scripts\pr-feedback\Get-PrChecks.ps1 -Watch

# Qodo open findings (unstriked items in parent comment)
.\scripts\pr-feedback\Get-PrQodoFindings.ps1 -Json | Set-Content .\tmp\qodo.json -Encoding utf8

# Local gates (same order as address-pr-feedback / raise skills)
.\scripts\pr-feedback\Invoke-PrVerification.ps1

# Post responses (dry-run prints intent only)
.\scripts\pr-feedback\Publish-PrFeedbackResponses.ps1 -DryRun `
  -ThreadRepliesFile .\tmp\replies.json `
  -SummaryBodyFile .\tmp\pr-feedback-response.md

# CI watch after push (handoff gate)
.\scripts\pr-feedback\Get-PrChecks.ps1 -Watch
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
