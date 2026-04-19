# Edge Function Authentication Patterns

This document describes the authentication patterns used in Supabase Edge Functions and which functions are authorized to use the service role key.

## Overview

Edge Functions can create Supabase clients in two modes:

1. **User-Scoped Client** (`createUserSupabaseClient`) - Uses `SUPABASE_ANON_KEY` + forwards the user's JWT. RLS policies apply.
2. **Admin Client** (`createAdminSupabaseClient`) - Uses `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS. **Use sparingly.**

## Default Pattern: User-Scoped Client

Most functions should use the user-scoped client pattern:

```typescript
import { createUserSupabaseClient, requireUser } from "../_shared/supabase-clients.ts";

Deno.serve(async (req) => {
  const supabase = createUserSupabaseClient(req);
  const auth = await requireUser(req, supabase);
  if ("error" in auth) {
    return createErrorResponse(auth.error, auth.status);
  }
  // All queries respect RLS
  const { data } = await supabase.from("equipment").select("*");
});
```

## Functions Authorized to Use Service Role

The following functions are explicitly authorized to use `createAdminSupabaseClient()` or `SUPABASE_SERVICE_ROLE_KEY`:

### Webhooks (No User Context)

| Function | Reason | Config |
|----------|--------|--------|
| `github-issue-webhook` | GitHub webhook HMAC-SHA256 signature auth; syncs issue status and comments to tickets table | `verify_jwt = false` |

### Cron / Background Jobs

| Function | Reason | Config |
|----------|--------|--------|
| `quickbooks-refresh-tokens` | System cron job; requires service role to enumerate credentials | `verify_jwt = true` (requires service role JWT) |

### Super Admin Endpoints

| Function | Reason | Config |
|----------|--------|--------|
| `list-organizations-admin` | Cross-org admin access; validated via `verifySuperAdminAccess()` | `verify_jwt = true` |

### Special Cases (Hybrid)

| Function | Reason | Config |
|----------|--------|--------|
| `check-subscription` | Uses user-scoped for auth, admin for subscriber table upsert (self-referential update only) | `verify_jwt = true` |
| `create-ticket` | Uses `requireUser()` for auth with a user-scoped client, and an admin client for ticket insert (to atomically set `github_issue_number`) | `verify_jwt = false` |

## Functions Using User-Scoped Client (RLS Enforced)

The following functions use `createUserSupabaseClient()` and rely on RLS:

- `export-report` - Exports data to CSV
- `export-work-orders-excel` - Exports work orders to Excel
- `export-work-orders-to-google-docs` - Creates Google Docs executive packets (also uses admin client for Google token refresh)
- `export-work-orders-to-google-sheets` - Exports work orders to Google Sheets
- `geocode-location` - Geocodes addresses with caching
- `get-google-export-destination` - Returns configured Google Docs export destination
- `set-google-export-destination` - Saves Google Docs export destination
- `import-equipment-csv` - Imports equipment from CSV
- `part-detail` - Returns part details
- `quickbooks-export-invoice` - Exports work orders to QuickBooks
- `quickbooks-oauth-callback` - Handles OAuth callbacks
- `quickbooks-search-customers` - Searches QuickBooks customers
- `resolve-inventory-scan` - Resolves scanned inventory items
- `send-invitation-email` - Sends invitation emails

## Authenticated-User Public-Data Endpoints (`verify_jwt = true`, no role gating)

These endpoints require any signed-in user but otherwise return non-secret
operational values to the client. The platform-level JWT check (`verify_jwt = true`
in `supabase/config.toml`) gates anonymous traffic; the function then trusts
that any authenticated user can read the value.

| Function | Reason | Security Notes |
|----------|--------|----------------|
| `public-google-maps-key` | Returns the browser API key + optional Map ID needed by every authenticated client to render Fleet Map and address autocomplete | `verify_jwt = true` (anon-key callers receive 401 — verified by `.github/workflows/edge-functions-smoke-test.yml`). The browser key is HTTP-referrer-restricted in Google Cloud Console; secret is loaded via `requireSecret("GOOGLE_MAPS_BROWSER_KEY")`. The "public" in the function name refers to the *value* it returns being non-secret, NOT to anonymous access. |

## Public Endpoints (No JWT Required)

These endpoints have `verify_jwt = false` and do NOT require authentication:

| Function | Reason | Security Notes |
|----------|--------|----------------|
| `verify-hcaptcha` | Validates captcha tokens during signup | Only calls hCaptcha API; secret loaded via `requireSecret("HCAPTCHA_SECRET_KEY")` |
| `parts-search` | Deprecated; returns 410 Gone | No DB access |

## Adding New Functions

When adding a new Edge Function:

1. **Default to user-scoped client** unless you have a specific reason otherwise
2. If you need admin access, document it in this file and explain why
3. Set appropriate `verify_jwt` in `supabase/config.toml`
4. Add explicit org membership checks even with RLS as defense-in-depth

## Security Best Practices

### Required Secrets (`requireSecret`)

Every Edge Function loads its runtime secrets through the `requireSecret`
helper in `_shared/require-secret.ts`. This is the canonical pattern —
do not call `Deno.env.get()` directly for secret-class env vars.

```typescript
import { requireSecret, MissingSecretError } from "../_shared/require-secret.ts";

