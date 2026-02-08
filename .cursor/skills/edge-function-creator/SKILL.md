---
name: edge-function-creator
description: Scaffolds new Supabase Edge Functions with standard imports, CORS handling, and auth patterns from the EquipQR codebase. Use when the user says "scaffold function", "new edge function", "create edge function", or "add edge function".
---

# Edge Function Creator

## Scaffold a New Edge Function

### Quick Start (automated)

Run the scaffold script:

```powershell
python .cursor/skills/edge-function-creator/scripts/scaffold.py <function-name>
```

This creates `supabase/functions/<function-name>/index.ts` from the standard template.

### Quick Start (manual)

1. Create `supabase/functions/<function-name>/index.ts`
2. Copy contents from [templates/index.ts.txt](templates/index.ts.txt)
3. Replace `{{FUNCTION_NAME}}` with the uppercase kebab-case name (e.g., `MY-FUNCTION`)

### Template Variants

The default template includes **user-scoped auth** (RLS enforced). Choose the right pattern:

| Pattern | When to Use | Key Import |
|---------|------------|------------|
| **User-scoped (default)** | User-facing endpoints | `createUserSupabaseClient` |
| **Admin / service-role** | Webhooks, cron jobs, no user context | `createAdminSupabaseClient` |
| **No auth** | Public endpoints (hCaptcha, public keys) | Only `corsHeaders` |

For admin-only functions, replace `createUserSupabaseClient` with `createAdminSupabaseClient` from `../_shared/supabase-clients.ts` and remove `requireUser`.

### Shared Utilities

All shared code lives in `supabase/functions/_shared/`:

| Module | Exports |
|--------|---------|
| `cors.ts` | `corsHeaders` |
| `supabase-clients.ts` | `createUserSupabaseClient`, `createAdminSupabaseClient`, `requireUser`, `verifyOrgMembership`, `createErrorResponse`, `createJsonResponse`, `handleCorsPreflightIfNeeded` |
| `admin-validation.ts` | Super-admin validation helpers |
| `error-message-allowlist.ts` | `SAFE_ERROR_PATTERNS`, `isErrorAllowlisted` |

### Post-Scaffold Checklist

- [ ] Implement function logic inside the `try` block
- [ ] Add any new error messages to `_shared/error-message-allowlist.ts`
- [ ] Deploy with `supabase functions deploy <function-name>`
- [ ] If the function should be publicly accessible (no JWT), update `supabase/config.toml` to set `verify_jwt = false`
