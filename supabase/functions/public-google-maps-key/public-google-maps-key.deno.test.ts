import { assert, assertEquals } from "jsr:@std/assert@1";
import { __testables } from "./index.ts";

/**
 * Ordering contract test for `public-google-maps-key`.
 *
 * `.github/workflows/edge-functions-smoke-test.yml` is a non-trivial
 * deploy-time check that depends on a specific ordering inside the function:
 * the required secret MUST be loaded BEFORE `requireUser` is called.
 *
 * If the ordering ever flips (secret-after-auth), the smoke test silently
 * stops working — every anon-key call would return 401 regardless of secret
 * state, which the workflow currently treats as "healthy". These tests fail
 * loudly if that contract is violated, so the workflow's claim that "401
 * proves the secret is loaded" stays honest.
 *
 * Two scenarios:
 *   1. No GOOGLE_MAPS_BROWSER_KEY env + no Authorization header → 500
 *      (proves the secret is checked first; otherwise this would 401)
 *   2. With GOOGLE_MAPS_BROWSER_KEY env + no Authorization header → 401
 *      (proves auth runs after the secret is confirmed present)
 *
 * Setup notes:
 *   - We invoke the inner `handle` function directly via `__testables`,
 *     bypassing `Deno.serve`. This is the same pattern used by
 *     `healthcheck/healthcheck.deno.test.ts`.
 *   - We synthesize a minimal `RequestContext` (only `correlationId` is
 *     read by the handler).
 *   - Console output is captured so the structured MISSING_REQUIRED_SECRET
 *     log line emitted by `MissingSecretError` does not pollute the test
 *     runner output.
 */

const FAKE_CORRELATION_ID = "00000000-0000-4000-8000-000000000001";
const PREVIEW_ORIGIN = "https://preview.equipqr.app";
const PRODUCTION_ORIGIN = "https://equipqr.app";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

function buildRequest(options?: {
  origin?: string;
  authorization?: string;
}): Request {
  const headers = new Headers({
    "Content-Type": "application/json",
    Origin: options?.origin ?? PREVIEW_ORIGIN,
  });
  if (options?.authorization) {
    headers.set("Authorization", options.authorization);
  }

  return new Request("https://example.test/functions/v1/public-google-maps-key", {
    method: "POST",
    headers,
    body: "{}",
  });
}

function buildAnonRequest(origin?: string): Request {
  // Anon-style POST with no Authorization header. The smoke test sends a
  // Bearer anon-key, which `requireUser` rejects identically; using "no
  // header" here keeps the test independent of supabase-js mock state.
  return buildRequest({ origin });
}

function assertPreviewCors(response: Response, expectedStatus: number): void {
  assertEquals(response.status, expectedStatus);
  assertEquals(
    response.headers.get("Access-Control-Allow-Origin"),
    PREVIEW_ORIGIN,
    "Preview-origin requests must echo the preview origin instead of falling back to production CORS headers.",
  );
  assert(
    response.headers.get("Access-Control-Allow-Origin") !== PRODUCTION_ORIGIN,
    "Preview-origin requests must not receive the production fallback origin.",
  );
}

function withMockFetch(
  stub: typeof fetch,
  fn: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = stub;
  return fn().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

function silenceConsole(fn: () => Promise<void>): Promise<void> {
  const origError = console.error;
  const origLog = console.log;
  console.error = () => {};
  console.log = () => {};
  return fn().finally(() => {
    console.error = origError;
    console.log = origLog;
  });
}

async function withEnv(
  pairs: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const prior: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(pairs)) {
    prior[k] = Deno.env.get(k) ?? undefined;
    if (v === undefined) {
      Deno.env.delete(k);
    } else {
      Deno.env.set(k, v);
    }
  }
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(prior)) {
      if (v === undefined) {
        Deno.env.delete(k);
      } else {
        Deno.env.set(k, v);
      }
    }
  }
}

