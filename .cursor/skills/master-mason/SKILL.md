---
name: master-mason
description: Use to audit conversation history, an attached plan file, a diff, or a scoped path through one or more masonic lenses — chisel (clarity), compasses (boundaries), gauge (performance), level (accessibility), plumb (security), square (architecture), trowel (integration). The skill self-selects the lenses that fit the request, runs each as an evidence-first audit, and returns per-lens findings plus a cross-lens synthesis. Triggers on "audit", "review", "assess", "look at this plan", "is this safe / fast / accessible / architecturally clean", or any request to evaluate code quality across multiple dimensions. For destructive cleanup use `common-gavel`; for spec drafting use `pencil`; for PR pre-flight use `raise`.
---

# Master Mason

## Symbolism

The master mason is entrusted with every working tool of the craft and chooses the right one — or several together — for the work at hand. The chisel finishes; the compasses bound; the gauge measures; the level equalizes; the plumb stands true; the square aligns; the trowel cements.

This skill carries all seven working-tool lenses. It does not own destructive cleanup (that is the common gavel) and does not own spec drafting (that is the pencil); those remain separate skills.

## Purpose

Run an evidence-first, multi-lens audit of:

- the current conversation history,
- an attached plan or change-record file,
- a diff or branch range,
- or a scoped path / module / feature.

The skill picks the lenses that fit the target, runs each as a focused checklist, and reports findings with confidence and priority.

## Invocation

- `/master-mason` — self-select lenses from context
- `/master-mason <scope-path>` — audit a specific path
- `/master-mason --lens=<name>[,<name>...]` — force one or more lenses
- `/master-mason --plan <file>` — audit an attached plan or change record
- `/master-mason --diff <base>..<head>` — audit a branch range

Lens names: `chisel`, `compasses`, `gauge`, `level`, `plumb`, `square`, `trowel`.

## Operating Rules

1. **Evidence over speculation.** Every finding cites file paths, symbols, lines, commands, or quoted plan text. Suspicion is allowed but must be labeled.
2. **Self-select honestly.** If a lens has no signal in the target scope, say so and skip it instead of producing filler.
3. **Confidence matters.** Mark findings `high`, `medium`, or `low`. Do not bury hedge words.
4. **Respect repository patterns.** Derive the project's actual conventions before judging a deviation.
5. **No mutation.** This skill audits and recommends. It does not delete code, prune docs, or rewrite architecture. Hand off to `common-gavel` for destructive cleanup or to the developer for behavior changes.
6. **Developer-in-the-loop.** Surface ambiguous intent as questions before recommending action.
7. **One verdict per lens.** Each lens produces its own findings block; the synthesis at the end is the only place lenses are mixed.

## Workflow

Copy this checklist and track it while running:

```markdown
Master Mason Progress
- [ ] 1) Confirm target (conversation / plan file / diff / scope path)
- [ ] 2) Select lenses (auto-select from signal, or honor --lens=)
- [ ] 3) Run each selected lens against the target
- [ ] 4) Record per-lens findings with confidence
- [ ] 5) Produce cross-lens synthesis and priority order
- [ ] 6) Recommend the execution model for the highest-priority hand-off
- [ ] 7) Report next step (questions, hand-off skill, or stand-down)
```

### 1) Confirm target

Identify what is being audited:

- conversation context (recent agent turns, attached files, decisions made)
- a plan or change-record markdown file
- a `git diff <base>..<head>` range or a specific commit
- a scoped path or module
- a combination

Restate the target in one sentence before starting.

### 2) Select lenses

If `--lens=` is supplied, honor it.
Otherwise auto-select using the table below. If no lens has signal, return only the synthesis with `no actionable lenses triggered`.

