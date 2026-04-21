# AI Model Comparison Report: 28 Models Across 6 Families (April 2026)

> **Scope:** Cursor-native models (Auto, Premium, Composer series), Anthropic Claude (Opus, Sonnet, Haiku), OpenAI GPT-5 and Codex families, Google Gemini 3.x, xAI Grok 4.20, and Moonshot AI Kimi K2.5.  
> **Last updated:** April 21, 2026. Pricing, deprecation dates, and benchmark scores are subject to change. Always verify against official provider documentation before making architectural decisions.

***

## Part I — Lifecycle & Basic Information

### Release Dates

| Model | Official Release Date | Notes |
|---|---|---|
| **Auto** (Cursor router) | Ongoing — introduced with Cursor 2.0 (Oct 29, 2025) | Not a model; a routing layer |
| **Premium** (Cursor mode) | Ongoing — part of Cursor's paid credit system | Not a model; a billing tier enabling manual model selection |
| **Composer 2** | March 19, 2026[^1] | Built on Kimi K2.5 with continued pretraining + RL[^2] |
| **Composer 1.5** | February 8, 2026[^3] | 20× RL scaling over Composer 1 base |
| **Composer 1** | October 29, 2025[^4] | Launched alongside Cursor 2.0 |
| **Claude Opus 4.7** | April 16, 2026[^5] | New xhigh effort level, 3× vision resolution[^6] |
| **Claude Opus 4.6** | February 5, 2026[^7] | First Opus with 1M token context (beta) |
| **Claude Opus 4.5** | November 24, 2025[^8] | New "effort" parameter introduced |
| **Claude Sonnet 4.6** | February 17, 2026[^9] | 1M context; default model on claude.ai[^10] |
| **Claude Sonnet 4.5** | September 29, 2025[^11] | Context-awareness feature debut |
| **Claude Sonnet 4** | May 22, 2025[^12] | ⚠ Deprecated — retiring June 15, 2026[^13] |
| **Claude Haiku 4.5** | October 14, 2025[^14] | First Haiku with extended thinking + computer use |
| **GPT-5.4** | March 5, 2026[^15] | 1M context (opt-in); Computer Use API 75% OSWorld[^16] |
| **GPT-5.4 Mini** | March 17, 2026[^17] | — |
| **GPT-5.4 Nano** | March 17, 2026[^18] | API-only |
| **GPT-5.2** | December 11, 2025[^19] | Three variants: Instant, Thinking, Pro |
| **GPT-5.1** | November 13, 2025[^20] | Adaptive reasoning; new "no-reasoning" default mode |
| **GPT-5.1 Mini (Codex Mini)** | November 13, 2025[^21] | Fixed medium reasoning; coding specialist |
| **GPT-5 Mini** | August 7, 2025[^22] | — |
| **Codex 5.3** | February 5, 2026[^23] | GA for GitHub Copilot February 9, 2026 |
| **Codex 5.3 Spark** | February 12, 2026[^24] | Research preview; Cerebras WSE-3 hardware |
| **Codex 5.2** | January 14, 2026[^25] | Agentic coding; SWE-Bench Pro 56.4%[^19] |
| **Codex 5.1 Max** | November 13, 2025[^26] | Long-context "Max" variant of GPT-5.1 Codex |
| **Gemini 3.1 Pro** | February 19, 2026[^27] | ARC-AGI-2 leader at launch |
| **Gemini 3 Flash** | ~November/December 2025[^28] | GA model; predecessor to 3.1 Flash |
| **Gemini 2.5 Flash** | June 17, 2025[^29] | ⚠ Deprecated — shutting down June 17, 2026[^30] |
| **Grok 4.20** | March 9–10, 2026[^31][^32] | Beta release; flagship multi-agent model |
| **Kimi K2.5** | January 27, 2026[^33] | Open-weight MoE; MIT license with attribution clause |

***

### Deprecation & End-of-Life

| Model | Deprecation Status |
|---|---|
| **Claude Sonnet 4** | ⚠ Retired **June 15, 2026** — API calls fail after this date[^13][^34] |
| **Claude Opus 4** (original 4.0) | ⚠ Retired **June 15, 2026**[^35] |
| **Gemini 2.5 Flash** | ⚠ Shutdown scheduled **June 17, 2026**; replace with `gemini-3-flash-preview`[^30] |
| All others listed | No published deprecation dates as of April 2026 |

***

### Open Weights vs. API-Only

| Category | Models |
|---|---|
| **Open-weight (downloadable)** | Kimi K2.5 (MIT license + attribution clause for large-scale commercial use)[^33] |
| **Proprietary API-only** | All Cursor models (Auto, Premium, Composer series), all Claude models, all GPT-5/Codex models, all Gemini 3.x models, Grok 4.20[^31][^1] |

***

## Part II — Context Window & Pricing

### Input Context Window & Max Output Tokens

| Model | Max Input Context | Max Output Tokens |
|---|---|---|
| **Auto** (Cursor router) | Routes to underlying model; varies | Varies by routed model |
| **Premium** (Cursor mode) | Routes to selected model | Varies |
| **Composer 2** | 200,000 tokens[^1] | Not separately published (MoE limits) |
| **Composer 1.5** | 200,000 tokens (inferred from C2 tech report) | Not separately published |
| **Composer 1** | 200,000 tokens (inferred) | Not separately published |
| **Claude Opus 4.7** | 1,000,000 tokens[^36] | 128,000 tokens[^37] |
| **Claude Opus 4.6** | 1,000,000 tokens (GA March 13, 2026)[^38] | 128,000 tokens[^39] |
| **Claude Opus 4.5** | 200,000 tokens[^8] | 64,000 tokens[^40] |
| **Claude Sonnet 4.6** | 1,000,000 tokens (GA)[^41] | 65,536 tokens[^42] |
| **Claude Sonnet 4.5** | 200,000 tokens standard; 1M preview[^43] | 64,000 tokens |
| **Claude Sonnet 4** | 200,000 tokens[^44] | 64,000 tokens[^45] |
| **Claude Haiku 4.5** | 200,000 tokens[^46] | 64,000 tokens[^46] |
| **GPT-5.4** | 272K standard; 1M opt-in (experimental)[^47] | 128,000 tokens |
| **GPT-5.4 Mini** | 400,000 tokens[^15] | 128,000 tokens (inferred) |
| **GPT-5.4 Nano** | 400,000 tokens[^15] | ~128,000 tokens |
| **GPT-5.2** | 400,000 tokens[^48] | 128,000 tokens[^48] |
| **GPT-5.1** | 400,000 tokens (272K prompt + 128K output)[^49] | 128,000 tokens[^20] |
| **GPT-5.1 Mini (Codex Mini)** | 400,000 tokens[^21] | 128,000 tokens |
| **GPT-5 Mini** | 400,000 tokens[^50] | 128,000 tokens |
| **Codex 5.3** | 400,000 tokens (272K prompt limit per API)[^51][^52] | 128,000 tokens |
| **Codex 5.3 Spark** | 128,000 tokens[^53] | Not published (research preview) |
| **Codex 5.2** | 400,000 tokens[^19] | 128,000 tokens[^19] |
| **Codex 5.1 Max** | 400,000 tokens[^26] | 128,000 tokens[^26] |
| **Gemini 3.1 Pro** | 1,048,576 tokens (~1M)[^54] | 65,536 tokens[^28] |
| **Gemini 3 Flash** | 1,000,000 tokens[^55] | 65,536 tokens[^28] |
| **Gemini 2.5 Flash** | 1,000,000 tokens[^29] | 65,536 tokens[^56] |
| **Grok 4.20** | 2,000,000 tokens[^57] | Not officially published; large |
| **Kimi K2.5** | 256,000 tokens (API)[^58]; architecture supports 512K[^59] | Not separately published |

***

### Standard API Pricing (per 1M tokens)

| Model | Input $/M | Output $/M | Cached Input $/M |
|---|---|---|---|
| **Auto** (Cursor) | ~$1.25 (estimated routing cost)[^60] | ~$6.00[^60] | Available |
| **Premium** (billing tier) | N/A — routes to provider model prices | N/A | N/A |
| **Composer 2** (standard) | $0.50[^61] | $2.50[^61] | Available (fast variant; base had early bug)[^62] |
| **Composer 2** (fast) | $1.50[^61] | $7.50[^61] | Available[^63] |
| **Composer 1.5** | $3.50[^64] | $17.50[^1] | Available |
| **Composer 1** | $1.25[^65] | $10.00[^65] | Available |
| **Claude Opus 4.7** | $5.00[^6] | $25.00[^6] | $0.50 (cache reads)[^37] |
| **Claude Opus 4.6** | $5.00[^42] | $25.00[^42] | $0.50 (cache reads) |
| **Claude Opus 4.5** | $5.00[^8] | $25.00[^8] | $0.50 (cache reads) |
| **Claude Sonnet 4.6** | $3.00[^10] | $15.00[^10] | $0.30 (cache reads)[^66] |
| **Claude Sonnet 4.5** | $3.00[^43] | $15.00[^43] | $0.30 (cache reads)[^43] |
| **Claude Sonnet 4** | $3.00[^44] | $15.00[^44] | $0.30 (cache reads)[^66] |
| **Claude Haiku 4.5** | $1.00[^14] | $5.00[^14] | $0.10 (inferred from tier ratio) |
| **GPT-5.4** | $2.50 (<272K)[^47] | $15.00[^47] | $0.25[^47] |
| **GPT-5.4 Mini** | $0.75[^15] | $4.50[^15] | $0.075[^67] |
| **GPT-5.4 Nano** | $0.20[^15] | $1.25[^15] | $0.02[^67] |
| **GPT-5.2** | $1.75[^19] | $14.00[^19] | $0.175[^19] |
| **GPT-5.1** | $1.25[^20] | $10.00[^20] | $0.125[^23] |
| **GPT-5.1 Mini (Codex Mini)** | $0.25[^21] | $2.00[^21] | $0.025[^68] |
| **GPT-5 Mini** | $0.25[^50] | $2.00[^50] | $0.025[^50] |
| **Codex 5.3** | $1.75[^51] | $14.00[^51] | $0.175[^51] |
| **Codex 5.3 Spark** | Research preview — pricing not published[^53] | Research preview | Research preview |
| **Codex 5.2** | $1.75[^25] | $14.00[^25] | $0.175[^19] |
| **Codex 5.1 Max** | $1.25[^69] | $10.00[^69] | $0.125[^69] |
| **Gemini 3.1 Pro** | $2.00 (<200K)[^70] / $4.00 (>200K)[^70] | $12.00 (<200K)[^70] / $18.00 (>200K)[^70] | Implicit context caching supported[^71] |
| **Gemini 3 Flash** | $0.50[^54] | $3.00[^54] | Implicit context caching supported[^72] |
| **Gemini 2.5 Flash** | $0.30[^29] | $2.50[^29] | Supported[^73] |
| **Grok 4.20** | $2.00[^57] | $6.00[^57] | $0.75 (Grok 4 tier cited)[^74] |
| **Kimi K2.5** | $0.60[^58] | $2.50[^58] | Not published for general API |

