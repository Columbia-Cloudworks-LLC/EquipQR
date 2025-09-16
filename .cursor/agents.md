# AGENTS.md — Opinionated Mode (EquipQR)

**Audience:** Multi‑agent coding systems (Lovable.dev, GPT‑5, Claude Code) and human maintainers.

**Non‑negotiable Goal:** Ship small, safe, reviewable changes that keep **tests green, billing correct, RBAC airtight, and bundles under budget**.

> This file is the contract. Agents must follow it literally. Humans can make exceptions, but must document them in the PR.

---

## 0) Canonical Commands (must run & paste outputs in PR)

```bash
# Install (npm only)
npm ci

# Dev server
npm run dev

# Lint & typecheck
npx eslint .
npx tsc --noEmit

# Test + coverage gate
node scripts/test-ci.mjs
# (vitest runs with coverage)

# Build + bundle budgets
npm run build
npx size-limit
```

### Environment & Secrets (authoritative list)

> **Never** hardcode secrets. Root `.env` is for local dev and is gitignored. Client-readable envs **must** be prefixed with `VITE_` (Vite exposes them to the browser). Server-only secrets are configured for Supabase Edge Functions via `supabase secrets set` or a local `supabase/functions/.env` used only for `supabase functions serve`.

| Name | Scope | Where to set | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Client | root `.env` | URL for Supabase project (public). Mirrors `SUPABASE_URL`.
| `VITE_SUPABASE_ANON_KEY` | Client | root `.env` | Public anon key (RLS still applies). Mirrors `SUPABASE_ANON_KEY`.
| `VITE_STRIPE_PUBLISHABLE_KEY` | Client | root `.env` | Public key used by Stripe.js on the client.
| `VITE_GOOGLE_MAPS_API_KEY` | Client | root `.env` | Public Maps key if maps are rendered client-side.
| `VITE_PRODUCTION_URL` | Client (optional) | root `.env` | Only if client needs absolute links; otherwise omit.
| `STRIPE_SECRET_KEY` | Server | Supabase **secrets** / `functions/.env` | Private Stripe secret key.
| `STRIPE_WEBHOOK_SECRET` | Server | Supabase **secrets** / `functions/.env` | For verifying webhook signatures.
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase **secrets** / `functions/.env` | Service role (bypasses RLS). **Never** expose to client.
| `SUPABASE_DB_URL` | Server | Supabase **secrets** | Used only by server utilities/migrations if applicable.
| `RESEND_API_KEY` | Server | Supabase **secrets** / `functions/.env` | Transactional email.
| `HCAPTCHA_SECRET_KEY` | Server | Supabase **secrets** / `functions/.env` | Server-side verification. (Site key is public; not listed here.)
| `GOOGLE_MAPS_API_KEY` | Server (optional) | Supabase **secrets** | Only if server-side geocoding or static maps are used.
| `SUPABASE_URL` | Server | Supabase **secrets** | Server needs this for API calls.
| `SUPABASE_ANON_KEY` | Server (optional) | Supabase **secrets** | Only if anon operations are needed server-side.
| `PRODUCTION_URL` | Server | Supabase **secrets** | Canonical app URL for emails/links.

**Local dev recipe**

```bash
# Copy and fill
cp .env.example .env

# (Optional) run functions locally with an env file
supabase functions serve --env-file supabase/functions/.env

# Set hosted function secrets (recommended for deploys)
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  SUPABASE_SERVICE_ROLE_KEY=... \
  SUPABASE_DB_URL=... \
  RESEND_API_KEY=... \
  HCAPTCHA_SECRET_KEY=... \
  GOOGLE_MAPS_API_KEY=... \
  PRODUCTION_URL=https://your.app \
  SUPABASE_URL=https://xxxx.supabase.co \
  SUPABASE_ANON_KEY=eyJhbGciOi...
```

> Build/test require at minimum: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Feature areas may also require `VITE_STRIPE_PUBLISHABLE_KEY` and `VITE_GOOGLE_MAPS_API_KEY` when touched. Server handlers must rely on server secrets (never Vite vars).

---

## 1) Agent Personas (roles, allowed changes, required artifacts)

> Only one agent owns a file at a time. Agents must not refactor files outside their scope.

### 1. Lead Architect (Human, reviewer)
- **Scope:** Approves task definition, risk class, and final merge on high‑risk PRs.
- **Outputs:** Green/Red decision; notes in PR.

### 2. Codegen Agent
- **Scope:** Implement feature/fix inside boundaries; no schema/billing changes.
- **Must:** Add/adjust unit/integration tests; keep diffs small.
- **Outputs:** Diff; test evidence; screenshots/GIF for UI.

### 3. Test Engineer Agent
- **Scope:** Expand/normalize tests only.
- **Must:** Cover happy path + 2 failure modes; avoid brittle snapshots.
- **Outputs:** Coverage summary; links to tests touched.

### 4. Security & Compliance Agent
- **Scope:** Review RBAC, input validation, storage access, Stripe trust boundaries.
- **Must:** Confirm RLS assumptions; check no secrets in code/logs; webhook idempotency.
- **Outputs:** Checklist comment; risk notes.

### 5. DB/Migrations Agent
- **Scope:** Schema and data migrations only.
- **Must:** Create forward + rollback SQL in `supabase/migrations/`; idempotent backfills; update generated types.
- **Outputs:** Migration files; backfill plan; rollback steps; updated types.

### 6. Docs Agent
- **Scope:** Update `docs/` and in‑repo help; never change runtime code.
- **Outputs:** Updated docs + links from PR.

### 7. UX QA Agent
- **Scope:** A11y, keyboard nav, mobile; no logic edits.
- **Outputs:** Before/after screenshots; list of ARIA/label fixes.

