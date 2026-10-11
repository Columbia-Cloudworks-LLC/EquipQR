---
name: edge-functions
description: Conventions, security patterns, and testing guidelines for Supabase Edge Functions (Deno) in EquipQR.
---

# Supabase Edge Functions Guide

EquipQR uses Supabase Edge Functions running on Deno for server-side logic, third-party integrations (QuickBooks, Google Workspace), notifications, and background processing.

## 1. Handler Contract

Wrap every function handler using `withCorrelationId`:

```typescript
import {
  createUserSupabaseClient,
  requireUser,
  createJsonResponse,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsPreflight = handleCorsPreflightIfNeeded(req);
  if (corsPreflight) return corsPreflight;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, { req });
  }

  const supabase = createUserSupabaseClient(req);
  const auth = await requireUser(req, supabase);
  if ("error" in auth) {
    return createErrorResponse(auth.error, auth.status, { req });
  }

  const { organizationId } = await req.json();
  if (!organizationId) {
    return createErrorResponse("organizationId is required", 400, { req });
  }

  // Enforce tenant boundary via organization_id filter alongside RLS
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("organization_id", organizationId);
  if (error) return createErrorResponse(error.message, 500, { req });

  return createJsonResponse({ data }, 200, { req });
}));
```

## 2. Authentication & RLS Boundaries

1. **User-Scoped by Default:** Always use `createUserSupabaseClient(req)` forwarding user JWT.
2. **Admin Client Restricted:** `createAdminSupabaseClient()` (service-role key) bypasses RLS. Use ONLY for authorized background cron jobs, verified webhooks, or documented super-admin / hybrid endpoints (such as `list-organizations-admin`, `check-subscription`, or `create-ticket` per `docs/edge-functions/auth-patterns.md:79-108`).
3. **Public Token Endpoints (`verify_jwt = false`):**
   - Endpoints like `operator-check-in` or `quick-form` must validate assignment tokens via scoped RPCs before executing business logic. Never run arbitrary raw table queries with admin client in unauthenticated request branches.

## 3. Secret Management

Always load secrets via `requireSecret` in `_shared/require-secret.ts`:

```typescript
import { requireSecret, optionalSecret } from "../_shared/require-secret.ts";

const apiKey = requireSecret("GOOGLE_MAPS_BROWSER_KEY", { functionName: "public-google-maps-key" });
```

- Never log secret values.
- Never use raw `Deno.env.get()` for credentials or API keys.

## 4. Deno Testing & Verification

Run tests from the repository root:

```bash
# Type check edge function entrypoints
deno check --config supabase/functions/deno.json supabase/functions/*/index.ts

# Run tests for a specific function
deno test --config supabase/functions/deno.json --allow-env --allow-net supabase/functions/quickbooks-export-invoice/
```