| Lens | Auto-trigger when target involves… |
|---|---|
| `chisel` | code being kept (any file under audit); dense control flow, weak types, naming drift, duplicated helpers |
| `compasses` | API routes, edge functions, IAM/role checks, rate limits, tenant scoping, background jobs, destructive paths |
| `gauge` | hot paths, loops, queries, renders, bundles, assets, caching, background work |
| `level` | UI components, pages, forms, focus/keyboard, viewport-specific layout, dark/reduced-motion |
| `plumb` | secrets, auth, validation, logging of sensitive data, regulated workflows (CCPA/GDPR/SOC 2) |
| `square` | new files, layer boundaries, naming conventions, dependency direction, repo architecture |
| `trowel` | dependency declarations, shared types, API contracts between modules, generated code, integration seams |

A single target often warrants 2–4 lenses. Do not run all seven by default — that produces noise.

### 3) Run each selected lens

Each lens runs the same shape: focus → checks → findings → smallest-fix recommendation.

#### chisel — clarity & craftsmanship

> The chisel gives shape, precision, and finish.

Focus: readability, type tightness, naming, control flow, low-risk craftsmanship.
Checks:
- weak or implicit typing
- misleading variable / function names
- nested or repetitive boolean logic
- duplicated helpers or extractable intent

Output: list polish targets that **preserve behavior**. Do not delete logic — that is `common-gavel` territory.

#### compasses — boundaries & guardrails

> The compasses circumscribe the work and keep it within due bounds.

Focus: identity, authorization, tenant scope, rate limits, execution bounds, fail-closed defaults.
Checks:
- missing role / org / tenant checks at each trust-boundary hop
- over-broad IAM, service-role, or admin-bypass usage
- missing rate limits on user-facing or destructive endpoints
- background tasks without circuit breakers or execution caps

Output: a boundary map plus the smallest set of guards that would keep callers in scope.

#### gauge — performance & resource use

> The 24-inch gauge divides labor and resources wisely.

Focus: latency, complexity, render cost, network / DB cost, build weight.
Checks:
- O(n²) or repeated traversal
- expensive renders or selectors
- N+1 queries or missing indexes
- large bundles, heavy assets
- duplicated work that can be cached / batched / deferred

Output: ranked findings (`Critical`, `High-value`, `Watchlist`) with a verification plan (profile, benchmark, query timing, bundle diff) for each recommendation.

#### level — accessibility & device parity

> The level reminds the builder to meet every user on equal ground.

Focus: WCAG, semantic structure, keyboard, focus, contrast, viewport parity (mobile-first for technician use), reduced motion, dark mode.
Checks:
- accessible names, labels, landmarks, heading order
- tab order, focus visibility, keyboard-only completion of key flows
- contrast in light + dark
- mobile / tablet / desktop layout parity
- motion that should respect `prefers-reduced-motion`

Output: separate blockers from inconveniences. Do not claim WCAG conformance from inspection alone.

#### plumb — security & compliance

> The plumb line tests whether the work stands upright before its obligations.

Focus: secrets, authn vs authz, input validation, sensitive-data handling, tenant isolation, regulated obligations (CCPA/CPRA, GDPR, SOC 2).
Checks:
- exposed keys, credentials, privileged tokens
- unsanitized or weakly validated inputs
- missing authorization checks (distinct from authentication)
- insecure storage or logging of sensitive data
- privacy obligations on intake / retention / deletion / disclosure paths

Output: severity-ranked findings (`Critical`, `High`, `Moderate`, `Policy / Doc Gap`) with standards mapping when useful. Redact real secrets in the response.

#### square — architectural alignment

> The square reminds the builder to bring every action into right alignment.

Focus: folder layout, naming, layering, dependency direction, responsibility boundaries against the **repository's actual** conventions.
Checks:
- modules in the wrong layer
- naming that conflicts with established convention
- responsibilities mixed into one file or component
- dependency flow that cuts across intended boundaries

Output: pattern baseline first, then out-of-square findings, then the smallest alignment plan. Distinguish quick fixes from larger structural work.

#### trowel — integration & dependency cohesion

> The trowel spreads the cement that unites separate parts.

