import { assertEquals } from "jsr:@std/assert@1";
import { isCaptchaEnforced, verifyHcaptchaToken } from "./hcaptcha-gate.ts";

Deno.test("captcha is skipped when the secret is missing (local E2E)", () => {
  assertEquals(isCaptchaEnforced(null), false);
  assertEquals(isCaptchaEnforced(""), false);
  assertEquals(isCaptchaEnforced("   "), false);
});

Deno.test("captcha is required when a secret exists (preview/prod fail-closed)", () => {
  assertEquals(isCaptchaEnforced("secret-from-env"), true);
});

async function withStubbedFetch(
  stub: (input: Request | URL | string, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = stub as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

Deno.test("verifyHcaptchaToken posts secret and response and returns success", async () => {
  let sent: FormData | undefined;
  await withStubbedFetch(
    (_input, init) => {
      sent = init?.body as FormData;
      return Promise.resolve(new Response(JSON.stringify({ success: true })));
    },
    async () => {
      assertEquals(await verifyHcaptchaToken("s", "t", "TEST"), true);
    },
  );
  assertEquals(sent?.get("secret"), "s");
  assertEquals(sent?.get("response"), "t");
});

Deno.test("verifyHcaptchaToken returns false on rejection and on fetch failure", async () => {
  await withStubbedFetch(
    () => Promise.resolve(new Response(JSON.stringify({ success: false }))),
    async () => {
      assertEquals(await verifyHcaptchaToken("s", "t", "TEST"), false);
    },
  );
  const originalError = console.error;
  console.error = () => {};
  try {
    await withStubbedFetch(
      () => Promise.reject(new Error("offline")),
      async () => {
        assertEquals(await verifyHcaptchaToken("s", "t", "TEST"), false);
      },
    );
  } finally {
    console.error = originalError;
  }
});
