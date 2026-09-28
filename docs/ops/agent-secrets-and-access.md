# Agent secrets and access (EquipQR)

Operational reference for Cursor agents and headless automation. Columbia Cloudworks LLC / EquipQR.

GitHub is the source of truth for EquipQR automation and deployment configuration. Preview and production values live in GitHub Environments with those names. The Linux bootstrap (`dev/linux/dev-start.sh`) builds local `.env` files from local Supabase and does not need 1Password. A missing `OP_SERVICE_ACCOUNT_TOKEN` is not a bootstrap failure.

1Password remains only for the exceptions in `.github/workflows/README.md`: human logins, personal MCP credentials, and the rollback sync scripts. Do not copy those human passwords into GitHub. Do not delete vault items from this migration.

---

## Vault and tokens

**Primary vault:** `EquipQR Agents` (`tgo2m6qbct5otqeqirjocn3joa`)

**Columbia Cloudworks Agents vault:** `mrviyowmjwrxv7syobdlhnmawa` — maintainer Google sign-in for admin.google.com and console.cloud.google.com. Readable with the same `OP_SERVICE_ACCOUNT_TOKEN` as EquipQR Agents.

| Item | Item ID | Purpose |
|---|---|---|
| `Google (Business)` | `ukvy6bzwb2ikq5cfeambgcq5u4` | Workspace admin + GCP Console browser sign-in (`username`, `password`) |
| `Google (Test User)` | `hlp7llqbvfm7mmic2z2e43ftem` | Alternate test-user record (Playwright E2E still uses EquipQR Agents `google-login`) |
| `wordpress-mcp` | `ywccaftp6lat6kuq2fomu7byn4` | WordPress MCP credentials |

Load Google Business credentials for browser automation:

```bash
bash dev/e2e/env.sh google-business COMMAND
# Sets GOOGLE_BUSINESS_EMAIL and GOOGLE_BUSINESS_PASSWORD
```

**op:// note:** titles with parentheses break `op read` URIs. Use vault UUID + item ID:

```bash
op read op://mrviyowmjwrxv7syobdlhnmawa/ukvy6bzwb2ikq5cfeambgcq5u4/username
```

Constants and child-process loading: `dev/e2e/env.sh`.

| Token env var | Service account | Permissions | Typical use |
|---|---|---|---|
| `OP_SERVICE_ACCOUNT_TOKEN` | `op-svc-equipqr-agents` | Read | `op read`, `op inject`, metadata, CI |
| `OP_SAT_EquipQR` | Write SAT (maintainer-provisioned) | Read, Write & Share on vault | `op item create`, `op item edit` |

Cloud Agents and GitHub Actions use the read-only token as a repo/org secret. Never commit either token.

**Token rules**

- Never use the read-only token for vault writes.
- Never store write-tier vendor PATs (`github-write`, `vercel-write`, `supabase-write`, and similar) in a persistent global environment. Materialize with `op read` in-session when needed.
- Supply the read-only `OP_SERVICE_ACCOUNT_TOKEN` through the Linux process environment for headless reads.

### Env and vendor item patterns

Naming convention for MCP-backed items: `<service>-<access-tier>` (not env tier).

| Item pattern | Purpose |
| --- | --- |
| `app-env-local-dev` | Optional integration `.env` (via `bash dev/ops/local-env.sh`) |
| `edge-env-local-dev` | Local edge `supabase/functions/.env` |
| `app-env-preview-public` / `app-env-prod-public` | Public `VITE_*` vars synced to Vercel |
| `edge-env-preview-secrets` / `edge-env-prod-secrets` | Supabase Edge Function secrets |
| `github-read` / `github-write` | GitHub MCP tiers |
| `gcp-read` / editor impersonation | GCP viewer + `gcloud-write` MCP |
| `supabase-write`, `vercel-write` | Vendor CLI write tokens |
| `Google (Business)` (Columbia Cloudworks Agents, item id `ukvy6bzwb2ikq5cfeambgcq5u4`) | Workspace admin + GCP Console browser sign-in |

---

## 1Password writes from Linux