**Prompt caching details (Claude):** Cache writes are $3.75/M (5-minute TTL) or $6.00/M (1-hour TTL); cache reads are $0.30/M for Sonnet 4.x and $0.50/M for Opus 4.x. All Claude models in the 4.x family support prompt caching.[^37][^66]

**Long-context Claude pricing:** Claude Opus 4.7, 4.6, and Sonnet 4.6 include the full 1M context window at standard per-token pricing with no long-context premium as of March 2026. Earlier (Opus 4.6 at launch in Feb) charged $10/$37.50 above 200K — that premium was removed.[^75][^66][^38]

***

## Part III — Technical Integration & Capabilities

### Tool Calling, Structured Outputs, and Prompt Caching

| Model | Tool Calling | Structured JSON Output | Prompt Caching |
|---|---|---|---|
| **Auto** | Depends on routed model | Depends | Yes (varies)[^60] |
| **Premium** | Depends on selected model | Depends | Depends |
| **Composer 2** | Yes (native IDE tool access; function calling)[^2] | Yes (Kimi K2.5 base supports it)[^76] | Yes (fast variant)[^63]; base had a bug resolved in recent update[^77] |
| **Composer 1.5** | Yes[^65] | Yes | Yes[^63] |
| **Composer 1** | Yes[^65] | Yes | Yes |
| **Claude Opus 4.7** | Yes[^78] | Yes — JSON schema + strict tool use[^78] | Yes — 5-min and 1-hour TTL[^37] |
| **Claude Opus 4.6** | Yes | Yes[^78] | Yes[^37] |
| **Claude Opus 4.5** | Yes | Yes[^79] | Yes |
| **Claude Sonnet 4.6** | Yes | Yes[^78] | Yes[^66] |
| **Claude Sonnet 4.5** | Yes | Yes[^78] | Yes[^43] |
| **Claude Sonnet 4** | Yes | Yes[^79] | Yes[^66] |
| **Claude Haiku 4.5** | Yes | Yes[^78] | Yes |
| **GPT-5.4** | Yes[^15] | Yes[^80] | Yes ($0.25/M cached)[^47] |
| **GPT-5.4 Mini** | Yes[^81] | Yes[^80] | Yes ($0.075/M)[^67] |
| **GPT-5.4 Nano** | Yes (limited per OpenAI)[^15] | Yes[^80] | Yes ($0.02/M)[^67] |
| **GPT-5.2** | Yes[^19] | Yes[^80] | Yes (90% discount)[^19] |
| **GPT-5.1** | Yes[^20] | Yes[^80] | Yes[^23] |
| **GPT-5.1 Mini (Codex Mini)** | Yes[^21] | Yes[^80] | Yes |
| **GPT-5 Mini** | Yes[^50] | Yes[^80] | Yes ($0.025/M)[^50] |
| **Codex 5.3** | Yes[^51] | Yes | Yes ($0.175/M)[^51] |
| **Codex 5.3 Spark** | Yes (research preview; text-only at launch)[^53] | Limited (research preview) | Not confirmed |
| **Codex 5.2** | Yes[^19] | Yes | Yes (90% discount)[^19] |
| **Codex 5.1 Max** | Yes[^26] | Yes[^26] | Yes |
| **Gemini 3.1 Pro** | Yes[^71] | Yes (Structured Output)[^71] | Yes — implicit + explicit context caching[^71] |
| **Gemini 3 Flash** | Yes[^72] | Yes (Structured Output)[^72] | Yes — implicit + explicit[^72] |
| **Gemini 2.5 Flash** | Yes | Yes | Yes[^73] |
| **Grok 4.20** | Yes — parallel function calling[^82] | Yes (Structured Outputs)[^82] | $0.75/M cached input (Grok 4 pricing)[^74] |
| **Kimi K2.5** | Yes — up to 1,500 tool calls in agent swarm mode[^76] | Yes | Not separately published for API |

***

### Supported Modalities

| Model | Text | Vision (Image Input) | Audio | Document Parsing | Image Output |
|---|---|---|---|---|---|
| **Auto** | ✓ | Depends | Depends | Depends | Depends |
| **Composer 2** | ✓ | ✓ (Kimi K2.5 base)[^76] | ✗ | ✓ | ✗ |
| **Composer 1.5** | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Composer 1** | ✓ | Partial | ✗ | ✓ | ✗ |
| **Claude Opus 4.7** | ✓ | ✓ (up to 3.75MP images)[^83] | ✗ | ✓ | ✗ |
| **Claude Opus 4.6** | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Claude Opus 4.5** | ✓ | ✓[^84] | ✗ | ✓ | ✗ |
| **Claude Sonnet 4.6** | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Claude Sonnet 4.5** | ✓ | ✓[^43] | ✗ | ✓ | ✗ |
| **Claude Sonnet 4** | ✓ | ✓[^45] | ✗ | ✓ | ✗ |
| **Claude Haiku 4.5** | ✓ | ✓[^46] | ✗ | ✓ | ✗ |
| **GPT-5.4** | ✓ | ✓ | ✓ (native)[^85] | ✓ | ✓ (via `gpt-image-1.5`)[^86] |
| **GPT-5.4 Mini** | ✓ | ✓[^81] | Limited | ✓ | Limited |
| **GPT-5.4 Nano** | ✓ | ✓[^15] | ✗ | ✓ | ✗ |
| **GPT-5.2** | ✓ | ✓[^48] | ✓ | ✓ | ✓ |
| **GPT-5.1** | ✓ | ✓[^20] | ✓ | ✓ | ✓ |
| **GPT-5.1 Mini (Codex Mini)** | ✓ | ✓[^26] | ✗ | ✓ | ✗ |
| **GPT-5 Mini** | ✓ | ✓[^50] | ✗ | ✓ | ✗ |
| **Codex 5.3** | ✓ | ✓[^52] | ✗ | ✓ | ✗ |
| **Codex 5.3 Spark** | ✓ | ✗ (text-only at launch)[^53] | ✗ | ✗ | ✗ |
| **Codex 5.2** | ✓ | ✓[^19] | ✗ | ✓ | ✗ |
| **Codex 5.1 Max** | ✓ | ✓[^26] | ✗ | ✓ | ✗ |
| **Gemini 3.1 Pro** | ✓ | ✓ | ✓[^71] | ✓ | ✓ (inline image gen)[^87] |
| **Gemini 3 Flash** | ✓ | ✓[^72] | ✓ | ✓ | ✓ (inline)[^87] |
| **Gemini 2.5 Flash** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Grok 4.20** | ✓ | ✓[^31] | ✗ (video incoming)[^88] | ✓ | ✗ |
| **Kimi K2.5** | ✓ | ✓ (native multimodal)[^76] | ✗ | ✓ | ✗ |

***

### Strengths & Weaknesses by Model

#### Cursor-Native Models

**Auto (router)**  
*Strengths:* Unlimited use on paid Cursor plans; automatic model selection optimized for cost and reliability; no credit drain for everyday coding tasks.[^89][^90]
*Weaknesses:* No user control over which model is selected; quality ceiling is lower than manually selecting a frontier model; as of mid-2025 no longer truly unlimited (quota-gated since August 2025).[^91]

**Premium (billing mode)**  
*Strengths:* Unlocks any supported model (GPT-5.4, Claude Opus 4.7, Gemini 3.1 Pro) at full capability inside Cursor; enables Max Mode for extended context tasks.[^92][^89]
*Weaknesses:* Drains the monthly credit pool fast, especially Claude Sonnet (roughly 2× the depletion rate of Gemini); overages billed at provider cost.[^92]

**Composer 2**  
*Strengths:* Best coding model in the Cursor ecosystem (61.3 CursorBench, 61.7 Terminal-Bench 2.0, 73.7 SWE-bench Multilingual); 86% cheaper on input than Composer 1.5; deep IDE integration (worktrees, terminal, git); native multimodal (vision via Kimi K2.5 base); agent swarm capability inherited from Kimi.[^1][^61][^76]
*Weaknesses:* Requires Cursor IDE — no public API; early caching bug for base variant (resolved with recent update); Cursor's 25% architectural ownership of Kimi K2.5 base creates transparency concerns; context window capped at 200K vs. Opus/Sonnet 1M.[^77][^1]

**Composer 1.5**  
*Strengths:* Strong for daily interactive use; 20× RL scaling over Composer 1; CursorBench 44.2, Terminal-Bench 47.9, SWE-bench Multilingual 65.9; better system prompt adherence than Composer 1.[^61]
*Weaknesses:* 3.5× more expensive on input than Composer 2; significantly outperformed by Composer 2 on all benchmarks; no external API access.

**Composer 1**  
*Strengths:* 250 tokens/sec generation — roughly 4× faster than GPT-5 or Claude Sonnet 4.5; high-velocity prototyping and exploration; available as fallback after premium credit exhaustion.[^65]
*Weaknesses:* Weakest of the three Composer models (CursorBench 38.0, Terminal-Bench 40.0); struggles with complex multi-file backend work; limited reasoning depth.[^61][^91]

***

#### Anthropic Claude Models

**Claude Opus 4.7**  
*Strengths:* Top coding model globally as of April 2026 — 87.6% SWE-bench Verified, 64.3% SWE-bench Pro, 94.2% GPQA Diamond; leads GPT-5.4 by 9.2 points on MCP-Atlas tool invocation; new xhigh effort level for maximum reasoning depth; 3× higher-resolution vision (up to 3.75MP, 2,576px long edge); 1M context; same pricing as Opus 4.6.[^93][^37]
*Weaknesses:* New tokenizer uses 1.0–1.35× more tokens for identical input (up to 35% tokenizer inflation), raising effective costs beyond sticker price; high latency at 1M context (30–60+ seconds initial processing); no audio modality; most expensive non-Gemini output token cost at $25/M.[^94][^83][^95]

