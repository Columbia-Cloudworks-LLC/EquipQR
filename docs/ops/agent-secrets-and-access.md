# Agent secrets and access (EquipQR)

Operational reference for Cursor agents and headless automation. Columbia Cloudworks LLC / EquipQR.

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

```powershell
. .\scripts\e2e\Load-GoogleBusinessEnv.ps1
# Sets GOOGLE_BUSINESS_EMAIL and GOOGLE_BUSINESS_PASSWORD
```

**op:// note:** titles with parentheses break `op read` URIs. Use vault UUID + item ID:

```powershell
op read op://mrviyowmjwrxv7syobdlhnmawa/ukvy6bzwb2ikq5cfeambgcq5u4/username
```

Constants and helpers: `scripts/op/columbia-cloudworks-agents-vault.ps1`.

| Token env var | Service account | Permissions | Typical use |
|---|---|---|---|
| `OP_SERVICE_ACCOUNT_TOKEN` | `op-svc-equipqr-agents` | Read | `op read`, `op inject`, metadata, CI |
| `OP_SAT_EquipQR` | Write SAT (maintainer-provisioned) | Read, Write & Share on vault | `op item create`, `op item edit` |

Cloud Agents and GitHub Actions use the read-only token as a repo/org secret. Never commit either token.

---

## Cursor shell vs 1Password writes

### Symptom

Running `op item edit` or `op item create` **inline** in a Cursor agent terminal:

- Hangs until killed (exit `4294967295` / timeout)
- `invalid JSON in piped input`
- `cannot create an item from template and stdin at the same time`

### Cause

Cursor's integrated shell attaches **stdin as a pipe** to child processes. The 1Password CLI treats active stdin as [JSON template input](https://www.1password.dev/cli/reference/management-commands/item#item-edit) (the `-` positional form). Reads do not use that code path, so `op read` works inline.

### Fix (required pattern)

Use the repo helper, which runs `op` in a **detached** `powershell.exe -File` process:

```powershell
# Dry-run field update (safe)
.\scripts\op-item-mutate.ps1 `
  -Action Edit `
  -Item "app-env-preview-public" `
  -Vault "EquipQR Agents" `
  -Assignment "GOOGLE_WORKSPACE_CLIENT_ID[text]=87469690682-example.apps.googleusercontent.com" `
  -DryRun

# Apply
.\scripts\op-item-mutate.ps1 -Action Edit -Item "app-env-preview-public" -Vault "EquipQR Agents" `
  -Assignment "GOOGLE_WORKSPACE_CLIENT_ID[text]=87469690682-example.apps.googleusercontent.com"
```

Assignment rules ([official docs](https://www.1password.dev/cli/reference/management-commands/item#item-edit)):

- `--` before assignments when values contain `.` or special characters
- `field[text]=value` for plain text fields
- For multi-field or sensitive bulk edits: `-Action Edit -TemplatePath C:\path\to\item.json` after `op item get ... --format json`

Interactive maintainer terminals (`PS D:\EquipQR>`) can run `op` directly; agents should not rely on that.

---

## Secret sync pipelines

| Script | Source | Target |
|---|---|---|
| `dev-start.bat` / `dev-start.ps1` | `app-env-local-dev`, `edge-env-local-dev` | `.env`, `supabase/functions/.env` |
| `scripts/sync-vercel-from-1password.ps1` | `app-env-*-public` | Vercel env (production / preview) |
| `scripts/sync-supabase-secrets-from-1password.ps1` | `edge-env-*-secrets` | Supabase Edge secrets |
| `scripts/render-mcp-config.ps1` | `scripts/mcp.template.json` + `op inject` | `~/.cursor/mcp.json` |

Verify MCP wiring: `.\scripts\op-mcp-doctor.ps1` (expect 13/13 green on maintainer machine).

### Preview OAuth alignment checklist

Google Workspace OAuth requires **matching client ID** in:

1. `app-env-preview-public` → `GOOGLE_WORKSPACE_CLIENT_ID` → baked into Vite as `VITE_GOOGLE_WORKSPACE_CLIENT_ID`
2. `edge-env-prod-secrets` → `GOOGLE_WORKSPACE_CLIENT_ID` + `GOOGLE_WORKSPACE_CLIENT_SECRET` (cloud preview and production share this item after #1033)

After vault edit:

1. `.\scripts\sync-vercel-from-1password.ps1 -Environment preview`
2. Redeploy the latest Vercel Preview deployment for git **`preview`** (or merge/push to `preview` so `preview.equipqr.app` rebuilds)
3. Confirm edge secrets via `sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-prod-secrets`

### Rotate-and-verify playbook (preview + production)

Use this end-to-end loop after any secret rotation in 1Password. Never paste secret values into chat, commits, or PR bodies.

**1. Read-only digest check (before change)**

```powershell
$env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN','User')
.\scripts\sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-prod-secrets
.\scripts\sync-vercel-from-1password.ps1 -Check -Environment preview
.\scripts\sync-vercel-from-1password.ps1 -Check -Environment production
```

**2. Rotate in 1Password** (detached writes only)

```powershell
# Dry-run first
.\scripts\op-item-mutate.ps1 -Action Edit -Item "edge-env-prod-secrets" -Vault "EquipQR Agents" `
  -Assignment "TOKEN_ENCRYPTION_KEY[text]=<openssl rand -base64 32 output>" -DryRun
# Apply without -DryRun when dry-run looks correct
```

For `TOKEN_ENCRYPTION_KEY` on production: generate a **new** key; do not copy the preview value. Rotating production encryption keys invalidates existing Google Workspace refresh tokens unless a re-encryption migration runs first — coordinate with maintainers before prod rotation.

**3. Apply to targets**

```powershell
# Production edge (serves preview.equipqr.app and equipqr.app) — apply only when maintainer authorizes
.\scripts\sync-supabase-secrets-from-1password.ps1 -OpItem edge-env-prod-secrets

# Vercel public env
.\scripts\sync-vercel-from-1password.ps1 -Environment preview
.\scripts\sync-vercel-from-1password.ps1 -Environment production
```

**4. Redeploy affected surfaces**

- Vercel: trigger redeploy of `preview` branch (or production promotion) so baked `VITE_*` values refresh.
- Supabase Edge: secrets apply immediately; invoke a smoke edge function if unsure (`edge-functions-smoke-test.yml` or local `dev-start.bat` + integration path).

**5. Smoke verify**

| Surface | Signal |
|---------|--------|
| Preview GW | `/dashboard/organization/integrations` — Connect / sync users |
| Preview QB | Connect sandbox company; `quickbooks_credentials` row present |
| Production GW/QB | Repeat on `equipqr.app` after prod apply only |
| Drift CI | `secrets-drift-check.yml` daily run green on both edge items |

**6. Re-run `-Check`** — all four commands must exit 0 before closing a rotation task.

See also `docs/ops/preview-architecture-migration.md` (#1033) for consolidating cloud preview on `edge-env-prod-secrets`.

---

## MCP and vendor access tiers

Rendered in `~/.cursor/mcp.json` from `scripts/mcp.template.json`:

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
- `.cursor/skills/secrets-rotation/SKILL.md` — rotation procedures (when present)
- `docs/technical/setup.md` — human developer onboarding
