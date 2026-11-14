import { assert, assertEquals } from "jsr:@std/assert@1";
import { z } from "https://esm.sh/zod@4.4.3";
import type { User } from "npm:@supabase/supabase-js@2.45.0";
import { authenticateAndParseJson, rejectNonPostRequest } from "./user-request.ts";

const schema = z.object({ name: z.string() });
const fakeUser = { id: "user-1" } as User;

function post(body: string): Request {
  return new Request("https://example.test/fn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

Deno.test("rejectNonPostRequest rejects GET with 405", async () => {
  const res = rejectNonPostRequest(new Request("https://example.test/fn", { method: "GET" }));
  assert(res);
  assertEquals(res.status, 405);
  await res.body?.cancel();
});

Deno.test("rejectNonPostRequest lets POST through", () => {
  assertEquals(rejectNonPostRequest(post("{}")), null);
});

Deno.test("authenticateAndParseJson returns the auth error response", async () => {
  const res = await authenticateAndParseJson(
    post('{"name":"a"}'),
    () => Promise.resolve({ error: "No authorization header provided", status: 401 }),
    schema,
  );
  assert(res instanceof Response);
  assertEquals(res.status, 401);
  await res.body?.cancel();
});

Deno.test("authenticateAndParseJson returns 400 for invalid JSON after running the authenticated callback", async () => {
  let authenticatedCalls = 0;
  const res = await authenticateAndParseJson(
    post("not json"),
    () => Promise.resolve({ user: fakeUser, token: "t" }),
    schema,
    () => {
      authenticatedCalls += 1;
    },
  );
  assert(res instanceof Response);
  assertEquals(res.status, 400);
  assertEquals(authenticatedCalls, 1);
  await res.body?.cancel();
});

Deno.test("authenticateAndParseJson returns user and parsed data", async () => {
  const res = await authenticateAndParseJson(
    post('{"name":"widget"}'),
    () => Promise.resolve({ user: fakeUser, token: "t" }),
    schema,
  );
  assert(!(res instanceof Response));
  assertEquals(res.user.id, "user-1");
  assertEquals(res.data, { name: "widget" });
});
