# SECURITY DEFINER RPC grant policy

EquipQR uses many `SECURITY DEFINER` PostgreSQL functions in `public`. PostgREST exposes any function granted `EXECUTE` to `anon` or `authenticated` at `/rest/v1/rpc/<name>`.

Issue [#762](https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/762) locked down the default-allow posture from the baseline migration.

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

- `scripts/security-definer-rpc-allowlists.json` — names granted back to `authenticated` / `anon` after the bulk revoke in `20260602120000_lockdown_security_definer_rpc_grants.sql`.

## Inventory

Regenerate after grant changes (local Supabase must be running):

```powershell
node scripts/generate-security-definer-rpc-inventory.mjs
```

Output: `docs/ops/security-definer-rpc-inventory.md`

## CI regression guard

`.github/scripts/validate-migrations.js` fails **new** migrations that `GRANT EXECUTE` on functions to `anon` unless the migration includes `-- rpc-anon-grant-allowed: <function_name>` on the same statement block.

## Verification

```powershell
npx supabase db reset
npm run test:db
```

pgTAP: `supabase/tests/13_security_definer_rpc_grants.sql`
