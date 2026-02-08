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
| `stripe-license-webhook` | Stripe webhook signature-based auth; no user JWT available | `verify_jwt = false` |
| `stripe-webhook` | Legacy redirect to stripe-license-webhook | `verify_jwt = false` |

### Cron / Background Jobs

| Function | Reason | Config |
|----------|--------|--------|
| `quickbooks-refresh-tokens` | System cron job; requires service role to enumerate credentials | `verify_jwt = true` (requires service role JWT) |

### Super Admin Endpoints

| Function | Reason | Config |
|----------|--------|--------|
| `list-organizations-admin` | Cross-org admin access; validated via `verifySuperAdminAccess()` | `verify_jwt = true` |
| `manage-billing-exemptions` | Cross-org billing admin; validated via `verifySuperAdminAccess()` | `verify_jwt = true` |

### Special Cases (Hybrid)

| Function | Reason | Config |
|----------|--------|--------|
| `check-subscription` | Uses user-scoped for auth, admin for subscriber table upsert (self-referential update only) | `verify_jwt = true` |
| `create-ticket` | Uses user-scoped for auth, admin client for ticket insert (to atomically set `github_issue_number`) | `verify_jwt = true` |

## Functions Using User-Scoped Client (RLS Enforced)

The following functions use `createUserSupabaseClient()` and rely on RLS:

- `create-checkout` - Creates Stripe checkout sessions
- `customer-portal` - Creates Stripe billing portal sessions
- `export-report` - Exports data to CSV
- `export-work-orders-excel` - Exports work orders to Excel
- `geocode-location` - Geocodes addresses with caching
- `import-equipment-csv` - Imports equipment from CSV
- `part-detail` - Returns part details
- `purchase-user-licenses` - Creates license checkout sessions
- `quickbooks-export-invoice` - Exports work orders to QuickBooks
- `quickbooks-oauth-callback` - Handles OAuth callbacks
- `quickbooks-search-customers` - Searches QuickBooks customers
- `resolve-inventory-scan` - Resolves scanned inventory items
- `send-invitation-email` - Sends invitation emails

## Public Endpoints (No JWT Required)

These endpoints have `verify_jwt = false` and do NOT require authentication:

| Function | Reason | Security Notes |
|----------|--------|----------------|
| `public-google-maps-key` | Returns browser API key (intentionally public) | Key is restricted in Google Cloud Console |
| `verify-hcaptcha` | Validates captcha tokens during signup | Only calls hCaptcha API |
| `parts-search` | Deprecated; returns 410 Gone | No DB access |

## Adding New Functions

When adding a new Edge Function:

1. **Default to user-scoped client** unless you have a specific reason otherwise
2. If you need admin access, document it in this file and explain why
3. Set appropriate `verify_jwt` in `supabase/config.toml`
4. Add explicit org membership checks even with RLS as defense-in-depth

## Security Best Practices

### Error Handling with Correlation IDs

When handling errors in webhook handlers or other sensitive endpoints, use the error ID pattern to correlate client responses with server logs without exposing internal error details:

```typescript
} catch (error) {
  // Generate a unique error ID to correlate client response with server logs
  const errorId = crypto.randomUUID();

  // Log the full error server-side for debugging, including the error ID
  console.error("[FUNCTION-NAME] Error:", { errorId, error });

  // Return generic message to client with reference ID - never expose error.message directly
  return new Response(`Operation failed. Reference ID: ${errorId}`, { 
    status: 500,
    headers: corsHeaders 
  });
}
```

**Benefits:**
- Prevents information disclosure (CWE-209) by never exposing internal error messages
- Enables efficient debugging by correlating client-reported reference IDs with server logs
- Provides users with a trackable reference for support requests

**When to use:**
- Webhook handlers (Stripe, QuickBooks, etc.)
- Any endpoint where errors may contain sensitive debugging info
- OAuth callback handlers

### Error Message Allowlisting

For user-facing endpoints, use `createErrorResponse()` from `supabase-clients.ts` which implements an allowlist approach. Only explicitly safe error messages are exposed to clients; all others are replaced with a generic message and logged server-side.

See `SAFE_ERROR_PATTERNS` in `supabase-clients.ts` for the allowlist and add new patterns when introducing new user-facing error messages.

## Shared Utilities

All auth helpers are in `supabase/functions/_shared/`:

- `supabase-clients.ts` - Client creation and auth helpers
- `admin-validation.ts` - Super admin validation
- `cors.ts` - CORS headers
- `crypto.ts` - Token encryption utilities
