# EquipQR — Cursor Agent Handbook

This file is the **starting point** for agents working in this repo. It is intentionally scoped to **secrets, access, and escalation** first. Product conventions, branching, and release flows live in `.cursor/rules/*.mdc` and `docs/ops/` until they are reintroduced here deliberately.

**Environment:** Cursor on Windows (PowerShell). Stack: React, TypeScript, Vite, Supabase, TanStack Query.

---

## 1. Secrets management

### Source of truth

All agent-facing credentials live in the **EquipQR Agents** 1Password vault. Do not invent parallel secret stores, commit `.env` files, or paste secret values into chat, commits, or PR bodies.

**Columbia Cloudworks Agents** vault (`mrviyowmjwrxv7syobdlhnmawa`) holds maintainer Google sign-in for **admin.google.com** and **console.cloud.google.com** (`Google (Business)` item). Agents may load it via `.\scripts\e2e\Load-GoogleBusinessEnv.ps1` when browser automation is the unblock path. Local Playwright Google E2E uses **captured storage state** for `nicholas.king@columbiacloudworks.com` (`npm run e2e:google-auth:capture`) — not password or backup-code login in test runs.

| Item pattern | Purpose |
| --- | --- |
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
| --- | --- | --- |
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
$edge = (op read "op://EquipQR Agents/edge-env-prod-secrets/GOOGLE_WORKSPACE_CLIENT_ID").Trim()
"appEdgeAligned=$($app -eq $edge)"
```

After changing `app-env-preview-public`, run `.\scripts\sync-vercel-from-1password.ps1 -Environment preview` and confirm `preview.equipqr.app` is bound to git branch **`preview`** in Vercel (`preview-domain-alias.yml` fast-forwards that branch and fires the Vercel deploy hook on every push to `main`).

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
| --- | --- |
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
| --- | --- |
| Full secrets map, sync scripts, rotation | `docs/ops/agent-secrets-and-access.md` |
| Branching / git + deploy | `docs/ops/git-and-deploy.md`, `.cursor/rules/branching.mdc` |
| **Dev stack stop/start (batch files only)** | `.cursor/rules/dev-stack-lifecycle.mdc` |
| Local E2E gate before preview push | `.cursor/rules/local-verify-before-preview-push.mdc` |
| **Async export jobs (CSV)** | `docs/technical/async-export-jobs.md` |
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

- **Dev stack: batch files only; cycle freely.** Use `dev-stop.bat` / `dev-start.bat` / `dev-start.bat -Force` for the **entire** stack — never partial Supabase/Docker restarts or `npm ci` while Vite is running. Agents may stop/start without asking when verification requires it (`dev-stack-lifecycle.mdc`). Vite, docs, and edge serve run as background processes with logs under `tmp/dev-logs/` — do not reintroduce detached popup terminal windows. Do not assume the stack is down when a probe fails after an earlier success — verify probe logic (e.g. HTTP 304 vs `fetch().ok`) before restarting.
- **Supabase `migration new` in agent shells:** never run bare `npx supabase migration new` from Cursor — the CLI reads SQL from stdin and agent terminals keep stdin open, so the command can hang for minutes. Use `npm run db:migration:new -- <snake_case_name>` (`scripts/db/New-SupabaseMigration.ps1`; 30s timeout, immediate EOF). If a hang occurs, kill stray `supabase.exe` processes before retrying. Do not hand-create migration timestamps as a workaround.
- **Browser automation: Cursor built-in Browser MCP only.** User disabled IronBee DevTools — use `cursor-ide-browser` (maintainer's logged-in session) for verification, GCP Console, and E2E flows; do not use IronBee.
- **Zero npm install debt.** Address deprecation warnings and `npm audit` findings immediately — do not defer; target `npm audit` → 0. Fresh clone bootstrap is **`npm run ci:install`** or **`npm-ci-safe.bat`** (`scripts/Invoke-SafeNpmCi.ps1`) on Windows — stops E2E/dev stack **and** repo-scoped Vitest/Cursor/Playwright/ESLint lock holders via `stop-dev-and-e2e.ps1`; bare `dev-stop.bat` only frees port listeners. Recovery **deletes** `node_modules` outright (cleans legacy `node_modules.bak-*` from repo root); if delete is still blocked, move scrap to `%TEMP%\equipqr-nm-scrap\` — never leave backup folders in the repo. Do not run bare `npm ci` while native binaries are locked. Linux/CI still uses `npm ci --prefer-offline --no-audit`. Reload Cursor after install so the Vitest extension finds `node_modules`.
- **PR handoff = merge-ready, every time (incl. `/itil-issue-resolver`).** Feature-branch PRs follow the full open → CI green → Qodo `openCount=0` (action required, review recommended, and optional) → threads clear → evidence published loop (`pr-merge-ready-workflow.mdc`). When Qodo offers auto-fix PRs for flagged items, **favor merging those into the feature branch first** before hand-implementing the same fixes. Scan resolved threads for regressions from post-open commits. Do not open a PR and walk away. Use Composer 2.5 for post-push babysit loops (CI/Qodo/threads) to limit cost. Invoking `/itil-issue-resolver` authorizes the same full integrate loop (`itil-issue-resolver/SKILL.md` §6). **Exception:** when the user explicitly asks to stop after PR open (or excludes the PR portion), hand off after implementation + local verification without babysitting — a separate cheaper agent may monitor to merge-ready.
- **Main-centric git, preview QA, and release (#1033).** `main` is production. Branch off `main`; validate on each push’s commit-specific Vercel Preview URL (`*.vercel.app`); ship via PR to `main` — not via a `preview` integration train. Git branch **`preview`** remains a **Vercel domain anchor** for `preview.equipqr.app` only; do not PR feature work into `preview`. Verify locally end-to-end before push/PR open (`local-verify-before-preview-push.mdc`). Merge release PR to `main`; **Production Release Readiness** applies prod migrations, strict schema drift, waits for the Vercel build, promotes **equipqr.app**, then runs `supabase functions deploy` for all Edge Functions (last step so a failed promote cannot leave prod edge ahead of the frontend). Do not ask the maintainer for manual edge deploys post-merge. Feature plans babysit CI + Qodo until merge-ready. **Stash caution:** `git stash pop` after a `git stash -u` that created no entry can pop a years-old stash from another branch and conflict — check `git stash list` before popping.
- **No product PR without visual evidence.** Every product/runtime PR must include local-stack screenshots and an H.264 MP4 demo uploaded to GitHub user-attachments for inline playback (`pr-visual-evidence.mdc`, `scripts/pr-evidence/`). When a PR touches user-visible behavior — even indirectly — evidence must prove the real workflow still works end-to-end and, when docs or contextual Help links change, that users can discover the relevant guide from each surfaced entry point. Add `e2e/pr-evidence/<feature>.spec.ts` when existing specs do not cover the change; use `-MobileViewport` for phone UX. Pass `{ target: locator }` to `evidenceScreenshot()` so the control under test is fully framed; capture asserts no horizontal overflow. **After capture, open each PNG** and walk `visual-review-checklist.md` — confirm mobile layout is production-ready (no horizontal scroll traps, poor stacking, clipped controls, unreachable actions), then run `Complete-PrEvidenceVisualReview.ps1` before upload/publish. `-Publish` reuses existing `tmp/pr-evidence/{flow}/` on the same machine (`-CaptureOnly` first when empty; subagent/worktree captures do not transfer). Demo video requires **`GH_SESSION_TOKEN`** (GitHub `user_session` browser cookie — not a PAT; setup in `scripts/pr-evidence/README.md`). On Windows, `gh image extract-token` often picks a stale/wrong browser profile and can silently return a stale cookie — always run `gh image check-token` before trusting it; if it fails, copy `user_session` from DevTools on the browser where github.com is logged in and set `$env:GH_SESSION_TOKEN` in the **current shell only** — do not persist write-tier session cookies to User-scope env vars or commit them (§1 secrets policy).
- **No PR handoff with red CI / release metadata.** Run `npm ci --prefer-offline --no-audit` before opening a feature-branch PR (matches GitHub Actions). After push, watch `gh pr checks <num> --watch` until required jobs pass — never open a PR and walk away on failing Lint/Test/Security/Build/**Release Metadata**. PRs to `main` touching release-relevant paths must bump `package.json` above the base branch, keep `CHANGELOG.md` `[Unreleased]` empty, add a top `## [x.y.z]` section with at least one bullet, and align `package-lock.json` — local: `npm run verify:release-metadata` (set `RELEASE_METADATA_BASE_SHA` to simulate a PR). Workflow-only paths (`.cursor/**`, `docs/**`, `AGENTS.md`, etc.) are exempt, same as `changelog-stop`. If local install needed `--legacy-peer-deps`, commit `.npmrc` so CI can install too. See `pr-ci-gate-before-open.mdc`.
- **Edited `.ts`/`.tsx` and `.md`/`.mdc` files must pass ESLint (`--max-warnings 0`) and markdownlint-cli2 before the agent continues** (Cursor `lint-on-edit` and `markdown-lint-on-edit` hooks; shared config `.markdownlint-cli2.jsonc`). **Markdown policy (#1232):** hooks enforce high-signal rules only — fix violations for enabled rules (e.g. fenced-code language `MD040`, bare URLs `MD034`, reference links `MD052`, trailing whitespace `MD009`). Do **not** churn suppressed rules: `MD013`/`MD024`/`MD025`/`MD033`/`MD036`/`MD041` (pre-existing), plus `MD060` (compact tables), `MD022`/`MD032`/`MD031` (spacing around headings/lists/fences in tight `.mdc` layouts). `npm run lint:md` scopes to `.cursor/**` and `AGENTS.md`; legacy `docs/**` is out of enforced scope until migrated.
- **Fleet Export Console UX:** `/dashboard/reports` export cards use inline collapsible field/worksheet pickers (`ReportColumnSelector` / `WorksheetSelector`, collapsed by default, defaults checked) and one direct **Export** / **Export Packet** button — not Quick/Customize modals for standard exports. Omit decorative card chrome (operation codes, audience/format badges, Export Protocol panel, header badge); reports should be self-explanatory.
- Use the Columbia Cloudworks Workspace tenant (`columbiacloudworks.com`) and the Columbia Cloudworks Google account for GCP Console OAuth edits on `equipqr-prod`; use the real EquipQR Connect flow for Google Workspace integration validation; do not provision parallel Google orgs unless explicitly asked. When blocked on Google Admin or GCP Console UI, load `Google (Business)` from Columbia Cloudworks Agents vault (`mrviyowmjwrxv7syobdlhnmawa`) via `.\scripts\e2e\Load-GoogleBusinessEnv.ps1` before asking the maintainer to sign in manually. Local Playwright Google and QuickBooks E2E use captured storage state (`npm run e2e:google-auth:capture` / `e2e:quickbooks-auth:capture` with `Load-GoogleLocalAuthEnv.ps1` / `Load-QuickBooksLocalAuthEnv.ps1`) — replay headlessly; complete OAuth only during capture runs. Prefer the custom `reflect` skill for memory capture (explicit approval); do not reinstall the continual-learning plugin. **`op-item-mutate.ps1`:** omit `-Vault "EquipQR Agents"`; use the script default vault UUID — spaced vault names break detached `op item edit`.
- **PII redaction before publishing captures** (docs-media, PR evidence from production data): rewrite page text nodes in-browser before screenshot/video — phones → `+1 (555) 867-5309`, emails → `local@example.com`, street → `123 Main St`, city → `Springfield`, ZIP → `12345`; keep states; names of public business partners (e.g. Matt, Nick) are OK to show.

## Learned Workspace Facts

- **Product onboarding:** active owners/admins only — members never redirected. Wizard at `/dashboard/onboarding/getting-started` while `get_product_onboarding_status` returns `needs_onboarding` (null `product_onboarding_completed_at` and org missing a team **or** equipment; established orgs with both skip even when timestamp is null). Steps: team → equipment → QR. Equipment `team_id` links QuickBooks customer invoicing.
- Google Workspace OAuth must request `openid`, `email`, and `profile`; callback errors validate via `validate_google_workspace_oauth_session`; URL handlers clear `gw_connected` on `gw_error`. Access contract: claimed domains block self-join; membership needs import/invite; directory sync revokes suspended/removed users; connect/disconnect requires org owner/admin; disconnect clears OAuth, cached directory data, and releases domain claim. **Directory sync** on Integrations must not require Drive/Docs/Sheets export scopes — gate on `admin.directory.user.readonly` only so directory-only connections stay usable.
- **Preview/cloud QA (#1033):** Day-to-day QA uses each push’s commit-specific Vercel Preview URL (`equipqr-<hash>-columbia-cloudworks-llc.vercel.app`). **`preview.equipqr.app`** is optional — Vercel binds it to git branch **`preview`** (domain anchor, not integration queue). **`preview-domain-alias.yml`** runs on push to `main` only (no PR-attached checks): it fast-forwards git branch **`preview`** and fires the Vercel **deploy hook** (same-SHA branch pushes are deduplicated by Vercel and build nothing); the branch-bound domain then auto-aliases — no `vercel alias set` step. Cloud preview uses production Supabase `https://supabase.equipqr.app`. Ephemeral Supabase PR branches validate schema/RLS only; GW/QB: test on the **local stack** before merge. **Schema reference:** commit `supabase/current_schema.sql` regenerated after DDL migrations (`npx supabase db dump --local -f supabase/current_schema.sql`); CI `verify:schema-reference` fails stale dumps (git-diff based, no DB spin-up; `-- schema-reference: skip` for data-only migrations). **Supabase Preview CI:** `TenantNotFound`/storage-config 404 while branch status is `COMING_UP` is usually platform provisioning, not PR SQL — green **Validate Supabase Migrations** means migrations are fine; unset `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` on ephemeral branches is expected. Preview/local QuickBooks use Intuit **Development** keys plus `QBO_USE_SANDBOX=true` on edge; production (`main`) uses Production keys without sandbox. Intuit OAuth redirect URIs are **per app tier** — preview cloud callback is `https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback` on the Development app only. Preview GW client ID drift check compares `app-env-preview-public` to `edge-env-prod-secrets`; `VITE_INTUIT_CLIENT_ID` must match edge `INTUIT_CLIENT_ID`. **QuickBooks production workflow:** live QBO connections and team→customer mappings are org-specific (exact IDs live in the private ops runbook / 1Password, not in this repo). EquipQR exports **draft-only** invoices from work order details via Export → QuickBooks (**Create New Invoice** / **Update Invoice #…** / **Open Invoice**); export is gated on a completed WO + team→customer mapping + `can_manage_quickbooks`.
- OAuth redirects: local uses separate GCP clients for Supabase Auth sign-in vs Google Workspace Connect — register `http://localhost:54321` and `http://127.0.0.1:54321` on each, set `GW_OAUTH_REDIRECT_BASE_URL=http://localhost:54321` in `supabase/functions/.env`, restart via `dev-stop.bat` / `dev-start.bat`. Production callbacks use `https://supabase.equipqr.app` (Google/Intuit consoles + Vercel `VITE_SUPABASE_URL`); edge auto-injects project URL — code maps to custom domain; keep `GW_OAUTH_REDIRECT_BASE_URL=https://supabase.equipqr.app` on `edge-env-prod-secrets` and sync via `.\scripts\sync-supabase-secrets-from-1password.ps1 -OpItem edge-env-prod-secrets`. Google OAuth Verification Center expects live `https://equipqr.app/privacy-policy` (not `/privacy`); `@equipqr.app` does not forward email.
- **Docs site, PWA, and public media:** `equipqr.info` is a standalone VitePress site in `docs/` (`docs:dev` on 5174, `docs:build`, `docs:preview`); app links resolve through `documentationUrl.ts`. **`docs:build`** runs `externalize-docs-inline-scripts.mjs` so VitePress inline bootstrap scripts become content-addressed `/assets/inline.*.js` files — committed `docs/vercel.json` keeps static `script-src 'self'` (Vercel serves committed headers, so post-build sha256 hashes from older flows drifted and broke hydration/clicks on #1147/#1158). Public marketing media uses Supabase `landing-page-images` / `landing-page-videos` via `landingImage()` / `landingVideo()`; app image buckets stay private with signed URLs except organization logos. PWA service worker is disabled on Vite dev (`localhost:8080`); SW/offline-shell verification requires `npm run build` + `vite preview`, and stale chunk 404s recover through chunk-load reload handling. **docs-media publishing:** upload curated captures via `npx tsx scripts/upload-screenshot.ts <local> <storage-path> docs-media` with env from `Set-PrEvidenceUploadEnvironment` (`PrEvidenceCommon.ps1`); docs embed images as `https://supabase.equipqr.app/storage/v1/object/public/docs-media/...` and videos as bare URLs in angle brackets.
- **Dashboard scope, equipment, & public QR:** Dashboard stat widgets and `get_dashboard_trends` respect TopBar `useSelectedTeam` (including unassigned-only). **Org realtime (#1203):** `backgroundSync.ts` refcount org channels and unsubscribe on unmount; `equipment_notes` realtime filters use denormalized `organization_id`. Public `/qr/equipment/:id` uses `useSimpleOrganizationSafe()` — not `useOrganization()` outside `SimpleOrganizationProvider`. Duplicate org equipment serials warn with link but do not block create; offline creates queue in localStorage; persistent 409 sync failures usually mean record already exists. **Equipment details desktop layout (#1212):** Details tab — Basic Information + Lifecycle & Warranty share a two-column row; Work Orders tab — Preventative Maintenance (`EquipmentPMInfo`) with PM Template nested above PM Schedule (two-column, aligned control rows); Check-Ins tab — operator check-in assignment + ledger. **Operator daily check-ins:** separate append-only domain from PM/scans — org admins define templates on **Operations → Daily Check-Ins**; equipment assignment lives on the equipment **Check-Ins** tab via `EquipmentOperatorCheckinTemplateAssignmentMenu` (`MultiSelectActionMenu` — search, select all/none/inverse, multi-assign; assigned checklists as compact list with count badge on trigger); daily-check-in QR lives there (not bulk Equipment QR admin) and equipment QR becomes a **dropdown** when any are assigned. Captured fields are admin-defined — operator input, optional client context (timestamp, location), labeled equipment-record snapshots — with **no hard-coded mileage/odometer** or auto-filled equipment assumptions. **Starter catalog** presets are **clone-only** (client-side, collapsible). Template delete/deactivate via `delete_operator_checklist_template` disables assignments but **preserves ledger submissions**. Public `/qr/operator-check-in/{token}` stores SHA-256 hash in Postgres; the raw token persists server-side in **`operator_checkin_token_secrets`** (admin-only RLS; written solely by `create_operator_checkin_assignment` / `rotate_operator_checkin_token` SECURITY DEFINER RPCs) so QR links print from any device (#1154). **Legacy assignments** created before persistence (bulk/direct inserts with `token_rotated_by` null and no secret row) show a missing-token notice; owners/admins mint via **Generate QR link** in the equipment QR dialog or details actions menu (`rotate_operator_checkin_token`). **`operator-check-in`** edge: `requireOperatorCheckinAssignmentToken` + anon RPC `resolve_operator_checkin_by_token` for load; service_role submit RPC only after hCaptcha when configured. **Daily Ledger** is template-scoped with equipment multi-select; PDF/Excel exports use that scope and optional column toggles. **Quick Forms:** standalone public QR data-collection (not equipment/team-linked) — owners/admins on **Operations → Quick Forms**; public `/qr/quick-form/{token}` via `quick-form` edge; tokens in `quick_form_token_secrets` with anon `resolve_quick_form_by_token`; append-only ledger + CSV/Excel/PDF exports; **Fleet Export Console** Scan Evidence card **Quick Form Submission Ledger** (`quick-forms` via `export-report`).
- Edge Function compliance contract: wrap handlers with `Deno.serve(withCorrelationId(async (req, _ctx) => { ... }))`; return JSON via `createJsonResponse`/`createErrorResponse` (with `{ req }` for CORS), not handcrafted `Response` bodies; use `getCorsHeaders(req)` instead of deprecated wildcard `corsHeaders`; best-effort `finally` cleanup must be wrapped in its own `try/catch` so it cannot override the primary success response. **Invitation emails:** member invites call `send-invitation-email` synchronously (not pgmq/`queue-worker`); Resend via `_shared/resend-send-email.ts` native fetch — do **not** import `npm:resend` in Deno (react-dom crash); from `EquipQR™ <invite@equipqr.app>`; `RESEND_API_KEY` on `edge-env-prod-secrets`.
- **Work orders:** **Create (#1162):** single flow — PM template `<Select>` directly below title (None + clear control; defaults to equipment-assigned template); no generic vs PM type split; equipment QR/card/details/dialog entry points all use `createWorkOrder=1`. Details reads `workOrderKeys.detail` (`useWorkOrderById`); mutation hooks call `invalidateWorkOrderCaches` in `invalidateWorkOrderQueries.ts`, not list-only invalidation. Inline edit on details page (assignment, priority, due date, description)—not a separate edit dialog. Owner/admin delete via `delete_work_order_cascade` SECURITY DEFINER RPC (list + details; storage cleanup inside RPC). Create-form equipment picker is scrollable Radix Select + Search dialog—not cmdk combobox. **Mobile:** contextual quick-access FAB + bottom sheet on work order details (`MobileWorkOrderActionFooter` / `MobileWorkOrderActionSheet`); reserve bottom padding so content clears the fixed FAB. **Notes:** requestors and work-order creators add **public-only** notes on viewable WOs including **completed**; managers/technicians/team owners keep full notes (including private) and may note after completion; **cancelled** WOs stay note-locked; RLS enforces requestor public-only on insert. **Exports:** work-order/report exports are org owner/admin today (`verifyOrgAdmin` on edge functions; UI `permissionLevels.isManager`); team visibility is application-layer (`getTeamBasedWorkOrders` / accessible equipment IDs)—opening requestor/viewer export needs server-side team scope, customer-safe formats, and no private notes/costs. Bulk fetch already filters `is_private = false` on notes. Historical create/edit/convert is owner/admin-only via org-scoped RPCs (`create_historical_work_order_with_pm`, `replace_historical_work_order_timeline` with explicit `p_organization_id`, `convert_work_order_to_historical`); `is_org_admin` enforces owner and admin roles server-side. `HistoricalTimelineEditorDialog` seeds `HistoricalTimelineEditor` from frozen `editorSeedEvents` on open (not mutable `draftEvents`); edit mode waits for `historyReady`; save disabled when incomplete rows visible. PDF/Docs exports read `created_date`, `completed_date`, and status history—timeline replace updates those columns. Operational timeline (`WorkOrderTimeline`) stays separate from audit log; label copy in `workOrderTimelineLabels.ts`; synthesize a single creation row for fresh WOs (combined title when assigned-at-create), skip synthetic creation/current rows for historical WOs, badge `is_historical_creation` rows. **Mobile (#1258):** collapsible **Timeline & office details**. **Admin timeline:** `WorkOrderHistoricalTimelineSection` adds **Admin** badge + **Edit Timeline** on the timeline header → `HistoricalTimelineEditorDialog` titled **Timeline Editor**. Chained lifecycle in `historicalTimeline.ts`—upstream status change clears downstream rows.
- **Inventory RBAC:** `parts_managers` and `parts_consumers` are separate grant tables—not `organization_members.role` values. Read inventory/alternate groups/part lookup via `can_access_inventory` (owner/admin, Parts Manager, or Parts Consumer); writes via `can_manage_inventory`. **Alternate Groups (`/dashboard/alternate-groups`):** card list uses status dot + tooltip; groups with members show scrollable name/SKU list instead of description; desktop card/table toggle (mobile cards only); table flattens memberships one row per part with left group-name column—parts may repeat across groups; `getAlternateGroups` loads `member_summaries` + `member_details` in one query; desktop table uses TanStack Table column resize, double-click separator auto-fit, and header sort (hide card-view sort popover in table view). **List metadata (#1203):** `get_inventory_list_metadata` RPC returns health-summary aggregates in one bounded SQL query. No backfill on rollout—plain active members are denied until explicitly granted Parts Consumer or Parts Manager; route guards and nav must hide direct URLs, not just sidebar links. Inventory **Parts Access** sheet (`PartsAccessSheet`) manages both grants from the Inventory page (desktop header + mobile footer link). **Part storage locations:** org `inventory_default_location_*` fields plus per-item structured geo in `inventoryLocationUtils.ts` (part overrides org default; part QR scans do not capture storage location). **Cost obliviousness:** team requestors/viewers and plain members (customer roles) must see zero evidence of parts, pricing, or labor—`work_order_costs` RLS uses `can_access_work_order_costs` (org admin, WO assignee, or team owner/manager/technician on the WO's team); every cost-surfacing UI gates on `useCanViewWorkOrderCosts()` and every inventory surface (equipment Parts tab, WO part picker, dashboard FAB/widgets) gates on `useInventoryAccess()`. Parts Consumers consume/restore stock only through WO-scoped `adjust_inventory_quantity` calls (requires cost access on that WO); labor hours on notes and `estimated_hours` are hidden from requestor/viewer in UI (column-level DB enforcement not possible). Matrix: `docs/guides/permissions.md` § Inventory & Internal Costing Visibility.
- **Equipment location & maps:** Canonical resolver in `effectiveLocation.ts` — effective order is last-known scan GPS → assigned equipment address → legacy `equipment.location` coordinates → team fallback when `team.override_equipment_location` is enabled (no per-equipment `use_team_location` opt-in). Asset maps use a shared source dropdown (Effective / team / equipment / last scan) and `LocationSourceBadge`; Fleet Map aligns source labels. `ClickableAddress` and map pins open Google Maps directions for displayed coordinates or addresses. One-time GPS saves use shared `LiveLocationCaptureDialog` + center-pin `CenterPinMapPicker` (fixed pin, pan map to adjust, pin lifts with ground shadow while dragging). `equipment_location_history` is authoritative for scan movement; assigned-address and live-capture saves log manual history via `logEquipmentLocationChange`.
- **Audit logs & team views:** Audit log at `/dashboard/organization/audit-log` (owner/admin only, Organization subnav — not main sidebar; dedicated CSV/JSON export via `AuditExplorer`; legacy `/audit-log` redirects). Do not surface audit timelines on operational/historical work-order pages as primary UX. Team details use `teams.preferred_view` (`internal` | `department` | `customer`) with `TeamViewSwitcher` — session override on TeamDetails, persisted team default via `updateTeam`. PM templates list separates EquipQR bundled vs org templates; team-scoped equipment assignment via `PMTemplateEquipmentAssignmentMenu` + `MultiSelectActionMenu`.
- **Preview evidence capture on `preview.equipqr.app`:** Vercel Deployment Protection intercepts fresh Playwright sessions — mint a share link via Vercel MCP `get_access_to_vercel_url`, open it **first** to seed the bypass cookie, then run app Google OAuth as the Columbia Cloudworks automation account (password + fresh TOTP from Columbia Cloudworks Agents vault via `Load-GoogleBusinessEnv.ps1`; TOTP via `op read '.../one-time password?attribute=otp'`). Skipping this can leave the app signed in as a personal Gmail account tied to a different org where production team/equipment IDs 404. Scripted Playwright with a persistent profile works for `accounts.google.com` and GCP Console UI edits (e.g. Maps browser-key allowlist). **Intuit sign-in blocks automation** at the passkey "Verify it's you" chooser — prefer the maintainer's logged-in **cursor-ide-browser** session when QBO UI is needed; `scripts/qbo/Connect-QboBrowserSession.ps1` exists for scripted retries.
