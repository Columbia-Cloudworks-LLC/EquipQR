# EquipQR Best Practices (for Qodo Merge)

> Read by `qodo-code-review[bot]` on every PR. Findings tagged
> `Columbia Cloudworks best practice`. Pattern-based per
> https://docs.qodo.ai/code-review/qodo-merge/features/best-practices.
>
> Scope: domain-specific patterns CI cannot detect. CI already covers
> ESLint, `tsc --noEmit`, CodeQL, `npm-audit-ci`, bundle-size limits,
> and Vitest coverage — do not duplicate those here.

## Multi-tenant organization scoping

Every Supabase query that touches a tenant table must filter by
`organization_id` (or the equivalent column for that table — see
`src/integrations/supabase/types.ts`). The org id must come from the
current user's `useOrganization()` context, never a hardcoded UUID,
URL param, or untrusted input. Mutations must include
`organization_id` in the insert/update payload. RLS is the last line
of defense, not the first — code that "trusts RLS" without a client
filter is a violation because it leaks across tenants on any RLS
regression.

Example code before:

```ts
const { data } = await supabase
  .from('equipment')
  .select('*');
```

Example code after:

```ts
const { organizationId } = useOrganization();
const { data } = await supabase
  .from('equipment')
  .select('id, name, status, team_id')
  .eq('organization_id', organizationId);
```

## Service layer pattern (no Supabase in components)

Components in `src/components/` and `src/pages/` must not import the
Supabase client directly. Data access flows
`component → hook (TanStack Query) → service → supabase`. Services
live under `src/services/` or `src/features/<feature>/services/` and
accept `organizationId` as a required parameter. This boundary makes
multi-tenant scoping enforceable in one place and keeps query keys,
caching, and error handling consistent.

Example code before:

```tsx
function EquipmentList() {
  const { data } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => supabase.from('equipment').select('*'),
  });
  return <List items={data ?? []} />;
}
```

Example code after:

```tsx
function EquipmentList() {
  const { organizationId } = useOrganization();
  const { data } = useEquipmentList(organizationId);
  return <List items={data ?? []} />;
}
```

## RBAC permission gating before sensitive UI / actions

Destructive or admin-only UI (Edit, Delete, Approve, Invite, role
changes, etc.) must be gated by `usePermissions()` (or the equivalent
RBAC helper) — not by hiding the trigger via CSS, not by relying on
the server to reject the call. Mutations that perform sensitive
actions must also re-check the permission inside the handler before
calling the service. Edge Functions then validate the same role at
their entrypoint as a defense-in-depth third layer.

Example code before:

```tsx
<Button onClick={handleDelete} variant="destructive">
  Delete equipment
</Button>
```

Example code after:

```tsx
const { canDelete } = usePermissions();
{canDelete && (
  <Button onClick={handleDelete} variant="destructive">
    Delete equipment
  </Button>
)}
```

## Edge Function: validate auth at entrypoint

Every function under `supabase/functions/` must validate the caller's
identity (and role, when sensitive) as the first non-CORS step —
before any DB read, external API call, or secret-bearing work. Use
the shared helpers in `supabase/functions/_shared/`
(`handleCorsPreflightIfNeeded`, `requireSecret`,
`createUserSupabaseClient`, `requireUser`, `createJsonResponse` /
`createErrorResponse`, and `withCorrelationId`). Canonical reference:
`supabase/functions/geocode-location/index.ts` — copy from there.

Example code before:

```ts
Deno.serve(async (req) => {
  const body = await req.json();
  const result = await someExternalApi(body);
  return new Response(JSON.stringify(result));
});
```

Example code after:

```ts
import {
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from '../_shared/supabase-clients.ts';
import { MissingSecretError, requireSecret } from '../_shared/require-secret.ts';

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const apiKey = requireSecret('SOME_API_KEY', { functionName: 'my-function' });
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ('error' in auth) return createErrorResponse(auth.error, auth.status);

    const body = await req.json();
    const result = await someExternalApi(body, apiKey);
    return createJsonResponse(result);
  } catch (error) {
    if (error instanceof MissingSecretError) return createErrorResponse(error, 500);
    return createErrorResponse('An unexpected error occurred', 500);
  }
}));
```

## No `service_role` key outside approved Edge Functions

The Supabase service-role key bypasses RLS and is a tenant-isolation
break if it ever runs in client code or in an Edge Function that
hasn't been explicitly authorized to use it. Never construct an admin
client (`createClient(url, SERVICE_ROLE_KEY)`) anywhere under `src/`,
and never reference `SUPABASE_SERVICE_ROLE_KEY` from client code.
Inside `supabase/functions/`, the service role is acceptable only
when the function's purpose explicitly requires bypassing RLS (admin
tooling, system maintenance, cross-tenant aggregation) and the
function still validates the caller's identity and role at the
entrypoint.

Example code before:

```ts
import { createClient } from '@supabase/supabase-js';
const admin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
);
```

Example code after:

```ts
import { supabase } from '@/integrations/supabase/client';
// All client work goes through the anon-key client; RLS plus
// org-scoped service queries enforce isolation. Admin actions
// belong in an Edge Function under supabase/functions/.
```

---

For the longer-form versions of these patterns and the rest of the
EquipQR review checklist (accessibility, error handling, query
optimization, design context), see:

- [.github/copilot-instructions.md](.github/copilot-instructions.md) — full domain reviewer guide
- [.github/instructions/code-review.instructions.md](.github/instructions/code-review.instructions.md) — prioritized reviewer checklist
- [docs/guides/permissions.md](docs/guides/permissions.md) — RBAC matrix