Focus: dependency declarations vs real usage, shared types, contract consistency across boundaries, integration seams.
Checks:
- unused or duplicated dependencies
- outdated packages with real compatibility / security risk
- producer / consumer disagreements on field names, types, nullability, error shapes
- duplicated mapping logic or manual sync across layers

Output: contract mismatches and risky deps with breakage modes (not just version numbers).

### 4) Per-lens findings format

For every lens that produced findings, render a block:

```markdown
### Lens: <name>
- Status: pass | findings | no signal
- Findings:
  | # | Where | Issue | Confidence | Smallest fix |
  |---|---|---|---|---|
  | 1 | path/symbol | concise problem statement | high/med/low | minimal action |
- Verification (if applicable): how to prove the fix worked
```

### 5) Cross-lens synthesis

After all lenses, produce one prioritized table that mixes lenses:

| Priority | Lens | Issue | Why it matters | Hand-off |
|---|---|---|---|---|
| P0 | plumb | tenant check missing on `…` | data leak | developer fix |
| P1 | gauge | N+1 query on `…` | latency on hot path | developer fix |
| P2 | chisel | duplicated helper in `…` | cleanup | developer fix |

Hand-off targets:
- `common-gavel` — when findings include confirmed dead code, stale docs, or superfluous implementation that should be deleted
- `pencil` — when findings reveal a missing spec for upcoming work
- `raise` — when the audit is the last gate before promoting to `main`
- `developer fix` — everything else

### 6) Recommend the execution model for the highest-priority hand-off

Load the [model-recommender](../model-recommender/SKILL.md) skill and pass the work shape implied by the P0/P1 row of the priority table (e.g. plumb finding → security audit / RLS analysis shape; gauge finding → multi-file refactor shape; chisel finding → routine single-file fix shape). Embed the resulting standardized block verbatim as item 6 of the Output Contract. When the audit produced findings across multiple high-stakes lenses (e.g. P0 plumb AND P0 gauge), pick the higher-tier model that satisfies both — do not emit two recommendations.

Skip this step ONLY when no actionable lenses triggered (the synthesis is `no actionable lenses triggered` or `The stone is square.`) — there is no follow-on work to recommend a model for.

### 7) Report next step

End with:

- whether the developer should review questions before any action
- which hand-off skill is appropriate (if any)
- or, if nothing actionable was found in any lens, output exactly `The stone is square.`

## Output Contract

1. **Target** (one sentence)
2. **Lenses Selected** (with reason)
3. **Per-Lens Findings** (one block per selected lens)
4. **Cross-Lens Synthesis** (priority table)
5. **Hand-off Recommendation**
6. **Recommended Execution Model** — standardized block emitted by [model-recommender](../model-recommender/SKILL.md), sized for the highest-priority hand-off. Embedded verbatim. Skip only when the synthesis is `no actionable lenses triggered` or `The stone is square.`. When the recommendation surfaces a constraint (deprecated model, training-policy concern, preview-tier flag), lead this item with a `> ⚠ Note:` callout above the block.
7. **Open Questions** (only if intent was ambiguous)

## Guardrails

- Do not run lenses that have no signal in the target.
- Do not delete code, prune docs, or change behavior; recommend only.
- Do not claim formal compliance, WCAG conformance, or performance wins without supporting evidence.
- Do not invent architecture rules the repository does not actually follow.
- Do not collapse distinct lens findings into a vague "needs refactor."
- Do not duplicate work that belongs to `common-gavel`, `pencil`, `trestle`, or `raise`. Hand off instead.
- Do not output the full lens registry in the response — only the lenses you actually ran.
- Do not omit the **Recommended Execution Model** Output Contract item when the synthesis has any actionable findings — load [model-recommender](../model-recommender/SKILL.md) and embed its block verbatim. The executing developer needs to know which model to use for the highest-priority hand-off; an audit without that guidance leaves the developer guessing.