Deno.test(
  "ordering: missing GOOGLE_MAPS_BROWSER_KEY returns 500 even with no auth header (secret loads BEFORE requireUser)",
  async () => {
    await withEnv(
      {
        GOOGLE_MAPS_BROWSER_KEY: undefined,
        VITE_GOOGLE_MAPS_BROWSER_KEY: undefined,
      },
      async () => {
        await silenceConsole(async () => {
          const res = await __testables.handle(buildAnonRequest(), {
            correlationId: FAKE_CORRELATION_ID,
          });

          assertPreviewCors(
            res,
            500,
          );
          assertEquals(
            res.status,
            500,
            "Expected 500 because the missing required secret should be detected before requireUser runs. " +
              "If this is 401, the function reordered auth before the secret check and " +
              ".github/workflows/edge-functions-smoke-test.yml is now a no-op.",
          );

          // Confirm the body is the generic message (no secret name leak).
          const body = await res.text();
          assert(
            !body.includes("GOOGLE_MAPS_BROWSER_KEY"),
            "Response body must not leak the secret name. createErrorResponse should force the generic message.",
          );
        });
      },
    );
  },
);

// Tests that exercise the post-secret path (steps 4+) need the platform
// secrets that `createUserSupabaseClient` reads internally. These are fake
// values; supabase-js doesn't make a network request during construction so
// they never need to resolve.
const PLATFORM_FAKES = {
  SUPABASE_URL: "https://fake.supabase.test",
  SUPABASE_ANON_KEY: "fake-anon-key-for-test-only",
} as const;

Deno.test(
  "ordering: with GOOGLE_MAPS_BROWSER_KEY present, no auth header returns 401 (auth runs AFTER the secret check)",
  async () => {
    await withEnv(
      {
        GOOGLE_MAPS_BROWSER_KEY: "test-fake-not-a-real-key",
        VITE_GOOGLE_MAPS_BROWSER_KEY: undefined,
        ...PLATFORM_FAKES,
      },
      async () => {
        await silenceConsole(async () => {
          const res = await __testables.handle(buildAnonRequest(), {
            correlationId: FAKE_CORRELATION_ID,
          });

          assertPreviewCors(
            res,
            401,
          );
          assertEquals(
            res.status,
            401,
            "Expected 401 because the secret loaded successfully and requireUser then rejected the missing Authorization header.",
          );
        });
      },
    );
  },
);

Deno.test(
  "ordering: legacy alias VITE_GOOGLE_MAPS_BROWSER_KEY satisfies the secret check too",
  async () => {
    await withEnv(
      {
        GOOGLE_MAPS_BROWSER_KEY: undefined,
        VITE_GOOGLE_MAPS_BROWSER_KEY: "legacy-fake-not-a-real-key",
        ...PLATFORM_FAKES,
      },
      async () => {
        await silenceConsole(async () => {
          const res = await __testables.handle(buildAnonRequest(), {
            correlationId: FAKE_CORRELATION_ID,
          });

          assertEquals(
            res.status,
            401,
            "Expected 401: the legacy alias should resolve so the secret check passes and requireUser becomes the gate.",
          );
        });
      },
    );
  },
);

Deno.test(
  "cors: preview origin is preserved on 200 JSON responses",
  async () => {
    await withEnv(
      {
        GOOGLE_MAPS_BROWSER_KEY: "test-fake-not-a-real-key",
        GOOGLE_MAPS_MAP_ID: "test-map-id",
        VITE_GOOGLE_MAPS_BROWSER_KEY: undefined,
        ...PLATFORM_FAKES,
      },
      async () => {
        await silenceConsole(async () => {
          await withMockFetch(
            (input: RequestInfo | URL) => {
              const url = typeof input === "string"
                ? input
                : input instanceof URL
                ? input.toString()
                : input.url;
              if (url.includes("/auth/v1/user")) {
                return Promise.resolve(
                  new Response(
                    JSON.stringify({
                      id: "user-123",
                      aud: "authenticated",
                      role: "authenticated",
                      email: "map-tester@example.com",
                    }),
                    { status: 200, headers: JSON_HEADERS },
                  ),
                );
              }

              return Promise.resolve(
                new Response(JSON.stringify({ error: `Unexpected fetch: ${url}` }), {
                  status: 500,
                  headers: JSON_HEADERS,
                }),
              );
            },
            async () => {
              const res = await __testables.handle(
                buildRequest({ authorization: "Bearer valid-test-token" }),
                { correlationId: FAKE_CORRELATION_ID },
              );

              assertPreviewCors(res, 200);
              assertEquals(await res.json(), {
                key: "test-fake-not-a-real-key",
                mapId: "test-map-id",
              });
            },
          );
        });
      },
    );
  },
);
