# EquipQR — Cursor Agent Handbook

This file is the **starting point** for agents working in this repo. It is intentionally scoped to **secrets, access, and escalation** first. Product conventions, branching, and release flows live in `.cursor/rules/*.mdc` and `docs/ops/` until they are reintroduced here deliberately.

**Environment:** Cursor on Windows (PowerShell). Stack: React, TypeScript, Vite, Supabase, TanStack Query.

---

## 1. Secrets management

### Source of truth

All agent-facing credentials live in the **EquipQR Agents** 1Password vault. Do not invent parallel secret stores, commit `.env` files, or paste secret values into chat, commits, or PR bodies.

**Columbia Cloudworks Agents** vault (`mrviyowmjwrxv7syobdlhnmawa`) holds maintainer Google sign-in for **admin.google.com** and **console.cloud.google.com** (`Google (Business)` item). Agents may load it via `.\scripts\e2e\Load-GoogleBusinessEnv.ps1` when browser automation is the unblock path. Local Playwright Google E2E uses **captured storage state** for `nicholas.king@columbiacloudworks.com` (`npm run e2e:google-auth:capture`) — not password or backup-code login in test runs.

| Item pattern | Purpose |
|---|---|
| `app-env-local-dev` | Local Vite `.env` (via `dev-start.bat`) |
| `edge-env-local-dev` | Local edge `supabase/functions/.env` |
| `app-env-preview-public` / `app-env-prod-public` | Public `VITE_*` vars synced to Vercel |
| `edge-env-preview-secrets` / `edge-env-prod-secrets` | Supabase Edge Function secrets |
| `github-read` / `github-write` | GitHub MCP tiers |
| `gcp-read` / editor impersonation | GCP viewer + `gcloud-write` MCP |
| `supabase-write`, `vercel-write` | Vendor CLI write tokens |
| `Google (Business)` (Columbia Cloudworks Agents, item id `ukvy6bzwb2ikq5cfeambgcq5u4`) | Workspace admin + GCP Console browser sign-in for agent unblock |

Naming convention for MCP-backed items: `<service>-<access-tier>` (not env tier). See `docs/ops/agent-secrets-and-access.md` for the full map and sync scripts.

### Read vs write tokens

| Variable | Scope | Use |
|---|---|---|
| `OP_SERVICE_ACCOUNT_TOKEN` (User scope) | Read-only service account `op-svc-equipqr-agents` | `op read`, `op item list`, `op inject`, CI headless reads |
| `OP_SAT_EquipQR` (User scope) | **Write** service account on EquipQR Agents vault | `op item create`, `op item edit`, vault mutations only |

**Rules**

- Never use the read-only token for vault writes.
- Never store write-tier vendor PATs (`github-write`, `vercel-write`, `supabase-write`, etc.) in `HKCU\Environment`. Materialize with `op read` in-session when needed.
- The only long-lived User-scope exception the maintainer chose is read-only `OP_SERVICE_ACCOUNT_TOKEN` for headless reads.

### 1Password CLI writes from Cursor (critical)

**Inline agent shell commands break `op item create` and `op item edit`.** Cursor's terminal feeds piped stdin into child processes. The CLI interprets that as JSON-on-stdin mode and hangs or returns `invalid JSON in piped input` / `cannot edit from template and stdin at the same time`.

**Always mutate vault items through a detached subprocess:**

```powershell
.\scripts\op-item-mutate.ps1 -Action Edit -Item "app-env-preview-public" -Vault "EquipQR Agents" -Assignment "FIELD[text]=value"
```

Or spawn `powershell.exe -NoProfile -File ...` yourself. Reads (`op read`, `op item list`, `op item get`) are fine inline.

