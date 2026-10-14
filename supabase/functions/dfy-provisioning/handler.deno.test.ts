import { assertEquals } from "jsr:@std/assert@1";
import type { User } from "npm:@supabase/supabase-js@2.45.0";
import { handleDfyProvisioning, type HandlerDeps, type ProvisioningBackend } from "./handler.ts";

const OPERATOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";

function user(id: string, confirmed = true): User {
  return {
    id,
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-10-14T00:00:00Z",
    email_confirmed_at: confirmed ? "2026-10-14T00:00:00Z" : undefined,
  };
}

function post(body: unknown): Request {
  return new Request("https://example.test/functions/v1/dfy-provisioning", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://equipqr.app", Authorization: "Bearer t" },
    body: JSON.stringify(body),
  });
}

interface Recorder {
  backendCreated: number;
  rpcCalls: Array<{ fn: string; args?: Record<string, unknown> }>;
}

function deps(caller: User | null, operatorIds: string[], rpcResult: { data: unknown; error: { code?: string; message: string; details?: string | null } | null } = { data: [], error: null }) {
  const rec: Recorder = { backendCreated: 0, rpcCalls: [] };
  const backend: ProvisioningBackend = {
    rpc: (fn, args) => {
      rec.rpcCalls.push({ fn, args });
      return Promise.resolve(rpcResult);
    },
    firstTeamId: () => Promise.resolve({ id: "team-1", error: null }),
    invite: () => Promise.resolve(true),
  };
  const d: HandlerDeps = {
    authenticate: () =>
      Promise.resolve(caller ? { user: caller, token: "t" } : { error: "Authentication failed", status: 401 }),
    createBackend: () => {
      rec.backendCreated += 1;
      return backend;
    },
    isOperator: (u) => (operatorIds.length > 0 && Boolean(u.email_confirmed_at) && operatorIds.includes(u.id)),
  };
  return { d, rec };
}

function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const log = console.log;
  const error = console.error;
  console.log = () => {};
  console.error = () => {};
  return fn().finally(() => {
    console.log = log;
    console.error = error;
  });
}

Deno.test("unauthenticated callers get 401 and no service-role client", () =>
  quiet(async () => {
    const { d, rec } = deps(null, [OPERATOR_ID]);
    const res = await handleDfyProvisioning(post({ action: "list" }), "c", d);
    assertEquals(res.status, 401);
    assertEquals(rec.backendCreated, 0);
  }));

Deno.test("whoami reports false for non-operators without touching the service role", () =>
  quiet(async () => {
    const { d, rec } = deps(user("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), [OPERATOR_ID]);
    const res = await handleDfyProvisioning(post({ action: "whoami" }), "c", d);
    assertEquals(res.status, 200);
    assertEquals(await res.json(), { isOperator: false });
    assertEquals(rec.backendCreated, 0);
  }));

Deno.test("non-operators are refused before the service-role client exists", () =>
  quiet(async () => {
    const { d, rec } = deps(user("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), [OPERATOR_ID]);
    const res = await handleDfyProvisioning(post({ action: "list" }), "c", d);
    assertEquals(res.status, 403);
    assertEquals(rec.backendCreated, 0);
  }));

Deno.test("an empty allowlist refuses even the operator's own account", () =>
  quiet(async () => {
    const { d, rec } = deps(user(OPERATOR_ID), []);
    const res = await handleDfyProvisioning(post({ action: "list" }), "c", d);
    assertEquals(res.status, 403);
    assertEquals(rec.backendCreated, 0);
  }));

Deno.test("an operator with an unconfirmed email is refused", () =>
  quiet(async () => {
    const { d, rec } = deps(user(OPERATOR_ID, false), [OPERATOR_ID]);
    const res = await handleDfyProvisioning(post({ action: "list" }), "c", d);
    assertEquals(res.status, 403);
    assertEquals(rec.backendCreated, 0);
  }));

Deno.test("create passes the authenticated operator id and request id to provision_organization", () =>
  quiet(async () => {
    const { d, rec } = deps(user(OPERATOR_ID), [OPERATOR_ID], {
      data: { organization_id: ORG_ID, created: true },
      error: null,
    });
    const res = await handleDfyProvisioning(
      post({
        action: "create",
        requestId: REQUEST_ID,
        name: "Acme Heavy Repair",
        staff: [{ email: "Owner@Acme.test", role: "owner" }],
        equipment: [{ name: "Excavator 7", serialNumber: "SN1" }],
      }),
      "c",
      d,
    );
    assertEquals(res.status, 200);
    assertEquals(rec.rpcCalls.length, 1);
    assertEquals(rec.rpcCalls[0].fn, "provision_organization");
    assertEquals(rec.rpcCalls[0].args?.p_operator_id, OPERATOR_ID);
    assertEquals(rec.rpcCalls[0].args?.p_request_id, REQUEST_ID);
    assertEquals(rec.rpcCalls[0].args?.p_staff, [{ email: "owner@acme.test", role: "owner", team_role: null }]);
  }));

Deno.test("a claimed organization is reported as ORG_NOT_EDITABLE", () =>
  quiet(async () => {
    const { d } = deps(user(OPERATOR_ID), [OPERATOR_ID], {
      data: null,
      error: { code: "42501", message: "ORG_NOT_EDITABLE" },
    });
    const res = await handleDfyProvisioning(
      post({ action: "delete_equipment", organizationId: ORG_ID, equipmentId: REQUEST_ID }),
      "c",
      d,
    );
    assertEquals(res.status, 409);
    assertEquals((await res.json()).error, "ORG_NOT_EDITABLE");
  }));

Deno.test("invalid bodies are rejected with 400", () =>
  quiet(async () => {
    const { d } = deps(user(OPERATOR_ID), [OPERATOR_ID]);
    const res = await handleDfyProvisioning(post({ action: "create", requestId: "nope" }), "c", d);
    assertEquals(res.status, 400);
  }));
