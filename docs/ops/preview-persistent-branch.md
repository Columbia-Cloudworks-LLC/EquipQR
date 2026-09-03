# Persistent Supabase Branch for `preview.equipqr.app`

> Decision record for reversing the shared-production preview backend after
> #1033. This document records the approved target only. It does **not** create
> the branch, change Vercel env, seed Auth, or enable Quick Login on the
> current live preview.

**Status:** Approved target; implementation remains queued.  
**Current live state:** `preview.equipqr.app` still points at production
Supabase (`ymxkzronkhwxzcdcbnwq` / `https://supabase.equipqr.app`) until the
cutover checklist below is executed.  
**Related docs:** [preview-architecture-migration](./preview-architecture-migration.md),
[supabase-branching](./supabase-branching.md),
[cloud-agent-ephemeral-stack](./cloud-agent-ephemeral-stack.md),
[supabase-branch-secrets](./supabase-branch-secrets.md).

---

## Context

`preview.equipqr.app` currently shares production Supabase Auth and data with
`equipqr.app`. That kept the #1033 rollback simple, but it makes preview QA
more expensive in operator time and risk than the fixed cost of restoring an
isolated backend.

| Option | Cost / risk profile |
|--------|----------------------|
| Keep preview on production Supabase | No extra branch spend, but preview sign-in and QA continue to touch production Auth and live data. Quick Login must stay disabled there. |
| Move preview to a persistent Supabase branch | Roughly **$9.80/mo** (`$0.01344/hr`) per [`preview-architecture-migration.md`](./preview-architecture-migration.md), but preview regains isolated Auth, dataless test rows, and preview-only Quick Login. |

Important constraints locked by Product:

- This is a **persistent Supabase Database Branch**, not an ephemeral PR branch.
- This is **not** a second paid Supabase project.
- Production remains `ymxkzronkhwxzcdcbnwq` / `https://supabase.equipqr.app`.
- The branch must be created with **`with_data: false`**.
- Production rows, including 3-A Equipment shop data, must never be cloned or
  seeded into the preview branch.

---

## Decision

| Surface | Decision | Notes |
|---------|----------|-------|
| `preview.equipqr.app` backend | Create a **new persistent Supabase Database Branch** on the production project | Do **not** reuse retired branch `olsdirkvvfegvclbpgrg` as-is. |
| Branch data | Create with **`with_data: false`** | Never clone production rows. Never seed production. |
| Vercel Preview env for git `preview` | Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at the persistent branch | The stable hostname remains `https://preview.equipqr.app`. |
| Edge Function secrets | Restore `edge-env-preview-secrets` onto the persistent branch | Set `PUBLIC_SITE_URL=https://preview.equipqr.app` on that branch. |
| Preview Auth | Seed preview-only Quick Login and email/password personas through the **Auth Admin API** | Branch `service_role` is allowed for this seed on the persistent branch only. |
| Production Auth | No change | Production never shows the Quick Login picker and never accepts preview-only passwords. |
| PR schema validation | Keep existing ephemeral PR branches for `supabase/**` | This decision does **not** replace the GitHub Integration branching path. |
| Cursor Cloud Agents | Keep existing `agent-*` ephemeral branches | This decision does **not** replace [`cloud-agent-ephemeral-stack.md`](./cloud-agent-ephemeral-stack.md). |

---

## Seed contract

Reuse the fictional org/persona contract from
[`cloud-agent-ephemeral-stack.md`](./cloud-agent-ephemeral-stack.md) and
[`dev/cloud-agent/seed-quick-login.mjs`](../../dev/cloud-agent/seed-quick-login.mjs)
where it already matches. Extend the preview seed contract as follows:

| Requirement | Contract |
|-------------|----------|
| Org naming | Seed **fictional test org names** only. Do not use live Columbia Cloudworks or 3-A Equipment stand-ins. |
| Primary preview org | Provide one shared test org with at least one **Owner or Admin**, one **Technician**, and one **Viewer**. Each persona must be able to sign in and open at least one seeded work order in that org. |
| Viewer scope | The Viewer can open the seeded work order but still sees **no cost, inventory, or labor** data. |
| Technician scope | The Technician can open the seeded work order with technician permissions, but still **does not** see Delete. |
| Plain org member | A plain org member with no team is **not** a QA persona for this branch. |
| Second org isolation | Seed a second fictional org with its own work order so Org B users cannot see Org A work orders. |
| Quick Login | Quick Login is **preview-only test chrome** on this branch. It must never be enabled against production Auth or the current live preview before cutover. |
| QA identities | Nicholas Google accounts are **not** preview QA logins. Use preview-only email/password personas instead. |

Implementation should keep the existing fictional persona set where practical
(`owner@apex.test`, `admin@apex.test`, `tech@apex.test`, `owner@metro.test`,
`tech@metro.test`) and add the missing preview Viewer coverage on the shared
test org rather than introducing production-linked accounts.

---

## Consequences

### Benefits

- Preview QA stops depending on production Auth sessions and live production
  rows.
- `preview.equipqr.app` can use Quick Login without widening production blast
  radius.
- Reviewers get a stable preview hostname with isolated test data instead of a
  mix of production state and per-PR ephemeral URLs.

### Tradeoffs

- Supabase branching regains a fixed monthly compute cost of about **$9.80/mo**.
- Preview edge secrets, Auth configuration, and seed drift become explicit
  operational responsibilities again.
- Google Workspace and QuickBooks parity on the preview branch remain out of
  scope for this slice and continue to rely on local-stack verification.

---

## Cutover checklist

Implementation waits on the Product Owner queue. When the cutover starts, use
this checklist:

1. Create a **new persistent Supabase Database Branch** from
   `ymxkzronkhwxzcdcbnwq` with **`with_data: false`**.
2. Verify the new branch ref is **not** `ymxkzronkhwxzcdcbnwq` and **not**
   `olsdirkvvfegvclbpgrg`.
3. Restore `edge-env-preview-secrets` onto the new branch and confirm
   `PUBLIC_SITE_URL=https://preview.equipqr.app`.
4. Point the Vercel **Preview** env for git `preview` at the branch
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Configure branch Auth so `site_url=https://preview.equipqr.app` and the
   required redirect URLs stay aligned with that preview hostname.
6. Seed preview-only Quick Login and email/password personas through the Auth
   Admin API using the branch `service_role` only. Never seed production.
7. Confirm the primary test org has Owner/Admin, Technician, and Viewer
   personas that can each open a seeded work order, with the expected RBAC
   limits still enforced.
8. Confirm a second seeded org exists and cannot read the first org's work
   orders.
9. Reconfirm that the Google Maps browser-key HTTP referrer allowlist already
   includes `https://preview.equipqr.app/*`; no new preview hostname means no
   Maps referrer change is expected for this cutover.
10. Verify the active preview backend ref is no longer
    `ymxkzronkhwxzcdcbnwq` anywhere the ops runbook checks it.

---

## Rollback

If the preview cutover fails, rollback is intentionally small:

1. Point the Vercel **Preview** env for git `preview` back to production
   `VITE_SUPABASE_URL=https://supabase.equipqr.app` and the production anon
   key.
2. Redeploy `preview.equipqr.app` and confirm preview traffic is back on
   production Supabase.
3. Leave the persistent preview branch detached for later cleanup rather than
   improvising writes against production.

---

## Explicitly out of scope

- Copying production data into preview
- Changing production Auth behavior
- Enabling Quick Login on production
- Enabling Quick Login on the current live preview before cutover
- Merging the two revert writes
- Reopening #1485
- Google Workspace / QuickBooks OAuth parity on the preview branch
- Replacing ephemeral PR branches for `supabase/**`
- Replacing `agent-*` Cursor Cloud Agent branches
- Creating the branch or changing secrets/env in this documentation-only PR

---

## References

- [Preview Architecture Migration (#1033) — historical](./preview-architecture-migration.md)
- [Supabase Database Branching](./supabase-branching.md)
- [Cloud Agent Ephemeral Supabase Stack](./cloud-agent-ephemeral-stack.md)
- [Supabase Branch Secrets Configuration](./supabase-branch-secrets.md)
