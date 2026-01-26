---
applyTo: "supabase/functions/**/*.ts"
---

# Supabase Edge Functions (Deno) Standards

## Purpose

Standards for Deno-based Edge Functions in the EquipQR Supabase project.
Edge Functions run on Deno Deploy with TypeScript support.

## What CI Does NOT Check

Edge Functions are excluded from ESLint (`supabase/functions` in ignores).
All checks below require manual review.

---

## HIGH PRIORITY: Authentication

**CRITICAL: Validate authentication at the start of every function.**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  // 1. Validate JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');

  // 2. Create client and verify user
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Now proceed with authenticated logic
});
```

---

## HIGH PRIORITY: Service Role Usage

**AVOID `service_role` key unless absolutely necessary.**

When required, document the justification:

```typescript
// ONLY use service_role for:
// - Admin operations that legitimately bypass RLS
// - System-level tasks (cron jobs, webhooks)
// - Data migrations

// DOCUMENT WHY:
// This function handles Stripe webhooks which don't have user context
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

---

## HIGH PRIORITY: RBAC Permission Checks

Validate user permissions before sensitive operations:

```typescript
async function checkUserPermission(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  requiredRole: string[]
): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();

  return data && requiredRole.includes(data.role);
}

// Usage
const canDelete = await checkUserPermission(supabase, user.id, orgId, ['owner', 'admin']);
if (!canDelete) {
  return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## HIGH PRIORITY: Multi-Tenancy

Always scope operations to the user's organization:

```typescript
// VIOLATION: No org scoping
const { data } = await supabase.from('equipment').select('*');

// CORRECT: Org-scoped query
const { data } = await supabase
  .from('equipment')
  .select('id, name, status')
  .eq('organization_id', orgId);
```

---

## MEDIUM PRIORITY: Input Validation

Validate all request inputs before processing:

```typescript
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const CreateEquipmentSchema = z.object({
  name: z.string().min(1).max(255),
  organization_id: z.string().uuid(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

Deno.serve(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = CreateEquipmentSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(validation.error.message, 400);
  }

  const { name, organization_id, status } = validation.data;
});
```

---

## MEDIUM PRIORITY: Error Handling

Return consistent JSON error responses:

```typescript
function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

function successResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

## MEDIUM PRIORITY: CORS Handling

Handle CORS for browser requests:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

---

## LOW PRIORITY: Environment Variables

Never log secrets:

```typescript
// VIOLATION
console.log('Key:', SUPABASE_SERVICE_ROLE_KEY);

// CORRECT
console.log('Supabase URL configured:', !!SUPABASE_URL);
```

---

## LOW PRIORITY: Structured Logging

```typescript
console.log(JSON.stringify({
  level: 'info',
  function: 'create-equipment',
  user_id: user.id,
  org_id: orgId,
  action: 'equipment_created',
}));
```
