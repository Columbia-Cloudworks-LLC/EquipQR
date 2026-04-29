---
name: google-cloud-debug
description: Retrieve and validate Google Cloud project configuration for debugging using gcloud with evidence-first outputs. Use when the user mentions Google Cloud, GCP projects, API keys, enabled APIs, IAM, billing, quotas, or asks to debug cloud configuration.
---

# Google Cloud Debug

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Purpose

Collect trustworthy Google Cloud project context for debugging without exposing secrets.

This skill is designed for project and key troubleshooting where the agent must verify real state in Google Cloud before proposing fixes.

## Tool preference (updated)

Prefer the **`gcloud` MCP server** (entry name: `gcloud` in `~/.cursor/mcp.json`) over raw `gcloud` CLI calls. The MCP server is auto-authenticated via the `agent-viewer@equipqr-prod` service account JSON rendered by `scripts/render-mcp-config.ps1` from `op://EquipQR Agents/gcp-viewer/credential`. No interactive `gcloud auth login` is required.

If the MCP server is unavailable (rare; check with `scripts/op-mcp-doctor.ps1`), fall back to direct `gcloud` CLI commands as documented below.

## Invocation

- `/google-cloud-debug`
- `/google-cloud-debug <optional-project-id>`

## Output Style

Use evidence-first reporting:

1. `What was checked`
2. `What was observed`
3. `What is likely wrong`
4. `Recommended next action`

Always include command evidence (sanitized where required).

## Guardrails

- Never print full API keys, private key material, OAuth tokens, or secrets.
- Redact sensitive values in output; show only key IDs, display names, and metadata.
- Confirm active account and project before interpreting results.
- If permissions are insufficient, report the exact denied action and required role.
- Prefer read-only inspection commands unless the user explicitly asks for mutations.
- If authentication is blocked, stop and provide the user with exact re-auth commands to run locally before continuing.

## Auth Blocker Handling (Required)

If any command returns auth errors (for example `Reauthentication failed`, `cannot prompt during non-interactive execution`, or missing ADC), the agent must:

1. Stop further Google Cloud inspection immediately.
2. Report that debugging cannot continue until the user re-authenticates.
3. Provide this exact PowerShell recovery sequence for the user:

```powershell
gcloud auth login --no-launch-browser
gcloud auth application-default login --no-launch-browser
gcloud auth list
gcloud auth print-access-token
gcloud auth application-default print-access-token
```

4. If multiple accounts exist, also ask the user to set the intended one:

```powershell
gcloud config set account <ACCOUNT_EMAIL>
```

5. Resume checks only after token commands succeed.

## Workflow

Copy this checklist and track progress:

```markdown
Google Cloud Debug Progress
- [ ] 1) Confirm gcloud availability and authentication
- [ ] 2) Confirm active project and account context
- [ ] 3) Gather project inventory (APIs, IAM, billing, quotas)
- [ ] 4) Gather API key metadata safely
- [ ] 5) Summarize findings and next fix actions
```

### 1) Confirm gcloud availability and authentication

Run:

```powershell
gcloud --version
gcloud auth list
gcloud auth application-default login
gcloud auth application-default print-access-token
```

Notes:

- Use `gcloud auth application-default login --no-launch-browser` when browser launch is unavailable.
- If token printing fails, stop and report auth as blocked before further debugging.
- When blocked, explicitly give the user the re-auth command sequence from `Auth Blocker Handling (Required)`.

### 2) Confirm active project and account context

Run:

```powershell
gcloud config list
gcloud projects list --format="table(projectId,name,projectNumber)"
gcloud projects describe <PROJECT_ID>
```

If the target project is known, set it:

```powershell
gcloud config set project <PROJECT_ID>
```

### 3) Gather project inventory (APIs, IAM, billing, quotas)

Run:

```powershell
gcloud services list --enabled --project <PROJECT_ID>
gcloud projects get-iam-policy <PROJECT_ID>
gcloud beta billing projects describe <PROJECT_ID>
gcloud services quota list --consumer=projects/<PROJECT_NUMBER> --service=serviceusage.googleapis.com
```

Notes:

- If `gcloud services quota list` is unavailable in the installed SDK version, report that and continue with available evidence.
- For IAM outputs, focus on role/member patterns relevant to the failing feature.

### 4) Gather API key metadata safely

Run:

```powershell
gcloud services api-keys list --project <PROJECT_ID>
gcloud services api-keys describe <KEY_ID> --project <PROJECT_ID>
```

Optional lookup by key string (never echo full key in output):

```powershell
gcloud services api-keys lookup --key=<API_KEY_STRING>
```

Do not run `gcloud services api-keys get-key-string` unless the user explicitly requests it for a controlled operation.

### 5) Summarize findings and next fix actions

Produce:

- mismatched project/account context
- missing API enablement
- IAM gaps causing denied calls
- billing/quota blockers
- stale, restricted, or misconfigured API keys

Then recommend the smallest safe next step and list any missing permissions needed to proceed.

## Quick Templates

### Debug Snapshot Template

```markdown
## Google Cloud Debug Snapshot

### What was checked
- Account: <ACTIVE_ACCOUNT>
- Project: <PROJECT_ID> (<PROJECT_NUMBER>)
- Surfaces: APIs, IAM, billing, quotas, API keys

### What was observed
- APIs: <enabled/missing service names>
- IAM: <relevant roles or missing binding>
- Billing: <enabled/disabled>
- Quotas: <healthy/exhausted + metric>
- API keys: <restricted/unrestricted/disabled findings>

### Likely root cause
- <most probable blocker>

### Recommended next action
1. <smallest safe fix>
2. <validation step to confirm fix>
```
