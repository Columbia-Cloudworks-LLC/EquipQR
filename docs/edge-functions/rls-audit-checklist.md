# Edge Function RLS Audit Checklist

Use this checklist to verify that Edge Functions properly enforce RLS and don't expose cross-organization data.

## Pre-Deployment Checklist

### 1. Code Review

For each Edge Function, verify:

- [ ] Uses `createUserSupabaseClient(req)` for user-facing operations
- [ ] Uses `requireUser(req, supabase)` to validate authentication
- [ ] If using `createAdminSupabaseClient()`, it's documented in `docs/edge-functions/auth-patterns.md`
- [ ] All `.from()` queries include `.eq('organization_id', ...)` as defense-in-depth
- [ ] No hardcoded organization IDs
- [ ] Error messages don't leak sensitive information

### 2. Config Review

Check `supabase/config.toml`:

- [ ] All user-facing functions have `verify_jwt = true`
- [ ] Only webhooks/public endpoints have `verify_jwt = false`
- [ ] New functions are added with explicit JWT config

### 3. Shared Utilities Check

Verify `supabase/functions/_shared/supabase-clients.ts`:

- [ ] `createUserSupabaseClient` uses `SUPABASE_ANON_KEY`, not service role
- [ ] Authorization header is properly forwarded
- [ ] `createAdminSupabaseClient` is clearly documented as admin-only

## Manual Testing Checklist

### Test 1: Unauthenticated Access Denied

For each function with `verify_jwt = true`:

```bash
# Should return 401 Unauthorized
curl -X POST https://<project>.supabase.co/functions/v1/<function-name> \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `401 Unauthorized` or `No authorization header`

### Test 2: Cross-Org Access Denied

Using a valid user JWT, try to access another organization's data:

```bash
# Get a JWT for user in Org A
TOKEN="<user-a-jwt>"

# Try to access Org B's data
curl -X POST https://<project>.supabase.co/functions/v1/geocode-location \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "<org-b-id>", "input": "123 Main St"}'
```

Expected: `403 Forbidden` or empty results (RLS blocks access)

### Test 3: Valid Access Works

Using a valid user JWT, access their own organization's data:

```bash
TOKEN="<user-a-jwt>"

curl -X POST https://<project>.supabase.co/functions/v1/geocode-location \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "<org-a-id>", "input": "123 Main St"}'
```

Expected: Success (200 OK with geocode data)

### Test 4: Webhook Signature Validation

For Stripe webhooks, verify signature validation:

```bash
# Invalid signature should fail
curl -X POST https://<project>.supabase.co/functions/v1/stripe-license-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{"type": "test"}'
```

Expected: `400 Bad Request` or signature validation error

## Automated Tests

### Test File Location

Edge Function tests should be placed in:
- `supabase/functions/<function-name>/*.deno.test.ts`

### Example Test Structure

```typescript
// supabase/functions/geocode-location/geocode.deno.test.ts
import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";

Deno.test("geocode-location: rejects unauthenticated requests", async () => {
  const response = await fetch(
    "http://localhost:54321/functions/v1/geocode-location",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: "test", input: "123 Main" }),
    }
  );
  assertEquals(response.status, 401);
});

Deno.test("geocode-location: rejects cross-org access", async () => {
  // Get a token for User A in Org A
  const userAToken = await getTestToken("user-a@test.com");
  const orgBId = "org-b-id";

  const response = await fetch(
    "http://localhost:54321/functions/v1/geocode-location",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userAToken}`,
      },
      body: JSON.stringify({ organizationId: orgBId, input: "123 Main" }),
    }
  );
  assertEquals(response.status, 403);
});
```

### Running Tests

```bash
# Start local Supabase
npx supabase start

# Run function tests
npx supabase functions test geocode-location
```

## Periodic Audit Schedule

Perform this audit:

- **Before major releases** - Full checklist
- **Monthly** - Spot-check 2-3 functions
- **When adding new functions** - Full checklist for new function + integration tests

## Common Vulnerabilities to Check

1. **Service role in user-facing code** - Should use anon key + forwarded JWT
2. **Missing org membership check** - Even with RLS, add explicit checks
3. **Trusting request body org ID** - Always verify user is member of that org
4. **Logging sensitive data** - Don't log JWTs, passwords, or full error stacks
5. **Hardcoded IDs** - Use environment variables or DB lookups
6. **Missing rate limiting** - Especially on export/bulk operations

## Grep Commands for Quick Audit

```bash
# Find all service role key usage
rg "SUPABASE_SERVICE_ROLE_KEY" supabase/functions/

# Find functions NOT using shared auth helpers
rg -L "createUserSupabaseClient|createAdminSupabaseClient" supabase/functions/*/index.ts

# Find potential hardcoded org IDs (UUIDs)
rg "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}" supabase/functions/
```
