import { assertEquals } from "jsr:@std/assert@1";
import { authorizeServiceRoleRequest } from "./service-role-auth.ts";

const NOW = 1_800_000_000;

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fakeJwt(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  return `${header}.${base64Url(JSON.stringify(payload))}.signature`;
}

function requestWith(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("Authorization", authorization);
  return new Request("https://example.test/functions/v1/queue-worker", { method: "POST", headers });
}

const SERVICE_ROLE_JWT = fakeJwt({ iss: "supabase", role: "service_role", iat: NOW - 100, exp: NOW + 1000 });

Deno.test("accepts exact key match of any format", () => {
  const result = authorizeServiceRoleRequest(requestWith("Bearer sb_secret_abc"), "sb_secret_abc", NOW);
  assertEquals(result, { ok: true, method: "exact-key" });
});

Deno.test("accepts a service_role JWT that differs from the runtime key (vault drift)", () => {
  const result = authorizeServiceRoleRequest(requestWith(`Bearer ${SERVICE_ROLE_JWT}`), "some-other-key", NOW);
  assertEquals(result, { ok: true, method: "service-role-jwt" });
});

Deno.test("accepts lowercase bearer scheme and surrounding whitespace", () => {
  const result = authorizeServiceRoleRequest(requestWith(`  bearer   ${SERVICE_ROLE_JWT}  `), undefined, NOW);
  assertEquals(result.ok, true);
});

Deno.test("accepts a service_role JWT without exp (legacy keys may omit it)", () => {
  const token = fakeJwt({ role: "service_role" });
  assertEquals(authorizeServiceRoleRequest(requestWith(`Bearer ${token}`), "x", NOW).ok, true);
});

Deno.test("rejects anon and authenticated JWTs", () => {
  for (const role of ["anon", "authenticated"]) {
    const token = fakeJwt({ role, sub: "user-id", exp: NOW + 1000 });
    assertEquals(authorizeServiceRoleRequest(requestWith(`Bearer ${token}`), "x", NOW), {
      ok: false,
      reason: "not-service-role",
    });
  }
});

Deno.test("rejects expired service_role JWT", () => {
  const token = fakeJwt({ role: "service_role", exp: NOW });
  assertEquals(authorizeServiceRoleRequest(requestWith(`Bearer ${token}`), "x", NOW), {
    ok: false,
    reason: "expired",
  });
});

Deno.test("rejects missing, malformed, and non-JWT credentials", () => {
  assertEquals(authorizeServiceRoleRequest(requestWith(), "x", NOW), { ok: false, reason: "missing-authorization" });
  assertEquals(authorizeServiceRoleRequest(requestWith(`Basic ${SERVICE_ROLE_JWT}`), "x", NOW), {
    ok: false,
    reason: "invalid-scheme",
  });
  assertEquals(authorizeServiceRoleRequest(requestWith("Bearer"), "x", NOW), { ok: false, reason: "empty-token" });
  assertEquals(authorizeServiceRoleRequest(requestWith("Bearer sb_secret_wrong"), "sb_secret_right", NOW), {
    ok: false,
    reason: "not-a-jwt",
  });
  assertEquals(authorizeServiceRoleRequest(requestWith("Bearer a.!!!.c"), "x", NOW), {
    ok: false,
    reason: "malformed-jwt",
  });
  assertEquals(authorizeServiceRoleRequest(requestWith(`Bearer a.${base64Url("[1]")}.c`), "x", NOW), {
    ok: false,
    reason: "malformed-jwt",
  });
});

Deno.test("does not treat an empty expected key as a match", () => {
  assertEquals(authorizeServiceRoleRequest(requestWith("Bearer "), "", NOW).ok, false);
});

// The JWT path skips signature verification and relies on the gateway, so every
// caller of authorizeServiceRoleRequest MUST be deployed with verify_jwt = true.
Deno.test("every caller of authorizeServiceRoleRequest has verify_jwt = true", async () => {
  const functionsDir = new URL("../", import.meta.url);
  const config = await Deno.readTextFile(new URL("../../config.toml", import.meta.url));

  const callers: string[] = [];
  for await (const entry of Deno.readDir(functionsDir)) {
    if (!entry.isDirectory || entry.name.startsWith("_") || entry.name === "node_modules") continue;
    const indexUrl = new URL(`${entry.name}/index.ts`, functionsDir);
    let source: string;
    try {
      source = await Deno.readTextFile(indexUrl);
    } catch {
      continue;
    }
    if (source.includes("authorizeServiceRoleRequest(")) callers.push(entry.name);
  }

  assertEquals(
    callers.sort(),
    ["queue-worker", "quickbooks-refresh-tokens", "quickbooks-sync-invoice-status"],
  );

  for (const name of callers) {
    const section = config.match(new RegExp(`\\[functions\\.${name}\\]\\s*\\n([^\\[]*)`));
    assertEquals(
      section?.[1]?.match(/^verify_jwt\s*=\s*(true|false)/m)?.[1],
      "true",
      `${name} must keep verify_jwt = true in supabase/config.toml`,
    );
  }
});