**Claude Opus 4.6**  
*Strengths:* 1M token context at no premium (GA March 13, 2026); 76% MRCR v2 at 1M tokens — first model with genuinely reliable long-context retrieval; 128K max output; 78.3% MRCR v2 benchmark; strong at architectural synthesis (Coding Arena Elo ~1549).[^38][^41][^96][^97]
*Weaknesses:* Superseded by Opus 4.7 for coding; adaptive thinking deprecates the prior explicit budget control path (breaking API change); tokenizer change applies from 4.7 onward but Opus 4.6 remains stable.[^39]

**Claude Opus 4.5**  
*Strengths:* Introduced the effort parameter paradigm; 80.9% SWE-bench Verified at launch; medium effort matches Sonnet 4.5 while using 76% fewer tokens; strong computer use (66.3% OSWorld).[^98][^99]
*Weaknesses:* 200K context vs. 1M in 4.6/4.7; 64K max output vs. 128K in newer Opus; inferior to 4.6 and 4.7 on long-context tasks; no longer the primary recommendation.

**Claude Sonnet 4.6**  
*Strengths:* Near-Opus performance at 1/5 the price ($3/$15 vs. $5/$25); 1M context window at no premium; 72.5% OSWorld score; default model on claude.ai Free/Pro; strong instruction following improvements; excellent for production workloads needing scale; Coding Arena Elo ~1523.[^10][^41][^97][^38]
*Weaknesses:* 65,536 max output (vs. Opus 128K); no audio; system prompt compliance begins to degrade in very long multi-turn sessions.[^100]

**Claude Sonnet 4.5**  
*Strengths:* First Sonnet with context-awareness feature; 77.2% SWE-bench Verified; stateful project memory; good for extended agentic workflows; 200K context standard.[^101]
*Weaknesses:* 200K context vs. 1M in 4.6; MRCR v2 score at 1M tokens was only 18.5% (context quality far below 4.6); now a secondary choice given 4.6 at same price.[^96]

**Claude Sonnet 4**  
*Strengths:* Stable, well-understood model; $3/$15 pricing; widely integrated across toolchains.  
*Weaknesses:* ⚠ Deprecated — retires June 15, 2026; superseded on performance by Sonnet 4.5 and 4.6; 200K context only; 64K max output; should not be used in new deployments.[^13]

**Claude Haiku 4.5**  
*Strengths:* $1/$5 pricing — fastest and cheapest Claude with full capability set; extended thinking, computer use, and context awareness all included; comparable performance to Sonnet 4 at 1/3 the cost; TTFT ~600ms on medium prompts; excellent for high-volume pipelines.[^46][^14][^102]
*Weaknesses:* 200K context ceiling (no 1M option); 64K max output; less reasoning depth than Sonnet/Opus; no audio modality; weaker on multi-file large-codebase tasks.

***

#### OpenAI GPT-5 and Codex Models

**GPT-5.4**  
*Strengths:* 75% Computer Use (OSWorld); 1M context (opt-in via params); five reasoning effort levels; 57.7% SWE-bench Pro; native audio/image/text multimodality; Computer Use API generally available.[^16][^47][^103]
*Weaknesses:* 1M context doubles pricing above 272K ($5.00 input, $22.50 output); "safe-completions" alignment has higher apparent jailbreak surface than older GPT-4o; some users report 2.4× more interactions needed vs. GPT-4 for identical quality and 27% more refusals on previously-safe tasks; no separate thinking toggle — reasoning effort is a continuum.[^67][^104][^105]

**GPT-5.4 Mini**  
*Strengths:* Performs within 5% of GPT-5.4 on coding and computer-use benchmarks at 6× lower cost; 400K context; fast (>2× GPT-5.4 speed); $0.75/$4.50 pricing; good for chat support, content generation, lightweight code completion.[^18]
*Weaknesses:* No audio output; Max mode not available; no dedicated thinking toggle; lower ceiling on complex multi-step reasoning vs. full GPT-5.4.

**GPT-5.4 Nano**  
*Strengths:* Cheapest OpenAI model ($0.20/$1.25); API-only makes it cost-effective for classification, extraction, and ranking at massive scale.[^18]
*Weaknesses:* Limited computer use support; not suitable as primary reasoning model; no Max mode; API-only; weakest in GPT-5.4 family.

**GPT-5.2**  
*Strengths:* 400K context; 128K output — first GPT model with truly large output capacity; 90%+ on ARC-AGI-1; 93.2% GPQA Diamond; 90% input caching discount (best in class); Thinking variant available.[^19][^106][^107]
*Weaknesses:* Superseded by GPT-5.4 on most benchmarks; "refusal-enablement gap" — refuses in natural language but may still provide executable attack steps via tool log output; no 1M context option.[^108]

