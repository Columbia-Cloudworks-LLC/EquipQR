import { assertEquals } from "jsr:@std/assert@1";
import {
  RESEND_EMAILS_API_URL,
  RESEND_FETCH_TIMEOUT_MS,
  sendResendEmail,
} from "./resend-send-email.ts";

const SAMPLE_INPUT = {
  apiKey: "re_test_key",
  from: "EquipQR <invite@equipqr.app>",
  to: ["invitee@example.com"],
  subject: "Test subject",
  html: "<p>Hello</p>",
};

function withFetchStub(
  stub: typeof fetch,
  fn: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

Deno.test("sendResendEmail returns data.id on 200", async () => {
  await withFetchStub(
    async (input, init) => {
      assertEquals(input, RESEND_EMAILS_API_URL);
      const requestInit = init as RequestInit | undefined;
      assertEquals(requestInit?.method, "POST");
      return new Response(JSON.stringify({ id: "email-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    async () => {
      const result = await sendResendEmail(SAMPLE_INPUT);
      assertEquals(result, {
        data: { id: "email-123" },
        error: null,
      });
    },
  );
});

Deno.test("sendResendEmail returns structured error on 422", async () => {
  await withFetchStub(
    async () =>
      new Response(
        JSON.stringify({
          name: "validation_error",
          message: "Invalid from address",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    async () => {
      const result = await sendResendEmail(SAMPLE_INPUT);
      assertEquals(result.data, null);
      assertEquals(result.error?.name, "validation_error");
      assertEquals(result.error?.message, "Invalid from address");
    },
  );
});

Deno.test("sendResendEmail returns structured error on 401", async () => {
  await withFetchStub(
    async () =>
      new Response(
        JSON.stringify({
          name: "invalid_api_key",
          message: "API key is invalid",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    async () => {
      const result = await sendResendEmail(SAMPLE_INPUT);
      assertEquals(result.data, null);
      assertEquals(result.error?.name, "invalid_api_key");
    },
  );
});

Deno.test("sendResendEmail returns network_error when fetch throws", async () => {
  await withFetchStub(
    () => {
      throw new Error("connection reset");
    },
    async () => {
      const result = await sendResendEmail(SAMPLE_INPUT);
      assertEquals(result.data, null);
      assertEquals(result.error?.name, "network_error");
      assertEquals(result.error?.message, "connection reset");
    },
  );
});

Deno.test("sendResendEmail passes AbortSignal timeout to fetch", async () => {
  await withFetchStub(
    async (_input, init) => {
      const signal = (init as RequestInit | undefined)?.signal;
      assertEquals(signal instanceof AbortSignal, true);
      assertEquals((signal as AbortSignal).reason, undefined);
      return new Response(JSON.stringify({ id: "email-timeout" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    async () => {
      const result = await sendResendEmail(SAMPLE_INPUT);
      assertEquals(result.data?.id, "email-timeout");
    },
  );
});

Deno.test("RESEND_FETCH_TIMEOUT_MS is a positive bounded value", () => {
  assertEquals(RESEND_FETCH_TIMEOUT_MS > 0, true);
  assertEquals(RESEND_FETCH_TIMEOUT_MS <= 60_000, true);
});
