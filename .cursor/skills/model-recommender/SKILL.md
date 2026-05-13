---
name: model-recommender
description: Recommends the cheapest specific execution model that can safely complete a given work shape (Composer 2 / Cursor Auto first, premium models only when the work cannot be split smaller), grounded in the EquipQR model research report at `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md`. Other plan-creating skills (`itil-change-record`, `itil-problem-record`, `itil-service-request`, `pencil`, `master-mason`, `devops-triage-dispatch` Phase 2) MUST load this skill and embed its standardized **Recommended Execution Model** output block in their own outputs. Also use standalone when the user says "what model should I use", "recommend a model", "which model for this", "pick the model", or asks model-selection questions. Read-only; safe in Plan mode.
---

# Model Recommender (EquipQR)

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Purpose

Map a work shape (single-file fix, multi-file refactor, schema migration, deep root-cause debug, security audit, vendor-doc research, agent-swarm orchestration, etc.) to the **cheapest sufficient specific model** in the EquipQR model research report - and to a **Cursor billing tier** for users who select via the IDE picker - then emit a standardized markdown block that other skills embed verbatim.

Composition is the point. Plan-creating skills like `itil-change-record` do not maintain their own model tables. They invoke this skill, take its output, and paste it into their own **Recommended Execution Model** section.

## Cheap-model planning contract

For implementation plans, this skill optimizes for total execution cost, not for the strongest available model. The default target is `Composer 2 (fast)` or Cursor **Auto** whenever the plan can be made sufficiently explicit. Premium/MAX recommendations are allowed only when the work is indivisible after reasonable slicing, such as an RLS/security decision that must be reasoned about as one unit, a cross-repo audit that genuinely needs >200K context, or a production incident investigation that depends on deep log correlation.

When another planning skill passes a broad work shape that maps to Premium/MAX, first ask: "Can this be split into smaller independently verifiable plans that a cheap model can execute?" If yes, recommend splitting and make the **Recommended Execution Model** for each slice cheap. If no, keep the higher-tier recommendation and state the indivisible reason in **Constraints surfaced**.

## Source of truth

The model research lives at:

```
docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md
```

(Note the double space between "Report" and "28" in the filename — this is intentional in the source file.)

This skill is a **lookup harness**, not a duplicate of the report. Every recommendation must be cross-checked against the report at invocation time:

- The model still exists (not removed from the report).
- The model is **not deprecated** — Claude Sonnet 4 retires June 15, 2026, Claude Opus 4 (original 4.0) retires June 15, 2026, Gemini 2.5 Flash shuts down June 17, 2026.
- The pricing tier hint in this skill matches the report's pricing table.
- For Cursor-only models (Composer series), the user is actually running inside Cursor IDE.

If the report has been updated and contradicts this skill's model facts (availability, pricing, context, deprecation, capabilities), **the report wins**. The cheap-model planning policy still wins for scope decomposition: split broad implementation work before recommending a stronger model. Surface factual discrepancies in the recommendation as a "matrix outdated" callout so a future maintainer can reconcile.

## When to read this skill

Read and follow this skill **every time** you:

- Are running another plan-creating skill (`itil-change-record`, `itil-problem-record`, `itil-service-request`, `pencil`, `master-mason`, `devops-triage-dispatch`) and that skill says "embed model-recommender output here". Composition is the primary path.
- Receive a standalone "what model should I use", "recommend a model for X", "which model handles Y best", or "pick the model" request from the user.
- Are about to dispatch work to a fresh execution agent and need to suggest the right model in the handoff prompt.
- Are uncertain whether the model currently driving the conversation is well-matched to the work — recommend a swap when the mismatch is material (e.g. user is on Composer 1 but the task is a 1M-context full-repo audit).

## Workflow

### Step 1 — Identify the work shape

Determine which row of the **Work-shape decision matrix** below matches the task. Use the input you have:

- An ITIL artifact (Change Record, Problem Record, Service Request) — read the **Implementation Steps** / **Recommended Resolution Direction** / **Scope** to infer shape.
- A `pencil` spec — read the **File Plan / Boilerplate Map** and **Acceptance Criteria** to infer scale.
- A `master-mason` audit synthesis — the **Cross-Lens Synthesis** priority table tells you which lens dominates (security → plumb model, performance → gauge model, etc.).
- A `devops-triage-dispatch` Phase 1 finding — the identified scenario maps directly to a row.
- A standalone user prompt — ask one clarifying question if the shape is genuinely ambiguous; do not guess across two materially different shapes.