**GPT-5.1**  
*Strengths:* Flat $1.25/$10 pricing across the full 400K window; adaptive reasoning (can disable reasoning for faster responses); good "workhorse" balance for production; improved instruction following vs. GPT-5.[^49]
*Weaknesses:* 400K context only; outperformed on coding by GPT-5.2 and the Codex family; no Max mode; lower refusal robustness than Claude on multi-turn adversarial scenarios (28.6% breach rate vs. Claude Opus 4.5's 4.8%).[^108]

**GPT-5.1 Mini (Codex Mini)**  
*Strengths:* Fixed medium reasoning; $0.25/$2.00; 400K context; strong coding benchmark (83.6% coding score, 81.3% GPQA); cost-effective coding specialist.[^21]
*Weaknesses:* Fixed reasoning — no effort dial; not suitable for deep multi-step analysis; no Max mode; audio not supported.

**GPT-5 Mini**  
*Strengths:* $0.25/$2.00 pricing; 400K context; 128K output; fast (~86 tok/s); all GPT-5 capabilities at fraction of cost; excellent for well-defined tasks.[^50][^109]
*Weaknesses:* Fixed medium reasoning; lower accuracy on open-ended tasks; no computer use; no audio output; not fine-tunable.[^50]

**Codex 5.3**  
*Strengths:* Fastest Codex model before Spark; 78.8 tok/s (xhigh effort) per Artificial Analysis; agentic coding with context compaction; 400K context; strong on SWE-bench Pro; GitHub Copilot GA integration; $1.75/$14 — same price as Codex 5.2.[^23][^110]
*Weaknesses:* Effective prompt limit is 272K (not the full 400K); reasoning-heavy — no "no thinking" mode; slower than GPT-5.4 Mini for lightweight tasks.[^52]

**Codex 5.3 Spark**  
*Strengths:* 1,000+ tokens/second on Cerebras WSE-3 hardware; 50% TTFT improvement vs. standard Codex 5.3; 80% RTT reduction; designed for real-time coding edits where delay breaks flow.[^111][^53]
*Weaknesses:* Research preview only — not GA; text-only (no vision at launch); 128K context window only; separate rate limits; limited availability during high demand; no explicit reasoning effort levels exposed.[^53]

**Codex 5.2**  
*Strengths:* 56.4% SWE-Bench Pro and 64.0% Terminal-Bench 2.0 at launch; strong long-horizon task completion; 90% caching discount; fast xhigh variant.[^19]
*Weaknesses:* Superseded by Codex 5.3 on most benchmarks; same pricing as 5.3 makes it a secondary choice; 400K context only.

**Codex 5.1 Max**  
*Strengths:* Long-context "Max" variant of the GPT-5.1 Codex family; 400K context, 128K output; $1.25/$10 pricing; good for large codebase analysis within the Codex family.  
*Weaknesses:* Older generation than 5.2/5.3; 77.9% SWE-bench Verified (below Opus 4.5's 80.9% at same era); medium–xhigh reasoning only (no low effort).[^98]

***

#### Google Gemini Models

**Gemini 3.1 Pro**  
*Strengths:* Highest ARC-AGI-2 score at launch (77.1%); 1M token context; thinking levels (low/medium/high) provide granular control; 123 tok/s generation — fast for a frontier reasoning model; 80.6% SWE-bench Verified; native image generation inline; full audio support; Grounding with Google Search; 6.15s avg TTFT on Artificial Analysis.[^112][^113][^114][^103][^71]
*Weaknesses:* Thinking cannot be fully disabled — minimum is "low" thinking level; tiered pricing above 200K tokens ($4/$18 vs. $2/$12) creates cost cliff for long-context work; still in preview as of April 2026 — GA pricing not finalized; 64K max output is the lowest among flagship models.[^70][^115][^28]

**Gemini 3 Flash**  
*Strengths:* $0.50/$3.00 — strong cost-efficiency for high-volume tasks; 1M context; ~114 tok/s; GA model (not preview); supports Computer Use Preview; full tool calling and structured output; good for agentic workflows and balanced tasks; inline image generation.[^87][^113][^72]
*Weaknesses:* "Minimal" thinking level is not a true non-thinking mode; less accurate than 3.1 Pro on complex reasoning; 64K max output; Flash hit practical truncation at ~12,854 output tokens in some long-generation tests before 3.1 Pro improvements.[^116]

**Gemini 2.5 Flash**  
*Strengths:* 1M context; thinking on/off toggle; context caching supported; strong throughput (~173 tok/s at long prompts); $0.30/$2.50 pricing; unified pricing regardless of context length.[^73][^102]
*Weaknesses:* ⚠ Deprecated — shutting down **June 17, 2026**; should migrate to Gemini 3 Flash; 64K max output; generation reliability at long context inferior to Gemini 3.1 Pro.[^30][^117]

***

#### xAI and Moonshot Models

**Grok 4.20**  
*Strengths:* 2M token context — largest among all models in this list; 234.9 tok/s output speed — fastest among flagship models; Arena Elo ~1485–1493; 78% on Omniscience (non-hallucination); lowest hallucination rate per xAI's claims; multi-agent mode (up to 16 sub-agents); $2/$6 pricing — aggressive for a flagship model; reasoning can be toggled on/off per request.[^57][^82][^32][^118]
*Weaknesses:* High TTFT (~10.33s) — reasoning-heavy requests take significant latency; no audio output; xAI data governance under EU regulatory scrutiny (GDPR investigation); relatively newer enterprise track record vs. Anthropic/OpenAI; Arena Elo preliminary (only ~5,071 votes as of early April).[^119][^120][^118]

**Kimi K2.5**  
*Strengths:* Only open-weight model in this list (MIT license; weights downloadable); 1T parameter MoE, 32B active — frontier-scale intelligence at $0.60/$2.50; native multimodal (vision + text); agent swarm (up to 100 sub-agents, 1,500 tool calls); basis for Composer 2; strong on coding (73.7 SWE-bench Multilingual); can self-host for zero per-token costs at sufficient GPU scale.[^58][^33][^76][^1]
*Weaknesses:* 256K API context (below the 1M+ offered by Claude and Gemini flagship models); privacy policy for the Moonshot API broadly permits using content for model training — requires negotiated enterprise agreement or self-hosting to ensure data exclusion; performance below Claude Opus 4.7 on pure coding benchmarks; no audio; no Max mode via Cursor.[^121][^122][^58]

***

## Part IV — Performance Metrics

### Time to First Token (TTFT) and Generation Speed

These are observed/measured values from independent benchmarks. Reasoning models have much higher TTFT due to internal chain-of-thought.

| Model | Typical TTFT | Typical Throughput (tok/s) | Notes |
|---|---|---|---|
| **Auto** | Varies | Varies | Routes to least-loaded model |
| **Composer 2** (fast) | ~300–500ms est. | ~250 tok/s est. | Based on Kimi K2.5 architecture |
| **Composer 1** | ~100–200ms | ~250 tok/s[^65] | Fastest Composer |
| **Claude Opus 4.7** | 2–5s+ (thinking overhead) | ~60 tok/s[^123] | Thinking always runs |
| **Claude Opus 4.6** | 2–5s+ | ~60–80 tok/s[^123] | — |
| **Claude Sonnet 4.6** | ~300–500ms | ~80 tok/s[^123] | — |
| **Claude Sonnet 4.5** | ~1–2s | ~50 tok/s[^124] | — |
| **Claude Sonnet 4** | ~1–2s | ~42–50 tok/s[^102] | — |
| **Claude Haiku 4.5** | ~597–639ms[^102] | ~78–135 tok/s[^102] | Fastest TTFT among Claude models |
| **GPT-5.4** | ~2–10s (reasoning-dependent) | ~100 tok/s[^118] | TTFT scales with effort level |
| **GPT-5.4 Mini** | <1s est. | ~120–150 tok/s est. | — |
| **GPT-5.4 Nano** | <500ms est. | ~150+ tok/s est. | Speed-optimized tier |
| **GPT-5.2** | ~sub-second (non-reasoning mode) | ~74% faster than prior models[^106] | 74% speed improvement noted at launch |
| **GPT-5.1** | ~0.97–1.5s | ~83–143 tok/s[^109][^125] | Non-reasoning mode is fast |
| **GPT-5 Mini** | ~65s TTFT (at high reasoning)[^109] | ~86 tok/s[^109] | High TTFT reflects deep reasoning budget |
| **Codex 5.3** | ~7.48s (xhigh effort)[^126] | ~73–79 tok/s[^110] | — |
| **Codex 5.3 Spark** | ~50% less than Codex 5.3[^111] | 1,000+ tok/s[^53] | Cerebras hardware; research preview |
| **Codex 5.2** | ~similar to Codex 5.3 | ~similar | — |
| **Codex 5.1 Max** | ~7s est. | ~211 tok/s[^126] | GPT-5.1-Codex listed at 211 tok/s, 7.48s TTFT |
| **Gemini 3.1 Pro** | ~6.15s (reasoning)[^113] | ~123 tok/s[^114] | — |
| **Gemini 3 Flash** | ~730ms–1.5s[^102] | ~114 tok/s[^113] | — |
| **Gemini 2.5 Flash** | ~730ms–1.5s[^102] | ~146–173 tok/s[^102] | Best throughput before deprecation |
| **Grok 4.20** | ~10.33s[^119] | ~233–265 tok/s[^32][^118] | Fastest flagship output once started |
| **Kimi K2.5** | Not independently published | Not independently published | Self-hosted deployments vary widely |

***

### Major Benchmark Rankings (April 2026)

| Model | SWE-bench Verified | SWE-bench Pro | GPQA Diamond | Arena Elo (Coding) | Arena Elo (General) |
|---|---|---|---|---|---|
| **Claude Opus 4.7** | **87.6%**[^103] | **64.3%**[^103] | **94.2%**[^93] | ~1549–1561[^97] | ~1510+ |
| **Claude Opus 4.6** | 80.8%[^127] | 53.4%[^127] | — | ~1549[^97] | ~1480–1492[^128] |
| **Claude Sonnet 4.6** | ~77%+ | — | — | ~1523[^97] | ~1480+ |
| **Claude Sonnet 4.5** | 77.2%[^101] | — | — | ~1491[^97] | — |
| **Claude Opus 4.5** | 80.9%[^98] | — | — | ~1491[^97] | — |
| **GPT-5.4** | ~80% est.[^16] | 57.7%[^103] | — | ~1457[^97] | ~1480+ |
| **GPT-5.2** | ~80%[^106] | — | 93.2%[^107] | — | ~1480–1492[^128] |
| **GPT-5.1** | — | — | — | — | — |
| **Codex 5.3** | — | ~56%+ est. | — | — | — |
| **Codex 5.2** | — | 56.4%[^19] | — | — | — |
| **Codex 5.1 Max** | 77.9%[^98] | — | — | — | — |
| **Gemini 3.1 Pro** | 80.6%[^103] | 54.2%[^127] | — | — | ~1485[^118] |
| **Grok 4.20** | — | — | — | ~1485[^32] | ~1493[^118] |
| **Composer 2** | 73.7% (Multilingual)[^61] | — | — | 61.3 CursorBench | — |
| **Kimi K2.5** | 73.7% (Multilingual)[^61] | — | — | — | — |

*General Arena Elo for Claude Opus 4.7 not yet established as of report date (released April 16, 2026). Claude 4.6 and GPT-5.2 remain in a near-statistical tie at the top of the General Arena. Grok 4.20's Arena ranking is preliminary with limited vote count.*[^128][^118]

***

## Part V — Behavior & Enterprise Compliance

### System Prompt Adherence in Long Contexts

| Model Family | Adherence Behavior |
|---|---|
| **Claude (all 4.x)** | Generally strong but degrades measurably over very long conversations — constraints near position 50+ in a chat show statistically reduced compliance[^100]. Claude's Constitution (published Jan 2026) establishes a reasoning-based judgment framework rather than strict rules, meaning Claude fills instruction gaps with contextual judgment rather than outright refusal[^129]. Operators at the top of the principal hierarchy (Anthropic → Operator → User) can set hard constraints[^130]. |
| **GPT-5.x / Codex** | GPT-5's "Safe-Completions" alignment favors helpful partial responses over hard refusals, improving UX but creating a "refusal-enablement gap" where the chat response is a refusal yet tool logs may contain executable content[^108]. System prompt robustness to prompt injection is weaker than Claude[^108]. GPT-5 defaults to "ship rather than discuss" — strong agentic compliance but requires precise upfront specifications[^131]. |
| **Gemini 3.x** | Grounded search and code execution constraints respected; structured output and system instructions work reliably per Vertex AI docs[^71]. Long-context adherence not independently published at the time of this report. |
| **Grok 4.20** | xAI touts "strict prompt adherence" and "lowest hallucination rates"[^82]. Enterprise tiers include isolated data planes and permission-aware document access[^132]. GDPR investigation ongoing for consumer usage — not enterprise usage specifically[^120]. |
| **Composer 2 / Kimi K2.5** | Cursor-specific integration enforces IDE-level context (file tree, git state). No independent long-context prompt adherence benchmark published for Composer series. |

***

### Known Refusal Triggers

| Model Family | Primary Refusal Patterns |
|---|---|
| **Claude (all 4.x)** | Hardcoded refusals for CSAM, mass-casualty weapons, and critical-infrastructure attacks are absolute. Softcoded behaviors (e.g., graphic violence, dual-use code) are adjustable by operators via system prompt. Starting Claude 4, streaming returns `stop_reason: "refusal"` with no message text (Anthropic's intentional test string exists and can be exploited for denial-of-service injection)[^133]. Red-team breach rate for Opus 4.5 was 4.8% across 21 adversarial scenarios — lowest of models tested[^108]. |
| **GPT-5.x** | "Safe-Completions" replaces the previous "refusal-first" approach — GPT-5 models rarely outright refuse but may produce educational-looking outputs that still provide harmful components[^104][^134]. GPT-5 showed 27% more refusals on "previously safe" tasks vs. GPT-4 in some controlled tests[^105], particularly around criticism of public figures and corporations. GPT-5 mini/nano were significantly more permissive than flagship GPT-5 (37–38% attack success rate vs. GPT-4o's 19%)[^104]. |
| **Codex 5.x** | Similar "Safe-Completions" inheritance from GPT-5. Code generation refusals are rare for general automation; more restrictive for malware, exploit scaffolding, or network intrusion code. |
| **Gemini 3.x** | Google's safety classifiers apply; standard refusals around CSAM, weapons, and hate speech. Grounding with Google Search can override hallucinated refusals. |
| **Grok 4.20** | Positioned as lower-refusal than competitors per xAI marketing. Hallucination rate claimed as lowest on market[^82], but enterprise deployment requires careful verification for regulated industries. |
| **Kimi K2.5** | Limited publicly available red-team data. As an open-weight model, self-hosted deployments bypass Moonshot AI's safety filters entirely — the model has no hardwired safety training equivalent to Claude's Constitutional AI. |

***

### API Data Training Policies

| Provider | API Data Used for Training? | Policy Details |
|---|---|---|
| **Anthropic (Claude API)** | **No** — API data is never used for training by default[^135] | API logs retained 7 days (since Sept 15, 2025) then deleted[^135]. Consumer Free/Pro plans: opt-in training model since Sept 28, 2025[^136][^137]. Enterprise/API: permanently excluded[^138]. Zero Data Retention mode available for enterprise[^135]. |
| **OpenAI (GPT/Codex API)** | **No** — OpenAI stopped training on API data by default since March 2023[^139][^140] | API inputs/outputs not used for training unless customer explicitly opts in. 30-day retention for abuse monitoring. Enterprise Zero Data Retention available. Consumer ChatGPT (non-API) usage may still be used[^141]. |
| **Google (Gemini API)** | **Paid API: No / Free tier: Yes**[^142][^143] | Paid Google Cloud API (Vertex AI) and Google Workspace: customer data not used to train foundation models[^144]. Free Gemini API tier defaults to training usage[^145]. ZDR available for approved Paid projects[^146]. |
| **xAI (Grok)** | **Business/Enterprise: No** | xAI explicitly states "Your data stays yours: no training on it, ever" for Business and Enterprise tiers[^132]. Consumer Grok on X: standard consumer terms apply. Enterprise Vault provides customer-managed encryption keys[^132]. |
| **Moonshot AI (Kimi K2.5 API)** | **Potentially yes — not clearly opt-out by default** | The Kimi OpenPlatform Privacy Policy states content may be used to "train and optimize models"[^147]. A Hugging Face analysis notes there is no explicit prohibition[^121][^122]. Users can request opt-out via `membership@moonshot.ai`[^148], but this is not the default. Enterprise negotiation is required for strong guarantees. Self-hosting the open weights entirely avoids this concern. |
| **Cursor (Composer/Auto)** | Routes to underlying provider policies | Cursor's models route through Anthropic, OpenAI, and Google APIs per their respective terms. Cursor's own Composer models are proprietary to Cursor (Anysphere); no specific training data policy for Composer inference is published. |

***

## Appendix: Key Numbers Quick Reference

| Model | Input $/M | Output $/M | Context | Max Out | Released |
|---|---|---|---|---|---|
| Claude Opus 4.7 | $5.00 | $25.00 | 1M | 128K | Apr 16, 2026 |
| Claude Opus 4.6 | $5.00 | $25.00 | 1M | 128K | Feb 5, 2026 |
| Claude Opus 4.5 | $5.00 | $25.00 | 200K | 64K | Nov 24, 2025 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | 1M | 65,536 | Feb 17, 2026 |
| Claude Sonnet 4.5 | $3.00 | $15.00 | 200K | 64K | Sep 29, 2025 |
| Claude Sonnet 4 ⚠ | $3.00 | $15.00 | 200K | 64K | May 22, 2025 |
| Claude Haiku 4.5 | $1.00 | $5.00 | 200K | 64K | Oct 14, 2025 |
| GPT-5.4 | $2.50 | $15.00 | 272K (1M opt-in) | 128K | Mar 5, 2026 |
| GPT-5.4 Mini | $0.75 | $4.50 | 400K | 128K | Mar 17, 2026 |
| GPT-5.4 Nano | $0.20 | $1.25 | 400K | 128K | Mar 17, 2026 |
| GPT-5.2 | $1.75 | $14.00 | 400K | 128K | Dec 11, 2025 |
| GPT-5.1 | $1.25 | $10.00 | 400K | 128K | Nov 13, 2025 |
| GPT-5.1 Mini (Codex Mini) | $0.25 | $2.00 | 400K | 128K | Nov 13, 2025 |
| GPT-5 Mini | $0.25 | $2.00 | 400K | 128K | Aug 7, 2025 |
| Codex 5.3 | $1.75 | $14.00 | 400K (272K prompt) | 128K | Feb 5, 2026 |
| Codex 5.3 Spark | Preview | Preview | 128K | TBD | Feb 12, 2026 |
| Codex 5.2 | $1.75 | $14.00 | 400K | 128K | Jan 14, 2026 |
| Codex 5.1 Max | $1.25 | $10.00 | 400K | 128K | Nov 13, 2025 |
| Gemini 3.1 Pro | $2.00–$4.00 | $12.00–$18.00 | 1,048,576 | 65,536 | Feb 19, 2026 |
| Gemini 3 Flash | $0.50 | $3.00 | 1M | 65,536 | ~Dec 2025 |
| Gemini 2.5 Flash ⚠ | $0.30 | $2.50 | 1M | 65,536 | Jun 17, 2025 |
| Grok 4.20 | $2.00 | $6.00 | 2M | Large | Mar 9, 2026 |
| Kimi K2.5 | $0.60 | $2.50 | 256K (API) | TBD | Jan 27, 2026 |
| Composer 2 | $0.50 | $2.50 | 200K | IDE only | Mar 19, 2026 |
| Composer 1.5 | $3.50 | $17.50 | 200K | IDE only | Feb 8, 2026 |
| Composer 1 | $1.25 | $10.00 | 200K | IDE only | Oct 29, 2025 |

⚠ = Deprecated / retiring soon.

---

## References

1. [Cursor Composer 2: Benchmarks, Pricing & Review (2026)](https://www.buildfastwithai.com/blogs/cursor-composer-2-review-2026) - Composer 1.5 cost $3.50 per million input tokens and $17.50 per million output tokens in February 20...

2. [Composer 2 Technical Report - arXiv](https://arxiv.org/html/2603.24477v2) - Composer 2 is a specialized model designed for agentic software engineering. The model demonstrates ...

3. [Introducing Composer 1.5 - Cursor](https://cursor.com/blog/composer-1-5) - Composer 1.5 is a significantly stronger model than Composer 1 and we recommend it for interactive u...

4. [Composer: Building a fast frontier model with RL](https://simonwillison.net/2025/Oct/29/cursor-composer/) - 29th October 2025 - Link Blog. Composer: Building a fast frontier model with RL (via) Cursor release...

5. [Claude Opus 4.7: Complete Guide to Features, Benchmarks ...](https://www.nxcode.io/resources/news/claude-opus-4-7-complete-guide-features-benchmarks-pricing-2026) - Claude Opus 4.7 is here — same $5/$25 pricing, 70% CursorBench (+12pp), 98.5% vision accuracy, 3x im...

6. [Introducing Claude Opus 4.7 - Anthropic](https://www.anthropic.com/news/claude-opus-4-7) - Pricing remains the same as Opus 4.6: $5 per million ... In addition to Claude Opus 4.7 itself, we'r...

7. [Introducing Claude Opus 4.6 - Anthropicwww.anthropic.com › news › claude-opus-4-6](https://www.anthropic.com/news/claude-opus-4-6)

8. [Claude Opus 4.5: Complete Guide, Pricing, Context Window ...](https://llm-stats.com/blog/research/claude-opus-4.5-launch) - A comprehensive look at Claude Opus 4.5 - Anthropic's flagship AI model with 80.9% SWE-bench, 200K c...

9. [Claude Sonnet 4.6 Adds 1M Token Context and Enhanced Long ...](https://windowsforum.com/threads/claude-sonnet-4-6-adds-1m-token-context-and-enhanced-long-context-reasoning.401569/) - Anthropic’s Claude Sonnet 4.6 lands as a practical, broadly available step-change: the Sonnet family...

10. [Introducing Claude Sonnet 4.6 - Anthropic](https://www.anthropic.com/news/claude-sonnet-4-6)

11. [Claude Sonnet 4.5 Model Specs, Costs & Benchmarks (March 2026)](https://blog.galaxy.ai/model/claude-sonnet-4-5) - Detailed breakdown of Claude Sonnet 4.5 including features, pricing, benchmarks, and performance ana...

12. [Claude Sonnet 4 Model Specs, Costs & Benchmarks (April 2026)](https://blog.galaxy.ai/model/claude-sonnet-4) - Detailed breakdown of Claude Sonnet 4 including features, pricing, benchmarks, and performance analy...

13. [Claude 4 Deprecation: Sonnet 4 and Opus 4 Retire June 15, 2026](https://tygartmedia.com/claude-4-deprecation/)

14. [Introducing Claude Haiku 4.5 - Simon Willison's Weblog](https://simonwillison.net/2025/Oct/15/claude-haiku-45/) - Anthropic released Claude Haiku 4.5 today, the cheapest member of the Claude 4.5 family that started...

15. [Complete Guide to OpenAI's Latest Models (March 2026) - FluxHire.AI](https://www.fluxhire.ai/blog/chatgpt-gpt-5-4-mini-nano-complete-guide-2026) - GPT-5.4 Mini and Nano are smaller, faster, more cost-effective variants released on 17 March 2026. M...

16. [GPT-5.4 (March 2026): 75% Computer Use, 1M Context ... - NxCode](https://www.nxcode.io/resources/news/gpt-5-4-release-date-features-pricing-2026) - GPT-5.4 complete overview: release date, key features, pricing, benchmarks, computer use, reasoning ...

17. [OpenAI launched GPT-5.4 mini and nano for faster high-volume ...](https://modelpricelab.com/changes/openai-gpt-5-4-mini-nano-introduced-2026-03-17)

18. [AI Breaking News: OpenAI's GPT-5.4 Mini & Nano | Kursol](https://www.kursol.io/blog/ai-breaking-news-2026-03-18-gpt-5-4-mini-nano) - OpenAI releases GPT-5.4 Mini and Nano—cheaper, faster small models. Why this matters for mid-market ...

19. [GPT-5.2 and Codex: Complete OpenAI Model Guide 2026](https://www.digitalapplied.com/blog/gpt-5-2-codex-openai-model-guide-2026) - OpenAI launches GPT-5.2 and GPT-5.2-Codex optimized for agentic coding as GPT-4o retires February 13...

20. [GPT-4.1 Mini vs GPT‑5.1 - Detailed Performance & Feature ...](https://docsbot.ai/models/compare/gpt-4-1-mini/gpt-5-1) - Discover how OpenAI's GPT-4.1 Mini and OpenAI's GPT‑5.1 stack up in performance, features, and appli...

21. [GPT 5.1 Codex Mini API Pricing 2026 - Costs ... - Price Per Token](https://pricepertoken.com/pricing-page/model/openai-gpt-5.1-codex-mini) - GPT 5.1 Codex Mini pricing: $0.25/M input, $2.00/M output. See benchmarks, capabilities, and find th...

22. [GPT-5 Mini Model Specs, Costs & Benchmarks (April 2026) | Galaxy.ai](https://blog.galaxy.ai/model/gpt-5-mini) - Detailed breakdown of GPT-5 Mini including features, pricing, benchmarks, and performance analysis. ...

23. [$20/mo, Pro $200, Pro Lite $100 & GPT-5.3-Codex API - ScreenApp](https://screenapp.io/blog/chatgpt-pricing) - With OpenAI's newest GPT-5.3-Codex (released February 5, 2026) and subscription tiers ranging from f...

24. [GPT 5.3 Codex Spark: 15x Faster AI Coding - SSNTPL](https://ssntpl.com/blog-gpt-5-3-codex-spark-real-time-coding-ai/) - OpenAI's GPT 5.3 Codex Spark delivers 1000+ tokens/second with Cerebras chips. 80% faster roundtrips...

25. [GPT 5.2 Codex API Pricing 2026 - Costs, Performance & Providerspricepertoken.com › pricing-page › model › openai-gpt-5.2-codex](https://pricepertoken.com/pricing-page/model/openai-gpt-5.2-codex) - GPT 5.2 Codex pricing: $1.75/M input, $14.00/M output. See benchmarks, capabilities, and find the ch...

26. [OpenAI GPT-5.1 Codex Max API Pricing Calculator](https://custom.typingmind.com/tools/estimate-llm-usage-costs/openai/gpt-5-1-codex-max) - Estimate how much you will spend on OpenAI GPT-5.1 Codex Max API. See pricing, capabilities, and con...

27. [Free Gemini Is 3 Flash — And 3.2 Is Already Being Spotted](https://leaveit2ai.com/ai-tools/language-model/google-gemini-3) - Free Gemini runs 3 Flash, not 3.1 Pro. Gemini 3.1 Pro launched Feb 19: 2x reasoning, same $19.99. Ve...

28. [Gemini 3.1 Models: Flash vs Pro](https://www.verdent.ai/zh-Hant/guides/gemini-3-1-flash-lite-vs-flash-vs-pro) - An honest comparison of all three Gemini 3.1 models — Flash-Lite, Flash, and Pro — with clear guidan...

29. [Gemini 2.5 Flash API Pricing 2026 - Costs, Performance & Providers](https://pricepertoken.com/pricing-page/model/google-gemini-2.5-flash) - Gemini 2.5 Flash pricing: $0.30/M input, $2.50/M output. See benchmarks, capabilities, and find the ...

30. [Gemini deprecations | Gemini API - Google AI for Developers](https://ai.google.dev/gemini-api/docs/deprecations) - Keep track of deprecation schedules for Gemini models and features

31. [Grok 4.20 0309 v2 (Non-reasoning) vs Kimi K2.5 (Reasoning)](https://artificialanalysis.ai/models/comparisons/grok-4-20-non-reasoning-vs-kimi-k2-5) - Context Window. 2000k tokens (~3000 A4 pages of size 12 Arial font). 256k tokens (~384 A4 pages of s...

32. [Grok 4.20 Benchmarks 2026: Scores, Rankings & Performance](https://benchlm.ai/models/grok-4-20-beta) - According to BenchLM.ai, Grok 4.20 ranks #24 out of 109 models on the provisional leaderboard with a...

33. [Kimi K2.5: How a $0.60/M Token Open-Source Model is Forcing Big ...](https://www.contextstudios.ai/blog/kimi-k25-how-a-060m-token-open-source-model-is-forcing-big-ai-to-rethink-pricing) - Moonshot AI released Kimi K2.5, a trillion-parameter open-source model at $0.60/M tokens that matche...

34. [Sonnet 4 API deprecation](https://www.reddit.com/r/claudexplorers/comments/1sly0ej/sonnet_4_api_deprecation/) - Sonnet 4 API deprecation

35. [Claude Platform — Anthropic - releases.sh](https://releases.sh/anthropic/claude-platform) - Release notes and changelog for Claude Platform by Anthropic

36. [Claude Opus 4.7: Benchmarks, Pricing, Context & What's New](https://llm-stats.com/blog/research/claude-opus-4-7-launch) - Claude Opus 4.7 scores 87.6% on SWE-bench Verified, 94.2% on GPQA, 1M token context, 3.3x higher-res...

37. [What Is Claude Opus 4.7? Features, Benchmarks, Pricing, and ...](https://apidog.com/blog/claude-opus-4-7/) - Claude Opus 4.7 is Anthropic's most capable GA model with 1M context, high-res vision (3.75MP), xhig...

38. [Anthropic just announced 1M context GA at standard pricing for ...](https://forum.cursor.com/t/anthropic-just-announced-1m-context-ga-at-standard-pricing-for-opus-4-6-sonnet-4-6-when-will-cursor-reflect-this/154701) - Anthropic announced today (March 13, 2026) that the full 1M context window is now generally availabl...

39. [Four Effort Levels](https://www.digitalapplied.com/blog/claude-opus-4-6-release-features-benchmarks-guide) - Claude Opus 4.6 brings 1M token context, adaptive thinking, and 128K output. Complete guide to bench...

40. [[News Brief] Anthropic Releases Claude Opus 4.5](https://trilogyai.substack.com/p/news-brief-anthropic-releases-claude) - New flagship model claims coding benchmark lead amid intensifying AI competition

41. [Claude Sonnet 4.6: 1M Token Context, Features & Benchmarks](https://hokai.io/hub/articles/claude-sonnet-4-6-1m-token-context-window-features) - Claude Sonnet 4.6: 1M token context, adaptive thinking, 72.5% OSWorld score, Opus-level performance ...

42. [Claude API Pricing 2026: Opus vs Sonnet vs Haiku Compared](https://aicostcheck.com/blog/anthropic-claude-pricing-guide-2026) - Complete guide to Anthropic Claude API pricing in 2026. Compare costs for Claude Opus 4.6, Sonnet 4....

43. [Claude Sonnet 4.5 API Price, Cost Calculator & Specs](https://muon.tools/en/models/anthropic-claude-sonnet-4.5)

44. [Claude Sonnet 4 API Pricing 2026 - Costs, Performance & Providers](https://pricepertoken.com/pricing-page/model/anthropic-claude-sonnet-4) - Claude Sonnet 4 pricing: $3.00/M input, $15.00/M output. See benchmarks, capabilities, and find the ...

45. [Claude Sonnet 4 - AI Model Specifications & Pricing | Amazon Bedrock](https://www.crackedaiengineering.com/ai-models/amazon-bedrock-anthropic-claude-sonnet-4-20250514-v1-0) - The Claude Sonnet 4 AI model by Amazon Bedrock offers developers advanced capabilities in text input...

46. [Claude Haiku 4.5 Deep Dive: Cost, Capabilities, and the Multi-Agent ...](https://caylent.com/blog/claude-haiku-4-5-deep-dive-cost-capabilities-and-the-multi-agent-opportunity) - Explore the newly launched Anthropic Claude Haiku 4.5, Anthropic's first Haiku model to include exte...

47. [GPT-5.4 deep dive: pricing, context limits, and tool search explained](https://community.openai.com/t/gpt-5-4-deep-dive-pricing-context-limits-and-tool-search-explained/1375800) - The announcement covers the headlines well. This is the companion post covering the specifics you’ll...

48. [GPT-5.2 Complete Guide: Features, Benchmarks & API](https://www.digitalapplied.com/blog/gpt-5-2-complete-guide) - Master GPT-5.2 with Instant/Thinking/Pro tiers. 38% fewer errors, 70.9% expert-level accuracy. Compl...

49. [GPT-5.1 API Pricing Explained (Usage, Tokens, Limits) - Skywork ai](https://skywork.ai/blog/ai-agent/gpt5-1-api-pricing/) - The context window expanded to 272,000 input tokens and 128,000 output tokens. This 2x increase from...

50. [GPT-5 mini (2025-08-07) - OpenAI Platform](https://platform.openai.com/docs/models/gpt-5-mini) - Explore resources, tutorials, API docs, and dynamic examples to get the most out of OpenAI's develop...

51. [GPT-5.3-Codex Model | OpenAI API](https://developers.openai.com/api/docs/models/gpt-5.3-codex)

52. [gpt-5.3-codex Cost Calculator - OpenAI | Bifrost - Maxim AI](https://www.getmaxim.ai/bifrost/llm-cost-calculator/provider/openai/model/gpt-5.3-codex) - Calculate the cost of using gpt-5.3-codex from OpenAI for Responses workloads. Input: $1.75 per 1M t...

53. [Introducing GPT-5.3-Codex-Spark - OpenAI](https://openai.com/index/introducing-gpt-5-3-codex-spark/) - At launch, Codex-Spark has a 128k context window and is text-only. During the research preview, Code...

54. [Gemini 3.1 Pro vs Gemini 3 Flash Comparison - LLM Stats](https://llm-stats.com/models/compare/gemini-3.1-pro-preview-vs-gemini-3-flash-preview) - For input processing, Gemini 3.1 Pro ($2.50/1M tokens) is 5.0x more expensive than Gemini 3 Flash ($...

55. [Gemini 3 Developer Guide | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/gemini-3?thinking=high) - Learn about the new features of Gemini 3 in the Gemini API.

56. [Gemini 2.0 Flash deprecated: migration cost guide 2026 - TokenCost](https://tokencost.app/blog/gemini-2-0-flash-deprecated-migration-cost) - Gemini 2.0 Flash shuts down June 1, 2026. 2.5 Flash costs 3x more on input, 6x on output. 2.5 Flash-...

57. [xAI - Grok 4.20 pricing & specs - CloudPrice](https://cloudprice.net/models/xai-grok-4-20) - Grok 4.20 is an AI model by xAI. 2.0M context window. Pricing from $2.00 per 1M input tokens. Availa...

58. [Kimi K2.5 vs Grok-4.20 Beta Reasoning Comparison - LLM Stats](https://llm-stats.com/models/compare/kimi-k2.5-vs-grok-4.20-beta-0309-reasoning) - Context Window. Maximum input and output token capacity. Grok ... 5 was released on 2026-01-27, whil...

59. [Kimi K2.5: Specifications and GPU VRAM Requirements](https://apxml.com/models/kimi-k25) - Kimi K2.5 exhibits strong transparency in its architectural specifications and hardware requirements...

60. [Cursor Pricing Explained 2026 - Vantage](https://www.vantage.sh/blog/cursor-pricing-explained) - Cursor's “Auto” mode automatically selects a cost-efficient model ... context windows, which adds a ...

61. [Introducing Composer 2 - Cursor](https://cursor.com/blog/composer-2) - Composer 2 is now available in Cursor. It's frontier-level at coding and priced at $0.50/M input and...

62. [Composer 2 Cache Read Issues - Help - Cursor - Community Forum](https://forum.cursor.com/t/composer-2-cache-read-issues/155983) - When using automation cloud agents with the Composer 2 model, the agents were hitting cache reads on...

63. [Composer 2 Cache Read Issues - #5 by deanrie - Help - Cursor](https://forum.cursor.com/t/composer-2-cache-read-issues/155983/5) - When using automation cloud agents with the Composer 2 model, the agents were hitting cache reads on...

64. [Cursor's Composer 2: What It Means for Your AI Coding Costs](https://www.vantage.sh/blog/cursor-composer-2) - Composer 1.5 shipped in February at $3.50 per million input tokens. Composer 2, released on March 18...

65. [Cursor Composer-1 and Composer-1.5 Review 2026 - EPAM](https://www.epam.com/insights/ai/blogs/cursor-composer-model-review) - A practical review of Cursor Composer-1 and Composer-1.5 using LLM Chess benchmarks and real coding ...

66. [Pricing - Claude API Docs](https://platform.claude.com/docs/en/about-claude/pricing) - Learn about Anthropic's pricing structure for models and features

67. [Pricing | OpenAI API](https://developers.openai.com/api/docs/pricing) - Realtime and audio generation models ; gpt-realtime-1.5 · Text, $4.00 ; gpt-realtime-1.5 · Image, $5...

68. [GPT-5 vs GPT-5.1-Codex-Mini - Pricing & Benchmark Comparison ...](https://pricepertoken.com/compare/openai-gpt-5-vs-openai-gpt-5.1-codex-mini) - Compare GPT-5 and GPT-5.1-Codex-Mini API pricing, benchmarks, and capabilities. GPT-5 costs $0.63/M ...

69. [500 - Internal Server Error | Nuxt](https://pricepertoken.com/pricing-page/model/openai-gpt-5.1-codex) - GPT 5.1 Codex pricing: $1.25/M input, $10.00/M output. See benchmarks, capabilities, and find the ch...

70. [Gemini 3 Developer Guide | Gemini API - Google AI for Developers](https://ai.google.dev/gemini-api/docs/gemini-3) - Learn about the new features of Gemini 3 in the Gemini API.

71. [Gemini 3.1 Pro | Generative AI on Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-1-pro) - Custom tools endpoint · Grounding with Google Search · Code execution · System instructions · Struct...

72. [Gemini 3 Flash | Generative AI on Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash)

73. [Gemini 2.5: Updates to our family of thinking models](https://developers.googleblog.com/en/gemini-2-5-thinking-model-updates/) - Explore the latest Gemini 2.5 model updates with enhanced performance and accuracy: Gemini 2.5 Pro a...

74. [xAI Grok API Pricing: Every Model, Cost, and Context Window ...](https://mem0.ai/blog/xai-grok-api-pricing) - Grok 4 costs $3.00/M input tokens and $15.00/M output tokens. Grok 4.1 Fast has a 2-million-token co...

75. [Claude Pricing Explained: Subscription Plans & API Costs](https://intuitionlabs.ai/articles/claude-pricing-plans-api-costs) - A complete guide to Anthropic Claude pricing in 2026. Learn about subscription plans (Pro, Max, Team...

76. [Kimi K2.5: Visual Agentic Intelligence | Technical Report](https://www.kimi.com/blog/kimi-k2-5.html?_bhlid=8b0a310c4f4664b295b41f614aa48c6415f77361) - Kimi K2.5 defines Visual Agentic Intelligence. Trained on 15T tokens, it introduces SOTA visual codi...

77. [Composer 2 Cache Read Issues - #12 by mohitjain - Help - Cursor](https://forum.cursor.com/t/composer-2-cache-read-issues/155983/12) - The Composer 2 cache read issue has been addressed in a recent Cursor update. Updating to the latest...

78. [Structured outputs - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - When combined, Claude can call tools with guaranteed-valid parameters AND return structured JSON res...

79. [Structured outputs is now available on the Claude Developer ...](https://www.reddit.com/r/ClaudeAI/comments/1ox5f1y/structured_outputs_is_now_available_on_the_claude/) - Can anyone explain how this is different from tool use? I have been using tools to get structured re...

80. [ChatGPT Versions: All 32 GPT Models at a Glance - Gradually AI](https://www.gradually.ai/en/chatgpt-versions/) - Excellent for structured data processing and standard programming tasks; Supports parallel tool call...

81. [OpenAi Released GPT 5.4 Mini and Nano, at 10% of the Cost of 5.4](https://www.reddit.com/r/openclaw/comments/1rweg03/openai_released_gpt_54_mini_and_nano_at_10_of_the/) - It has a 400k context window and costs $0.75 per 1M input tokens and $4.50 per 1M output tokens. In ...

82. [Models and Pricing - xAI Docs](https://docs.x.ai/developers/models) - Grok 4.20 is our newest flagship model with industry-leading speed and agentic tool calling capabili...

83. [Why Claude Opus 4.7 Uses More Tokens — and What Developers ...](https://techscanai.com/briefs/why-claude-opus-4-7-uses-more-tokens-and-what-developers-should-do-about-it)

84. [Claude by Anthropic - Models in Amazon Bedrock - AWS](https://aws.amazon.com/bedrock/anthropic/) - Claude offers best-in-class vision capabilities compared to other leading models. ... Tool, and Obse...

85. [How to Use GPT-5 Effectively - Towards Data Science](https://towardsdatascience.com/how-to-use-gpt-5-effectively/) - I'll discuss how GPT-5 handles multimodal inputs and how you can use that effectively. ... I'll also...

86. [Codex Pricing - OpenAI Developers](https://developers.openai.com/codex/pricing) - For Pro $100, to celebrate the launch, you'll get 2x Codex usage through May 31, 2026. That means 10...

87. [Google Gemini API Pricing 2026: Complete Cost Guide per 1M Tokenswww.metacto.com › Blog › AI](https://www.metacto.com/blogs/the-true-cost-of-google-gemini-a-guide-to-api-pricing-and-integration) - Gemini API pricing for 2026: $1.25-$15/1M tokens for 2.5 Pro, $0.10-$3/1M for Flash models. Full pri...

88. [XAI Launches Grok 4.20 , 4 AI Agents Collaborating. Estimated ELO ...](https://www.nextbigfuture.com/2026/02/xai-launches-grok-4-20-and-it-has-4-ai-agents-collaborating.html) - Estimated Arena (LMArena) Elo for Grok 4.20: ~1505–1535 provisional (Grok 4.20 analysis). Reasoning:...

89. [The complete guide to Cursor pricing in 2026 [+ How to Clone ...](https://flexprice.io/blog/cursor-pricing-guide) - Cursor's tiered model offers flexibility; you can use any supported model, scale context size, and p...

90. [Cursor AI Review 2026: Features, Pricing & Is It Worth $20/Month?](https://www.nxcode.io/resources/news/cursor-ai-review-2026-features-pricing-worth-it) - Honest Cursor AI review after daily use in 2026. Deep dive into Supermaven autocomplete, agent mode,...

91. [Cursor "Auto" is no-longer unlimited](https://forum.cursor.com/t/cursor-auto-is-no-longer-unlimited/148185) - Hey, I get the frustration. You're right: Auto really was unlimited until August 2025, and that was ...

92. [Cursor AI Pricing 2026: Plans, Costs & Which One Is Right for You](https://uibakery.io/blog/cursor-ai-pricing-explained) - ✓ $20/month credit pool for manually selecting premium models (Claude Sonnet, GPT-4o, Gemini, etc.) ...

93. [Claude Opus 4.7 Benchmark Full Analysis: Empirical Data Leading ...](https://help.apiyi.com/en/claude-opus-4-7-benchmark-review-2026-en.html) - Author's Note: A deep dive into the Claude Opus 4.7 benchmarks: 87.6% on SWE-bench Verified, 64.3% o...

94. [Claude Opus 4.7 Price: 2026 API Rates & Subscription - GlobalGPT](https://www.glbgpt.com/resources/claude-opus-4-7-price/) - Claude Opus 4.7 officially retails at $20/month for the Claude Pro plan, while API rates hold steady...

95. [Claude AI 2026: Complete Guide to Models, Pricing, Features & Use ...](https://www.nxcode.io/resources/news/claude-ai-complete-guide-models-pricing-features-2026) - Claude Haiku 4.5 — The Speed Tier. Haiku is the fastest and cheapest model in the Claude family. At ...

96. [Claude Opus 4.6: What Changed and What It Means for Your Work](https://www.polylabs.app/blog/claude-opus-4-6-release) - Anthropic released Claude Opus 4.6 with a 1M token context window, adaptive thinking, and record-bre...

97. [LMSYS Chatbot Arena Coding Leaderboard April 2026](https://aidevdayindia.org/blogs/lmsys-chatbot-arena-current-rankings/lmsys-chatbot-arena-coding-leaderboard-2026.html) - Claude Opus 4.6 dominates the April 2026 rankings! Discover the latest Elo scores for the Claude 4.6...

98. [Claude Releases Opus 4.5 - Live Stream!](https://www.youtube.com/watch?v=GIkaAQ47D7E) - 🚨 Anthropic Just Dropped Claude Opus 4.5 🚨

Anthropic released Claude Opus 4.5 on November 24, 2025,...

99. [Everything to know about Claude Opus 4.5 | The Neuron](https://www.theneuron.ai/explainer-articles/everything-to-know-about-claude-opus-4-5) - Anthropic's new Claude Opus 4.5 tops coding benchmarks and introduces a controllable "Effort" parame...

100. [System prompt compliance degrades over long conversations and ...](https://www.reddit.com/r/ClaudeAI/comments/1rh5l0l/system_prompt_compliance_degrades_over_long/) - Claude's system prompt compliance degrades over long conversations and nobody talks about it enough....

101. [Upgrading to Claude 4.5: Key Benefits Over Previous Versions (2025)](https://skywork.ai/blog/claude-4-5-vs-claude-4-3-2-2025-comparison/) - Compare Claude Sonnet 4.5 vs Claude 4 (Opus/Sonnet), Claude 3.5/3, and Claude 2 for 2025. See coding...

102. [LLM API Latency Benchmarks [2026]: 5 Models Compared](https://www.kunalganglani.com/blog/llm-api-latency-benchmarks-2026) - 597 milliseconds. That's how fast Claude Haiku 4.5 delivered its first token on a medium-length prom...

103. [Claude Opus 4.7 Benchmarks Explained - Vellum AI](https://www.vellum.ai/blog/claude-opus-4-7-benchmarks-explained) - Full breakdown of Claude Opus 4.7 benchmarks and what it means for your agents and assistants. Compa...

104. [Is GPT-5 Easier to Jailbreak — or Are We Assessing It Wrong? A ...](https://blog-en.fltech.dev/entry/2025/08/22/gpt-5-sec) - Prompt Injection (direct and indirect): Tricks the model into ignoring its system instructions by em...

105. [I officially hate GPT-5. - LinkedIn](https://www.linkedin.com/pulse/i-officially-hate-gpt-5-dion-wiggins-hxutc) - GPT-5 refused. It admitted the statement was factual, admitted it fit none of its disallowed content...

106. [GPT-5.2: Complete Guide to Pricing, Context Window, Benchmarks ...](https://llm-stats.com/blog/research/gpt-5-2-launch) - A comprehensive look at OpenAI's GPT-5.2 -- the most capable model yet with 400K context window, 3 s...

107. [GPT-5.2: First Model Above 90% ARC-AGI Changes Inference - Introl](https://introl.com/blog/gpt-5-2-infrastructure-implications-inference-demand-january-2026) - OpenAI's GPT-5.2 achieves 93.2% GPQA Diamond, 100% AIME, 70.9% GDPval. 400K context window drives ne...

108. [Claude Jailbreaking in 2026: What Repello's Red Teaming Data ...](https://repello.ai/blog/claude-jailbreak) - Repello AI provides enterprise AI security platform with automated AI red teaming, adaptive guardrai...

109. [LLM Speed & Latency Comparison — Tokens/sec, TTFT by Provider ...](https://benchlm.ai/llm-speed) - Compare LLM inference speed across all major AI models. Tokens per second, time to first token (TTFT...

110. [GPT-5.3 Codex (xhigh) - Intelligence, Performance & Price Analysis](https://artificialanalysis.ai/models/gpt-5-3-codex) - Price. Output Speed: Output Tokens per Second; Price: USD per 1M Tokens ... GPT-5.3 Codex (xhigh) ge...

111. [OpenAI Releases a Research Preview of GPT‑5.3-Codex-Spark](https://www.marktechpost.com/2026/02/12/openai-releases-a-research-preview-of-gpt-5-3-codex-spark-a-15x-faster-ai-coding-model-delivering-over-1000-tokens-per-second-on-cerebras-hardware/) - OpenAI Releases a GPT‑5.3-Codex-Spark: A 15x Faster AI Coding Model Delivering Over 1000 Tokens Per ...

112. [Gemini 3.1 Pro: Benchmarks, Pricing & Full Access Guide (2026)](https://almcorp.com/blog/gemini-3-1-pro-complete-guide/) - Gemini 3.1 Pro scores 77.1% on ARC-AGI-2—more than double Gemini 3 Pro. Full guide: verified benchma...

113. [Gemini 3.1 Flash-Lite vs Flash vs Pro: Which Should You Use?](https://www.verdent.ai/guides/gemini-3-1-flash-lite-vs-flash-vs-pro) - Speed: Significantly slower than Flash-Lite. At ~114 tokens/second versus Flash-Lite's ~287, it's no...

114. [Gemini 3.1 Pro Preview - Intelligence, Performance & Price Analysis](https://artificialanalysis.ai/models/gemini-3-1-pro-preview) - At 123 tokens per second, Gemini 3.1 Pro Preview is notably fast (62). ... Gemini 3.1 Pro Preview ha...

115. [Gemini 3.1 Pro Pricing in 2026: Token Costs, Caching ... - Verdent AI](https://www.verdent.ai/guides/gemini-3-1-pro-pricing) - A developer-first cost guide: exact input/output rates, when 'thinking tokens' spike your bill, cont...

116. [Gemini 3.1 Pro finally solves the output limit issues in Gemini 3 : r/Bard](https://www.reddit.com/r/Bard/comments/1r93kgf/gemini_31_pro_finally_solves_the_output_limit/) - Gemini 3 Pro → truncated at 21,723 output tokens. Gemini 3 Flash → stopped at 12,854 tokens. Gemini ...

117. [Deprecate or remove outdated Gemini models based on 2026-01 ...](https://github.com/langgenius/dify-official-plugins/issues/2515) - Upcoming Deprecations (For awareness, do not remove yet). The following models are scheduled for shu...

118. [Grok 4.20 - xAI's Multi-Agent Reasoning Flagship](https://awesomeagents.ai/models/grok-4-20/) - Grok 4.20 is xAI's current flagship LLM with a 2M-token context window, native multi-agent mode, and...

119. [Grok 4.20 vs Kimi K2.5 (Reasoning): AI Benchmark Comparison 2026](https://benchlm.ai/compare/grok-4-20-beta-vs-kimi-k2-5-reasoning) - Grok 4.20 has the larger context window at 2M, compared with 128K for Kimi K2.5 (Reasoning). Benchma...

120. [xAI Considering Free Grok Enterprise for 50+ Employee Companies](https://almcorp.com/blog/xai-grok-enterprise-free-version-businesses/) - xAI is gauging interest in a free Grok Enterprise tier for companies with 50+ employees. Full breakd...

121. [Kimi Privacy Policy Analysis 2026-02-07 - GitHub Gist](https://gist.github.com/gadgetb0y/11931119946c2e9dcae0a438fdefe0d5) - Broad, non-specific consent for using user content to train and improve AI models — potentially incl...

122. [moonshotai/Kimi-K2-Thinking · Their API Takes Your Data](https://huggingface.co/moonshotai/Kimi-K2-Thinking/discussions/24) - Their API Takes Your Data - PRIVACY RISK ... We may use content to provide, maintain, develop, and i...

123. [LLM API Comparison 2026: Pricing, Speed, Features | Every Provider](https://www.morphllm.com/llm-api) - Two metrics matter: time to first token (TTFT), which determines how fast streaming begins, and toke...

124. [LLM Latency Benchmark by Use Cases in 2026 - AIMultiple](https://aimultiple.com/llm-latency-benchmark) - Time to first token (TTFT) or first token latency, which captures how long it takes before the model...

125. [GPT-5 (ChatGPT) - Intelligence, Performance & Price Analysis](https://artificialanalysis.ai/models/gpt-5-chatgpt) - At 143 tokens per second, GPT-5 (ChatGPT) is notably fast (56). Technical specifications ...

126. [GPT 5 Codex API Pricing 2026 - Costs, Performance & Providers](https://pricepertoken.com/pricing-page/model/openai-gpt-5-codex) - Pricing starts at $1.25 per million input tokens and $10.00 per million output tokens. The model sup...

127. [Claude Opus 4.7: Full Review, Benchmarks & Features (2026)](https://www.buildfastwithai.com/blogs/claude-opus-4-7-review-benchmarks-2026) - Opus 4.7 hits 87.6% SWE-bench Verified and beats GPT-5.4 on coding at $5/M tokens. Full benchmarks, ...

128. [LMSYS Chatbot Arena Leaderboard 2026: | promptt.dev Blog](https://www.promptt.dev/blog/lmsys-chatbot-arena-leaderboard-2026) - Everything you need to know about the LMSYS Chatbot Arena Leaderboard in 2026 — Elo scores, top mode...

129. [Claude's Constitution - Anthropic](https://www.anthropic.com/constitution) - There are two broad approaches to guiding the behavior of models like Claude: encouraging Claude to ...

130. [My breakdown of Claude's 80-Page Constitution + 3 prompts to use ...](https://natesnewsletter.substack.com/p/what-anthropics-new-constitution) - Gaps in your system prompt get filled by judgment, not refusal. When your instructions don't cover a...

131. [16 Production Prompting Signals Hidden in GPT-5's System Prompt](https://natesnewsletter.substack.com/p/cracking-the-agent-code-16-production) - The system prompt's emphasis on compliance, observability, and policy routing signals OpenAI's enter...

132. [xAI Launches Grok Business and Enterprise Tiers with Team ...](https://ascii.co.uk/news/article/news-20260105-24e4e8c3/xai-launches-grok-business-and-enterprise-tiers-with-team-co) - xAI releases tiered Grok offerings: $30/seat Business plan with Google Drive integration and higher ...

133. [Break LLM Workflows with Claude's Refusal Magic String](https://hackingthe.cloud/ai-llm/exploitation/claude_magic_string_denial_of_service/) - This behavior creates a low-cost denial of service on any Claude-backed feature that does not robust...

134. [Tenable jailbreaks GPT-5, raising concerns about model's safety](https://www.tenable.com/blog/tenable-jailbreaks-gpt-5-gets-it-to-generate-dangerous-info-despite-openais-new-safety-tech) - Tenable Research managed to jailbreak GPT-5 soon after its release, raising questions about the AI m...

135. [Claude: data retention policies, storage rules, and compliance ...](https://www.datastudios.org/post/claude-data-retention-policies-storage-rules-and-compliance-overview) - Anthropic has refined Claude’s data retention framework to address privacy expectations, regulatory ...

136. [Anthropic updates Claude's policy with new data training choices](https://dig.watch/updates/anthropic-updates-claudes-policy-with-new-data-training-choices) - The change does not apply to enterprise services, which Anthropic confirmed remain under separate co...

137. [Claude Pro Data Privacy: Complete 2025 Guide to Security ...](https://aionx.co/claude-ai-reviews/claude-pro-data-privacy/) - Complete guide to Claude Pro data privacy in 2025. Learn about 2025 policy changes, encryption, GDPR...

138. [Anthropic users face a new choice – opt out or share your chats for ...](https://techcrunch.com/2025/08/28/anthropic-users-face-a-new-choice-opt-out-or-share-your-data-for-ai-training/) - Anthropic is making some major changes to how it handles user data. Users have until September 28 to...

139. [OpenAI halts training of GPT on API user data](https://forklog.com/en/openai-halts-training-of-gpt-on-api-user-data/)

140. [OpenAI Will No Longer Default to Using Customer Data for Training ...](https://mpost.io/openai-to-no-longer-use-customer-data-as-the-default-method-for-training-its-models/) - Read more: 5 Reasons to Use AI-Powered Bing Over Google Starting today, OpenAI is changing the terms...

141. [OpenAI Will No Longer Use Customer Data To Train Its Models by Default - Slashdot](https://tech.slashdot.org/story/23/03/01/1845206/openai-will-no-longer-use-customer-data-to-train-its-models-by-default) - OpenAI is changing the terms of its API developer policy, aiming to address developer -- and user --...

142. [Gemini API and Your Data Privacy: A 2025 Guide for ...](https://redact.dev/blog/gemini-api-terms-2025/) - Are you using Google’s Gemini API? Learn how your data is collected, stored, and used - plus practic...

143. [Gemini Training Data: Google's Consumer vs Enterprise Policies](https://i10x.ai/news/google-gemini-training-data-consumer-vs-enterprise) - Test

144. [Questions](https://knowledge.workspace.google.com/admin/gemini/generative-ai-in-google-workspace-privacy-hub)

145. [Gemini API and Your Data Privacy: A 2025 Guide for ... - Redact](https://redact.dev/blog/gemini-api-terms-2025) - Are you using Google’s Gemini API? Learn how your data is collected, stored, and used - plus practic...

146. [Zero data retention in the Gemini Developer API](https://ai.google.dev/gemini-api/docs/zdr) - Zero data retention in the Gemini API and Google AI Studio

147. [Kimi OpenPlatform Privacy Policy](https://platform.kimi.ai/docs/agreement/userprivacy) - We regularly provide training and education on personal information protection to our employees to e...

148. [how can paid subscribers opt out of training on their data? : r/kimi](https://www.reddit.com/r/kimi/comments/1qpeknq/terms_of_service_clarification_how_can_paid/) - The Kimi team has always attached great importance to the protection of personal information and pri...

