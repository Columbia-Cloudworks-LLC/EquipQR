# SECURITY DEFINER RPC grant policy

EquipQR uses many `SECURITY DEFINER` PostgreSQL functions in `public`. PostgREST exposes any function granted `EXECUTE` to `anon` or `authenticated` at `/rest/v1/rpc/<name>`.

Issue [#762](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/762) locked down the default-allow posture from the baseline migration. Issue [#1310](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/1310) re-locked after post-#762 drift (new `CREATE FUNCTION` inherited `ALTER DEFAULT PRIVILEGES … GRANT ALL ON FUNCTIONS TO anon/authenticated`) and removed public-bucket listing policies.

## Categories

| Category | Callable by | Examples |
| --- | --- | --- |
| **anon public RPC** | `anon`, `authenticated` | Pre-auth flows that must work before sign-in (`get_invitation_by_token_secure`) |
| **authenticated public RPC** | `authenticated` only | Dashboard, inventory, invitations, OAuth session setup, org admin actions |
| **RLS predicate helper** | `authenticated` only (not `anon`) | `is_org_member`, `is_org_admin`, `user_is_org_member` — required for policy evaluation, not public REST APIs |
| **internal / service** | `service_role`, trigger/cron context only | `notify_org_admins`, `invoke_queue_worker`, audit triggers |
| **internal trigger** | Not REST-callable | `handle_new_user`, `audit_*_changes`, `log_work_order_status_change` |

## Rules for new functions

1. **Default deny:** New `SECURITY DEFINER` functions must **not** grant `EXECUTE` to `PUBLIC`, `anon`, or `authenticated` unless explicitly reviewed.
2. **Pin `search_path`:** Use `SET search_path = public, pg_temp` (or `''` for cron helpers) on every definer.
3. **Add to allowlist:** Client-callable RPCs must be added to `scripts/security-definer-rpc-allowlists.json` and the lockdown migration pattern (or a follow-up migration that only re-grants the new name).
4. **Trigger-only helpers:** Revoke `PUBLIC`, `anon`, and `authenticated`; rely on definer owner + trigger/cron invocation.
5. **Never expose identity probes to browsers:** Helpers like `is_user_google_oauth_verified` stay `service_role` only (see migration `20260525000000_restrict_google_oauth_verified_to_service_role.sql`).

## Allowlists (source of truth)

- `scripts/security-definer-rpc-allowlists.json` — names granted back to `authenticated` / `anon` after bulk revoke. Source of truth for the latest re-lockdown migration (`20260719214316_security_advisor_1310_hardening.sql`; originally `20260602120000_lockdown_security_definer_rpc_grants.sql`).

## Inventory

Regenerate after grant changes (local Supabase must be running):

```powershell
node scripts/generate-security-definer-rpc-inventory.mjs
```

Output: `docs/ops/security-definer-rpc-inventory.md`

## CI regression guard

`.github/scripts/validate-migrations.js` fails **new** migrations that:

- `GRANT EXECUTE` on functions to `anon` unless the migration includes `-- rpc-anon-grant-allowed: <function_name>`
- `GRANT EXECUTE` on functions to `authenticated` unless the migration includes `-- rpc-authenticated-grant-allowed: <function_name>` (or uses the bulk lockdown migration)

Keep allowlists aligned:

```powershell
node scripts/validate-security-definer-allowlist-sync.mjs
```

## Supabase Advisor lints (0025 / 0029 / anon DEFINER)

| Lint | Expected after #1310 |
| --- | --- |
| `public_bucket_allows_listing` | **0** — public buckets keep `public=true` for direct object URLs; broad `storage.objects` SELECT policies are dropped |
| `function_search_path_mutable` on `datadog.explain_statement` | **0** when Datadog schema is present (pinned `search_path`) |
| `anon_security_definer_function_executable` | **3** intentional token/pre-auth RPCs (`anonPublicRpc`) |
| `authenticated_security_definer_function_executable` | Intentional allowlist only (client DEFINER RPCs + RLS helpers). INVOKER names in the JSON are not advisor DEFINER rows |

1. Deploy `20260719214316_security_advisor_1310_hardening.sql` (builds on `20260602120000_lockdown_security_definer_rpc_grants.sql`).
2. Confirm `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public` no longer grants new functions to `anon`/`authenticated`.
3. Regenerate inventory and confirm only allowlisted names have `authenticated EXECUTE = yes`.
4. Reconcile advisor exports: `node scripts/reconcile-advisor-rpc-warnings.mjs advisor-functions.txt`
5. Authorization evidence for high-risk RPCs: [security-definer-rpc-audit.md](./security-definer-rpc-audit.md)

## Future refactor (zero advisor warnings)

To clear advisor rows entirely (optional, larger effort):

1. Move privileged bodies to a non-exposed schema (for example `private` / `app_internal`).
2. Expose thin `SECURITY INVOKER` public wrappers, or route mutations through Edge Functions with `service_role`.
3. Keep RLS predicate helpers as definers but outside the API-exposed schema, or replace with `SECURITY INVOKER` helpers once RLS recursion is ruled out.

Do this domain-by-domain (invitations, QuickBooks, org lifecycle) to avoid breaking PostgREST contracts.

## Verification

```powershell
npx supabase db reset
npm run test:db
```

pgTAP: `supabase/tests/13_security_definer_rpc_grants.sql`