If the work spans **multiple shapes** (e.g. multi-file refactor + security audit), first decide whether the plan can be split into independently verifiable slices. Prefer smaller cheap-model slices over one expensive model recommendation. Pick the **higher-tier** model only when the shapes are genuinely indivisible for correctness or safety; in that case, explain why in **Constraints surfaced**. Do not emit two recommendations in one block - either recommend a cheap slice or justify the higher-tier monolith.

### Step 2 — Read the report and confirm the candidate

Read `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` at the section relevant to the candidate model (Lifecycle, Pricing, Capabilities, Strengths & Weaknesses, Performance, Behavior). Confirm:

1. The model is **listed** and **not deprecated** (deprecation column in Part I and the ⚠ markers in the Appendix).
2. The model's **context window** is sufficient for the task (e.g. don't pick Codex 5.3 Spark's 128K for a full-repo audit).
3. The model's **capabilities** match (vision required? structured outputs required? tool calling required? audio?).
4. The model's **data-training policy** is acceptable for the task's data sensitivity (Part V → API Data Training Policies). EquipQR data is multi-tenant customer data — never recommend Kimi K2.5 via the public Moonshot API for production work; recommend self-hosted only or pick a different model.

If any check fails, fall back to the **Fallback** column for that row.

### Step 3 — Map to a Cursor billing tier

Cursor users select models via Auto / Premium / MAX. The tier hint helps the user (or the dispatching agent) know which Cursor mode unlocks the recommendation:

| Tier | Meaning | When to recommend |
|---|---|---|
| **Auto** | Cursor picks a cost-efficient model from the routing pool. No credit drain on the paid plan (quota-gated since Aug 2025). | The default target for implementation plans. Use when the plan names exact files/symbols, has <=10 tightly scoped files, no schema/RLS ambiguity, and clear verification. Cursor will likely route to Composer 1, Composer 2 fast, or GPT-5.4 Mini, all of which suffice for well-specified slices. |
| **Premium** | User manually selects a specific model from the picker; credits drain at provider rates. | Use only when the work remains non-trivial after splitting: security/RLS reasoning, production incident analysis, high-risk migrations, or multi-file feature work whose correctness depends on cross-cutting reasoning that cannot be encoded into the plan. |
| **MAX** | Premium + extended context (Max Mode). Heaviest credit drain. | Use only when the work genuinely needs >200K context, deepest reasoning, or long-horizon agent loops after attempts to split the work would destroy correctness. |

When in doubt, recommend the lower tier — Premium over MAX, Auto over Premium.

### Step 4 — Emit the standardized output block

Render the **Recommended Execution Model** block (template below) and hand it back to the calling skill. The calling skill embeds it verbatim in its own output.

If invoked standalone, print the block and a one-paragraph rationale referencing the report sections you consulted.

## Work-shape decision matrix

Pick the row that best matches the task. The first model is the primary recommendation; the second is the fallback when the primary is unavailable, deprecated, or constraint-locked.

