---
name: code-review
description: Audit pull requests, diffs, and code changes for EquipQR security invariants, Supabase RLS isolation, SECURITY DEFINER safety, Deno Edge Functions, and RBAC compliance. Use during GitHub Copilot code reviews or local diff audits.
---

# EquipQR Code Review Skill

## 1. Agentic Context Gathering & Runner Tools
When reviewing a pull request or diff in an agentic runner environment:
- **Inspect beyond the diff:** Always read the full target file and related callers when reviewing changes to `supabase/migrations/`, `supabase/functions/`, or `src/hooks/`.
- **Run repository verification scripts** (when shell tool access is available in the runner) to validate invariants deterministically:
  - `node dev/validate-security-definer-allowlist-sync.mjs` (when migrations or RPCs change)
  - `node dev/check-root-layout.mjs` (when files are added at the repository root)
- **Skip lint/formatting noise:** Never leave review comments on formatting, import sorting, or rules already enforced by `eslint.config.js` and `.markdownlint-cli2.jsonc`.

## 2. Supabase Migrations & RLS (`supabase/migrations/**`)
- **Row Level Security (RLS):** Every new table must include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and tenant-scoped policies verifying organization membership.
- **`SECURITY DEFINER` Functions (`docs/ops/security-definer-rpc-policy.md`):** Any new or altered `SECURITY DEFINER` function must:
  1. Pin `search_path` using `SET search_path = public, pg_temp` (or `SET search_path = ''` with fully schema-qualified references for trigger/cron helpers).
  2. Enforce access boundaries by RPC category: require `auth.uid()` and organization membership/role verification for authenticated tenant RPCs, or verify the documented anonymous token, `service_role`, or trigger-only boundary for non-user flows.
  3. Preserve default-deny `EXECUTE` grants (never grant to `PUBLIC`, and keep `service_role`/trigger-only helpers out of client allowlists); synchronize `dev/security-definer-rpc-allowlists.json` and SQL grants only for intentional client-callable RPCs or RLS predicate helpers.
- **Migration Safety:** Ensure migrations use idempotent guards (`IF EXISTS` / `IF NOT EXISTS`) where appropriate and avoid unindexed foreign keys or destructive table locks on `equipment`, `work_orders`, and `inventory_items`.

## 3. Deno Edge Functions (`supabase/functions/**`)
- **Auth & Tenant Verification (`docs/edge-functions/auth-patterns.md`):** Default to user-scoped clients (`createUserSupabaseClient(req)` + `requireUser(req, supabase)`) and verify organization membership before trusting `organization_id` or `user_id` from request payloads. Preserve documented exceptions for approved `service_role`/cron, HMAC webhook, CAPTCHA-gated public intake, and QR token-scoped endpoints (`operator-check-in`, `quick-form`), where tenant/resource scope must be derived from the verified token rather than arbitrary payload IDs.
- **Configuration & Secrets Hygiene (`docs/ops/agent-secrets-and-access.md`):** Load secrets through `_shared/require-secret.ts` (`requireSecret` / `optionalSecret`) rather than raw `Deno.env.get()` for secret-class keys. Any new runtime configuration key or secret (whether read via `requireSecret`, `optionalSecret`, or `Deno.env.get()`) must be registered in `.github/configuration-inventory.yml` and `dev/ci/sync-deploy-config.mjs`, with explicit `SYNC_SECRET_<NAME>` workflow mappings in `.github/workflows/sync-deploy-config.yml` and `.github/workflows/production-release-readiness.yml` for new secrets.
- **Error Responses:** Ensure error responses return sanitized messages with CORS headers and never leak internal stack traces or database schema details.

## 4. Frontend RBAC, Multi-Tenancy & Accessibility (`src/**`)
- **Multi-Tenant Query Scoping:** Queries against tenant tables must scope to the active `organization_id` at the Supabase query level, never relying solely on client-side filtering.
- **RBAC & Cost Visibility:** Verify that sensitive financial, billing (QuickBooks export), and cost fields remain restricted both in UI rendering and data fetching for non-authorized roles.
- **Accessibility (a11y):** Interactive components must preserve keyboard navigation (`src/components/a11y/keyboard.ts`), focus management, and ARIA labels.

## 5. Testing & PR Evidence (`e2e/**`, `src/**/*.test.*`)
- **Unit & Integration Coverage:** Flag new business logic, hooks, or edge function handlers that lack corresponding unit tests.
- **Playwright PR Evidence:** When user-facing workflows or UI components change, verify whether E2E coverage in `e2e/pr-evidence/` or `e2e/user/` requires updates.

## 6. How to Format Review Feedback
- **On GitHub Pull Requests:** Leave inline comments strictly on actionable bugs, security risks, or broken invariants. Always include a concrete GitHub ````suggestion```` block when the fix is localized so it can be applied directly or delegated to Copilot cloud agent.
- **In IDE / CLI Chat:** Group findings by priority (**Blocking**, **Should Fix**, **Nit**) with file paths and line numbers.
