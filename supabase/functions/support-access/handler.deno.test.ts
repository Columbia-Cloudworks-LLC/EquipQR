import { assertEquals } from "jsr:@std/assert@1";
import type { User } from "npm:@supabase/supabase-js@2.45.0";
import { handleSupportAccess, type HandlerDeps, type SupportAccessBackend } from "./handler.ts";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OPERATOR_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ORG_ID = "11111111-1111-4111-8111-111111111111";

const owner: User = {
  id: OWNER_ID,
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-10-14T00:00:00Z",
};

function post(body: unknown): Request {
  return new Request("https://example.test/functions/v1/support-access", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://equipqr.app", Authorization: "Bearer t" },
    body: JSON.stringify(body),
  });
}

interface Calls {
  grants: Array<Record<string, unknown>>;
  reconciled: string[][];
  emails: Array<{ to: string[]; subject: string; html: string }>;
}

function setup(opts: { isOwner?: boolean; operatorIds?: string[]; grantError?: { code?: string; message: string } } = {}) {
  const calls: Calls = { grants: [], reconciled: [], emails: [] };
  const backend: SupportAccessBackend = {
    isActiveOwner: () => Promise.resolve(opts.isOwner ?? true),
    reconcileOperators: (operatorIds) => {
      calls.reconciled.push(operatorIds);
      return Promise.resolve();
    },
    grant: (args) => {
      calls.grants.push(args);
      return Promise.resolve(
        opts.grantError
          ? { data: null, error: opts.grantError }
          : { data: { grant_id: "g1", expires_at: "2026-10-17T00:00:00Z", extended: false }, error: null },
      );
    },
    organizationName: () => Promise.resolve("Acme <Heavy>"),
    operatorEmails: () => Promise.resolve(["ops@equipqr.test"]),
    sendEmail: (to, subject, html) => {
      calls.emails.push({ to, subject, html });
      return Promise.resolve(true);
    },
  };
  const deps: HandlerDeps = {
    authenticate: () => Promise.resolve({ user: owner, token: "t" }),
    backend: () => backend,
    operatorIds: () => opts.operatorIds ?? [OPERATOR_ID],
  };
  return { deps, calls };
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

Deno.test("non-owners cannot grant support access", () =>
  quiet(async () => {
    const { deps, calls } = setup({ isOwner: false });
    const res = await handleSupportAccess(post({ organizationId: ORG_ID }), "c", deps);
    assertEquals(res.status, 403);
    assertEquals(calls.grants.length, 0);
  }));

Deno.test("an empty operator allowlist reconciles live support memberships and grants nothing", () =>
  quiet(async () => {
    const { deps, calls } = setup({ operatorIds: [] });
    const res = await handleSupportAccess(post({ organizationId: ORG_ID }), "c", deps);
    assertEquals(res.status, 503);
    assertEquals((await res.json()).error, "SUPPORT_UNAVAILABLE");
    assertEquals(calls.grants.length, 0);
    assertEquals(calls.reconciled, [[]]);
  }));

Deno.test("defaults to 72 hours and passes the caller as the granter", () =>
  quiet(async () => {
    const { deps, calls } = setup();
    const res = await handleSupportAccess(post({ organizationId: ORG_ID }), "c", deps);
    assertEquals(res.status, 200);
    assertEquals(calls.grants[0], {
      organizationId: ORG_ID,
      grantedBy: OWNER_ID,
      operatorIds: [OPERATOR_ID],
      durationHours: 72,
      source: "settings",
      ticketRef: null,
    });
  }));

Deno.test("only 24, 72, or 168 hours are accepted", () =>
  quiet(async () => {
    const { deps, calls } = setup();
    const res = await handleSupportAccess(post({ organizationId: ORG_ID, durationHours: 720 }), "c", deps);
    assertEquals(res.status, 400);
    assertEquals(calls.grants.length, 0);
  }));

Deno.test("operators are emailed with escaped organization names", () =>
  quiet(async () => {
    const { deps, calls } = setup();
    const res = await handleSupportAccess(
      post({ organizationId: ORG_ID, durationHours: 24, source: "bug_report", ticketRef: "#42" }),
      "c",
      deps,
    );
    assertEquals(res.status, 200);
    assertEquals((await res.json()).operatorsNotified, true);
    assertEquals(calls.emails[0].to, ["ops@equipqr.test"]);
    assertEquals(calls.emails[0].html.includes("Acme &lt;Heavy&gt;"), true);
    assertEquals(calls.emails[0].html.includes("<Heavy>"), false);
  }));

Deno.test("a database ownership refusal is reported as 403", () =>
  quiet(async () => {
    const { deps } = setup({ grantError: { code: "42501", message: "Only the organization owner can grant support access" } });
    const res = await handleSupportAccess(post({ organizationId: ORG_ID }), "c", deps);
    assertEquals(res.status, 403);
  }));

Deno.test("a conflicting operator membership is reported as 409", () =>
  quiet(async () => {
    const { deps } = setup({
      grantError: {
        code: "22023",
        message: "Support operator already has an active non-admin membership in this organization",
      },
    });
    const res = await handleSupportAccess(post({ organizationId: ORG_ID }), "c", deps);
    assertEquals(res.status, 409);
  }));