| Work shape | Primary model | Fallback | Cursor tier | Why |
|---|---|---|---|---|
| Routine single-file fix, typo, lint fix, comment / doc tweak | **Cursor Auto** | **GPT-5.4 Mini** ($0.75/$4.50, 400K) | **Auto** | Cheap, fast, sufficient for <=1 file changes that don't span concepts. |
| Standard multi-file feature implementation (3-10 files, no schema) | **Composer 2 (fast)** ($1.50/$7.50, 200K, IDE-only) | **GPT-5.4 Mini** ($0.75/$4.50, 400K) | **Auto** | A concrete plan with named files, symbols, states, and tests should make this cheap-model executable. If it does not, split the plan further before recommending Premium. |
| Heavy refactor / sprawling rewrite spanning many files / packages | **Split into Composer 2 (fast) slices** | **Claude Sonnet 4.6** ($3/$15, 1M context) for an indivisible slice | **Auto -> Premium only if indivisible** | Start by dividing by module, behavior, or verification gate. Use a premium model only for the slice whose correctness depends on broad simultaneous context. |
| Schema migration + RLS + types regen (Supabase) | **Claude Sonnet 4.6** ($3/$15, 1M) for the schema/RLS decision slice | **Claude Opus 4.7** ($5/$25, 1M) for high-risk tenancy/security ambiguity | **Premium -> MAX only if needed** | Migration/RLS planning can be premium, but implementation should be split into migration, generated types, service update, and tests where possible. Simple non-RLS migrations can still target Composer 2 with explicit SQL. |
| Deep root-cause debugging requiring multi-file trace + log correlation | **Claude Opus 4.7 (xhigh)** | **Codex 5.3 (xhigh)** | **MAX** | Both excel at long-horizon trace following. Opus wins on architectural reasoning; Codex wins on raw coding throughput. |
| Security audit / RLS analysis / compliance sweep (`auditor` skill, `master-mason --lens=plumb`) | **Claude Opus 4.7 (xhigh effort)** | **Claude Opus 4.6** | **MAX** | Lowest red-team breach rate (Opus 4.5 was 4.8% — Opus 4.7 inherits the alignment). Constitutional AI handles regulatory reasoning best. |
| Full-repo audit / large log analysis (>200K context) | **Claude Opus 4.7** (1M, no premium) OR **Gemini 3.1 Pro** (~1M) OR **Grok 4.20** (2M) | **Claude Sonnet 4.6** (1M, $3/$15 — much cheaper) | **MAX** | Pick by data shape: Opus for code reasoning, Gemini for ARC-AGI-style symbolic reasoning, Grok 4.20 when 1M still isn't enough. |
| Fast iterative coding where TTFT matters (live pair-programming, prototyping) | **Composer 1** (~250 tok/s, IDE-only) OR **Codex 5.3 Spark** (1000+ tok/s, 128K, research preview) | **Claude Haiku 4.5** (TTFT ~600ms) | **Auto** | Optimize for TTFT and tok/s. Reasoning depth is secondary when the loop is sub-minute. Codex Spark is preview — flag availability risk. |
| Architectural design / technical spec (`pencil`, `itil-change-record` planning) | **Current planning model, then split execution to Composer 2 (fast)** | **GPT-5.4** ($2.50/$15) when the planner must be changed | **Auto for execution slices; Premium for planning only when needed** | Planning may use a stronger model, but the deliverable should be explicit enough for cheap implementation. If not, break the plan down further. |
| Vendor docs research with citation (`itil-service-request` Step 4–6, `firecrawl` heavy) | **Gemini 3.1 Pro** (Grounding with Google Search, ~1M) | **GPT-5.4** (Computer Use API) | **Premium** | Gemini's grounding-with-search reduces hallucination on live vendor pricing/setup procedures. |
| Multi-agent / agent-swarm orchestration | **Grok 4.20** (up to 16 sub-agents, parallel function calling) | **Kimi K2.5** (1500 tool calls in agent swarm — self-hosted only) | **Premium** | Both purpose-built for sub-agent fanout. Avoid Kimi via public API for EquipQR data (training-policy concern). |
| High-volume classification, extraction, ranking | **GPT-5.4 Nano** ($0.20/$1.25, 400K) | **Claude Haiku 4.5** ($1/$5) OR **Gemini 3 Flash** ($0.50/$3) | **Auto** | Cost-per-call dominates. Don't pay frontier rates for batch classification. |
| Vision-heavy work (UI mockups, screenshot diffing, diagram review) | **Claude Opus 4.7** (3.75MP, 2576px long edge) | **GPT-5.4** (vision + `gpt-image-1.5` output) OR **Gemini 3.1 Pro** (inline image gen) | **Premium** | Opus 4.7 has 3× higher vision resolution than 4.6. GPT-5.4 wins when image *output* is also required. |
| Agentic computer-use tasks (browser automation, form filling, OSWorld-style) | **GPT-5.4** (75% OSWorld) | **Claude Sonnet 4.6** (72.5% OSWorld) | **Premium** | OSWorld scores translate directly to live computer-use reliability. |
| Ambiguous / mixed shape, low-stakes | **Cursor Auto** | n/a | **Auto** | When you cannot match a row with confidence, defer to Auto rather than guess wrong. State the deferral explicitly. |

## Constraint table (what to AVOID)

These models should **not** appear in a recommendation unless the user explicitly requests them and accepts the trade-off:

| Model | Reason to avoid | Acceptable use |
|---|---|---|
| **Claude Sonnet 4** | ⚠ Retires June 15, 2026. API calls fail after this date. | Never recommend in new work. |
| **Claude Opus 4** (original 4.0) | ⚠ Retires June 15, 2026. | Never recommend in new work. |
| **Gemini 2.5 Flash** | ⚠ Shuts down June 17, 2026. | Never recommend; recommend Gemini 3 Flash instead. |
| **Kimi K2.5 via public Moonshot API** | Privacy policy permits training on submitted content. EquipQR data is multi-tenant customer data — incompatible. | Self-hosted Kimi K2.5 (open-weight, MIT) is acceptable for non-customer-data workloads. Composer 2 (built on Kimi K2.5 with Cursor's policies) is the consumer-safe alternative. |
| **Grok 4.20 for EU customer data** | xAI under active GDPR investigation as of April 2026 for consumer usage. Enterprise tier is cleaner but unverified for EquipQR-class data. | Acceptable for non-customer data, multi-agent orchestration, or 2M-context experiments. Flag the GDPR concern in the recommendation when EU data is involved. |
| **Codex 5.3 Spark** | Research preview only — separate rate limits, limited availability during high demand, text-only at launch. | Acceptable when speed is the dominant constraint AND the user is tolerant of preview-tier flakiness. Always mark as preview in the recommendation. |
| **Composer series for non-Cursor execution** | Cursor IDE-only — no public API. | Acceptable when the executing agent runs inside Cursor. Never recommend when the dispatching prompt will be run by an external CI agent or HTTP API caller. |

## Output format (standardized block)

Other skills embed this block **verbatim** in their own outputs (e.g. as the `## Recommended Execution Model` section of a Change Record, or as the `Model Recommendation:` line of a `devops-triage-dispatch` Execution Configuration).

```markdown
## Recommended Execution Model

- **Primary:** `<exact model name from the report>` — Cursor tier: **<Auto | Premium | MAX>**.
- **Fallback:** `<exact model name from the report>` — <one-line reason to swap, e.g. "credit budget exhausted", "Cursor unavailable", "preview tier deprecated">.
- **Avoid:** <comma-separated list of models to NOT use for this work, with one-line shared reason; or "n/a">.
- **Rationale:** <one sentence tying the work shape to the primary model's strengths, citing one concrete number from the report — e.g. "87.6% SWE-bench Verified", "1M context at no premium", "TTFT ~600ms">.
- **Constraints surfaced:** <call out any data-sensitivity, deprecation, or preview-tier flag relevant to this recommendation; or "None.">.
- **Reference:** `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` — sections consulted: <list, e.g. "Strengths & Weaknesses → Anthropic Claude Models, Appendix: Key Numbers Quick Reference">.
```

### Worked example — schema migration with RLS

```markdown
## Recommended Execution Model

- **Primary:** `Claude Opus 4.7` — Cursor tier: **MAX**.
- **Fallback:** `Claude Sonnet 4.6` — when MAX credit budget is unavailable, Sonnet 4.6 still gets 1M context and ~77% SWE-bench at $3/$15 vs. Opus 4.7's $5/$25.
- **Avoid:** `Claude Sonnet 4` (retires June 15, 2026), `Codex 5.3 Spark` (128K context insufficient for migration + RLS + types).
- **Rationale:** RLS reasoning is unforgiving on tenancy boundaries; Opus 4.7's 87.6% SWE-bench Verified and Constitutional AI alignment minimize the chance of a missing `org_id` predicate.
- **Constraints surfaced:** None.
- **Reference:** `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` — sections consulted: Strengths & Weaknesses → Claude Opus 4.7, Behavior & Enterprise Compliance → Known Refusal Triggers (Claude breach rate 4.8%).
```

### Worked example — small typo fix in a single component

```markdown
## Recommended Execution Model

- **Primary:** `Cursor Auto` — Cursor tier: **Auto**.
- **Fallback:** `GPT-5.4 Mini` — manually selectable if Auto routing produces an unwanted result; $0.75/$4.50 with 400K context.
- **Avoid:** `Claude Opus 4.7`, `Gemini 3.1 Pro`, `Codex 5.3 xhigh` — frontier-tier reasoning is wasted and expensive on ≤1 file changes.
- **Rationale:** Single-file typo fix is the canonical Auto-routable task; the routing pool will pick a fast cheap model (Composer 1, Composer 2 fast, GPT-5.4 Mini) without burning credits.
- **Constraints surfaced:** None.
- **Reference:** `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` — sections consulted: Strengths & Weaknesses → Cursor-Native Models, Appendix: Key Numbers Quick Reference.
```

## Embedding into other skills (composition contract)

When another skill loads `model-recommender`, it must:

1. **Pass the work shape** as input (one or two sentences naming the task type, file count, context size, capability requirements) and say whether the plan has already been split small enough for Composer 2 / Auto.
2. **Receive the standardized block** above.
3. **Embed the block verbatim** under a `## Recommended Execution Model` section in its own output (or `### Recommended Execution Model` if the consumer's heading hierarchy demands it). No paraphrasing, no summarizing, no dropping fields.
4. **Position the block** adjacent to the section that authorizes execution: in `itil-change-record`, place it just before `## Authorization`. In `pencil`, place it as item 7 in the Output Contract. In `master-mason`, append it to the **Cross-Lens Synthesis** as a final row of the priority table's hand-off column. In `devops-triage-dispatch`, replace the static Phase 2 tier table with the block in **Execution Configuration**.

If the consumer skill receives a recommendation that surfaces a constraint (deprecated, training-policy concern, preview-tier), the consumer skill MUST also surface the constraint visibly to the user — e.g. by leading with a `> ⚠ Note:` callout above the block, not by silently embedding it. This keeps the user from missing a flag because they skipped the **Constraints surfaced** field.

## Standalone invocation

When the user invokes this skill directly ("what model should I use for X", "recommend a model for Y"), produce:

1. The standardized block above.
2. A one-paragraph rationale (≤ 4 sentences) explaining the matrix row that matched and the report sections you consulted.
3. The one clarifying question you would have asked but didn't (so the user can revise the input if your inference was wrong).

Do **not** produce a full multi-row comparison unless the user explicitly asks for one. The standardized block is the deliverable; comparison shopping is a different request.

## Guardrails

- **Read-only.** This skill does not modify code, write files (other than possibly emitting markdown output), or change configuration. It is safe to load in Plan mode.
- **The report is the source of truth.** Never recommend a model that is not in the report. Never invent a model name or version. If the report does not list it, do not recommend it.
- **Never invent benchmark numbers.** Every quantitative claim in the **Rationale** field must come from the report or be omitted.
- **Never recommend a deprecated model** for new work, even if the user names it. Suggest the successor and flag the deprecation date.
- **Never recommend Kimi K2.5 via the public Moonshot API for EquipQR customer data.** The training-policy concern is non-negotiable. Self-hosted Kimi or Composer 2 (built on Kimi K2.5 with Cursor's policies) are acceptable substitutes.
- **Cheapest sufficient model.** Prefer Auto/Composer 2 over Premium, and Premium over MAX, whenever the plan can be made explicit enough. Cursor credits are finite; recommendations should respect that.
- **Split before spending.** If a Premium/MAX recommendation is driven mainly by breadth, tell the calling skill to split the plan into smaller independently verifiable slices instead of recommending the expensive model. Higher-tier models are for irreducible reasoning risk, not vague plans.
- **Stale matrix detection.** If the report has been updated since this skill was last revised and the matrix's primary recommendation now contradicts the report's pricing, deprecation, or capability tables, surface a "matrix outdated" callout in the **Constraints surfaced** field so a future maintainer reconciles the skill against the report. Do not silently follow the stale matrix.
- **One block per invocation.** When composed by another skill, emit one **Recommended Execution Model** block — not a comparison, not a multi-tier ladder. If the work spans multiple shapes, pick the higher-tier model.
- **PowerShell on Windows host.** This skill itself runs no commands, but if you cite an example command anywhere in the recommendation, follow EquipQR's PowerShell conventions (`;` not `&&`, `Get-Content` not `cat`).

## Progressive disclosure

- **Source of truth:** [`docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md`](../../../docs/ops/ci-cd-workshop/) — the 731-line report this skill reads at every invocation.
- **Plan-creating skills that compose this one:** [itil-change-record](../itil-change-record/SKILL.md), [itil-problem-record](../itil-problem-record/SKILL.md), [itil-service-request](../itil-service-request/SKILL.md), [pencil](../pencil/SKILL.md), [master-mason](../master-mason/SKILL.md).
- **Triage skill that composes this one:** [devops-triage-dispatch](../devops-triage-dispatch/SKILL.md) Phase 2 — the static Auto/Premium/MAX tier table has been replaced by a `model-recommender` call.
- **For Cursor-specific tier mechanics** (credit pool, Auto routing pool, Max Mode), see the report's Strengths & Weaknesses → Cursor-Native Models section.
