import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  createErrorResponse,
  createJsonResponse,
  withCorrelationId,
} from "./supabase-clients.ts";
import { MissingSecretError } from "./require-secret.ts";

// =============================================================================
// withCorrelationId
// =============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.test("withCorrelationId mints a UUID when no inbound header is present", async () => {
  const handler = withCorrelationId(async (_req, ctx) => {
    return createJsonResponse({ ok: true, seenId: ctx.correlationId });
  });

  const res = await handler(new Request("https://example.com"));
  const headerId = res.headers.get("X-Correlation-Id");
  assert(headerId, "X-Correlation-Id header must be set");
  assert(UUID_RE.test(headerId!), `expected a UUID, got ${headerId}`);

  const body = await res.json();
  assertEquals(body.seenId, headerId, "ctx.correlationId must match the header value");
});

Deno.test("withCorrelationId reuses inbound X-Correlation-Id when supplied", async () => {
  const handler = withCorrelationId(async (_req, ctx) => {
    return createJsonResponse({ seenId: ctx.correlationId });
  });

  const inbound = "test-inbound-correlation-id";
  const res = await handler(
    new Request("https://example.com", { headers: { "X-Correlation-Id": inbound } }),
  );

  assertEquals(res.headers.get("X-Correlation-Id"), inbound);
  const body = await res.json();
  assertEquals(body.seenId, inbound);
});

Deno.test("withCorrelationId reuses inbound X-Request-Id when X-Correlation-Id is absent", async () => {
  const handler = withCorrelationId(async (_req, ctx) => {
    return createJsonResponse({ seenId: ctx.correlationId });
  });

  const inbound = "upstream-request-id-456";
  const res = await handler(
    new Request("https://example.com", { headers: { "X-Request-Id": inbound } }),
  );

  assertEquals(res.headers.get("X-Correlation-Id"), inbound);
});

Deno.test("withCorrelationId injects correlation_id into JSON error bodies", async () => {
  const handler = withCorrelationId(async () => {
    return createErrorResponse("An internal error occurred", 500);
  });

  const res = await handler(new Request("https://example.com"));
  assertEquals(res.status, 500);

  const headerId = res.headers.get("X-Correlation-Id");
  assert(headerId, "X-Correlation-Id header must be set on error responses");

  const body = await res.json();
  assertEquals(body.error, "An internal error occurred");
  assertEquals(body.correlation_id, headerId, "body.correlation_id must equal the header");
});

Deno.test("withCorrelationId leaves success JSON bodies unchanged (wire-format compat)", async () => {
  const handler = withCorrelationId(async () => {
    return createJsonResponse({ ok: true, value: 42 });
  });

  const res = await handler(new Request("https://example.com"));
  assertEquals(res.status, 200);

  const body = await res.json();
  // Success bodies must NOT carry correlation_id (existing clients depend on
  // the original wire format). The header alone carries the id.
  assertEquals(body, { ok: true, value: 42 });
  assert(res.headers.get("X-Correlation-Id"), "header still set on success");
});

Deno.test("withCorrelationId catches uncaught handler exceptions and returns generic 500 with id", async () => {
  // Suppress the structured UNCAUGHT_HANDLER_ERROR log so test output stays clean.
  const originalError = console.error;
  const captured: unknown[] = [];
  console.error = (...args: unknown[]) => {
    captured.push(args);
  };

  try {
    const handler = withCorrelationId(async () => {
      throw new Error("simulated handler failure");
    });

    const res = await handler(new Request("https://example.com"));
    assertEquals(res.status, 500);

    const headerId = res.headers.get("X-Correlation-Id");
    assert(headerId);

    const body = await res.json();
    // Must use generic message via createErrorResponse + allowlist.
    assertEquals(body.error, "An internal error occurred");
    assertEquals(body.correlation_id, headerId);

    // The wrapper must have logged the UNCAUGHT_HANDLER_ERROR with the id.
    assert(
      captured.some((args) => {
        const a = (args as unknown[])[0];
        if (typeof a !== "string") return false;
        try {
          const parsed = JSON.parse(a);
          return (
            parsed.code === "UNCAUGHT_HANDLER_ERROR" &&
            parsed.correlation_id === headerId
          );
        } catch {
          return false;
        }
      }),
      "wrapper must emit UNCAUGHT_HANDLER_ERROR structured log with correlation_id",
    );
  } finally {
    console.error = originalError;
  }
});

Deno.test("withCorrelationId handles MissingSecretError thrown from the handler", async () => {
  // MissingSecretError emits its own MISSING_REQUIRED_SECRET log on construction;
  // the wrapper-level UNCAUGHT_HANDLER_ERROR also fires. Suppress both.
  const originalError = console.error;
  console.error = () => {};

  try {
    const handler = withCorrelationId(async () => {
      throw new MissingSecretError({
        secretName: "TEST_SECRET",
        functionName: "test-fn",
        legacyAliasesChecked: [],
      });
    });

    const res = await handler(new Request("https://example.com"));
    assertEquals(res.status, 500);

    const body = await res.json();
    // The secret name must NEVER appear in the response body.
    assertEquals(body.error, "An internal error occurred");
    assert(!JSON.stringify(body).includes("TEST_SECRET"),
      "secret name must not leak into the response");
    assert(body.correlation_id, "correlation_id must be present");
  } finally {
    console.error = originalError;
  }
});