const FUNCTION_NAME = "my-function";

const apiKey = requireSecret("MY_API_KEY", {
  functionName: FUNCTION_NAME,
  legacyAliases: ["LEGACY_MY_API_KEY"], // optional, in priority order
});
```

When the canonical name and every legacy alias are absent (or empty),
the helper throws a typed `MissingSecretError` whose constructor emits
exactly one structured log line on `console.error`:

```json
{"level":"error","code":"MISSING_REQUIRED_SECRET","function":"my-function","secret":"MY_API_KEY","legacyAliasesChecked":["LEGACY_MY_API_KEY"],"timestamp":"2026-04-18T..."}
```

Operators can grep `"code":"MISSING_REQUIRED_SECRET"` across all Edge
Function logs to find every misconfiguration regardless of which
function fired it.

**Security guarantees:**
- Secret values are NEVER logged, even partially. Only names, the
  function tag, and a presence boolean (via the structured line) ever
  appear on stdout/stderr.
- `createErrorResponse(error)` accepts a `MissingSecretError` and
  forces the generic `"An internal error occurred"` message, so the
  secret name cannot reach the client even if a function forgets to
  catch it explicitly.
- For optional config (graceful degradation), use `optionalSecret`
  instead — it returns `null` and never logs.

### Correlation IDs (`withCorrelationId`)

Wrap your `Deno.serve` handler with `withCorrelationId` to get
end-to-end request correlation:

```typescript
import { withCorrelationId } from "../_shared/supabase-clients.ts";

Deno.serve(withCorrelationId(async (req, ctx) => {
  console.log(JSON.stringify({
    correlation_id: ctx.correlationId,
    step: "function started",
  }));
  // ... your handler ...
}));
```

The wrapper:
- Mints a fresh `crypto.randomUUID()` per request (or reuses an
  inbound `X-Correlation-Id` / `X-Request-Id` header).
- Sets `X-Correlation-Id` on every outbound response.
- Injects `correlation_id` into JSON error bodies so support flows
  can quote the id without parsing headers. Success bodies are
  unchanged for wire-format compatibility.
- Catches any uncaught handler exception, emits an
  `UNCAUGHT_HANDLER_ERROR` structured log with the id, and returns
  a generic 500 (never leaks `error.message` to the client).

### Error Message Allowlisting

For user-facing endpoints, use `createErrorResponse()` from `supabase-clients.ts` which implements an allowlist approach. Only explicitly safe error messages are exposed to clients; all others are replaced with a generic message and logged server-side.

See `SAFE_ERROR_PATTERNS` in `supabase-clients.ts` for the allowlist and add new patterns when introducing new user-facing error messages.

## Shared Utilities

All auth helpers are in `supabase/functions/_shared/`:

- `supabase-clients.ts` - Client creation, auth helpers, `createErrorResponse` allowlist, `withCorrelationId` wrapper
- `require-secret.ts` - `requireSecret` / `optionalSecret` / `MissingSecretError`
- `admin-validation.ts` - Super admin validation
- `cors.ts` - CORS headers (`corsHeaders` static + `getCorsHeaders(req)` validated-origin)
- `crypto.ts` - Token encryption utilities
- `error-message-allowlist.ts` - SAFE_ERROR_PATTERNS for client-facing error strings