Use the Bash wrapper to close stdin and bound execution time. It requires the
write-tier `OP_SAT_EquipQR` token and keeps it inside the child process.

```bash
bash dev/ops/op-item.sh --dry-run edit app-env-preview-public -- 'FIELD[text]=value'
bash dev/ops/op-item.sh edit app-env-preview-public --template /path/to/item.json
```

Use protected files for bulk secrets. Never include secrets in command output.
See [Bash workflows](linux-workflows.md) for current sync commands and arguments.

## Secret sync pipelines

| Script | Source | Target |
|---|---|---|
| `bash dev/ops/local-env.sh` | `app-env-local-dev`, `edge-env-local-dev` | `.env`, `supabase/functions/.env` |
| `bash dev/ops/vercel-env.sh` | `app-env-*-public` | Vercel env (production / preview) |
| `bash dev/ops/supabase-secrets.sh` | `edge-env-*-secrets` | Supabase Edge secrets |
| `bash dev/ops/render-mcp.sh` | `dev/mcp.template.json` + `op inject` | `~/.cursor/mcp.json` |

Verify MCP wiring: `bash dev/ops/doctor.sh` (expect 13/13 green on maintainer machine).

### Preview OAuth alignment checklist

Google Workspace OAuth requires **matching client ID** in:

1. `app-env-preview-public` → `GOOGLE_WORKSPACE_CLIENT_ID` → baked into Vite as `VITE_GOOGLE_WORKSPACE_CLIENT_ID\
2. `edge-env-prod-secrets` → `GOOGLE_WORKSPACE_CLIENT_ID` + `GOOGLE_WORKSPACE_CLIENT_SECRET` (cloud preview and production share this item after #1033)

After vault edit:

1. `bash dev/ops/vercel-env.sh --apply --environment preview`
2. Redeploy the latest Vercel Preview deployment for git **`preview`** (or merge/push to `preview` so `preview.equipqr.app` rebuilds)
3. Confirm edge secrets via `bash dev/ops/supabase-secrets.sh --check --op-item edge-env-prod-secrets`

### Rotate-and-verify playbook (preview + production)

Use this end-to-end loop after any secret rotation in 1Password. Never paste secret values into chat, commits, or PR bodies.

**1. Read-only digest check (before change)**

```bash
# Authenticate the Linux 1Password CLI before checking configuration.
bash dev/ops/supabase-secrets.sh --check --op-item edge-env-prod-secrets
bash dev/ops/vercel-env.sh --check --environment preview
bash dev/ops/vercel-env.sh --check --environment production
```

**2. Rotate in 1Password** (detached writes only)

Use the current [Linux workflow commands](https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/preview/docs/ops/linux-workflows.md) for this operation.
**3. Apply authorized changes**

```bash
# Production edge (serves preview.equipqr.app and equipqr.app) — apply only when maintainer authorizes
bash dev/ops/supabase-secrets.sh --apply --op-item edge-env-prod-secrets

# Vercel public env
bash dev/ops/vercel-env.sh --apply --environment preview
bash dev/ops/vercel-env.sh --apply --environment production
```

**4. Redeploy affected surfaces**

- Vercel: trigger redeploy of `preview` branch (or production promotion) so baked `VITE_*` values refresh.
- Supabase Edge: secrets apply immediately; invoke a smoke edge function if unsure (`edge-functions-smoke-test.yml` or local `bash dev/linux/dev.sh start` + integration path).

**5. Smoke verify**

| Surface | Signal |
|---------|--------|
| Preview GW | `/dashboard/organization/integrations` — Connect / sync users |
| Preview QB | Connect sandbox company; `quickbooks_credentials` row present |
| Production GW/QB | Repeat on `equipqr.app` after prod apply only |
| Drift CI | `secrets-drift-check.yml` daily run green on both edge items |

**6. Re-run `--check`** — all four commands must exit 0 before closing a rotation task.

See also `docs/ops/preview-architecture-migration.md` (#1033) for consolidating cloud preview on `edge-env-prod-secrets`.

---

## Agent access tiers

Default to the lowest tier that completes the task. When blocked, **stop
and ask the maintainer** with a concrete approval request — do not loop
on failing commands.

### Tier A — Read-only (no approval needed)

- `op read` / `op item get` with read SAT (EquipQR Agents **and** Columbia Cloudworks Agents vaults)
- `github-read` MCP, `gcloud` viewer MCP, Supabase MCP reads, Datadog/Better Stack read tools
- Local `npm test`, lint, scoped verification
- Google Admin / GCP Console browser sign-in via `bash dev/e2e/env.sh google-business` when fixing Workspace or OAuth client blockers

### Tier B — Maintainer User-scope env (already granted on the dev machine)

- `OP_SAT_EquipQR` for 1Password vault writes (via `bash dev/ops/op-item.sh` only)
- `OP_SERVICE_ACCOUNT_TOKEN` for headless reads
- `FIRECRAWL_API_KEY` (bounded quota risk)

If a shell was opened before these were set, refresh:

```bash
 $OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN','User')
 $OP_SAT_EquipQR = [Environment]::GetEnvironmentVariable('OP_SAT_EquipQR','User')
