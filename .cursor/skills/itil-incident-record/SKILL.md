---
name: itil-incident-record
description: Mandates an ITIL-style Incident Record for exactly ONE bug observed in EquipQR — the agent navigates the live app via the cursor-ide-browser MCP (production at equipqr.app by default; preview only when the user specifies), reproduces the symptom, captures screenshot evidence at every reproduction step, and pulls correlated logs from every relevant production-side MCP (Supabase, Vercel, Better Stack, Google Cloud, GitHub) — then writes a strict Incident Record that documents WHAT is wrong, WHERE it is wrong, and HOW to reproduce it, but does NOT propose a root cause and does NOT plan a fix. If a GitHub issue already covers the symptom, the agent edits the issue body in place when permitted (preserving the reporter's original text in a quoted block) or appends a comment when not; if no issue exists, the agent creates one. After posting, the agent runs the trestle skill to triage the new/updated issue against existing tracking and link related issues. Use whenever the user reports a live-site bug, asks the agent to "document this incident", "reproduce on production", "verify and report", "open an incident on", or references a GitHub issue that lacks reproduction steps and production evidence. One prompt, one symptom, one Incident Record. No fixes. Hand off to itil-problem-record for root-cause work.
---

# ITIL Incident Record (EquipQR)

## How this fits the ITIL flow

This repository treats ITIL roles as follows:

| ITIL artifact | EquipQR equivalent |
|---|---|
| **Incident Record** | **Output of *this* skill** — verified live-site reproduction with screenshot evidence and cross-system logs, posted on a GitHub issue |
| Service Request | Output of [`itil-service-request`](../itil-service-request/SKILL.md) — feasibility, dollar-cost, and market-viability evaluation of a feature / enhancement |
| Problem Record | Output of [`itil-problem-record`](../itil-problem-record/SKILL.md) — local-dev reproduction + root cause analysis on top of an Incident Record |
| Change Record | Output of [`itil-change-record`](../itil-change-record/SKILL.md) — implementation plan, in Plan mode, awaiting user approval |
| Change Implementation | What runs after the user approves the Change Record ("clicks build") |

**Bug flow:** `itil-incident-record` → `itil-problem-record` → `itil-change-record` → implementation.

The Incident Record answers exactly three questions: *"What is wrong? Where is it wrong? How is it reproduced?"* It does **not** answer *"why?"* — that is the Problem Record's job. It does **not** propose code changes — that is the Change Record's job.

## Mandatory rule

For **this repository only**, when the user asks the agent to verify, reproduce, or document a live-site bug, the agent must:

1. Operate against **exactly one** symptom (one bug, one reproduction sequence).
2. Reproduce it against the **live production app at `equipqr.app`** by default — only use a different environment if the user explicitly says so.
3. Capture **real evidence** at every reproduction step — screenshots, console messages, network requests — plus correlated logs from every production-side MCP that touches the failing code path.
4. Produce the Incident Record using the **exact** structure below.
5. Post it on the corresponding GitHub issue: edit the issue body in place when permitted, append a comment when not, or create a new issue when none exists.
6. Triage via [`trestle`](../trestle/SKILL.md) — link related issues, apply existing labels, place the issue on the org project board.
7. **Stop.** Do not write a Problem Record, do not modify code, do not change production state.

## One prompt, one symptom, one Incident Record

**Hard guardrail — do NOT guess what to reproduce.**

Before starting, you must have either:

- A clearly described symptom (what the user saw, on what page, after what action), **or**
- A GitHub issue number / URL whose body contains enough detail to reproduce.

If **any** of the following is true, **STOP** and ask one clarifying question — do not browse for inspiration, do not pick "the most likely page":

- The symptom is vague ("the dashboard is broken") with no specific action / page / data state.
- Multiple symptoms are described ("login is slow AND the map doesn't load AND…") — pick one or split into separate Incident Records.
- A GitHub issue is referenced but more than one exists, or the URL is malformed.
- The user expects local-dev reproduction (that is `itil-problem-record`'s job — route them there).

Stop message template:

> I need exactly one symptom to verify on production. Please reply with (a) the page or URL, (b) the action that triggers the bug, and (c) what you see vs. what you expected — or a single GitHub issue number that already contains those three things. I will not proceed without it.

## When this skill is the right one

Read and follow this skill **every time** you:

- Are asked to "verify", "reproduce", "document this incident", "open an incident on", "check on production", "see if this still happens", or "get evidence for" a bug.
- See `#<number>` or a `github.com/.../issues/<n>` URL framed as a bug that lacks reproduction steps OR lacks production evidence (screenshot, console error, log line).
- Are about to write a bug report from scratch and the user has shown you a symptom in the live app.

If the issue is a feature / enhancement / vendor-cost ask, use [`itil-service-request`](../itil-service-request/SKILL.md). If the user wants root-cause analysis with local-dev reproduction, use [`itil-problem-record`](../itil-problem-record/SKILL.md).

## Workflow

### Step 1 — Confirm the target

1. If a GitHub issue is referenced: `gh issue view <number> --json number,title,body,labels,state,assignees,author,comments,url` — capture the existing body verbatim (you will preserve it later).
2. If no issue is referenced: confirm with the user (a) page/URL, (b) reproduction action, (c) observed vs. expected.
3. Confirm the **environment**. Default = production (`https://equipqr.app`). Allow these alternatives only if the user explicitly names them: a Vercel preview URL, or `localhost:8080` (rare — note that local-dev reproduction is normally `itil-problem-record`'s scope).

### Step 2 — Plan the evidence sweep

Before touching the browser, list which production-side MCPs the failing code path likely touches. This drives the Step 4 sweep. See [toolbelt](../toolbelt/SKILL.md) for full tool inventory.

| If the failing path involves… | Pull logs from… |
|---|---|
| Any auth / session / RLS / database read or write | `plugin-supabase-supabase` — `get_logs` (services: `api`, `postgres`, `auth`) |
| Any edge function (e.g. `send-*`, `scan-*`, OAuth callbacks, webhook handlers) | `plugin-supabase-supabase` — `get_logs` (service: `edge-function`) |
| Any frontend route or SSR / build / runtime issue | `plugin-vercel-vercel` — `get_runtime_logs`, `get_deployment` |
| Any production runtime exception, timing, or telemetry | `plugin-better-stack-betterstack` — error tracking + telemetry sources |
| Any Google API surface (Maps, OAuth, Workspace, Cloud Storage) | `gcloud` MCP — Cloud Logging |
| Any prior issue, PR, or recent merge that may have introduced the regression | `gh` CLI — `gh issue list`, `gh pr list`, `gh search` |

**Datadog is intentionally disabled in this workspace** — see [toolbelt](../toolbelt/SKILL.md). Use Better Stack for live production telemetry instead.

### Step 3 — Reproduce on the live app via the browser MCP

**Tool:** `cursor-ide-browser`. Read its workflow notes in [toolbelt](../toolbelt/SKILL.md) §6 before starting.

Sequence:

1. `browser_navigate` to the target URL (start at `https://equipqr.app/<path>` or the user-supplied URL).
2. **If a login screen, captcha, passkey, or MFA prompt appears: STOP. Tell the user to take over the browser tab and complete authentication.** Do not improvise credentials, do not type into password fields, do not approve passkey prompts. Resume only after the user confirms they are signed in.
3. Once the app is loaded and authenticated as the right account / role, `browser_lock` the tab so the user does not collide with the reproduction.
4. Capture a baseline:
   - `browser_snapshot` (records the page accessibility tree)
   - `browser_take_screenshot` with filename `incident-<short-slug>-step-0-baseline.png`
   - Copy the returned temp path into `tmp/screenshots/` per [toolbelt](../toolbelt/SKILL.md) §6.
5. Execute the reproduction steps **one at a time**. After each step:
   - Take a fresh `browser_snapshot` (refs invalidate after every interaction).
   - Take a `browser_take_screenshot` named `incident-<short-slug>-step-<N>-<descriptor>.png`. Copy to `tmp/screenshots/`.
   - Pull `browser_console_messages` — record any new `error` / `warning` lines verbatim with their timestamp.
   - Pull `browser_network_requests` — record any 4xx/5xx, slow (>2s), or relevant successful calls (record method + URL + status + response body **redacted**).
6. Capture the **failure step** with extra care:
   - Screenshot before the action and after the action.
   - Quote the exact console error verbatim.
   - Quote the failing network request (method, URL, status, response body — redact tokens / PII).
   - Note the exact UTC timestamp from the screenshot or network panel — you will need it for cross-system log correlation.
7. `browser_lock` → unlock when done. Do **not** leave the tab locked.

If the symptom does **not** reproduce on production:

- Do not invent it. Document the **negative result** explicitly in the Incident Record under **Reproduction status: Could not reproduce on production**, list every step you tried, every screenshot you captured, and the time of test.
- Recommend the reporter provide: app version (Session Diagnostics → App Version), browser + OS, account / org ID, exact timestamp of their failure, and a screenshot.
- Skip Steps 4 and 5 below; jump to Step 6 to write the (negative-result) Incident Record and post / triage it normally.

### Step 4 — Cross-system evidence sweep

For each MCP identified in Step 2, pull logs **scoped to a tight time window around the failure timestamp** captured in Step 3 (typical window: failure − 2 min through failure + 2 min).

For each system, capture:

- The exact MCP tool call you made (parameters and time window).
- A short verbatim snippet of any matching log lines — request IDs, error messages, status codes, function name, deploy SHA. Trim to relevance.
- Explicitly note if a system returned **no matching logs** in the window — that is itself evidence (and may indicate the request never reached that tier).

Mandatory targets when relevant:

- **Supabase** (`plugin-supabase-supabase` → `get_logs`):
  - `api` for any REST / RLS denial.
  - `postgres` for any DB-level error (constraint violation, RLS, type mismatch).
  - `edge-function` for any function in the failing call chain — capture the function name and the request ID.
  - `auth` if login / session / JWT / refresh is involved.
- **Vercel** (`plugin-vercel-vercel`):
  - `get_deployment` of the **current production deployment** at the time of failure — capture deployment ID and commit SHA.
  - `get_runtime_logs` filtered to the request path / status / time window.
- **Better Stack** (`plugin-better-stack-betterstack`):
  - Pull any error report whose fingerprint or first-seen timestamp matches the failure.
  - Pull telemetry from the relevant source if the failure manifests as latency / spike.
- **Google Cloud** (`gcloud` MCP) — only if a Google API surface (Maps, OAuth callback, Workspace, Cloud Storage) is in the call chain. Pull Cloud Logging entries for the relevant API + project + time window.
- **GitHub** (`gh` CLI):
  - `gh search issues --repo Columbia-Cloudworks-LLC/EquipQR --state all "<short-symptom-keywords>"` — find prior reports.
  - `gh log` / `gh pr list --search` — find recent merges on the implicated paths.

**Never paste full secrets, tokens, JWTs, refresh tokens, service-role keys, or full auth headers.** Reference by name and first 4–8 chars only when correlation requires it.

### Step 5 — Confirm authorship and edit-vs-comment posture

If a GitHub issue exists, decide whether to **edit the issue body in place** or **append a comment**:

1. Get the issue author and your authenticated GitHub identity:
   - `gh issue view <number> --json author -q .author.login`
   - `gh api user -q .login`
2. Determine permission:
   - If you are the issue author **or** you have triage / write permission on the repo → **edit in place is permitted**.
   - Otherwise → **comment only**.
3. If edit is permitted: capture the original body verbatim (Step 1 already did this) — you will preserve it as a quoted "Original report" block at the bottom of the new body so the reporter's words are never lost.
4. If edit is not permitted, or if the issue has substantial discussion that would be lost in an in-place rewrite, **default to appending a comment** even when edit is technically allowed. Edit-in-place is for thin / placeholder issues; comment-append is the safe default for issues with conversation.

### Step 6 — Author the Incident Record

Use these **exact** top-level headers (`##`).

```markdown
## Incident Record — Issue #<number-or-NEW>

- **Symptom (one line):** <what the user sees, in 10 words or less>
- **Environment:** <Production https://equipqr.app | Preview <url> | Local dev>
- **Verified at (UTC):** <ISO 8601 timestamp of the reproduction>
- **Production deployment:** <commit SHA> — <Vercel deployment ID> (omit if not Production)
- **App version (package.json at time of test):** <x.y.z>
- **Reporter:** <username, if known>
- **Verified by:** agent (`itil-incident-record` skill) on behalf of <user-handle>
- **Date documented:** <YYYY-MM-DD>

## Affected Surface

- **Page / route:** `<path>` — `<https://equipqr.app/...>`
- **Component / view:** <best-known component name from the codebase, when identifiable from snapshot>
- **Data scope:** <which org / role / record state triggers it — e.g. "any org with > 0 work orders in 'Submitted' state", "iOS Safari only", "all users">
- **Triggering action:** <click / form submit / scan / page load / cron / webhook>

## Reproduction Steps

[Numbered, junior-executable steps. Anyone holding the right account credentials should be able to follow these and see the same failure.]

1. Navigate to `<URL>`.
2. [Exact step]
3. [Exact step]
4. […]

**Account / role used:** <e.g. owner@apex.test as Org Admin>
**Browser / OS:** <from `browser_snapshot` or user agent — e.g. Chrome 142 on Windows 11>

## Observed Behavior

[What actually happened. Quote console errors verbatim. Reference screenshots inline.]

- **At step <N>:** see `tmp/screenshots/incident-<slug>-step-<N>-<descriptor>.png`
- **Console error (verbatim):**
  ```
  <quoted error text with stack trace if present>
  ```
- **Failing network request:**
  - `<METHOD> <URL>` → `<status>` at `<UTC timestamp>`
  - Response body (redacted): `<short snippet>`

## Expected Behavior

[What should have happened, per the issue body, per documented behavior, or per the user's stated expectation. One paragraph.]

## Reproduction Status

<Reproduced on production | Could not reproduce on production | Reproduced intermittently (N of M attempts)>

## Cross-System Evidence

[For each MCP queried in Step 4, a short subsection. Include "no matching logs in window" when applicable — silence is evidence.]

### Supabase

- `get_logs` (service: `<service>`, window: `<start>` → `<end>`):
  ```
  <verbatim relevant log lines, trimmed>
  ```

### Vercel

- Production deployment: `<commit SHA>` (`<deployment ID>`).
- `get_runtime_logs` (path: `<path>`, window: `<start>` → `<end>`):
  ```
  <verbatim relevant log lines, trimmed>
  ```

### Better Stack

- <error fingerprint or "no matching error report in window">

### Google Cloud

- <Cloud Logging snippet, or "not in failing call chain — skipped">

### GitHub history

- Prior reports of the same / similar symptom: <`#NNN`, `#MMM` — one-line each, or "none found">
- Recent merges to implicated paths (last 30 days): <`<sha>` `<one-line>` — or "none">

## Severity & Scope

- **Severity:** <P1 (production-down for > 1 user) | P2 (broken feature with workaround) | P3 (cosmetic / edge case)> — one-line rationale.
- **Frequency:** <Always | Intermittent (N% of attempts) | Once>.
- **Estimated affected users / orgs:** <best estimate from data, or "unknown — recommend the reporter clarify">.
- **Workaround available:** <Yes — describe / No>.

## Screenshots & Artifacts

- `tmp/screenshots/incident-<slug>-step-0-baseline.png`
- `tmp/screenshots/incident-<slug>-step-<N>-<descriptor>.png`
- […list every captured screenshot…]

## Original Report (preserved)

> [Verbatim quote of the original issue body, or "(N/A — newly created from user report)" if no prior issue existed.]

## Handoff

- **Next ITIL step:** invoke [`itil-problem-record`](../itil-problem-record/SKILL.md) for root-cause analysis and local-dev reproduction.
- **Status:** Incident verified and documented. **No root cause assigned. No fix proposed.**
```

### Step 7 — Post / update on GitHub

Write the body to a temp file (PowerShell-safe). Then choose one path:

**A) Edit-in-place** (allowed per Step 5, AND issue has minimal prior discussion):

```powershell
gh issue edit <number> --repo Columbia-Cloudworks-LLC/EquipQR --body-file <temp-file.md>
```

The new body must include the **Original Report (preserved)** block quoting the prior body verbatim. If the issue title is vague (e.g. "broken"), also pass `--title "<short symptom>"` so triage / search works.

**B) Append comment** (default when permission is unclear, when prior discussion exists, or when the user is not the issue author):

```powershell
gh issue comment <number> --repo Columbia-Cloudworks-LLC/EquipQR --body-file <temp-file.md>
```

**C) Create new** (no prior issue exists):

```powershell
gh issue create --repo Columbia-Cloudworks-LLC/EquipQR --title "<short-symptom>" --body-file <temp-file.md> --label "bug"
```

After posting:

1. Delete the temp file.
2. Print the full Incident Record in chat.
3. Print the issue URL (`gh issue view <number> --json url -q .url`).
4. Apply a label that signals the issue has verified evidence (e.g. `triage:reproduced`, `incident-record-posted`) **only if** such a label exists in the repo (`gh label list`). Do not create new labels.

### Step 8 — Triage via trestle

Invoke [`trestle`](../trestle/SKILL.md) to:

1. Find related issues / PRs covering the same surface or symptom — link them in a follow-up comment on the new/updated issue (`Related: #NNN, #MMM`).
2. Confirm the issue is on the EquipQR org project board (#5) with appropriate Status / Priority fields. The `trestle` skill knows how to read project fields before mutating them.
3. Apply existing labels that match the affected surface (e.g. `area:work-orders`, `area:fleet-map`) — only labels that already exist (`gh label list`).

Trestle is invoked in **mutation** mode here because the user implicitly authorized GitHub state changes by asking for an Incident Record. If trestle prompts for mutation authority, confirm "yes — link related issues and place on project board, do not close anything."

### Step 9 — Stop

Tell the user the Incident Record is posted and triaged, then ask the next-step question via `AskQuestion` (buttons — never freeform text):

```json
{
  "questions": [
    {
      "id": "next-step",
      "prompt": "Incident Record is posted on issue #<number> and triaged. What's next?",
      "options": [
        { "id": "problem-record", "label": "Move to root-cause analysis (invoke itil-problem-record)" },
        { "id": "stop",           "label": "Stop here — I'll come back to this later" }
      ]
    }
  ]
}
```

Treat the user's response strictly: only an explicit button selection moves to the next action.

## Strict guardrails

- **Production by default.** The agent reproduces against `https://equipqr.app`. Other environments require an explicit user override.
- **Read-only on production.** No mutations to production data, no edits to migrations, no deploys, no flag flips. Browser interactions are limited to navigating, inspecting, and the minimal user-actions required to reproduce — never destructive operations (do not click "Delete", "Cancel Subscription", "Revoke", "Confirm" buttons unless the bug is *specifically* about that confirmation flow and the user has authorized it in the same turn).
- **Browser auth is a user task.** If a login / passkey / MFA / captcha prompt appears, the agent stops and asks the user to take over. The agent must not type passwords, must not approve passkey prompts, must not solve captchas.
- **No root-cause speculation.** The Incident Record documents **what / where / how**, not **why**. Phrases like "this is probably caused by", "the bug is in `<file>`", "we should fix this by" do **not** belong in this artifact. Save them for the Problem Record.
- **No fix recommendations.** No "consider", no "should", no "could", no implementation hints. The handoff line at the bottom is the only forward-looking content.
- **No fabricated evidence.** Every screenshot must be a real `browser_take_screenshot` saved to `tmp/screenshots/`. Every log line must be a real MCP tool call result with the time window you queried. If a system returned no matching logs, write "no matching logs in window" — do not invent.
- **Secrets first.** Never paste full tokens, JWTs, service-role keys, refresh tokens, full Authorization headers, or PII into the Incident Record, the GitHub comment, the chat, or screenshots. Redact before posting. If a screenshot inadvertently captured a token, retake it (e.g. by pasting `***REDACTED***` into the field first or scrolling the value out of frame). See [security-supabase](../../rules/security-supabase.mdc).
- **Preserve original reports.** When editing an issue body in place, the original body must be quoted verbatim under **Original Report (preserved)** at the bottom. Never silently overwrite a reporter's words.
- **Single symptom only.** One invocation = one Incident Record for one symptom. Unrelated bugs noticed during reproduction get filed as separate issues via a brief follow-up comment ("Noticed during reproduction: <symptom>. Filed separately as #NNN.") — do not roll them into this Incident Record.
- **Stop at triage.** Do not invoke `itil-problem-record` in the same turn unless the user explicitly approves it via the Step 9 `AskQuestion` prompt.
- **Approval and next-step prompts MUST use `AskQuestion` with buttons.** Same rule the other ITIL skills enforce — buttons are deterministic; freeform text is not.

## Authoring constraints

- **Reproduction Steps**: numbered, junior-executable, account / role / browser captured. "Click around until it breaks" is never a step.
- **Observed Behavior**: console errors quoted verbatim; network failures named by method + URL + status + UTC timestamp.
- **Cross-System Evidence**: every MCP queried gets its own subsection. "No matching logs in window" is a valid (and required) entry when nothing matched — silence is evidence.
- **Severity**: P1/P2/P3 with rationale. Default to P2 if unclear.
- **Screenshots**: at minimum a baseline + one per reproduction step + one of the failure moment. Filenames follow the pattern `incident-<slug>-step-<N>-<descriptor>.png` and live under `tmp/screenshots/`.
- **No "we", no "should", no "I think".** Third-person, evidence-driven prose throughout.

## Progressive disclosure

- For browser MCP workflow (lock/unlock, snapshot/screenshot/console/network), Supabase / Vercel / Better Stack / GCP / GitHub MCP tools, and the `tmp/screenshots/` convention, follow [toolbelt](../toolbelt/SKILL.md).
- For the next ITIL step (local-dev reproduction + root cause), follow [itil-problem-record](../itil-problem-record/SKILL.md).
- For triage (linking related issues, project board placement), follow [trestle](../trestle/SKILL.md).
- For non-bug requests (features, enhancements, vendor cost), follow [itil-service-request](../itil-service-request/SKILL.md) instead.
- For secrets-handling rules that govern redaction in this artifact, follow [security-supabase](../../rules/security-supabase.mdc).