Official assignment syntax: [1Password item create/edit](https://www.1password.dev/cli/reference/management-commands/item#item-edit). Use `--` before assignments when values contain dots. Prefer `[text]` field types for OAuth client IDs.

Dry-run first: add `-DryRun` to `op-item-mutate.ps1`.

### Drift checks agents should run

Before debugging OAuth or deploy mismatches:

```powershell
# Preview Google Workspace OAuth client ID: app (Vercel) vs edge (Supabase) must match
$env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN','User')
$app = (op read "op://EquipQR Agents/app-env-preview-public/GOOGLE_WORKSPACE_CLIENT_ID").Trim()
$edge = (op read "op://EquipQR Agents/edge-env-preview-secrets/GOOGLE_WORKSPACE_CLIENT_ID").Trim()
"appEdgeAligned=$($app -eq $edge)"
```

After changing `app-env-preview-public`, run `.\scripts\sync-vercel-from-1password.ps1 -Environment preview` and confirm `preview.equipqr.app` alias targets the **staging** deployment (not generic Preview protection).

---

## 2. Requesting access when tools are insufficient

Agents operate in **tiers**. Default to the lowest tier that completes the task. When blocked, **stop and ask the maintainer** with a concrete approval request — do not loop on failing commands.

### Tier A — Read-only (no approval needed)

- `op read` / `op item get` with read SAT (EquipQR Agents **and** Columbia Cloudworks Agents vaults)
- `github-read` MCP, `gcloud` viewer MCP, Supabase MCP reads, Datadog/Better Stack read tools
- Local `npm test`, lint, scoped verification
- Google Admin / GCP Console browser sign-in via `.\scripts\e2e\Load-GoogleBusinessEnv.ps1` when fixing Workspace or OAuth client blockers

### Tier B — Maintainer User-scope env (already granted on dev machine)

- `OP_SAT_EquipQR` for 1Password vault writes (via `op-item-mutate.ps1` only)
- `OP_SERVICE_ACCOUNT_TOKEN` for headless reads
- `FIRECRAWL_API_KEY` (bounded quota risk)

If a shell was opened before these were set, refresh:

```powershell
$env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN','User')
$env:OP_SAT_EquipQR = [Environment]::GetEnvironmentVariable('OP_SAT_EquipQR','User')
```

### Tier C — Browser / OAuth approval (human in the loop)

Use when the agent hits **interactive or consent-bound** limits:

| Situation | What to ask the maintainer |
|---|---|
| MCP server not authenticated | "Please authorize **&lt;server&gt;** in Cursor → MCP (browser OAuth)." Then retry once. |
| Google Workspace connect/disconnect on **preview cloud** only | "Please complete **Connect Google Workspace** on preview.equipqr.app; I'll watch edge logs / DB row count." Local GW flows are agent-automated via browser MCP — do not ask the user to click through local OAuth. |
| Google Admin Console (2SV, OAuth clients, user security) | Prefer agent browser sign-in with `Load-GoogleBusinessEnv.ps1` first; ask the maintainer only if Columbia Cloudworks Agents read fails or the change needs their personal approval. |
| GCP mutation needed | Approve **gcloud-write** / editor SA impersonation for: &lt;exact change&gt;. Use `Load-GoogleBusinessEnv.ps1` for Console UI edits when impersonation is blocked. Never `gcloud config set account`. |
| GitHub mutation beyond agent PAT | "Approve **github-write** MCP or run: &lt;exact gh command&gt;." |
| Supabase production promotion | Explicit `/release` or hotfix language only. |
| Cursor Smart Mode blocks a command | User approves via the **native approval card** in Cursor; agent retries with `request_smart_mode_approval` when applicable. |

**Agent behavior when blocked**

1. State the **exact** missing capability (not "1Password broken").
2. Propose the **smallest** approval path (one MCP auth, one browser click, one detached script).
3. After approval, **verify** with a read-only check before claiming success.

---

## 3. Where to look next

| Topic | Location |
|---|---|
| Full secrets map, sync scripts, rotation | `docs/ops/agent-secrets-and-access.md` |
| Branching / preview push policy | `.cursor/rules/branching.mdc` |
| **Dev stack stop/start (batch files only)** | `.cursor/rules/dev-stack-lifecycle.mdc` |
| Local E2E gate before preview push | `.cursor/rules/local-verify-before-preview-push.mdc` |
| **PR open → merge-ready (CI + Qodo + evidence)** | `.cursor/rules/pr-merge-ready-workflow.mdc` |
| PR visual evidence (screenshots + GIF) | `.cursor/rules/pr-visual-evidence.mdc` |
| PR CI gate (`npm ci` + green checks before handoff) | `.cursor/rules/pr-ci-gate-before-open.mdc` |
| Pre-commit Fallow gate | `.cursor/rules/fallow-before-commit.mdc` |
| PowerShell / git conventions | `.cursor/rules/git-powershell.mdc` |
| Workflow artifact commits | `.cursor/rules/workflow-artifacts.mdc` |
| Implementation skills | `.cursor/skills/itil-issue-resolver/SKILL.md` |
| PR feedback triage (existing PRs) | `.cursor/skills/address-pr-feedback/SKILL.md` |

---

## 4. Document maintenance

This handbook is **rebuilt from scratch** as of 2026-06-13. Add product- and compliance-specific lessons back incrementally — do not paste the old monolithic `AGENTS.md` wholesale. Prefer `docs/ops/` for long runbooks; keep this file under ~200 lines for agent context efficiency.

When capturing a new secrets or access lesson, update **this file** and, if detailed, **`docs/ops/agent-secrets-and-access.md`** in the same change.

---

## Learned User Preferences

- **Dev stack: batch files only; cycle freely.** Use `dev-stop.bat` / `dev-start.bat` / `dev-start.bat -Force` for the **entire** stack — never partial Supabase/Docker restarts or `npm ci` while Vite is running. Agents may stop/start without asking when verification requires it (`dev-stack-lifecycle.mdc`). Vite, docs, and edge serve run as background processes with logs under `tmp/dev-logs/` — do not reintroduce detached popup terminal windows.
- **PR handoff = merge-ready, every time.** Feature-branch PRs follow the full open → CI green → Qodo `openCount=0` → threads clear → evidence published loop (`pr-merge-ready-workflow.mdc`). Do not open a PR and walk away.
- **No preview push without local E2E.** As of 2026-06-13, local dev has production parity. Never push to `preview` until the agent has verified the change locally end-to-end with zero manual user steps (see `local-verify-before-preview-push.mdc`).
- **No product PR without visual evidence.** Every product/runtime PR must include local-stack screenshots and a GIF uploaded for inline GitHub display (`pr-visual-evidence.mdc`, `scripts/pr-evidence/`). Add `e2e/pr-evidence/<feature>.spec.ts` when existing specs do not cover the change; use `-MobileViewport` for phone UX (see `e2e/pr-evidence/mobile-work-order-details.spec.ts`). `Invoke-PrEvidence -Publish` reuses existing `tmp/pr-evidence/{flow}/` artifacts; pass `-Recapture` only to re-run Playwright.
- **No PR handoff with red CI.** Run `npm ci --prefer-offline --no-audit` before opening a feature-branch PR (matches GitHub Actions). After push, watch `gh pr checks <num> --watch` until required jobs pass — never open a PR and walk away on failing Lint/Test/Security/Build. If local install needed `--legacy-peer-deps`, commit `.npmrc` so CI can install too. See `pr-ci-gate-before-open.mdc`.
- **Do not assume the local dev stack is down when a probe fails after an earlier successful capture** — verify probe/script logic (e.g. HTTP 304 vs `fetch().ok`) with an independent check before restarting or reporting stack failure.
- **Edited `.ts`/`.tsx` files must pass ESLint with `--max-warnings 0` before the agent continues** (Cursor `lint-on-edit` hook treats warnings as blocking).
- Use the Columbia Cloudworks Workspace tenant (`columbiacloudworks.com`) and the Columbia Cloudworks Google account for GCP Console OAuth edits on `equipqr-prod`; use the real EquipQR Connect flow for Google Workspace integration validation; do not provision parallel Google orgs unless explicitly asked. When blocked on Google Admin or GCP Console UI, load `Google (Business)` from Columbia Cloudworks Agents vault (`mrviyowmjwrxv7syobdlhnmawa`) via `.\scripts\e2e\Load-GoogleBusinessEnv.ps1` before asking the maintainer to sign in manually.
- **Slack: native vs Zapier.** Native Slack MCP for read/search; Zapier Slack write actions for posting in cross-app agent workflows (e.g. GitHub PR merge-ready handoff). Never call both for the same operation.
- **Walk-away merge-ready feature plans.** Implementation plans for feature branches must branch off `preview`, open a PR to `preview`, and babysit CI + Qodo until merge-ready so the maintainer can return to zero pending checks, comments, or tasks.
- When triaging PR feedback, address every Qodo Code Review item—action required, review recommended, and optional—not only the required block; scan resolved threads for regressions from commits pushed after the PR opened.
- Local Playwright Google and QuickBooks E2E use captured storage state (`npm run e2e:google-auth:capture` / `e2e:quickbooks-auth:capture` with `Load-GoogleLocalAuthEnv.ps1` / `Load-QuickBooksLocalAuthEnv.ps1`) — replay headlessly; complete OAuth only during capture runs. Prefer the custom `reflect` skill for memory capture (explicit approval); do not reinstall the continual-learning plugin.

## Learned Workspace Facts

- **Product onboarding:** active owners/admins only — members never redirected. Wizard at `/dashboard/onboarding/getting-started` while `get_product_onboarding_status` returns `needs_onboarding` (null `product_onboarding_completed_at` and org missing a team **or** equipment; established orgs with both skip even when timestamp is null). Steps: team → equipment → QR. Equipment `team_id` links QuickBooks customer invoicing.
- Google Workspace OAuth must request `openid`, `email`, and `profile`; callback errors validate via `validate_google_workspace_oauth_session`; URL handlers clear `gw_connected` on `gw_error`. Access contract: claimed domains block self-join; membership needs import/invite; directory sync revokes suspended/removed users; connect/disconnect requires org owner/admin; disconnect clears OAuth, cached directory data, and releases domain claim.
- Preview Google Workspace integration testing uses the Columbia Cloudworks org with `columbiacloudworks.com` mapped in `workspace_domains`.
- Preview and local QuickBooks use Intuit **Development** keys plus `QBO_USE_SANDBOX=true` on edge; production (`main`) uses Production keys without the sandbox flag. Reconnect QB on preview after switching from production tokens. `VITE_INTUIT_CLIENT_ID` (`app-env-preview-public`) must match `INTUIT_CLIENT_ID` (`edge-env-preview-secrets`).
- `equipqr.info` is served by the separate `equipqr-docs` Vercel project, which builds from `main` only, so Help Center fixes on `preview` reach equipqr.info only after a `preview → main` release; VitePress fails closed on dead links to `srcExclude`d `docs/ops/**` content.
- New `SECURITY DEFINER` functions use `SET search_path = public, pg_temp`; Supabase Preview runs migration statements outside implicit transactions (`LOCK TABLE` needs explicit `BEGIN`/`COMMIT`); new `GRANT EXECUTE` on SECURITY DEFINER RPCs to `authenticated` requires `-- rpc-authenticated-grant-allowed: <fn>` per `validate-migrations.js`.
- Local dev OAuth uses separate GCP clients for Supabase Auth sign-in vs Google Workspace Connect; register `http://localhost:54321` and `http://127.0.0.1:54321` redirect URIs on each; set `GW_OAUTH_REDIRECT_BASE_URL=http://localhost:54321` in `supabase/functions/.env` and restart via `dev-stop.bat` / `dev-start.bat` after env changes.
- Columbia Cloudworks Agents 1Password vault UUID `mrviyowmjwrxv7syobdlhnmawa` holds `Google (Business)` (item id `ukvy6bzwb2ikq5cfeambgcq5u4`) for agent browser sign-in; `op://` references must use item IDs when titles contain parentheses.
- PR evidence upload reads `SUPABASE_URL` from `app-env-preview-public` and `preview_service_role_key` from `supabase-write` (not `VITE_SUPABASE_URL` or `edge-env-preview-secrets`). Desktop recordings use `scripts/lib/recording-quality.mjs` (1920×1080, 15 fps GIF at 1280px); mobile captures use `-MobileViewport` (390×844) with palette-optimized GIF encoding to stay under Supabase bucket limits; Playwright `recordVideo.size` must match the viewport.
- Local stack preflight (`scripts/lib/e2e-stack-preflight.mjs`) uses a strict Vite app probe (2xx or 304) and a permissive Supabase listener probe (200–499); `fetch().ok` alone false-negatives on **304 Not Modified** after a prior app probe. `dev-start.ps1` validates `node_modules` health (`node_modules\.bin\vite.cmd` plus package.json) before skipping install — a partial failed `npm ci` can leave the folder without `.bin`.
- Edge Function compliance contract: wrap handlers with `Deno.serve(withCorrelationId(async (req, _ctx) => { ... }))`; return JSON via `createJsonResponse`/`createErrorResponse` (with `{ req }` for CORS), not handcrafted `Response` bodies; use `getCorsHeaders(req)` instead of deprecated wildcard `corsHeaders`; best-effort `finally` cleanup must be wrapped in its own `try/catch` so it cannot override the primary success response.
- Work order details reads `workOrderKeys.detail` (`useWorkOrderById`); mutation hooks must call `invalidateWorkOrderCaches` in `invalidateWorkOrderQueries.ts`, not list-only invalidation. Work orders use inline edit on the details page (assignment, priority, due date, description)—not a separate edit dialog.