```

### Tier C — Browser / OAuth approval (human in the loop)

| Situation | What to ask the maintainer |
| --- | --- |
| MCP server not authenticated | Authorize the server in Cursor → MCP (browser OAuth). Then retry once. |
| Google Workspace connect/disconnect on **preview cloud** only | Complete **Connect Google Workspace** on preview.equipqr.app; the agent watches edge logs / DB row count. Local GW flows are agent-automated via browser MCP. |
| Google Admin Console (2SV, OAuth clients, user security) | Prefer agent browser sign-in with `bash dev/e2e/env.sh google-business` first; ask only if Columbia Cloudworks Agents read fails or the change needs personal approval. |
| GCP mutation needed | Approve **gcloud-write** / editor SA impersonation for the exact change. Use `bash dev/e2e/env.sh google-business` for Console UI edits when impersonation is blocked. Never `gcloud config set account`. |
| GitHub mutation beyond agent PAT | Approve **github-write** MCP or run the exact `gh` command. |
| Supabase production promotion | Explicit `/release` or hotfix language only. |
| Cursor Smart Mode blocks a command | User approves via the native approval card; agent retries with `request_smart_mode_approval` when applicable. |

When blocked:

1. State the **exact** missing capability (not "1Password broken").
2. Propose the **smallest** approval path (one MCP auth, one browser click, one detached script).
3. After approval, **verify** with a read-only check before claiming success.

## MCP and vendor access tiers

Rendered in `~/.cursor/mcp.json` from `dev/mcp.template.json`:

| MCP entry | Tier | Notes |
|---|---|---|
| `github-read` | Read | Default PR/issue inspection |
| `github-write` | Write | Mutates GitHub; maintainer approval for destructive ops |
| `gcloud` | Read | Viewer SA JSON |
| `gcloud-write` | Write | Impersonates editor SA via `CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT` |
| `supabase` plugin | Mixed | Prefer read; migrations/production need explicit scope |
| Plugin MCPs (Datadog, Grafana, etc.) | Varies | First use may open **browser OAuth** in Cursor MCP settings |

When an MCP call returns auth errors, ask the maintainer to complete OAuth in **Cursor → Settings → MCP**, then retry once.

---

## Escalation template for agents

When blocked, post:

1. **Blocked on:** (e.g. "1Password vault write", "Supabase production migrate", "Google OAuth consent")
2. **Already tried:** (e.g. "inline op item edit — stdin pipe failure; detached script works")
3. **Request:** (e.g. "Please authorize Supabase MCP for project ymxkzronkhwxzcdcbnwq" or "Please click Connect Google Workspace on preview integrations page")
4. **Verify after:** (e.g. "I'll confirm `google_workspace_credentials` row count = 1")

---

## Related docs

- `docs/ops/cloud-admin-access.md` — GCP org posture
- `docs/ops/google-workspace.md` — Connect contract and OAuth redirects
- `.cursor/skills/secrets-rotation/SKILL.md` — rotation procedures (when present)
- `docs/technical/setup.md` — human developer onboarding
- `AGENTS.md` — slim index only; do not copy this runbook back there
