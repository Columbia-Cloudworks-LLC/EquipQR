---
name: itil-problem-record
description: Mandates an ITIL-style Problem Record for exactly ONE GitHub issue (the Incident Record) in EquipQR — the agent literally reproduces the issue in a verifiably clean local dev environment, performs root-cause analysis, posts the Problem Record as a comment on the GitHub issue, and outputs it in chat as the authorization context for the subsequent itil-change-record step. Acts as an L3 sysadmin: probes localhost:8080, instructs the user through the dev-start.bat / dev-stop.bat bring-up ladder, walks the user through env / secrets parity across .env, supabase/functions/.env, Supabase Dashboard, and Vercel when external integrations are in play, and defers any issue whose local stack cannot be brought up clean (no warnings, no errors of any kind). Includes an "already-resolved" short-circuit: if discovery surfaces a prior fix and the symptom does NOT reproduce in the appropriate environment (local / preview / production, chosen to match where the fix has shipped), the agent presents the evidence, asks explicit permission, and — only with approval — closes the issue from within the skill citing the fix commit and shipping version. Use whenever the user asks the agent to "investigate", "diagnose", "reproduce", "triage", "do the problem record for", "look into", or "work on" a GitHub issue, references an issue number (#NNN) or issue URL with no fix yet authorized, or starts the ITIL flow on an incident. One prompt, one issue, one Problem Record.
---

# ITIL Problem Record (EquipQR)

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## How this fits the ITIL flow

This repository treats ITIL roles as follows:

| ITIL artifact | EquipQR equivalent |
|---|---|
| Incident Record | A GitHub Issue — preferably one already documented via [`itil-incident-record`](../itil-incident-record/SKILL.md) (production-verified reproduction + cross-system evidence). Raw reporter-only issues are accepted but the Problem Record is more rigorous when an Incident Record already exists. |
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
5. **Stop** after posting. Do not proceed to planning, branching, or code edits — that's the `itil-change-record` skill's job. The **only** exception is the already-resolved short-circuit (Step 7): if reproduction confirms the bug is already fixed in the verified environment and the user explicitly approves, the agent may close the GitHub issue from within this skill, citing the fix commit and shipping version.

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

#### Step 2b — Fix-evidence sweep (mandatory)

Before assuming the bug is current, check whether someone already fixed it. This is the gating evidence for the already-resolved short-circuit (Step 7).

Run all four checks; record what you find:

1. **Issue-number references in git log:**
   `git log --all --oneline --grep="#<number>"`
   Look for `fix:`, `feat:`, or merge commits that mention the issue number.
2. **Recent commits on the implicated files:**
   `git log --oneline --since="180 days ago" -- <files-from-Step-2-#1>`
   Look for fix/refactor commits whose messages match the symptom.
3. **CHANGELOG.md:** search for the issue number, the symptom phrase, or the affected feature name.
4. **Version comparison:** compare the **app version reported in the issue body** (e.g. *Session Diagnostics → App Version*) against `node -p "require('./package.json').version"`. If the reporter is on an older version, find the version-bump commit (`git log --all --oneline --grep="bump version to <current>"`) and confirm whether any candidate fix from #1–#3 landed *before* it.

Mark the investigation as **likely-already-resolved** only when **all** of these are true:

- A commit explicitly references the issue number **or** describes the same symptom on the same code path.
- That commit landed **before** the current `package.json` version-bump commit (i.e. the fix has shipped or will ship with the next promote).
- The reporter's app version is **older** than the version that contains the fix (or app version is unknown).

If likely-already-resolved is **false**, proceed to Step 3 normally (you are reproducing a current bug).
If likely-already-resolved is **true**, proceed to Step 3 in **verification mode** (Step 3d explains what changes).

### Step 3 — Establish ground truth (reproduce locally)

**Cardinal rule:** if it does not reproduce in local dev, it does not get a root cause. The Problem Record is reproduction-driven, not speculation-driven. If local dev cannot be brought to a clean, healthy state, the issue is **deferred** until the local stack is healthy — full stop, regardless of cause. We do not ship fixes for symptoms we cannot reproduce. If it doesn't work in local dev, why would we expect it to work in production?

**"Clean" is a hard threshold, not a vibe.** It means **zero warnings and zero errors of any kind** in the `dev-start.bat` output. Specifically:

- Any red text in the terminal — including PowerShell `NativeCommandError` blocks, even when the underlying command exits 0 — is a failure. Treat it as such.
- Any line beginning with `WARNING:` from `dev-start.ps1` (e.g. `WARNING: MCP config render failed`, `WARNING: One or both 1Password env syncs failed`) is a failure even though the script keeps going.
- A 502 / 504 / EHOSTUNREACH from any `localhost:54321/functions/v1/*` call after dev-start is a failure even if you can still browse the app.
- Yellow text counts. Skipped checks count. "Mostly works" is not a clean state.

If you see any of these, **first** check `.cursor/rules/local-dev-troubleshoot.mdc` for the known failure-mode catalog — a fix may already exist or be one command away (e.g. `docker restart supabase_kong_*`). **Then** decide whether to fix the dev-tooling issue first or defer the investigation per the deferral protocol below. Never proceed with reproduction against a partially-up stack.

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

**Choose the right environment first.** Local dev is the default. Use a different environment when the fix-evidence sweep (Step 2b) shows the fix landed in code but has not yet shipped to where the user is:

| Where the fix lives | Environment to verify in |
|---|---|
| Merged to current branch / `main`, included in the version in `package.json` | **Local dev** (current main equals what users will get next) |
| Merged but not yet promoted to production (e.g. on `preview` branch awaiting release) | **Preview** at the deployed preview URL |
| Already shipped to production | **Production** at `equipqr.app` |

If you verify outside local dev, document the exact URL, deployment SHA / version, and the time of the test in the Problem Record — and skip the local liveness probe (it does not apply).

With Vite + Supabase API + DB green and (if relevant) external integrations verified per Step 3c:

**Bugs / regressions / defects (current bug — likely-already-resolved is FALSE):**

1. Execute the reproduction steps from the issue body. If the issue lacks reproduction steps, derive them from the description and call that out explicitly in the Problem Record.
2. Capture observed vs. expected behavior. Where possible, capture supporting evidence — console errors, network responses (status + redacted body), failing test output (`npm run test -- <pattern>`), screenshots from the IDE browser MCP if the issue is UI-facing.
3. **Cannot reproduce path:** if reproduction fails on a verifiably clean stack, do **not** invent a root cause. Document the negative result in the Problem Record under **Reproduction status: Could not reproduce**, list everything you tried (steps, env state, environments verified), and recommend the issue be returned to the reporter for more detail (build version, browser, account, org ID, screenshots, exact timestamp of failure).

**Verification mode (likely-already-resolved is TRUE):**

The goal flips: you are no longer trying to reproduce the bug — you are trying to confirm the fix works. The reproduction steps are the same, but the assertion is inverted.

1. Execute the same reproduction steps from the issue body in the environment chosen above.
2. **Assert the absence of the symptom.** Capture positive evidence the fix works: screenshots of the previously-broken state behaving correctly, network responses showing the right shape, the new UI element / data update appearing without the workaround the reporter had to use.
3. If the symptom **does NOT occur** → mark **Reproduction status: Already resolved in current code** and proceed. This is the trigger for Step 7 (closure with permission).
4. If the symptom **still occurs** despite the apparent fix → the fix is incomplete or there's a second code path. Drop verification mode, flip back to standard reproduction, and treat this as a current bug. Note in the Problem Record that the prior commit `<sha>` was insufficient, and identify the gap in **Root Cause Analysis → Why it wasn't caught**.

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

**Environment:** <Local dev | Preview | Production> — <verification details>.

If **Local dev** — verified clean per Step 3 ladder:
- Vite `http://localhost:8080`: 200
- Supabase API `http://localhost:54321/rest/v1/`: <status code>
- Postgres `localhost:54322`: Listening
- Last bring-up command run by user: `<dev-start.bat | dev-start.bat -Force | etc.>` — exited clean, no warnings, no errors
- Branch `<branch>`, commit `<sha>`, app version `<package.json version>`

If **Preview** or **Production** — record:
- URL tested: `<https://...>`
- Deployment SHA / version: `<sha or version>`
- Time of test: `<ISO timestamp>`
- Authenticated as: `<user / role>`

**Steps:**
1. [Exact step]
2. [Exact step]
3. […]

**Observed:** [what actually happened — paste error text, status codes, screenshots, or "feature does not exist; relevant area is X". For verification mode: paste positive evidence the fix works.]

**Expected:** [what should have happened, per issue or per documented behavior]

**Reproduction status:** <Reproduced | Could not reproduce | Already resolved in current code | Not applicable (feature/chore)>

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

[2–4 sentence non-prescriptive direction for the Change Record — e.g. "Add a null guard in `useEquipmentScan` and a Vitest case covering the empty-payload path; no schema change required." Do **not** write the implementation plan here — that's the Change Record's job. Flag any options the planner should consider.

If reproduction status is **Already resolved in current code**: state that no code change is required, name the fix commit `<sha>` and the version that contains it, and recommend closing the issue. The detailed close text goes in the Closure Recommendation section below.]

## Recommended Execution Model (for the upcoming Change Record)

[Embed verbatim the standardized **Recommended Execution Model** block produced by the [model-recommender](../model-recommender/SKILL.md) skill, sized for the implementation work the Change Record will plan (not for the diagnostic work this Problem Record performed). Load `model-recommender` after authoring **Recommended Resolution Direction** and pass the inferred work shape (single-file null guard? multi-file refactor? schema migration?) so the next-step `itil-change-record` invocation has the recommendation ready to paste in. Skip this section ONLY when **Reproduction status** is **Already resolved in current code** — no Change Record will follow, so no model is needed.]

## Closure Recommendation (only when status is "Already resolved in current code")

- **Fix commit:** `<sha>` — `<one-line summary>` — landed `<YYYY-MM-DD>`.
- **Shipping version:** `<x.y.z>` (`package.json` at this writing). The reporter was on `<reported version>`.
- **CHANGELOG entry:** `<file:line>` if applicable, quoted briefly.
- **Verification:** [1–2 sentences naming the environment, what was clicked / called, and what was observed — e.g. "Local dev v2.10.0, accepted+assigned a Submitted work order as `owner@apex.test`; detail page badge transitioned Submitted → Assigned → In Progress without a manual refresh."]
- **Reporter action:** ask the reporter to upgrade to `<x.y.z>` (or hard-refresh the SPA to pick up the new bundle) and confirm the symptom is gone.

## Authorization to Proceed

If reproduction status is **Reproduced** / **Could not reproduce** / **Not applicable**:
- Status: **Awaiting user approval to draft the Change Record.**
- Once approved, invoke the `itil-change-record` skill with this Problem Record as input.

If reproduction status is **Already resolved in current code**:
- Status: **Awaiting user approval to close issue #<number>.**
- Two options to present to the user:
  - **(A)** Close the issue as already-resolved, citing the fix commit and shipping version (Step 7 of this skill performs the close).
  - **(B)** Draft an `itil-change-record` for a follow-up housekeeping change — typically a regression test that locks in the fix, or consolidation of any duplicated code paths the investigation surfaced.
- Do **not** close the issue without explicit user approval.
```

### Step 6 — Post the Problem Record

1. Print the full Problem Record in chat.
2. Post it as a comment on the GitHub issue:
   ```powershell
   gh issue comment <number> --body-file <temp-file.md>
   ```
   Write the body to a temp file first to preserve markdown formatting, then delete the temp file. Do **not** use `--body "..."` for multi-line content on PowerShell.
3. Apply a label that signals investigation is complete (e.g. `triage:investigated` or `problem-record-posted`) **only if** such a label already exists in the repo (`gh label list`). Do not create new labels.
4. **STOP.** Tell the user the Problem Record is posted, then ask the next-step question via `AskQuestion` (buttons — never freeform text — they are deterministic and trivial to act on):

   - If reproduction status is **Already resolved in current code** → use the Step 7 approval prompt below.
   - Otherwise → call `AskQuestion` with this exact shape:

     ```json
     {
       "questions": [
         {
           "id": "next-step",
           "prompt": "Problem Record is posted on issue #<number>. What's next?",
           "options": [
             { "id": "draft-change-record", "label": "Draft the Change Record (invoke itil-change-record)" },
             { "id": "stop",                "label": "Stop here — I'll come back to this later" }
           ]
         }
       ]
     }
     ```

### Step 7 — Closure (already-resolved path only)

This step runs **only** when **all four** are true:

1. The fix-evidence sweep (Step 2b) found a prior fix.
2. Reproduction status in the posted Problem Record is **Already resolved in current code**.
3. The verification in Step 3d showed the symptom does **not** occur in the appropriate environment.
4. The user explicitly approved closure by selecting the **`close`** option in the `AskQuestion` prompt below. A button selection is the only accepted form of approval — silence, "ok", "thanks", a thumbs-up emoji, or freeform "yeah close it" replies do **not** count and must be re-prompted via `AskQuestion`.

If any of these are false, do **not** close the issue. Stop and wait.

**Approval prompt — MUST use the `AskQuestion` tool, never freeform text.**

The user prefers buttons because they are deterministic and unambiguous. Call `AskQuestion` with this exact shape (substitute the bracketed values from the Problem Record you just posted):

```json
{
  "title": "Close issue #<number> as already-resolved?",
  "questions": [
    {
      "id": "close-or-housekeeping",
      "prompt": "Status is 'Already resolved in current code', fixed in <sha> (shipped in v<x.y.z>) and verified in <environment>. What do you want to do?",
      "options": [
        { "id": "close",       "label": "(A) Close the issue, citing the fix commit and shipping version" },
        { "id": "housekeeping","label": "(B) Leave open and draft a housekeeping Change Record (e.g. regression test)" },
        { "id": "stop",        "label": "Neither — stop here, I'll decide later" }
      ]
    }
  ]
}
```

Treat the user's response strictly: only `close` is approval to perform the close. `housekeeping` switches to drafting an `itil-change-record`. `stop` leaves the issue open and ends the turn. Any freeform text reply that is not an unambiguous "yes, close it" should be re-prompted with the same `AskQuestion` call rather than interpreted.

**On approval — close the issue:**

1. Write the closing comment to a temp file (PowerShell-safe). The comment **must** include the fix commit SHA, the shipping version, the verified environment, and a one-line ask to the reporter:

   ```markdown
   Closing as already-resolved.

   **Fix commit:** [`<sha>`](https://github.com/Columbia-Cloudworks-LLC/EquipQR/commit/<sha>) — <one-line summary>
   **Shipping version:** v<x.y.z> (current `package.json`)
   **CHANGELOG:** see entry under v<x.y.z>
   **Verified in:** <Local dev | Preview | Production> — <one-line description of what was clicked / asserted>

   @<reporter-handle-if-known>: please upgrade to v<x.y.z> (or hard-refresh the app to pick up the new bundle) and re-test. If the symptom still occurs after upgrade, reopen this issue with fresh diagnostics (browser version, account, screenshot, and timestamp) and we'll open a new Problem Record.
   ```

2. Post the comment, then close the issue. Use two commands — `gh issue close` only takes `--comment` (single string) which mangles multi-line markdown on PowerShell:

   ```powershell
   gh issue comment <number> --body-file <temp-file.md>
   gh issue close   <number> --reason completed
   ```

3. Delete the temp file.
4. Confirm closure (`gh issue view <number> --json state,closedAt`) and report the closure URL in chat.

**On rejection** (user picks **(B)** or declines to close): leave the issue open and switch to drafting the housekeeping Change Record per `itil-change-record`. Do **not** post a closure comment.

## Strict guardrails

- **Read-only on code.** This skill must not modify production code, run migrations, push branches, or open PRs. The agent runs liveness probes and tests against the running stack but performs **no source edits**.
- **Agent does not run `dev-start.bat`.** The user starts the stack. The agent probes, instructs, waits, re-probes. This separation prevents the agent from masking environment problems by silently bouncing services.
- **Reproduction is mandatory; deferral is mandatory if the stack is broken.** No reproduction → no root cause → no Problem Record. If the stack cannot be brought up clean after Tier 4, post the deferral comment (Step 3e) and stop. No exceptions, regardless of how confident a hunch feels.
- **"Clean" means zero warnings and zero errors of any kind** in the `dev-start.bat` output (see Step 3 cardinal rule above for the full definition and known-failure-mode catalog at `.cursor/rules/local-dev-troubleshoot.mdc`). Yellow text counts. Skipped checks count. If anything is not OK, escalate the bring-up tier or defer.
- **Single issue only.** One invocation = one Problem Record for one issue.
- **No blind guessing.** If reproduction fails on a clean stack or evidence is thin, say so in the record and recommend returning to the reporter — do not fabricate a cause.
- **No scope creep.** If you discover unrelated bugs during reproduction, list them under **Related issues or recent commits** and recommend they be filed separately. Do not roll them into this Problem Record.
- **Security first.** Never paste full secrets, tokens, service-role keys, or full JWTs into the Problem Record, the GitHub comment, or chat. Reference by name + first 4–8 chars only when comparing for parity. See [security-supabase](../../rules/security-supabase.mdc).
- **Stop at posting.** Do not draft the Change Record in the same turn unless the user explicitly asks. The user is the change authority.
- **Closing issues is allowed only on the already-resolved path, only with explicit AskQuestion approval.** The agent may close a GitHub issue from within this skill **iff** all four Step 7 preconditions are met: (1) Step 2b's fix-evidence sweep found a prior fix, (2) the posted Problem Record's reproduction status is **Already resolved in current code**, (3) verification in Step 3d showed the symptom does not occur in the appropriate environment (local / preview / production), and (4) the user selected the `close` button in the `AskQuestion` prompt defined in Step 7 in the same turn. Never close based on code evidence alone — verification in the appropriate environment is required. Never close on implicit consent ("ok", "thanks", silence, emoji). Never close on a freeform text "yes" — re-prompt with `AskQuestion` until a button is clicked. On rejection, leave the issue open. On any uncertainty, do not close.
- **Approval and next-step prompts MUST use `AskQuestion` with buttons.** Anywhere this skill asks the user to choose a next step (Step 6 next-step question, Step 7 close-or-housekeeping question, future similar branch points), the agent must call the `AskQuestion` tool with the exact JSON shape specified in that step. Buttons are deterministic; freeform text answers to a freeform text question are not. If a future branch point needs a new approval, add a new `AskQuestion` call rather than asking inline.

## Authoring constraints

- **Reproduction Steps** must be reproducible by a junior developer from the record alone.
- **Evidence** must point at concrete artifacts (file:line, quoted error text, test output) — not "I noticed that…".
- **Root Cause** must be traced to code or config. If unknown, write "Underlying cause not yet identifiable; see Recommended Resolution Direction for investigation paths."
- **Recommended Resolution Direction** must be a *direction*, not a plan — preserve Plan-mode's job.
- **Recommended Execution Model (for the upcoming Change Record)**: Mandatory whenever the Problem Record's reproduction status is **Reproduced** / **Could not reproduce** / **Not applicable** (i.e. a Change Record will follow). Load the [model-recommender](../model-recommender/SKILL.md) skill and pass the work shape inferred from **Recommended Resolution Direction**. Embed the standardized block verbatim. This pre-stages the recommendation so the subsequent `itil-change-record` invocation can lift it directly into the Change Record's own **Recommended Execution Model** section. Skip ONLY when reproduction status is **Already resolved in current code** — closure does not need a model recommendation.

## Progressive disclosure

- For the prior ITIL step (production-verified reproduction with screenshot + cross-system evidence on the GitHub issue), follow [itil-incident-record](../itil-incident-record/SKILL.md). That skill is what turns a raw reporter description into an Incident Record this skill can build on.
- For local stack, env files, and MCP integrations used during reproduction, follow [toolbelt](../toolbelt/SKILL.md).
- For the next ITIL step (the implementation plan), follow [itil-change-record](../itil-change-record/SKILL.md).
- For the **Recommended Execution Model (for the upcoming Change Record)** section's model + Cursor tier choice, follow [model-recommender](../model-recommender/SKILL.md). It reads the EquipQR model research at `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` and emits the standardized block this Problem Record embeds verbatim.
- For feature / enhancement / vendor-cost issues (non-bug), use [itil-service-request](../itil-service-request/SKILL.md) instead — that skill evaluates feasibility, dollar cost, and market viability before a Change Record is drafted.
- For non-issue, ad-hoc planning that has no Incident Record, [itil-change-record](../itil-change-record/SKILL.md) can still be invoked directly with a brief Business Justification in lieu of a Problem Record reference.
