import { assert, assertEquals, assertInstanceOf } from "jsr:@std/assert@1";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { finishExportRequestLog } from "./export-request-log.ts";
import { exportRateLimitWindowStarts } from "./export-rate-limit-window.ts";
import {
  exportTokenErrorResponse,
  getGoogleAccessTokenOrError,
} from "./google-workspace-token-response.ts";
import { GoogleWorkspaceTokenError } from "./google-workspace-token.ts";

function clientWithFetch(fetchStub: (request: Request) => Promise<Response>) {
  return createClient("http://localhost:54321", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetchStub(new Request(input, init)),
    },
  });
}

Deno.test("exportRateLimitWindowStarts returns one-minute and one-hour windows", () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  const { oneMinuteAgo, oneHourAgo } = exportRateLimitWindowStarts(now);
  assertEquals(oneMinuteAgo, "2026-01-01T11:59:00.000Z");
  assertEquals(oneHourAgo, "2026-01-01T11:00:00.000Z");
});

Deno.test("finishExportRequestLog writes row_count only for completed exports", async () => {
  const patches: Array<{ url: string; body: Record<string, unknown> }> = [];
  const client = clientWithFetch(async (request) => {
    patches.push({ url: request.url, body: await request.json() });
    return new Response(null, { status: 204 });
  });

  assertEquals(await finishExportRequestLog(client, "log-1", { status: "completed", rowCount: 7 }), null);
  assertEquals(await finishExportRequestLog(client, "log-2", { status: "failed" }), null);

  assert(patches[0].url.includes("export_request_log"));
  assert(patches[0].url.includes("id=eq.log-1"));
  assertEquals(patches[0].body.status, "completed");
  assertEquals(patches[0].body.row_count, 7);
  assert(typeof patches[0].body.completed_at === "string");

  assert(patches[1].url.includes("id=eq.log-2"));
  assertEquals(patches[1].body.status, "failed");
  assertEquals("row_count" in patches[1].body, false);
});

Deno.test("getGoogleAccessTokenOrError returns the typed token error instead of throwing", async () => {
  const client = clientWithFetch(() =>
    Promise.resolve(
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
    )
  );

  const result = await getGoogleAccessTokenOrError(client, "org-1");
  assertInstanceOf(result, GoogleWorkspaceTokenError);
  assertEquals(result.code, "not_connected");
});

Deno.test("exportTokenErrorResponse maps not_connected to 400 and other codes to 403", async () => {
  const headers = { "Access-Control-Allow-Origin": "https://example.test" };

  const notConnected = exportTokenErrorResponse(
    headers,
    new GoogleWorkspaceTokenError("not connected", "not_connected"),
  );
  assertEquals(notConnected.status, 400);
  assertEquals(await notConnected.json(), { error: "not connected", code: "not_connected" });
  assertEquals(notConnected.headers.get("Content-Type"), "application/json");
  assertEquals(notConnected.headers.get("Access-Control-Allow-Origin"), "https://example.test");

  const revoked = exportTokenErrorResponse(
    headers,
    new GoogleWorkspaceTokenError("revoked", "token_revoked"),
  );
  assertEquals(revoked.status, 403);
});
