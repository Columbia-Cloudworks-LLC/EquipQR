# EquipQR — Cursor Agent Handbook

This file is the **starting point** for agents working in this repo. It is intentionally scoped to **secrets, access, and escalation** first. Product conventions, branching, and release flows live in `.cursor/rules/*.mdc` and `docs/ops/` until they are reintroduced here deliberately.

**Environment:** Cursor on Windows (PowerShell). Stack: React, TypeScript, Vite, Supabase, TanStack Query.

---

## 1. Secrets management

### Source of truth

All agent-facing credentials live in the **EquipQR Agents** 1Password vault. Do not invent parallel secret stores, commit `.env` files, or paste secret values into chat, commits, or PR bodies.

| Item pattern | Purpose |
|---|---|
| `app-env-local-dev` | Local Vite `.env` (via `dev-start.bat`) |
| `edge-env-local-dev` | Local edge `supabase/functions/.env` |
| `app-env-preview-public` / `app-env-prod-public` | Public `VITE_*` vars synced to Vercel |
| `edge-env-preview-secrets` / `edge-env-prod-secrets` | Supabase Edge Function secrets |
| `github-read` / `github-write` | GitHub MCP tiers |
| `gcp-read` / editor impersonation | GCP viewer + `gcloud-write` MCP |
| `supabase-write`, `vercel-write` | Vendor CLI write tokens |

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

- `op read` / `op item get` with read SAT
- `github-read` MCP, `gcloud` viewer MCP, Supabase MCP reads, Datadog/Better Stack read tools
- Local `npm test`, lint, scoped verification

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
| Google Workspace connect/disconnect on preview | "Please complete **Connect Google Workspace** in the browser; I'll watch edge logs / DB row count." |
| GCP mutation needed | "Approve **gcloud-write** / editor SA impersonation for: &lt;exact change&gt;." Never `gcloud config set account`. |
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
| Pre-commit Fallow gate | `.cursor/rules/fallow-before-commit.mdc` |
| PowerShell / git conventions | `.cursor/rules/git-powershell.mdc` |
| Workflow artifact commits | `.cursor/rules/workflow-artifacts.mdc` |
| Implementation skills | `.cursor/skills/itil-issue-resolver/SKILL.md` |

---

## 4. Document maintenance

This handbook is **rebuilt from scratch** as of 2026-06-13. Add product- and compliance-specific lessons back incrementally — do not paste the old monolithic `AGENTS.md` wholesale. Prefer `docs/ops/` for long runbooks; keep this file under ~200 lines for agent context efficiency.

When capturing a new secrets or access lesson, update **this file** and, if detailed, **`docs/ops/agent-secrets-and-access.md`** in the same change.

---

## Learned User Preferences

- Use the Columbia Cloudworks Workspace tenant (`columbiacloudworks.com`) and the real EquipQR Connect flow for Google Workspace integration validation; do not provision parallel Google orgs unless explicitly asked.
- Plans for unattended parallel agent execution (Build in Parallel) must branch off `preview`, open a PR to `preview`, and include automatable acceptance criteria verifiable without human intervention.
- When triaging PR feedback, address every Qodo Code Review item—action required, review recommended, and optional—not only the required block.
- Scan resolved review threads for regressions introduced by commits pushed after the PR opened; avoid fix-and-regress cycles.

## Learned Workspace Facts

- Google Workspace OAuth must explicitly request `openid`, `email`, and `profile`; after revoking EquipQR in Google Account permissions, `include_granted_scopes` no longer backfills identity scopes and the Edge callback userinfo step fails without them.
- Google Workspace access contract: claimed domains block automatic self-join; membership requires explicit import or invite; directory sync revokes Workspace-derived access for suspended or removed users; disconnect clears OAuth credentials and cached directory data but keeps the domain claimed.
- Preview Google Workspace integration testing uses the Columbia Cloudworks org with `columbiacloudworks.com` mapped in `workspace_domains`.
- `equipqr.info` is served by the separate `equipqr-docs` Vercel project, which builds from `main` only, so Help Center fixes on `preview` reach equipqr.info only after a `preview → main` release; VitePress fails closed on dead links to `srcExclude`d `docs/ops/**` content.
- Returning visitors on `equipqr.info` may still have the SPA Workbox service worker stranded on that origin (normal reload shows the app shell; hard reload shows docs); remediation is the kill-switch `docs/public/sw.js` that clears caches, reloads clients, and unregisters itself.
- Never call `window.matchMedia` at module scope in hooks: `src/test/setup.ts` mocks `matchMedia` in `beforeAll` (after module evaluation), so guard inside `getSnapshot`/`subscribe` like `use-prefers-reduced-motion.tsx`.
- Google Workspace OAuth callback error redirects must validate the stored OAuth session via `validate_google_workspace_oauth_session` (nonce, expiry, used_at) before restoring redirect context; unsigned `state` fields alone are not sufficient.
- OAuth callback URL handlers must clear `gw_connected` when processing `gw_error` so mixed query params cannot trigger conflicting success toasts or spurious cache invalidation.
- New `SECURITY DEFINER` functions should use `SET search_path = public, pg_temp`, matching the repo hardening convention in existing migrations.
