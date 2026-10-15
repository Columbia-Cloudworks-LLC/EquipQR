---
applyTo: "supabase/**"
---
When reviewing changes under `supabase/`, load and follow the `.agents/skills/code-review/SKILL.md` skill.
- Verify every new user-accessible table enables RLS: tenant-owned tables must enforce `organization_id` membership policies, while user-scoped, global, and internal tables must use caller-appropriate or default-deny policies.
- Verify every `SECURITY DEFINER` function pins `SET search_path = public, pg_temp` (or `''` with schema-qualified references), enforces `auth.uid()` tenant membership for authenticated RPCs (or the documented token/`service_role`/trigger boundary in `docs/ops/security-definer-rpc-policy.md`), and updates `dev/security-definer-rpc-allowlists.json` and SQL grants only for intentional client/RLS-helper functions while preserving default-deny access.
- Verify Edge Functions follow `docs/edge-functions/auth-patterns.md` (defaulting to validated user JWTs and org membership checks while preserving approved token-scoped, webhook, service, and CAPTCHA-gated public endpoint safeguards, deriving scope from verified tokens rather than payload IDs) and register any new keys loaded via `_shared/require-secret.ts` or `Deno.env.get()` in `.github/configuration-inventory.yml` and `dev/ci/sync-deploy-config.mjs` (plus explicit `SYNC_SECRET_<NAME>` workflow mappings for secrets per `docs/ops/agent-secrets-and-access.md`).
