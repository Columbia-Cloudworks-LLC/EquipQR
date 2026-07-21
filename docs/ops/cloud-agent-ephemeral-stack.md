# Cloud Agent Ephemeral Supabase Stack

> Per-session hosted Supabase Database Branch + cloud-safe Quick Login for Cursor
> Cloud Agents ([issue #1249](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/1249)).

## Decision

| Surface | Backend |
|---------|---------|
| **Cursor Cloud Agent (Linux VM)** | Ephemeral hosted Supabase **branch** + Vite on `:8080` |
| **Windows maintainer machine** | Full local Docker stack (`dev-start.bat` / `dev-start.ps1`) |
| **PR `supabase/**` validation** | Existing GitHub Integration branching (dataless; see [supabase-branching.md](./supabase-branching.md)) |

Cloud agents **do not** run `npx supabase start` in Docker. Cursor Cloud VMs have broken Docker bridge ICC; that path is abandoned.

## What the scripts do

1. `scripts/cloud-agent-ephemeral-stack.sh`
   - Loads `SUPABASE_ACCESS_TOKEN` (env or `op://tgo2m6qbct5otqeqirjocn3joa/supabase-write/SUPABASE_ACCESS_TOKEN`)
   - Deletes stale `agent-*` branches older than TTL (default **4 hours**; invalid TTL fails closed)

   - Creates `agent-<session>` via **Management API** with `git_branch=preview` (required so migrations deploy; CLI-only creates often hit `MIGRATIONS_FAILED`)
   - Polls until `FUNCTIONS_DEPLOYED`
   - Fetches branch anon + service_role keys (`supabase branches get -o json`)
   - Seeds Quick Login personas via Auth Admin API (`scripts/cloud-agent/seed-quick-login.mjs`)
   - Rewrites `.env` `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (backup under `tmp/cloud-agent/`)
   - Starts Vite (`npm run dev`) unless `--skip-vite`
2. `scripts/cloud-agent-ephemeral-teardown.sh`
   - Deletes the session branch
   - Restores `.env` from the pre-ephemeral backup

## Cursor wiring

[`.cursor/environment.json`](../../.cursor/environment.json):

- `install` → `bash scripts/cloud-agent-frontend-setup.sh` (Node 24, 1Password `.env`, `npm ci`)
- `start` → `bash scripts/cloud-agent-ephemeral-stack.sh`

Cloud Agent secrets must include at least:

- `OP_SERVICE_ACCOUNT_TOKEN` (for bootstrap + token read), **or**
- `SUPABASE_ACCESS_TOKEN` directly

## Quick Login contract

Same emails/password contract as local Dev Quick Login (`DevQuickLogin.tsx` / local seeds). Auth users are created with the **Auth Admin API** (hosted-safe). Direct `auth.users` SQL inserts are never used against hosted projects.

Password: set `CLOUD_AGENT_QUICK_LOGIN_PASSWORD` or `VITE_DEV_TEST_PASSWORD`, or ensure `.env` has `VITE_DEV_TEST_PASSWORD` or `DEV_LOGIN_PASSWORD` (agent-bootstrap / `app-env-local-dev` writes `DEV_LOGIN_PASSWORD`). The stack does **not** write the password into app `.env`; it writes a chmod-600 sidecar at `tmp/cloud-agent/vite-dev-password.env` for Vite/`--skip-vite` (source it before `npm run dev`). No hardcoded password fallback. The branch `service_role` key is fetched and used only inside Node (never assigned to a bash variable or printed).

Primary smoke persona: `owner@apex.test` — org upgraded with one team + `CAT 320 Excavator`.

**Safety rails:** seed and env rewrite refuse parent project ref `ymxkzronkhwxzcdcbnwq` and custom domain `supabase.equipqr.app`. Teardown only deletes `agent-*` branches whose live metadata matches the session state file.

## Manual commands

```bash
# Create branch, seed, rewrite .env, start Vite
bash scripts/cloud-agent-ephemeral-stack.sh

# Create/seed only (no Vite)
bash scripts/cloud-agent-ephemeral-stack.sh --skip-vite

# Playwright smoke (after Vite is up)
CLOUD_AGENT_E2E=1 npx playwright test e2e/cloud-agent/quick-login-smoke.spec.ts

# Tear down branch + restore .env
bash scripts/cloud-agent-ephemeral-teardown.sh
```

Session metadata: `tmp/cloud-agent/ephemeral-stack.json` (gitignored under `tmp/`).

## Cost guardrails

- Branching compute is **outside** the organization Spend Cap (~$0.01344/hr per branch).
- Default TTL cleanup + explicit teardown keep orphans under the **50-branch** cap.
- Glance weekly: Dashboard → Settings → Billing → Usage → **Branching**.
- Creation always sets `with_data: false` (never clone production rows).
- Override git association with `CLOUD_AGENT_GIT_BRANCH` (default `preview`) if needed.

## Non-goals

- Google Workspace / QuickBooks OAuth parity on branch URLs (Windows local stack)
- Full local `supabase/seeds/**` volume data
- Replacing PR schema-validation branching
- Repairing Docker ICC on cloud VMs
