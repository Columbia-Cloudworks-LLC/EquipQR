# SECURITY DEFINER RPC authorization audit (issue #762)

High-risk allowlisted RPCs reviewed for `auth.uid()` / org-scoped RBAC before accepting residual Supabase Advisor warnings.

| Function | Posture | Authorization evidence |
| --- | --- | --- |
| `delete_organization` | Keep authenticated RPC | `auth.uid()`; owner role on `p_organization_id`; confirmation name match |
| `accept_invitation_atomic` | Keep authenticated RPC | `p_user_id` defaults to `auth.uid()`; email must match invitation |
| `create_invitation_atomic` | Keep authenticated RPC | Admin checks in invitation migrations (`can_manage_invitation_atomic` pattern) |
| `adjust_inventory_quantity` | Keep authenticated RPC | `auth.uid()`; active org membership on item org |
| `update_equipment_working_hours` | Keep authenticated RPC | Org/equipment scoped checks in function body |
| `create_historical_work_order_with_pm` | Keep authenticated RPC | `is_org_admin(auth.uid(), p_organization_id)` |
| `apply_pending_admin_grants_for_user` | Keep authenticated RPC | Self-only when `auth.uid()` present; quiet no-op on mismatch |
| `update_member_quickbooks_permission` | Keep authenticated RPC | `auth.uid()`; caller must be org owner |
| `refresh_quickbooks_tokens_manual` | Keep authenticated RPC | **Hardened** in `20260602130000_*`: requires `can_user_manage_quickbooks` for an org with credentials |
| `initiate_ownership_transfer` / responders | Keep authenticated RPC | Transfer migrations enforce owner/participant rules |
| `is_org_*` / `user_is_org_*` / `check_org_access_secure` | RLS helpers | Intentional `authenticated` EXECUTE for policy evaluation only |

## Residual Supabase Advisor warnings

Lint `0029_authenticated_security_definer_function_executable` flags **any** public `SECURITY DEFINER` function granted to `authenticated`, including the intentional allowlist above and the six RLS predicate helpers. After `20260602120000_lockdown_security_definer_rpc_grants.sql` and the #1310 re-lockdown (`20260719214316_security_advisor_1310_hardening.sql`), internal/trigger/cron DEFINER helpers are **not** callable via PostgREST. Public-bucket listing policies and Datadog `search_path` are addressed in the same #1310 migration.

Treat unexpected advisor rows as deployment drift: regenerate [`security-definer-rpc-inventory.md`](./security-definer-rpc-inventory.md) and diff against [`security-definer-rpc-allowlists.json`](../../scripts/security-definer-rpc-allowlists.json).

## Advisor export reconciliation

- **2026-06-02 (#762):** Compared a 57-function Advisor export with the allowlist — gaps none; several allowlist names are `SECURITY INVOKER` (not DEFINER advisor rows).
- **2026-07-19 (#1310):** Production Advisor showed 24 anon + 94 authenticated DEFINER warnings plus 4 public-bucket listing rows. Drift came from default privileges re-granting new functions to `anon`/`authenticated`. Re-lockdown + default-privilege revoke restores the intentional surface (3 anon token RPCs; authenticated allowlist only).

Run: `node scripts/reconcile-advisor-rpc-warnings.mjs tmp/rpc-advisor-export.txt`
