# Agent secrets and access (EquipQR)

Operational reference for agents and headless automation. Columbia Cloudworks LLC / EquipQR.

**GitHub is the only source of EquipQR configuration.** There is no password-manager integration in this repository, its scripts, or CI.

- Secrets go in **GitHub Environment secrets**. Public values (anything baked into the browser bundle, URLs, IDs) go in **GitHub Environment variables**.
- Two environments exist: `preview` (branch `preview`) and `production` (branch `main`). The metadata-only inventory is `.github/configuration-inventory.yml`.
- Workflows are the only readers of GitHub secrets (GitHub never returns secret values to people or scripts). Vercel and Supabase receive values only through `dev/ci/sync-deploy-config.mjs`.

---

## How configuration reaches each surface

| Surface | Source | Applied by |
|---|---|---|
| Vercel Preview env (`VITE_*`) | `preview` environment | `sync-deploy-config.yml` on every push to `preview` (redeploys `preview` when a value changed) |
| Vercel Production env (`VITE_*`) | `production` environment | `production-release-readiness.yml` before promote (promote rebuilds with Production env) |
| Supabase Edge secrets (production project) | `production` environment | `production-release-readiness.yml` before `supabase functions deploy` |
| Local stack `.env` / `supabase/functions/.env` | Local Supabase + your own untracked values | `bash dev/linux/dev.sh start`; integration keys are added by hand from `.env.example` |
| Agent platforms (Cursor, Codex, Copilot) | That platform's secret store | The platform injects env vars; repo scripts only read env |

The managed key lists live at the top of `dev/ci/sync-deploy-config.mjs`:

- `VERCEL_PUBLIC_KEYS`: GitHub `NAME` is written to Vercel as `VITE_NAME` (variable first, then secret). Names GitHub doesn't define are skipped, never deleted. A check run lists Vercel keys that GitHub doesn't manage.
- `EDGE_REQUIRED_KEYS` / `EDGE_OPTIONAL_KEYS`: Supabase Edge secrets. A missing required key fails the run before any write.
- `IMMUTABLE_EDGE_KEYS` (`TOKEN_ENCRYPTION_KEY`, `KDF_SALT`) are never overwritten once set, because changing them strands stored integration tokens. A mismatch fails the run.

Output lists key names and `MATCH` / `DRIFT` / `MISSING` only, never values.

## Adding or changing a value

1. Set it in GitHub. Use a variable for public values (`gh variable set NAME --env preview --body VALUE`) and a secret for private ones (`gh secret set NAME --env production`, which reads the value from stdin).
2. If it's new, add the name to the matching list in `dev/ci/sync-deploy-config.mjs` and to `.github/configuration-inventory.yml`.
3. Apply it:
   - **Preview:** Actions → *Sync deployment configuration* → `environment=preview`, `mode=apply` (or push to `preview`).
   - **Production:** the next release to `main` applies it. To preview the effect first, run *Sync deployment configuration* with `environment=production`, `mode=check` from `main`, or *Production Release Readiness* in `dry-run` mode.

## Rotate-and-verify playbook (preview + production)

Never paste secret values into chat, commits, or PR bodies.

1. **Check:** run *Sync deployment configuration* in `mode=check` for the environment. It should report no drift.
2. **Rotate** the credential at its provider, then update the GitHub Environment secret or variable.
3. **Apply:** `mode=apply` for preview. Production applies on the next release, or immediately via *Production Release Readiness* `mode=apply`.
4. **Smoke verify:**

   | Surface | Signal |
   |---------|--------|
   | Preview GW | `/dashboard/organization/integrations` — Connect / sync users |
   | Preview QB | Connect sandbox company; `quickbooks_credentials` row present |
   | Production GW/QB | Repeat on `equipqr.app` after the production apply |

5. **Re-check:** `mode=check` must exit 0 before closing a rotation task.

### Preview OAuth alignment checklist

Google Workspace OAuth requires the **same client ID** in:

1. The `preview` / `production` variable `GOOGLE_WORKSPACE_CLIENT_ID`, baked into Vite as `VITE_GOOGLE_WORKSPACE_CLIENT_ID`
2. The `production` Edge secrets `GOOGLE_WORKSPACE_CLIENT_ID` + `GOOGLE_WORKSPACE_CLIENT_SECRET` (cloud preview and production share the production edge after #1033)

## Local-only credentials

Human logins and personal tokens are not automation configuration. They are not stored in GitHub or the repository. Export them in your own shell (or an untracked file you source) when a helper needs them:

| Helper | Environment variables |
|---|---|
| `bash dev/e2e/env.sh google-business` | `GOOGLE_BUSINESS_EMAIL`, `GOOGLE_BUSINESS_PASSWORD`, optional `GOOGLE_BUSINESS_TOTP_SECRET`, `GOOGLE_BUSINESS_BACKUP_CODES` |
| `bash dev/e2e/env.sh quickbooks-developer` / `qbo-browser` | `QUICKBOOKS_DEVELOPER_EMAIL`, `QUICKBOOKS_DEVELOPER_PASSWORD`, `QUICKBOOKS_DEVELOPER_TOTP_SECRET` (base32) |
| `bash dev/ops/render-mcp.sh` | `TODIAGRAM_API_KEY`, `GITHUB_MCP_READ_TOKEN`, `GITHUB_MCP_WRITE_TOKEN`, `EQUIPQR_GCP_VIEWER_SA_JSON` (key file path) |
| Cloud-agent Supabase branch helpers | `SUPABASE_ACCESS_TOKEN` |
| PR evidence uploads | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

Verify MCP wiring: `bash dev/ops/doctor.sh`.

---

## Agent access tiers

Default to the lowest tier that completes the task. When blocked, **stop
and ask the maintainer** with a concrete approval request — do not loop
on failing commands.

### Tier A — Read-only (no approval needed)

- `github-read` MCP, `gcloud` viewer MCP, Supabase MCP reads, Datadog/Better Stack read tools
- Local `npm test`, lint, scoped verification
- Google Admin / GCP Console browser sign-in via `bash dev/e2e/env.sh google-business` when fixing Workspace or OAuth client blockers

### Tier B — Maintainer shell environment (already granted on the dev machine)

- The local-only credentials listed above, exported in the maintainer's shell
- `FIRECRAWL_API_KEY` (bounded quota risk)
- Changing GitHub Environment secrets or variables needs the maintainer's explicit approval for that change

### Tier C — Browser / OAuth approval (human in the loop)

| Situation | What to ask the maintainer |
| --- | --- |
| MCP server not authenticated | Authorize the server in Cursor → MCP (browser OAuth). Then retry once. |
| Google Workspace connect/disconnect on **preview cloud** only | Complete **Connect Google Workspace** on preview.equipqr.app; the agent watches edge logs / DB row count. Local GW flows are agent-automated via browser MCP. |
| Google Admin Console (2SV, OAuth clients, user security) | Prefer agent browser sign-in with `bash dev/e2e/env.sh google-business` first; ask only if the credentials are not exported or the change needs personal approval. |
| GCP mutation needed | Approve **gcloud-write** / editor SA impersonation for the exact change. Use `bash dev/e2e/env.sh google-business` for Console UI edits when impersonation is blocked. Never `gcloud config set account`. |
| GitHub mutation beyond agent PAT | Approve **github-write** MCP or run the exact `gh` command. |
| Supabase production promotion | Explicit `/release` or hotfix language only. |
| Cursor Smart Mode blocks a command | User approves via the native approval card; agent retries with `request_smart_mode_approval` when applicable. |

When blocked:

1. State the **exact** missing capability (for example "GOOGLE_BUSINESS_PASSWORD not exported", not "credentials broken").
2. Propose the **smallest** approval path (one MCP auth, one browser click, one detached script).
3. After approval, **verify** with a read-only check before claiming success.

## MCP and vendor access tiers

Installed to `~/.cursor/mcp.json` from `dev/mcp.template.json` (tokens resolve from `${env:NAME}` at launch):

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

1. **Blocked on:** (e.g. "GitHub production secret update", "Supabase production migrate", "Google OAuth consent")
2. **Already tried:** (e.g. "sync check reports DRIFT on VITE_SUPABASE_URL")
3. **Request:** (e.g. "Please authorize Supabase MCP for project ymxkzronkhwxzcdcbnwq" or "Please click Connect Google Workspace on preview integrations page")
4. **Verify after:** (e.g. "I'll confirm `google_workspace_credentials` row count = 1")

---

## Related docs

- `docs/ops/cloud-admin-access.md` — GCP org posture
- `docs/ops/google-workspace.md` — Connect contract and OAuth redirects
- [Rotate-and-verify playbook](#rotate-and-verify-playbook-preview--production) — rotation procedure for preview and production secrets
- `docs/technical/setup.md` — human developer onboarding
- `AGENTS.md` — slim index only; do not copy this runbook back there
