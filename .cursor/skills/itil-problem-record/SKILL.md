---
name: itil-problem-record
description: Mandates an ITIL-style Problem Record for exactly ONE GitHub issue (the Incident Record) in EquipQR — the agent literally reproduces the issue in a verifiably clean local dev environment, performs root-cause analysis, posts the Problem Record as a comment on the GitHub issue, and outputs it in chat as the authorization context for the subsequent itil-change-record step. Acts as an L3 sysadmin: probes localhost:8080, instructs the user through the dev-start.bat / dev-stop.bat bring-up ladder, walks the user through env / secrets parity across .env, supabase/functions/.env, Supabase Dashboard, and Vercel when external integrations are in play, and defers any issue whose local stack cannot be brought up clean (no warnings, no errors of any kind). Use whenever the user asks the agent to "investigate", "diagnose", "reproduce", "triage", "do the problem record for", "look into", or "work on" a GitHub issue, references an issue number (#NNN) or issue URL with no fix yet authorized, or starts the ITIL flow on an incident. One prompt, one issue, one Problem Record.
---

# ITIL Problem Record (EquipQR)

## How this fits the ITIL flow

This repository treats ITIL roles as follows:

| ITIL artifact | EquipQR equivalent |
|---|---|
| Incident Record | A GitHub Issue |
| Problem Record | The output of **this** skill — root cause + reproduction posted on the issue and in chat |
| Change Record | The output of [`itil-change-record`](../itil-change-record/SKILL.md) — the implementation plan, in Plan mode, awaiting user approval |
| Change Implementation | What runs after the user approves the Change Record ("clicks build") |

This skill produces the **Problem Record only**. It does **not** plan the fix and does **not** modify production code. Its output is the documented authorization the user needs before invoking `itil-change-record`.

## Mandatory rule

For **this repository only**, when the user asks the agent to investigate or open an ITIL flow against a GitHub issue, the agent must:

1. Operate against **exactly one** GitHub issue.
2. Reproduce / establish ground truth before claiming a root cause.
3. Produce the Problem Record using the **exact** structure below.
4. Post it as a comment on the GitHub issue **and** print it in chat.
5. **Stop** after posting. Do not proceed to planning, branching, or code edits — that's the `itil-change-record` skill's job.

## One prompt, one issue, one Problem Record

**Hard guardrail — do NOT guess the target issue.**

Confirm the user has named exactly one issue, identifiable as one of:

- An issue number (`#1234` or `1234`)
- A full GitHub issue URL
- A title that resolves to exactly one open issue via `gh issue list`

If **any** of the following is true, **STOP** and ask one clarifying question — do not pick "the most likely one", do not browse for inspiration:

- No issue is referenced.
- More than one issue is referenced.
- A title matches zero or multiple issues.
- The repo has multiple GitHub remotes and the target repo is unclear.

Stop message template:

> I need exactly one GitHub issue to write the Problem Record for. Please reply with the issue number (e.g. `#1234`) or full issue URL. I will not proceed without it.

Re-validate after the user responds. Only continue once a single issue is locked in.

## When to read this skill

Read and follow this skill **every time** you:

- Are asked to investigate, diagnose, reproduce, triage, or "work on" a GitHub issue with no implementation yet authorized.
- See `#<number>` or a `github.com/.../issues/<n>` URL in a request that is **not yet** scoped to a fix.
- Start the ITIL flow against an incident.

If the user has already approved a Problem Record and is asking for the implementation plan, switch to [`itil-change-record`](../itil-change-record/SKILL.md) instead.

## Workflow

### Step 1 — Pull the Incident Record

1. Fetch the issue and **all** its comments:
   `gh issue view <number> --json number,title,body,labels,state,assignees,comments,url`
2. Note: type signal from labels (bug / feature / regression), reporter, environment hints, attached screenshots or stack traces.

### Step 2 — Code & data discovery

1. Locate the relevant code: search for symbols, file paths, error strings, route names, or component names mentioned in the issue. Use Grep / Glob — do not assume file structure.
2. Identify existing tests covering the affected code (`*.test.ts`, `*.test.tsx`).
3. If the issue touches data: identify the related Supabase pieces — migrations in `supabase/migrations/`, edge functions in `supabase/functions/`, RLS policies, and types in `src/integrations/supabase/types.ts`.
4. Check recent commits on the same files (`git log --oneline -- <path>`) for likely recent regressions.

If discovery cannot locate the relevant code with reasonable confidence, **STOP** and ask the user for a pointer (file, route, screen). Do not invent locations.

### Step 3 — Establish ground truth (reproduce locally)

**Cardinal rule:** if it does not reproduce in local dev, it does not get a root cause. The Problem Record is reproduction-driven, not speculation-driven. If local dev cannot be brought to a clean, healthy state, the issue is **deferred** until the local stack is healthy — full stop, regardless of cause. We do not ship fixes for symptoms we cannot reproduce. If it doesn't work in local dev, why would we expect it to work in production?

The agent acts as an **L3 sysadmin**: it does **not** run `dev-start.bat` itself — the user does. The agent owns the diagnostic ladder, tells the user precisely what to run, where to look, and how to verify each environment, then re-probes.

#### Step 3a — Liveness probe (mandatory first action)

Probe the three local services before doing anything else. This is the **first** thing the agent runs at Step 3 — every time, no exceptions.

```powershell
# Vite (frontend) — must return 200
try { (Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 5 -UseBasicParsing).StatusCode } catch { 'DOWN' }

# Supabase REST API — must return < 500 (default port 54321; confirm via supabase/config.toml if customized)
try { (Invoke-WebRequest -Uri 'http://localhost:54321/rest/v1/' -Method HEAD -TimeoutSec 5 -UseBasicParsing).StatusCode } catch { 'DOWN' }

# Local Postgres — must show TcpTestSucceeded : True
Test-NetConnection -ComputerName localhost -Port 54322 -InformationLevel Detailed
```

**Healthy** = Vite returns 200 **and** Supabase API returns < 500 **and** port 54322 is listening.

- If all three are healthy → the dev server is running. Skip to Step 3d.
- If any is down → run the **Bring-up ladder** (Step 3b). Do **not** proceed to reproduction with a partially-up stack.

#### Step 3b — Bring-up ladder (the agent instructs; the user executes)

The user must start the stack — the agent does **not** invoke `dev-start.bat` itself. The agent instructs, waits for confirmation, then re-probes (Step 3a). If a tier fails or the start script emits **any** warning or error, escalate to the next tier. If all four tiers fail, defer (Step 3e).

| Tier | When to use | The user runs (from repo root) | Why |
|---|---|---|---|
| 1 | Stack is down; issue does **not** touch Supabase migrations, edge functions, RLS, or generated types | `dev-start.bat` | Idempotent start; no DB reset |
| 2 | Issue touches `supabase/migrations/`, `supabase/functions/`, RLS policies, generated types (`src/integrations/supabase/types.ts`), or schema | `dev-start.bat -Force` | Adds DB reset + type regeneration + full verification |
| 3 | Tier 1 or 2 emitted **any** warning or error, or liveness still fails | `dev-stop.bat` then `dev-start.bat` (or `-Force`) | Clean shutdown then restart — leaves Docker Desktop running |
| 4 | Tier 3 still emits warnings or errors | `dev-stop.bat -Force` then `dev-start.bat -Force` | Cold start including Docker Desktop teardown |

Between each tier, **the agent re-runs Step 3a**. Only proceed to Step 3d (or Step 3c if there are signs of misconfig) when **both** of the following are true:

- All three liveness checks pass.
- The user reports `dev-start.bat` exited cleanly with **no warnings and no errors of any kind** — every component shows OK / `[OK]` in the final summary banner.

`dev-start.bat` and `-Force` are designed to be idempotent and almost always work. If they do not, the diagnosis is an **environment** problem, not a code problem, and Step 3e applies.

#### Step 3c — Environment & secrets parity (L3 sysadmin guidance)

Trigger this step if **either**:

- The bring-up ladder fails at any tier with messages mentioning missing env vars, auth, ports, or external services, **or**
- Reproduction in Step 3d fails with messages indicating misconfiguration: 401 / 403 from Edge Functions, OAuth callback mismatches, "missing API key", CORS / referrer rejections, webhook signature failures.

The user does not always know whether every value is set in every place. The agent must walk the user through parity, key by key. Do not assume.

EquipQR has multiple env surfaces that must agree:

| Surface | Location | Holds |
|---|---|---|
| Local frontend env | `.env` in repo root | `VITE_*` build-time variables read by Vite |
| Local edge functions env | `supabase/functions/.env` | Server-only secrets used by `supabase functions serve` |
| Supabase project — secrets | Supabase Dashboard → Project → Settings → Functions → Secrets | Edge Function secrets in **preview** AND **production** projects (separate sets) |
| Supabase project — Auth | Supabase Dashboard → Authentication → URL Configuration | Site URL + redirect allow-list (must match local + Vercel domains) |
| Vercel project env | Vercel Dashboard → Project → Settings → Environment Variables | `VITE_*` for build, scoped Preview vs Production separately |
| External provider | The provider's own dashboard (Supabase, hCaptcha, Google Cloud, Intuit, Resend, etc.) | The source-of-truth for the secret |

For each key relevant to the failing flow:

1. Identify which keys the failing flow touches. Use [`.env.example`](../../.env.example) — it documents *exactly* where each key lives, where to obtain it, and which files consume it.
2. Tell the user, key by key, the exact navigation path:
   - Where the **source-of-truth** value lives (e.g. *"Supabase Dashboard → Settings → API → service_role secret"*)
   - Where it must **also** be set (e.g. *"Vercel → Project → Settings → Environment Variables → Production **and** Preview"*, *"Supabase → Functions → Secrets — both the **preview** project and the **production** project"*)
   - **How to verify parity** without exposing the secret: ask the user to compare the **first 4–8 chars only** across surfaces.
3. For provider-side config that is not just a secret value, walk through:
   - OAuth redirect URIs (QuickBooks, Google Workspace) — must match `{SUPABASE_URL}/functions/v1/<callback>` for **each** environment.
   - hCaptcha allowed domains.
   - Google Cloud API key referrer / IP restrictions.
   - Webhook signing secrets and registered endpoints.
   - Map IDs and feature-flag pairs that span client + server (e.g. `VITE_ENABLE_QB_PDF_ATTACHMENT` ↔ `ENABLE_QB_PDF_ATTACHMENT`).
4. **Never** paste full secrets into chat or into the Problem Record. Always reference by name and first-N-chars only (e.g. `RESEND_API_KEY=re_AbCd...`). See [security-supabase](../../rules/security-supabase.mdc).
5. After the user confirms each value and location, return to Step 3a (re-probe) and then attempt Step 3d.

#### Step 3d — Reproduce (only on a verifiably clean stack)

With Vite + Supabase API + DB green and (if relevant) external integrations verified per Step 3c:

**Bugs / regressions / defects:**

1. Execute the reproduction steps from the issue body. If the issue lacks reproduction steps, derive them from the description and call that out explicitly in the Problem Record.
2. Capture observed vs. expected behavior. Where possible, capture supporting evidence — console errors, network responses (status + redacted body), failing test output (`npm run test -- <pattern>`), screenshots from the IDE browser MCP if the issue is UI-facing.
3. **Cannot reproduce path:** if reproduction fails on a verifiably clean stack, do **not** invent a root cause. Document the negative result in the Problem Record under **Reproduction status: Could not reproduce**, list everything you tried (steps, env state, environments verified), and recommend the issue be returned to the reporter for more detail (build version, browser, account, org ID, screenshots, exact timestamp of failure).

**Features / enhancements / capability gaps** — *current-state analysis* (still requires a healthy local stack):

1. Navigate the existing app surfaces related to the request and document what exists today.
2. Document the gap — exactly what behavior or capability is missing and the user-facing symptom of that gap.
3. Note any partial implementations, dead code, or feature flags that already touch this area.

**Refactor / chore / tech-debt** — *evidence of pain*:

1. Document the concrete pain point (failing tests, slow query, type holes, churn hotspots — quantify where possible: file size, cyclomatic complexity, number of related issues).
2. Liveness probe is still required — you cannot characterize "slow" or "broken" against a stack that is itself broken.

#### Step 3e — Defer (if the stack cannot be brought up clean)

If after Tier 4 the local dev environment still emits warnings or errors of **any** kind:

1. **STOP.** Do not write a Problem Record claiming a root cause. The investigation is invalid against an unhealthy stack.
2. Post a deferral comment on the issue using `gh issue comment` with this exact format:

   ```markdown
   ## Problem Record — Deferred

   Investigation deferred: the local development environment could not be brought to a clean state, so the reported behavior cannot be reproduced or characterized.

   **Bring-up attempts:**
   - Tier <N> — `<command>` — <verbatim warnings / errors observed>
   - …

   **Liveness probe results:**
   - Vite (`http://localhost:8080`): <status>
   - Supabase API (`http://localhost:54321/rest/v1/`): <status>
   - Postgres (`localhost:54322`): <Listening | Not listening>

   **Likely areas to inspect** (operator action — not a code change):
   - Docker Desktop running and healthy
   - Port conflicts on 8080 / 54321 / 54322
   - Supabase CLI version (`npx supabase --version`)
   - `.env` and `supabase/functions/.env` parity with `.env.example`
   - Generated types up to date (`src/integrations/supabase/types.ts`)
   - Any prior dev-stop / dev-start artifacts left behind

   **Status:** This issue is **not** a candidate for a Change Record until the local environment can be started cleanly with no warnings or errors of any kind.
   ```

3. Tell the user in chat that the deferral has been posted and that the investigation will resume only after the local stack comes up clean.

### Step 4 — Root Cause Analysis

State the **root cause** in one paragraph, traced to specific code (file + function/symbol), data shape, RLS policy, config, or external dependency. Distinguish:

- **Proximate cause** — the immediate trigger that produced the observed symptom.
- **Underlying cause** — the design decision, missing check, or systemic gap that allowed the proximate cause to exist.

If you can identify only the proximate cause, say so explicitly. Do not speculate beyond the evidence.

### Step 5 — Author the Problem Record

Use these **exact** top-level headers (`##`).

```markdown
## Problem Record — Issue #<number>

- **Issue:** [#<number> — <title>](<url>)
- **Type:** <bug | regression | feature | refactor | chore>
- **Labels:** <list>
- **Reporter:** <username>
- **Date investigated:** <YYYY-MM-DD>

## Incident Summary

[2–4 sentence restatement of the user-reported problem in your own words, normalized for clarity.]

## Reproduction / Current State

**Environment:** EquipQR local dev — verified clean per Step 3 ladder.
- Vite `http://localhost:8080`: 200
- Supabase API `http://localhost:54321/rest/v1/`: <status code>
- Postgres `localhost:54322`: Listening
- Last bring-up command run by user: `<dev-start.bat | dev-start.bat -Force | etc.>` — exited clean, no warnings, no errors
- Branch `<branch>`, commit `<sha>`

**Steps:**
1. [Exact step]
2. [Exact step]
3. […]

**Observed:** [what actually happened — paste error text, status codes, screenshots, or "feature does not exist; relevant area is X"]

**Expected:** [what should have happened, per issue or per documented behavior]

**Reproduction status:** <Reproduced | Could not reproduce | Not applicable (feature/chore)>

## Evidence

- [File / function / line reference — `src/path/file.ts:123` — relevance]
- [Console error / network response / failing test output — quoted verbatim, trimmed to relevance]
- [Migration / RLS policy / edge function reference if data-touching]
- […]

## Root Cause Analysis

- **Proximate cause:** [one sentence, traced to specific code or config]
- **Underlying cause:** [one sentence, design / systemic gap — or "Same as proximate" if not yet identifiable]
- **Why it wasn't caught:** [missing test? unguarded edge case? recent refactor? missing type?]

## Scope of Impact

- **Affected users / roles:** [who hits this — e.g. all org admins, only iOS Safari, only orgs with > N equipment]
- **Affected surfaces:** [routes, screens, edge functions, tables, RLS]
- **Frequency / severity:** [Always / Sometimes / Once · P1 / P2 / P3 with rationale]
- **Workaround available:** [Yes — describe / No]
- **Related issues or recent commits:** [#NNN, `<sha>` — if any]

## Recommended Resolution Direction

[2–4 sentence non-prescriptive direction for the Change Record — e.g. "Add a null guard in `useEquipmentScan` and a Vitest case covering the empty-payload path; no schema change required." Do **not** write the implementation plan here — that's the Change Record's job. Flag any options the planner should consider.]

## Authorization to Proceed

Status: **Awaiting user approval to draft the Change Record.**

Once approved, invoke the `itil-change-record` skill with this Problem Record as input.
```

### Step 6 — Post the Problem Record

1. Print the full Problem Record in chat.
2. Post it as a comment on the GitHub issue:
   ```powershell
   gh issue comment <number> --body-file <temp-file.md>
   ```
   Write the body to a temp file first to preserve markdown formatting, then delete the temp file. Do **not** use `--body "..."` for multi-line content on PowerShell.
3. Apply a label that signals investigation is complete (e.g. `triage:investigated` or `problem-record-posted`) **only if** such a label already exists in the repo (`gh label list`). Do not create new labels.
4. **STOP.** Tell the user the Problem Record is posted and ask whether to proceed with `itil-change-record`.

## Strict guardrails

- **Read-only on code.** This skill must not modify production code, run migrations, push branches, or open PRs. The agent runs liveness probes and tests against the running stack but performs **no source edits**.
- **Agent does not run `dev-start.bat`.** The user starts the stack. The agent probes, instructs, waits, re-probes. This separation prevents the agent from masking environment problems by silently bouncing services.
- **Reproduction is mandatory; deferral is mandatory if the stack is broken.** No reproduction → no root cause → no Problem Record. If the stack cannot be brought up clean after Tier 4, post the deferral comment (Step 3e) and stop. No exceptions, regardless of how confident a hunch feels.
- **"Clean" means zero warnings and zero errors of any kind** in the `dev-start.bat` output. Yellow text counts. Skipped checks count. If anything is not OK, escalate the bring-up tier or defer.
- **Single issue only.** One invocation = one Problem Record for one issue.
- **No blind guessing.** If reproduction fails on a clean stack or evidence is thin, say so in the record and recommend returning to the reporter — do not fabricate a cause.
- **No scope creep.** If you discover unrelated bugs during reproduction, list them under **Related issues or recent commits** and recommend they be filed separately. Do not roll them into this Problem Record.
- **Security first.** Never paste full secrets, tokens, service-role keys, or full JWTs into the Problem Record, the GitHub comment, or chat. Reference by name + first 4–8 chars only when comparing for parity. See [security-supabase](../../rules/security-supabase.mdc).
- **Stop at posting.** Do not draft the Change Record in the same turn unless the user explicitly asks. The user is the change authority.

## Authoring constraints

- **Reproduction Steps** must be reproducible by a junior developer from the record alone.
- **Evidence** must point at concrete artifacts (file:line, quoted error text, test output) — not "I noticed that…".
- **Root Cause** must be traced to code or config. If unknown, write "Underlying cause not yet identifiable; see Recommended Resolution Direction for investigation paths."
- **Recommended Resolution Direction** must be a *direction*, not a plan — preserve Plan-mode's job.

## Progressive disclosure

- For local stack, env files, and MCP integrations used during reproduction, follow [toolbelt](../toolbelt/SKILL.md).
- For the next ITIL step (the implementation plan), follow [itil-change-record](../itil-change-record/SKILL.md).
- For non-issue, ad-hoc planning that has no Incident Record, [itil-change-record](../itil-change-record/SKILL.md) can still be invoked directly with a brief Business Justification in lieu of a Problem Record reference.
