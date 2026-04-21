---
name: itil-service-request
description: Mandates an ITIL-style Service Request for exactly ONE GitHub issue (a feature request, enhancement, or capability gap) in EquipQR — the agent reads the issue, researches the cost (in dollars only, never time or effort) and feasibility of the requested feature, and when warranted scans the market for similar implementations to model the build on (preferring open-source projects). The agent makes NO code changes; it produces a Service Request comment on the issue and prints it in chat as the authorization context for a subsequent itil-change-record. Includes research-driven sections — Short Description, Description, Scope, External Dependencies, Potential Costs, Market Viability, Examples, and Vendor-side Setup Procedures (researched click-by-click steps for every vendor dashboard action the request implies, with "could not confirm" callouts when a feature can't be verified live). Use whenever the user asks the agent to "evaluate", "scope the cost of", "research", "draft a service request for", "look at this feature request", or "is this feasible" against a GitHub issue tagged feature / enhancement / chore-with-vendor-cost, references an issue number (#NNN) or issue URL framed as a feature ask, or starts the ITIL flow on a non-bug request. One prompt, one issue, one Service Request.
---

# ITIL Service Request (EquipQR)

## How this fits the ITIL flow

This repository treats ITIL roles as follows:

| ITIL artifact | EquipQR equivalent |
|---|---|
| Incident Record | A GitHub Issue reporting a bug / regression / defect |
| Problem Record | Output of [`itil-problem-record`](../itil-problem-record/SKILL.md) — root cause + reproduction posted on a bug issue |
| **Service Request** | **Output of *this* skill** — feasibility, cost, and market evaluation of a feature / enhancement issue |
| Change Record | Output of [`itil-change-record`](../itil-change-record/SKILL.md) — the implementation plan, in Plan mode, awaiting user approval |
| Change Implementation | What runs after the user approves the Change Record ("clicks build") |

A bug issue runs `itil-problem-record` → `itil-change-record`. A **feature** / **enhancement** / **vendor-cost** issue runs **`itil-service-request` → `itil-change-record`**. The Service Request answers: *"Is this worth building, what will it cost in dollars, and how have others done it well?"* It does **not** plan the implementation — that is the Change Record's job.

## Mandatory rule

For **this repository only**, when the user asks the agent to evaluate or scope a non-bug GitHub issue, the agent must:

1. Operate against **exactly one** GitHub issue.
2. Research the request — never fabricate cost numbers, never invent vendor names, never guess pricing.
3. Produce the Service Request using the **exact** structure below.
4. Post it as a comment on the GitHub issue **and** print it in chat.
5. **Stop** after posting. Do not draft the Change Record, do not branch, do not modify code — that is `itil-change-record`'s job.

## One prompt, one issue, one Service Request

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

> I need exactly one GitHub issue to write the Service Request for. Please reply with the issue number (e.g. `#1234`) or full issue URL. I will not proceed without it.

Re-validate after the user responds. Only continue once a single issue is locked in.

## When this skill is the right one

Read and follow this skill **every time** you:

- Are asked to evaluate, scope, or research the cost of a GitHub issue framed as a feature, enhancement, integration, or capability gap.
- See `#<number>` or a `github.com/.../issues/<n>` URL paired with phrases like "is this feasible?", "how much would this cost?", "could we build this?", "what would it take?", or "draft a service request".
- Encounter an issue with labels indicating non-bug intent: `enhancement`, `feature`, `feature-request`, `integration`, `chore` (when chore implies a paid vendor/service).
- Start the ITIL flow against a non-incident request.

If the issue is a bug / regression / defect (or labeled as such), use [`itil-problem-record`](../itil-problem-record/SKILL.md) instead. If the user has already approved a Service Request and is asking for the implementation plan, switch to [`itil-change-record`](../itil-change-record/SKILL.md).

## Workflow

### Step 1 — Pull the request

1. Fetch the issue and **all** its comments:
   `gh issue view <number> --json number,title,body,labels,state,assignees,comments,url`
2. Note: type signal from labels, reporter, business context, attached mockups, links to vendors / docs / competitors that the reporter already cited.

### Step 2 — Right-skill check

Before researching, confirm this is a Service Request and not a Problem Record:

- If the issue describes a broken behavior, regression, or defect → **STOP**, recommend `itil-problem-record` instead.
- If the issue mixes a bug report with a feature ask → **STOP**, recommend the user split it into two issues or pick which lens applies first.
- If the issue is a pure feature / enhancement / vendor-integration request → continue.

### Step 3 — Surface-area discovery (read-only)

Map what already exists in the codebase that the request would touch. This is **read-only context-building**, not implementation planning.

1. Use Grep / Glob to locate relevant code: feature names, route segments, vendor-prefixed env vars (e.g. `VITE_*`, `*_API_KEY`), table names, edge function paths, related component / hook names.
2. Identify whether the requested area exists today (partial implementation, dead code, feature flag) or is greenfield.
3. Identify the data layer touchpoints: Supabase migrations in `supabase/migrations/`, edge functions in `supabase/functions/`, RLS policies, generated types in `src/integrations/supabase/types.ts`.
4. Identify any existing third-party integrations the request would extend (QuickBooks, Resend, Google Maps, hCaptcha, etc.) by scanning [`.env.example`](../../.env.example).
5. Note: the goal is not to design the change — it is to populate **Scope** with concrete file / route / table / function references and to inform **Potential Costs** (e.g. "extends an integration we already pay for" vs. "introduces a brand-new vendor").

### Step 4 — Vendor & cost research (dollars only)

This is the heart of the Service Request. The user has been explicit: **cost = dollars, not time or effort.** Do not estimate engineering hours. Do not mention "X sprints" or "Y story points." If the request requires a paid service, find real numbers.

Use the toolbelt's preferred research tools — see [toolbelt](../toolbelt/SKILL.md):

- **`plugin-context7-plugin-context7`** — for SDK / library / API documentation. Always use this before quoting library capabilities or auth models.
- **`firecrawl`** — for live vendor pricing pages, marketplace listings, and product docs. Use this in place of any built-in web fetch / search. Pricing pages change; always pull live and cite the URL + the date you pulled it.

For each candidate vendor or dependency:

1. Confirm the vendor and product name (no acronym soup, no hallucinated SKUs).
2. Capture the published pricing model — pay-as-you-go, per-seat, per-event, per-MAU, tiered subscription, free tier limits.
3. Quote a representative price for **EquipQR's likely usage envelope**. If you do not know the usage envelope, write a sensitivity range (e.g. "$0 up to 1k events/mo on free tier; ~$0.0006/event after; at 100k events/mo ≈ $60/mo").
4. Note any **up-front** cost separately from **recurring** cost (one-time setup fees, certification fees, security review fees).
5. Note **billing cadence** — monthly, annual, per-call, per-token, prepaid credits.
6. Note any **free tier** that fully covers a reasonable EquipQR pilot, and the threshold at which the meter starts.
7. If the request has **no external dependency** (pure in-app feature), write "$0 — no third-party services required" in **Potential Costs** and skip vendor research. Still complete the rest of the Service Request.

If a price page requires login, displays "Contact Sales", or is otherwise opaque: say so explicitly in the record. Do not guess. Recommend the user request a quote.

### Step 5 — Feasibility check

Determine whether the request is buildable today against the EquipQR stack (React / Vite / Supabase / Edge Functions / Vercel — see [tech-stack](../../rules/tech-stack.mdc)). Three outcomes:

- **Feasible** — clear path with our current stack and one-or-fewer new vendors. Continue to Step 6 normally.
- **Feasible with caveats** — buildable, but requires a non-trivial new dependency, a security/compliance gate, or a schema/RLS change that the reporter did not mention. List the caveats explicitly in **Scope → Outside scope** or **Market Viability**.
- **Vague or infeasible** — the request lacks enough detail to scope cost, OR the request demands capabilities the stack genuinely cannot deliver without a major architectural shift (e.g. requires a native mobile binary when EquipQR ships as a PWA, requires real-time video conferencing, requires on-premise hosting). When this happens, the **Market Viability** section becomes the centerpiece — see Step 6.

### Step 6 — Market & examples scan (only when warranted)

Skip Steps 6a / 6b only if the request is trivial and self-evidently feasible (e.g. "add a copy-to-clipboard button on the equipment ID field"). Otherwise:

#### Step 6a — Market viability research

Run when the request is **vague**, **infeasible**, or **expensive**. Use `firecrawl` to:

1. Search for the feature category (not the brand) — e.g. "fleet equipment QR inspection mobile app", "QuickBooks-integrated work order billing", "barcode-scanning maintenance log".
2. Identify whether the feature is table-stakes in the segment (table-stakes → high market viability), niche-but-validated (real customers pay for it → medium), or unproven (no clear market → low).
3. Look at adjacent SaaS pricing in the same segment to triangulate whether EquipQR users would tolerate the cost overhead. Do not invent numbers — cite real product pages.

If the request is vague, the Market Viability section should explicitly state what the agent would need from the reporter to convert vagueness into a scopeable Service Request (specific user persona, specific workflow step, specific data shape, specific success metric).

#### Step 6b — Examples (open-source preferred)

Find 2–4 examples of products or services that already implement the requested feature **well enough to model on**. Order of preference:

1. **Open-source projects** — these are the gold standard because the agent can read their code, copy their patterns, and avoid licensing entanglement. Search GitHub topics, awesome-lists, and project READMEs via `firecrawl`.
2. **Documented commercial products with public docs / changelogs / blog posts** — useful as UX references even when the source is closed.
3. **Direct competitors** — name them honestly. The user explicitly accepts competitor citations.

For each example, capture:
- Product name + one-sentence positioning
- URL (repo for OSS, marketing site for commercial)
- License (for OSS — confirm it is compatible with the repo's licensing posture)
- The **specific aspect** of the feature they do well (UX flow, data model, API shape, pricing transparency) — not just "they have it"

If you genuinely cannot find prior art, write that out — "No comparable open-source implementation found; closest commercial reference is X." Do not pad with weak examples.

#### Step 6c — Vendor-side setup-step research (mandatory whenever the request implies any 3rd-party dashboard action)

The user has been explicit: **any time the request implies the user (or the agent) navigating a 3rd-party website to set something up — provisioning an API key, minting a Service Account, upgrading a plan, opting into a paid feature, installing a marketplace plugin, or any other vendor-dashboard action — the Service Request must include researched, click-by-click steps. If the steps cannot be found, the Service Request must say so explicitly so the user knows the feature might not exist or that they will need to hunt for it.**

Run this step whenever **any** of the following appears in the request, the External Dependencies, the Potential Costs, or the Recommended Next Step:

- Provisioning a new API key, PAT, service-account JSON, OAuth app, or webhook secret in any vendor dashboard
- Upgrading a vendor plan tier (Pro → Team, Team → Enterprise, etc.)
- Opting into a paid feature (audit logs, SIEM streaming, advanced retention, etc.) inside a vendor dashboard
- Installing a marketplace plugin / extension / integration on a vendor's marketplace
- Configuring a vendor-side webhook, SCIM provisioner, SSO integration, or audit-log destination
- Rotating an existing credential per a published vendor procedure
- Anything that requires the user to leave their IDE and click through a vendor portal

Skip this step ONLY when the request is fully implementable inside the EquipQR codebase with zero vendor-side dashboard interaction (e.g. "add a sort dropdown to the equipment list" — no 3rd-party setup at all).

For each in-scope vendor-side action, populate one labeled subsection (A, B, C, …) under **Vendor-side Setup Procedures** in the template below. Each subsection must:

1. **State whether the feature was confirmed via live vendor docs in this session.** Use one of three statuses, and write the status as the first line of the subsection:
   - **"Confirmed exists."** — followed by the source URL (vendor docs / pricing page / marketplace listing) and the date pulled.
   - **"Confirmed exists in the EquipQR setup but currently <state>."** — when the feature is part of the EquipQR architecture today but in a non-default state (disabled, partially configured, etc.).
   - **"Could not confirm — feature may not exist in the form the issue assumes."** — when `firecrawl` / `plugin-context7-plugin-context7` / vendor docs do not document the feature, or the documented path is plan-locked / region-locked / paywalled in a way the user might not anticipate. **Tell the user explicitly that they may need to hunt for it, contact vendor support, or that the feature might not actually exist as described.**
2. **List the click-by-click steps** as a numbered list. Use real UI labels (button names, sidebar entries, settings tabs) as they appear in the vendor's docs. Do not paraphrase UI labels — match what the user will actually see. Include direct deep-link URLs whenever the vendor publishes them (e.g. `https://github.com/settings/personal-access-tokens/new`, `https://app.datadoghq.com/organization-settings/api-keys`). Use the vendor's exact terminology even when it conflicts with EquipQR's terminology.
3. **Call out vendor-specific gotchas** explicitly. Examples worth including when applicable: One-Time Read modes (Datadog Application Keys post-Aug 2025), required IAM org-policy exemptions (GCP `iam.disableServiceAccountKeyCreation`), platform-specific limitations (1Password Environments local mounts being macOS/Linux only), required parent role/permission to perform the action, and any "this requires X plan tier" gates that aren't obvious from the dashboard URL alone.
4. **State the post-setup verification step** that confirms the action worked (e.g. "re-run `.\scripts\op-mcp-doctor.ps1`", "open Cursor → Settings → Hooks → Execution Log and look for `<entry>`", "verify the table shows a checkmark icon next to enabled services").
5. **Cross-link any cost implications back to Potential Costs.** If the action is the upgrade that unlocks the cost line item, say "see Potential Costs → Recurring cost for the price of this upgrade" so the reader does not have to triangulate.

Use `firecrawl` to pull the vendor's live setup docs (preferred) and the vendor's live pricing/marketplace page when an upgrade or marketplace install is involved. Use `plugin-context7-plugin-context7` only for SDK / library docs — vendor *dashboard* procedures live on vendor marketing/docs sites, which `firecrawl` is the right tool for. Cite the exact URL and the date pulled (today's date — see `Date evaluated` at the top of the Service Request).

Do NOT include screenshots in the Service Request comment — comments render as markdown and screenshots blow up the diff. Direct deep-link URLs in step lists are sufficient.

If a vendor's documented path requires the user to log in to view (e.g. dashboard URLs that 302 to a login page when fetched anonymously), include the login-gated URL anyway and note "(requires authenticated session in vendor dashboard)" so the user knows the link will redirect to login first.

Add a final subsection at the end called **"I. Vendor-side actions that this Service Request does NOT trigger"** (rename the letter as needed based on how many setup subsections precede it). Use this to head off the common misconception that the Service Request requires creating new vendor accounts / projects / SAs / vault items when those already exist. List each non-action with a ❌ and a one-line rationale (e.g. "❌ Create new Supabase project (`ymxkzronkhwxzcdcbnwq` is the production project; no new project needed)"). This subsection is mandatory whenever the EquipQR setup has pre-existing vendor resources that a fresh reader might assume need re-creation.

### Step 7 — Author the Service Request

Use these **exact** top-level headers (`##`). The seven required field sections are mandatory and ordered.

```markdown
## Service Request — Issue #<number>

- **Issue:** [#<number> — <title>](<url>)
- **Type:** <feature | enhancement | integration | chore-with-vendor-cost>
- **Labels:** <list>
- **Reporter:** <username>
- **Date evaluated:** <YYYY-MM-DD>

## Short Description

[One-line title, ≤ 100 chars, action-oriented. Restates the request as a deliverable, not a complaint. Example: "Add scheduled email digest of open work orders to org admins via Resend."]

## Description

[3–5 sentences describing the request. Sentence 1: what the reporter wants. Sentence 2: why they want it (business / user value). Sentence 3: where in the app it surfaces. Sentence 4 (optional): what triggers or activates it. Sentence 5 (optional): what success looks like to the reporter.]

## Scope

- **Users impacted:** [Who benefits and at what cardinality — e.g. "all org admins (~N today across M organizations)", "fleet managers using the mobile PWA only", "every authenticated user". Use real numbers from the codebase / data when available; write "unknown — recommend the reporter clarify" when not.]
- **Systems / code in scope:** [Concrete file / route / table / edge function references from Step 3 — e.g. `src/pages/WorkOrders.tsx`, `supabase/functions/send-digest/`, `work_orders` table, RLS policy `work_orders_org_read`. If greenfield, say so and name the proposed surface.]
- **Outside scope:** [What this Service Request explicitly does NOT cover — e.g. "Does not cover SMS delivery", "Does not modify QuickBooks invoice posting", "Does not introduce a new permission tier". This protects the Change Record from scope creep.]

## External Dependencies

[Numbered list. For each dependency: name, role in the feature, and a working URL to the canonical doc / pricing / API reference.]

1. **<Vendor / library name>** — <one-line role> — <URL>
2. […]

[If none: "None — feature is fully implementable with the existing stack and no new third-party services."]

## Potential Costs

- **Up-front cost:** [One-time fees — e.g. "$0", "$500 setup fee for X", "$2,000 annual security review for HIPAA-eligible vendor Y". Cite source URL.]
- **Subscription required for intended functionality?** [Yes / No, with one-line rationale. If "No, free tier covers expected usage", state the free-tier threshold and EquipQR's projected position relative to it.]
- **Recurring cost:** [Amount + cadence + sensitivity. Examples: "$20/mo flat", "$0.0006 per email; ~$60/mo at 100k emails/mo; ~$6/mo at 10k", "$15/seat/mo billed annually". Cite the pricing page URL and the date pulled.]
- **Cost confidence:** [High / Medium / Low — High if pulled from a public pricing page today, Medium if extrapolated from a free-tier overage rate, Low if "Contact Sales" / no public pricing.]

## Market Viability

[Mandatory when the request is vague, infeasible, or expensive (Step 5). Optional but recommended otherwise. Cover: (1) is this feature table-stakes / niche-validated / unproven in the segment? (2) what comparable SaaS products charge users for capability in this neighborhood; (3) for vague requests, the specific clarifications the reporter needs to provide before this can become a Change Record. Cite real products / URLs — no hand-waving.]

## Examples

[2–4 examples of products or services that implement this feature well, in priority order: open-source first, then documented commercial, then direct competitors. Skip only if the request is trivially small.]

1. **<Product name>** — <OSS | commercial | competitor> — <URL> — <license if OSS> — <the specific aspect they do well that we should model on>
2. […]

[If none found: "No comparable implementation found in research; closest reference is <X>." Do not invent examples to fill the section.]

## Vendor-side Setup Procedures

[Mandatory whenever the request implies any 3rd-party dashboard action (provisioning a key, upgrading a plan, opting into a paid feature, installing a marketplace plugin, configuring a webhook, rotating a credential per vendor procedure, etc.). Skip this section ENTIRELY only when the request is fully implementable inside the EquipQR codebase with zero vendor-side dashboard interaction.

For each in-scope action, populate one labeled subsection (A, B, C, …) per Step 6c. Each subsection MUST start with a status line: "Confirmed exists." (with source URL and date pulled), "Confirmed exists in the EquipQR setup but currently <state>." (when the feature is in a non-default state today), or "Could not confirm — feature may not exist in the form the issue assumes." (when vendor docs do not document the feature; tell the user explicitly that they may need to hunt for it or that the feature might not exist as described).

Each subsection MUST include: click-by-click numbered steps using real UI labels, direct deep-link URLs whenever the vendor publishes them, vendor-specific gotchas (One-Time Read modes, required org-policy exemptions, platform-specific limitations, plan-tier gates), the post-setup verification step, and a cross-link back to Potential Costs when the action is the upgrade that unlocks a cost line item.

End with a final subsection "I. Vendor-side actions that this Service Request does NOT trigger" (renumber the letter as needed) listing each commonly-imagined "I need to set up X" action that is NOT required because the EquipQR vault / production project / vendor resource already exists. Use ❌ + one-line rationale per non-action.]

### A. <Action name — e.g. "Mint or rotate `<credential>` <type>" or "Upgrade <vendor> to <plan>" or "Install <plugin> via <marketplace>">

**<Status line — e.g. "Confirmed exists."> Source: <URL> (pulled <YYYY-MM-DD>).**

1. <Step 1 — real UI label, deep link if available>
2. <Step 2 — call out gotchas inline as sub-bullets when relevant>
3. <…>

[Verification step + cross-link to Potential Costs if applicable.]

### B. <Next action…>

[…]

### I. Vendor-side actions that this Service Request does NOT trigger

[Rename the letter to match the actual count. Mandatory whenever pre-existing vendor resources might be misread as needing re-creation.]

- ❌ <Non-action> (<one-line rationale>)
- ❌ […]

## Recommended Next Step

[One of:
- **Proceed to Change Record** — request is feasible, costs are bounded and acceptable, examples exist. Recommend the user invoke `itil-change-record` next.
- **Proceed to Change Record with conditions** — feasible but requires the user to (a) approve the recurring cost, (b) sign a vendor contract, (c) provision keys in Vercel + Supabase before build. List the conditions.
- **Return to reporter** — request is too vague to scope; list the exact clarifications needed.
- **Decline** — request is infeasible against the current stack or market viability is too weak to justify the cost. Explain succinctly.]

## Authorization to Proceed

Status: **Awaiting user approval to draft the Change Record (or to take the recommended alternative action above).**
```

### Step 8 — Post the Service Request

1. Print the full Service Request in chat.
2. Post it as a comment on the GitHub issue:
   ```powershell
   gh issue comment <number> --body-file <temp-file.md>
   ```
   Write the body to a temp file first to preserve markdown formatting, then delete the temp file. Do **not** use `--body "..."` for multi-line content on PowerShell.
3. Apply a label that signals evaluation is complete (e.g. `triage:scoped` or `service-request-posted`) **only if** such a label already exists in the repo (`gh label list`). Do not create new labels.
4. **STOP.** Tell the user the Service Request is posted, then ask the next-step question via `AskQuestion` (buttons — never freeform text — they are deterministic and trivial to act on):

   ```json
   {
     "questions": [
       {
         "id": "next-step",
         "prompt": "Service Request is posted on issue #<number>. What's next?",
         "options": [
           { "id": "draft-change-record", "label": "Draft the Change Record (invoke itil-change-record)" },
           { "id": "return-to-reporter", "label": "Leave open — return to reporter for clarifications" },
           { "id": "decline",             "label": "Recommend declining the request" },
           { "id": "stop",                "label": "Stop here — I'll come back to this later" }
         ]
       }
     ]
   }
   ```

Treat the user's response strictly: only an explicit button selection moves to the next action. Freeform "yeah do it" replies should be re-prompted via `AskQuestion`.

## Strict guardrails

- **Read-only on code.** This skill must not modify production code, run migrations, push branches, or open PRs. Discovery (Grep / Glob / Read) is allowed; edits are not.
- **No engineering-effort estimates.** Cost = dollars only, per the user's explicit direction. Never estimate hours, days, story points, sprints, or "level of effort." If a vendor's cost depends on usage you cannot estimate, write a sensitivity range and cite the rate, not a guess at duration.
- **No fabricated pricing.** Every dollar figure in **Potential Costs** must trace to a live URL pulled this session via `firecrawl`, with the date noted. If pricing is hidden behind "Contact Sales", say so — do not invent a number.
- **No fabricated vendors.** If you cannot name a real product on a real URL, do not name one. The Service Request is a research artifact; its credibility is the only thing it has.
- **No fabricated examples.** Open-source examples must be real GitHub repos with real URLs. Commercial examples must be real products with real marketing pages. "I think company X probably does this" is not an example.
- **No fabricated vendor-side setup steps.** Every numbered step under **Vendor-side Setup Procedures** must trace to a vendor doc / pricing page / marketplace page that the agent pulled live this session via `firecrawl`, with the URL and date noted at the top of the subsection. If the steps cannot be confirmed, the subsection MUST start with "Could not confirm — feature may not exist in the form the issue assumes." and tell the user explicitly that they may need to hunt for it or contact vendor support.
- **No skipping Vendor-side Setup Procedures when 3rd-party dashboard actions are implied.** Per Step 6c, this section is mandatory whenever the request implies any vendor-dashboard action — provisioning a credential, upgrading a plan, opting into a paid feature, installing a marketplace plugin, configuring a webhook/SSO/SCIM, rotating a credential per vendor procedure, etc. The section is skippable ONLY when the request is fully implementable inside the EquipQR codebase with zero vendor-side dashboard interaction.
- **Single issue only.** One invocation = one Service Request for one issue.
- **Bug issues belong to `itil-problem-record`, not here.** If the issue is a bug / regression / defect, stop and route the user to the right skill.
- **No Change Record content.** Do not write Implementation Steps, Testing Plan, Backout Plan, or Branch & Commit Plan in the Service Request. Those belong to `itil-change-record` and emerge from Plan mode after the user approves this Service Request.
- **Stop at posting.** Do not invoke `itil-change-record` in the same turn unless the user explicitly approves it via the `AskQuestion` next-step prompt.
- **Approval and next-step prompts MUST use `AskQuestion` with buttons.** The same rule the other ITIL skills enforce — buttons are deterministic; freeform text is not.

## Authoring constraints

- **Short Description**: ≤ 100 chars, action-oriented (verb-first), restates the deliverable.
- **Description**: 3–5 sentences. No bullet lists. No headers. Prose.
- **Scope**: Real numbers and real file paths wherever the codebase / data supports it. "Unknown — clarify with reporter" is acceptable; vague gestures like "many users" are not.
- **External Dependencies**: Working URLs only. If a doc URL 404s when you cite it, fix the link or remove the dependency.
- **Potential Costs**: Every figure cites a URL and a date. The **Cost confidence** field is mandatory.
- **Market Viability**: Required when feasibility from Step 5 is "vague" or "infeasible" or when **Potential Costs → Recurring cost** is non-trivial. Optional otherwise — but write at least one sentence even when optional, so the reader knows you considered it.
- **Examples**: 2–4 real, citable products. Open-source first. License noted for OSS. Skip only when the request is trivially small AND you note that explicitly.
- **Vendor-side Setup Procedures**: Mandatory whenever the request implies any 3rd-party dashboard action (see Step 6c trigger list). Each subsection must lead with a status line ("Confirmed exists." / "Confirmed exists in the EquipQR setup but currently <state>." / "Could not confirm — feature may not exist in the form the issue assumes."), include the live source URL + date pulled, use real UI labels in numbered steps, surface vendor-specific gotchas inline, end with a verification step, and cross-link cost-implication subsections back to **Potential Costs**. Always include a final "actions this Service Request does NOT trigger" subsection when pre-existing vendor resources might be misread as needing re-creation.
- **Recommended Next Step**: Pick exactly one of the four options. No "it depends" — make the call so the user has something to react to. When **Vendor-side Setup Procedures** has subsections, cross-reference them by letter (e.g. "see **Section G**") in the conditions list so the user can act on the next step without scrolling.

## Progressive disclosure

- For research tools (`firecrawl`, `plugin-context7-plugin-context7`, `gh`) and how to call them in EquipQR, follow [toolbelt](../toolbelt/SKILL.md).
- For the prior ITIL step on bug issues (reproducing and root-causing), follow [itil-problem-record](../itil-problem-record/SKILL.md).
- For the next ITIL step (the implementation plan), follow [itil-change-record](../itil-change-record/SKILL.md).
- For the EquipQR stack constraints that drive the Step 5 feasibility judgment, follow [tech-stack](../../rules/tech-stack.mdc).
