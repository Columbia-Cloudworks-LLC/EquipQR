# Supabase Database Branching

> Operational runbook for the per-PR ephemeral Supabase branching workflow that EquipQR enabled on 2026-05-03 as part of [issue #722](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/722) (Sub-change 3 of 3).

## What it is

Supabase Database Branching creates a separate, isolated Supabase instance (its own Postgres, its own API, its own auth, its own anon key) per PR. When a PR is opened that touches database schema, Supabase clones the production schema into a new branch, runs the PR's migrations against that branch, and exposes a unique URL + anon key for the branch's preview environment. When the PR closes (merged or not), the branch is auto-deleted.

The point: schema migrations are validated against a real Postgres instance — not just locally — before they land on `preview`, where the preview deployment of EquipQR consumes them. This is the safety net that catches Postgres-version drift, RLS-policy interaction bugs, and migration ordering issues that local `supabase db reset` cannot reproduce.

## Trigger policy

Branching is configured to create a branch ONLY when a PR touches `supabase/migrations/**`. PRs that don't change the schema do not consume branch-hours. The policy is set in the Supabase Dashboard:

```text
https://supabase.com/dashboard/project/ymxkzronkhwxzcdcbnwq → Branches → Settings → "Branch only on file changes"
Path filter: supabase/migrations/**
```

**Why targeted, not every PR**: at $0.01344 per branch per hour, the bulk of EquipQR's PRs (front-end-only, doc-only, CI tweaks) would generate 0 schema risk and ~3-5x the spend if branching ran on every PR. The targeted policy keeps the bill near $14/mo for typical cadence.

## Cost model

Live pricing (https://supabase.com/pricing, validated 2026-05-03):

- **Per branch:** $0.01344 / hour.
- **Typical PR (24-hour life):** ~$0.32.
- **Typical week (5 PRs touching migrations × 48h each):** ~$3.22 → ~$14/mo.
- **Worst case (10 long-lived branches):** ~$96/mo. Still under any reasonable spend cap.

The Pro plan's spend cap (Project → Billing → "Spend cap is ON by default") prevents runaway billing if a branch is forgotten.

## Branch lifecycle

1. **PR opened** with a commit that modifies `supabase/migrations/**`.
2. **Supabase GitHub App** (already connected per the existing integration) detects the path match, clones the production schema (no data — branches are dataless by design), and starts the deployment workflow:
   - **Clone** → checks out the repo at the PR's HEAD.
   - **Pull** → retrieves prior production migrations to seed the migration history table.
   - **Health** → waits up to ~2 minutes for all Supabase services on the branch (Auth, API, Postgres, Storage, Realtime) to come up.
   - **Configure** → applies any branch-specific overrides from `supabase/config.toml`.
   - **Migrate** → runs the PR's pending migrations against the branch.
   - **Seed** → optional; only runs if a seed file is registered (we do not seed by default to avoid leaking production data shape).
   - **Deploy** → ships any changed Edge Functions to the branch.
3. **PR open** → branch URL + anon key visible at https://supabase.com/dashboard/project/ymxkzronkhwxzcdcbnwq/branches.
4. **PR closed/merged** → Supabase auto-deletes the branch.

## How to access a branch

While a PR is open, the Branches page shows each active branch with:
- A unique project URL (e.g. `https://branch-abc123.supabase.co`)
- A unique anon key (rotated per-branch)
- Links to the branch's Studio, Logs, and Edge Functions

To exercise the branch from a Vite preview:
- Vercel automatically generates a preview URL per PR (via the existing GitHub integration).
- The Vercel preview points at the production Supabase project by default (via build-time `VITE_SUPABASE_URL` env var). To point at the branch's Supabase, override the env vars on the Vercel preview deployment, OR use the branch's anon key inline in browser DevTools for a one-off check.
- For most validation (does the migration apply? does RLS still pass?), the branch's Studio + the branch's SQL Editor are sufficient — no Vite preview needed.

## What branching does NOT do

- **Branches are dataless.** They have the production schema but no production rows. If your migration depends on existing data shapes (e.g. backfills based on row content), test that locally with seeded data before relying on the branch.
- **Branches do not test Edge Function CORS / auth / cron behavior automatically.** Edge Functions deploy to the branch but only run when invoked. Cron jobs in `supabase/migrations` will be scheduled on the branch and start firing — this is mostly fine but worth knowing if a cron job has external side effects.
- **Branches do not clone Vault secrets.** If your migration depends on a Vault entry (e.g. the Stripe FDW pilot's `stripe_fdw_api_key`), the branch's Vault is empty unless you add the secret manually via the branch's Studio.
- **Branches don't catch post-deploy / production data issues.** They catch migration syntax, RLS interactions, and Postgres version compatibility. Production-data-shape bugs surface only after merge to `preview`.

## Cleanup if a branch is stuck

If the auto-delete on PR close fails (e.g. PR was force-closed during a deployment workflow run):

1. Open https://supabase.com/dashboard/project/ymxkzronkhwxzcdcbnwq/branches.
2. Find the stuck branch.
3. Click the three-dot menu → **Delete branch**.
4. Confirm. The branch is destroyed within a minute.

## Disabling branching (rollback)

If branching causes unexpected behavior (e.g. CI workflows break because of branch-creation timing), the rollback is dashboard-only:

1. Open https://supabase.com/dashboard/project/ymxkzronkhwxzcdcbnwq → **Branches** → **Settings**.
2. Click **Disable branching**.
3. No code change needed — the comment block in `supabase/config.toml` and this doc are dormant without branching enabled.

## References

- Supabase docs: https://supabase.com/docs/guides/deployment/branching
- Branching billing: https://supabase.com/docs/guides/platform/manage-your-usage/branching
- GitHub integration: https://supabase.com/docs/guides/deployment/branching/github-integration
- EquipQR Service Request on issue #722: https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/722#issuecomment-4366751122
- EquipQR Change Record on issue #722: https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/722#issuecomment-4366780373