### 8. Release Manager (Human)
- **Scope:** Tag, changelog, smoke checklist, feature flag toggles.
- **Outputs:** Release notes and confirmation comment.

---

## 2) Workflow (gated, with artifacts)

1. **Intake** — Issue describes scope, acceptance criteria (AC), risk class (see §3), and owner persona.
2. **Plan** — Agent posts a short plan (files to touch, tests to add). Lead Architect acknowledges.
3. **Implement** — Codegen Agent delivers minimal diff + tests.
4. **Test Pass** — Test Engineer ensures coverage ≥ **70%** overall and failures are represented.
5. **Security Pass** — Security Agent signs off (RBAC, RLS, Stripe, storage, input validation).
6. **Docs Pass** — Docs Agent updates user/dev docs.
7. **PR Ready** — Include all required artifacts (see template in §6).
8. **Human Review** — Lead Architect or maintainer reviews; DB changes require **DB Agent + human**.
9. **Merge & Release** — Release Manager handles tag/notes and any feature flags.

---

## 3) Risk Classes & Required Approvals

- **L1 (Low):** UI copy, styles, non‑logic refactor, new tests. *Review:* 1 human or Security Agent (if touching forms).
- **L2 (Medium):** New component, hook, or endpoint usage; minor Supabase query change without schema edits. *Review:* 1 human + Security Agent.
- **L3 (High):** Schema/migrations, auth/RBAC, Stripe/billing, storage deletion logic, data import/export, RLS policies. *Review:* Lead Architect + DB Agent + Security Agent.

> High‑risk PRs must include a **Rollback** section with exact steps and data implications.

---

## 4) Guardrails (do/don’t)

- **Package manager:** npm only. Do not add other lockfiles.
- **Env documentation:** Any new env var must be added to `.env.example` and referenced in §0. Do **not** expose server-only secrets to the client (i.e., never add them as `VITE_`).
- **Secrets:** Never in code, tests, or logs. Use envs and secret stores.
- **RBAC/RLS:** Do not rely on client checks. Server/API must enforce.
- **Stripe:** Webhooks **idempotent**, verify signatures, never trust client for billing decisions.
- **Storage:** Validate content type; sanitize filenames; cascade deletes carefully.
- **A11y:** Keyboard first; ARIA labels; focus management on dialogs.
- **Performance:** Respect `.size-limit.json` (Main JS ≤ 500KB gz, CSS ≤ 50KB, Total ≤ 1MB). Lazy‑load heavy routes.
- **Dates & Time:** Use `date-fns`/`date-fns-tz` only.
- **Types:** TS strict. No `any` in new code; add Zod schemas for inputs.

---

## 5) Supabase & DB Changes (DB Agent only)

1. Write forward + rollback migrations in `supabase/migrations/`.
2. Add idempotent backfill scripts; avoid long‑running locks.
3. Regenerate types in `src/integrations/supabase/types.ts` and fix compile errors.
4. Update tests that assert shapes/constraints.
5. Document data impact + rollback in PR.

---

## 6) Pull Request Template (paste into PR)

```markdown
### Summary
What changed and why.

### Risk Class
L1/L2/L3 and why. Approvals included.

### Scope
Files/areas touched; feature flags toggled.

### Test Plan
- eslint + tsc outputs
- vitest coverage summary (≥70%)
- screenshots/GIF for UI

### Security Review
- RBAC/RLS touched? yes/no
- Input validation present? yes/no
- Secrets/logs checked? yes/no
- Stripe/webhooks idempotent? yes/no

### Performance
- size-limit results (Main/CSS/Total)

### Migrations (if any)
- forward + rollback SQL
- backfill plan
- typegen updated

### Rollback
Exact steps to revert, including data.
```

---

## 7) Testing Policy

- Put tests next to the code they cover.
- Cover success + two representative failures.
- Mock network/storage cleanly; keep console output minimal.
- Avoid brittle snapshots; assert behavior, not DOM noise.

---

## 8) Stripe & Billing Rules (Security Agent checklist)

- Verify webhook signature, handle retries idempotently.
- Treat client‑supplied prices/entitlements as untrusted.
- Log sanitized event IDs, not PII.
- Use test mode keys locally/CI; never print keys.

---

## 9) LLM Prompting Rules for Agents

- Always state: **objective, files to touch, constraints, commands to run**.
- Produce: **diff‑like patch**, **test list**, **risk class**, **rollback plan**.
- Do **not** rewrite unrelated files or “improve architecture” unasked.
- Stop at boundaries: if migration or billing needed, escalate to the right persona.

---

## 10) File Ownership Hotspots

- `supabase/migrations/**` — **DB Agent + Human** required.
- `supabase/functions/**` — Codegen + Security Agent review.
- `src/integrations/supabase/**` — Codegen + DB Agent on type changes.
- `src/utils/**` — Changes discouraged; justify in PR; add targeted tests.

---

## 11) Maintaining Budgets & UX

- Prefer composition over new deps; avoid heavy UI libs.
- Lazy‑load admin‑only screens and large tables.
- Ensure mobile layouts stay usable; test at 360px width.

---

## 12) Glossary

- **RLS:** Row‑Level Security in Supabase.
- **Idempotent:** Safe to retry without double‑effects.
- **Risk Class:** L1/L2/L3 — determines review path.

---

## 13) Maintainers & Approvals

- **Lead Architect:** Project owner.
- **Release Manager:** Project owner or delegate.
- For L3 PRs, both must sign off before merge.

---

*If you improve this process, update AGENTS.md in the same PR and document the change under “Summary.”*


