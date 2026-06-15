# Preview Architecture Migration (#1033)

Operational architecture proposal for reducing persistent preview infrastructure cost and complexity. **Status: Phase 1 approved (2026-06-15) — maintainer confirmed main-centric solo workflow. Phase 3 cutover pending implementation.**

Related: [GitHub #1033](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/1033) (Linear COL-310).

---

## Current state (confirmed 2026-06-14)

| Layer | Persistent preview today | Production |
|-------|--------------------------|------------|
| Git integration branch | `preview` | `main` |
| Frontend | `preview.equipqr.app` (Vercel alias on `preview` pushes) | `equipqr.app` |
| Supabase | Persistent branch `olsdirkvvfegvclbpgrg` | Project `ymxkzronkhwxzcdcbnwq` / API `supabase.equipqr.app` |
| Ephemeral DB branches | Per-PR on prod project (`ymxkzronkhwxzcdcbnwq`) when `supabase/**` changes | — |
| 1Password edge items | `edge-env-preview-secrets` → `olsdirk` | `edge-env-prod-secrets` → `ymxkzronkhwxzcdcbnwq` |
| 1Password app items | `app-env-preview-public` → Vercel preview env | `app-env-prod-public` → Vercel production env |

### Cost drivers (quantified)

| Item | Estimate | Notes |
|------|----------|-------|
| Persistent preview Supabase branch (`olsdirk`) | ~**$9.80/mo** baseline | $0.01344/hr × 730 h; 24/7 compute on a dedicated branch |
| Duplicate edge secret surface | Ops time + drift risk | Two full secret sets, 6-hour `secrets-fanout.yml` apply to preview, daily drift check on both |
| Ephemeral PR branches (existing) | ~**$25–35/mo** | 10–15 PRs/mo × ~36 h × $0.01344/hr per `docs/ops/supabase-branching.md` |
| `configure-supabase-auth.yml` | Complexity tax | 4-minute sleep + Management API patch after every `preview` push (issue #512 workaround) |

**Net opportunity:** Eliminating `olsdirk` removes ~$10/mo fixed compute and the entire duplicate Supabase project ops layer. Ephemeral branching cost remains (and is the intended validation path for schema changes).

---

## Dependency inventory

Everything that currently assumes `preview.equipqr.app` and/or `olsdirkvvfegvclbpgrg`:

### Vercel and public env

- `app-env-preview-public` → Vercel **preview** env (`VITE_SUPABASE_URL` currently points at `olsdirk`)
- `.github/secrets-map.yml` defaults: `supabase_project_ref: olsdirkvvfegvclbpgrg`
- `vercel.json` / branch alias: `preview` → `preview.equipqr.app`

### CI / GitHub Actions

| Workflow | Dependency |
|----------|------------|
| `configure-supabase-auth.yml` | Patches **olsdirk** auth `site_url` → `preview.equipqr.app` after Vercel deploy |
| `secrets-fanout.yml` | Applies `edge-env-preview-secrets` to **olsdirk** (6 h schedule + push check) |
| `secrets-drift-check.yml` | Digest check on preview + prod edge items |
| `export-schema.yml` | `PREVIEW_DATABASE_URL` → **olsdirk** pooler (exports `supabase/schema.sql`) |
| `edge-functions-smoke-test.yml` | Hardcoded preview ref `olsdirk` |
| `deploy.yml` | Logs `preview.equipqr.app` URL |

### Scripts

- `scripts/sync-supabase-secrets-from-1password.ps1` — `edge-env-preview-secrets` locked to `olsdirk`
- `scripts/configure-supabase-auth.mjs` — preview environment = `olsdirk` + `preview.equipqr.app`
- `scripts/export-schema-baseline.{sh,ps1}` — links/exports from **olsdirk**
- `scripts/bootstrap-local-google-auth.ps1` — reads preview auth config from **olsdirk** API

### Supabase config

- `supabase/config.toml` — `[remotes.staging] project_id = "olsdirkvvfegvclbpgrg"`; auth `additional_redirect_urls` includes `preview.equipqr.app`

### Edge / OAuth code

- `supabase/functions/_shared/oauth-redirect-base.ts` — maps retired hosts → `olsdirk`; prod `ymxkz` → `supabase.equipqr.app`
- `supabase/functions/_shared/public-site-url.ts` — preview `PUBLIC_SITE_URL` = `preview.equipqr.app`
- Vendor callback URIs documented in `docs/ops/url-config-external-cleanup.md` (preview = **olsdirk** Supabase URL)

### E2E and agent docs

- `docs/ops/playwright-real-auth-integrations.md` — target `https://preview.equipqr.app`
- `e2e/user/shared/real-auth-config.ts` — default base URL `preview.equipqr.app`
- `AGENTS.md` — preview GW/QB testing on Columbia Cloudworks org

### External vendor consoles

- **Google Cloud OAuth** — redirect URIs include `https://olsdirkvvfegvclbpgrg.supabase.co/functions/v1/google-workspace-oauth-callback`
- **Intuit Developer Portal** — Development app redirect URIs for **olsdirk** QB callback
- **Google Maps HTTP referrer allowlist** — `https://preview.equipqr.app/*`, `https://*.equipqr.app/*`

### Production (must not regress)

- `equipqr.app` + `supabase.equipqr.app` OAuth (recent hardening in `oauth-redirect-base.ts`, commit `90d1eed1`)
- Production Intuit **Production** keys (no `QBO_USE_SANDBOX`)

---

## Target architecture (approved 2026-06-15)

Maintainer decision: **solo developer, one feature at a time, no persistent git `preview` integration branch.** Feature branches target **`main`** directly; Supabase ephemeral branches validate schema on open PRs.

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Git integration branch | **`main` only** | Solo workflow; no queue of features merging through `preview` |
| Feature workflow | `feat/*` → PR → **`main`** | Vercel deploys a preview URL per PR; merge promotes to `equipqr.app` |
| Supabase schema validation | **Ephemeral PR branches** (existing) | Created when PR touches `supabase/**`; auto-deleted on merge/close (~$0.32/PR) |
| Persistent git `preview` branch | **Retire** | No multi-team integration need; nested branches ad-hoc only |
| `preview.equipqr.app` | **Keep on Vercel Preview** | Stable hostname; `preview-domain-alias.yml` points it at the latest Preview deployment |
| Decommission `olsdirk`? | **Yes, after cutover** | Duplicate Supabase project; ~$10/mo + duplicate secret ops |
| Production Supabase | **`ymxkzronkhwxzcdcbnwq` / `supabase.equipqr.app`** | Single backend for production and PR previews that need live backend |
| `configure-supabase-auth.yml` | **Remove** | Tied to `preview` branch + olsdirk; obsolete under main-centric flow |
| `secrets-fanout.yml` (olsdirk apply) | **Remove / simplify** | Single prod edge secret surface via `edge-env-prod-secrets` |
| Schema export (`schema.sql`) | **Repoint to production** pooler | Export from `ymxkzronkhwxzcdcbnwq` |
| Integration E2E (GW/QB) | **Local stack** (primary) | Ephemeral branch URLs impractical for OAuth; optional per-PR Vercel URL for UI-only QA |

### Solo workflow (target)

    main (equipqr.app + supabase.equipqr.app)
      ^
      |  PR merge (one feature at a time)
      |
    feat/my-feature
      |
      +-- Vercel: equipqr-<hash>.vercel.app (automatic PR preview)
      +-- Supabase: ephemeral branch IF supabase/** changed (auto lifecycle)

### OAuth model (single production project)

All vendor OAuth callbacks use **`https://supabase.equipqr.app/functions/v1/...`**. PR preview frontends use the same Supabase project (production) unless wired to an ephemeral branch URL for migration-only testing.

- **Google Workspace / QuickBooks on production:** Production OAuth clients; no `QBO_USE_SANDBOX`.
- **Local dev:** Development/sandbox keys via `edge-env-local-dev` + `QBO_USE_SANDBOX=true`.
- **PR preview UI:** Same prod Supabase API; integrations tested locally before merge.

`PUBLIC_SITE_URL` on production edge: `https://equipqr.app`. Per-PR previews rely on `window.location.origin` at runtime for return URLs where applicable.

### Secrets model (target)

| Item | Target |
|------|--------|
| `edge-env-prod-secrets` | **Only** Supabase edge secret source (`ymxkzronkhwxzcdcbnwq`) |
| `edge-env-preview-secrets` | **Retire** after olsdirk decommission |
| `app-env-prod-public` | Vercel **production** env |
| `app-env-preview-public` | Vercel **preview** env (PR deployments) — `VITE_SUPABASE_URL` = `https://supabase.equipqr.app` |
| CI drift | Check-only on prod edge item; drop olsdirk preview fan-out |

### Vercel staging custom environment — removed (2026-06-15)

- Deleted Vercel custom environment **`staging`** (slug `staging`, branch matcher `preview`).
- Reattached **`preview.equipqr.app`** to the standard Preview deployment (not custom staging).
- Added `.github/workflows/preview-domain-alias.yml` + `scripts/vercel/Set-PreviewDomainAlias.ps1` to keep the hostname on the latest Preview build.
- Synced Vercel **Preview** env vars from `app-env-preview-public` → **`https://supabase.equipqr.app`** (production Supabase API).
- GitHub **`staging`** environment removed from `.github/secrets-map.yml` (use **Preview** only).

---

- `.cursor/rules/branching.mdc` — `main`-centric default; deprecate `preview` integration branch
- `.github/workflows/ci.yml` — triggers on `main` PRs (may already include)
- Remove or rewrite workflows keyed on `push: preview`
- `docs/ops/playwright-real-auth-integrations.md` — local-first, not `preview.equipqr.app`

---

## Migration phases

### Phase 1 — Discovery (this document) ✅

Inventory, cost model, architecture proposal. **Stop here for maintainer sign-off before decommission.**

### Phase 2 — Secrets pipeline hardening (safe before cutover)

1. Fix `sync-supabase-secrets-from-1password.ps1 -Check` CLI JSON parsing (spinner/ANSI on stderr).
2. Replace placeholder `TOKEN_ENCRYPTION_KEY` in `edge-env-prod-secrets` via `op-item-mutate.ps1` (maintainer: generate with `openssl rand -base64 32`; **do not copy preview key** if prod GW tokens exist).
3. Align 1Password field labels with sync scripts (`SUPABASE_URL` vs `vite_supabase_url` mismatch in `-Check` warnings).
4. Extend `secrets-drift-check.yml` / document rotate-and-verify playbook in `agent-secrets-and-access.md`.

### Phase 3 — Cutover (requires approval)

1. Update Vercel preview env + `app-env-preview-public` → prod Supabase URL/anon key.
2. Merge preview edge secrets into prod project (sandbox vars scoped to preview deployments only where possible).
3. Update docs, E2E defaults, `config.toml` remotes, smoke tests, schema export secret.
4. Validate GW + QB on `preview.equipqr.app` and local stack.
5. Remove/disable `configure-supabase-auth.yml`; update `secrets-fanout.yml`.
6. Vendor console cleanup (remove **olsdirk** redirect URIs).
7. **Decommission** Supabase branch `olsdirkvvfegvclbpgrg`.

### Phase 4 — Verification

Per `local-verify-before-preview-push.mdc`: Fallow, lint, type-check, targeted tests, OAuth smoke on new target, CI green.

---

## Rollback

If OAuth or integrations fail after cutover:

1. Restore Vercel preview `VITE_SUPABASE_URL` to **olsdirk** (if branch not yet deleted).
2. Re-enable `configure-supabase-auth.yml` run manually.
3. Re-run `sync-supabase-secrets-from-1password.ps1 -OpItem edge-env-preview-secrets`.

Do **not** delete `olsdirk` until at least one successful preview GW/QB cycle on the new architecture.

---

## Open questions — resolved (2026-06-15)

1. ~~Shared prod Postgres for preview~~ → **Single production Supabase project**; PR previews use prod API; integration OAuth tested **locally** before merge.
2. ~~Retire edge-env-preview-secrets~~ → **Yes**, after olsdirk decommission.
3. ~~Git preview branch~~ → **Retire**; feature branches merge to **main** directly.

---

## Phase 1 verification snapshot (2026-06-14)

| Check | Result |
|-------|--------|
| `sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-preview-secrets` | **Pass** (after Phase 2 CLI JSON parse fix) |
| `sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-prod-secrets` | **Pass** (vault placeholders fixed + applied to Supabase) |
| `sync-vercel-from-1password.ps1 -Check` preview + production | **Pass** (presence-only); many 1Password field label warnings |
