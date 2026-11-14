import { assertEquals } from "jsr:@std/assert@1";
import { MissingSecretError } from "./require-secret.ts";
import {
  createInternalErrorResponse,
  logUnexpectedHandlerError,
} from "./quickbooks-error-handling.ts";

type Logged = { step: string; details?: Record<string, unknown> };

function makeLogger() {
  const calls: Logged[] = [];
  return {
    calls,
    logStep: (step: string, details?: Record<string, unknown>) => {
      calls.push({ step, details });
    },
  };
}

function makeMissingSecretError(): MissingSecretError {
  return new MissingSecretError({
    secretName: "QB_ERROR_HANDLING_TEST_SECRET",
    functionName: "test-fn",
    legacyAliasesChecked: [],
  });
}

Deno.test("logUnexpectedHandlerError logs message and correlation id", () => {
  const { calls, logStep } = makeLogger();
  const message = logUnexpectedHandlerError(new Error("boom"), logStep, "corr-1");
  assertEquals(message, "boom");
  assertEquals(calls, [{ step: "ERROR", details: { message: "boom", correlation_id: "corr-1" } }]);
});

Deno.test("logUnexpectedHandlerError stringifies non-Error values", () => {
  const { calls, logStep } = makeLogger();
  assertEquals(logUnexpectedHandlerError("plain", logStep, "c"), "plain");
  assertEquals(calls.length, 1);
});

Deno.test("logUnexpectedHandlerError skips MissingSecretError", () => {
  const { calls, logStep } = makeLogger();
  logUnexpectedHandlerError(makeMissingSecretError(), logStep, "c");
  assertEquals(calls.length, 0);
});

Deno.test("createInternalErrorResponse masks unexpected errors as generic 500", async () => {
  const { calls, logStep } = makeLogger();
  const req = new Request("https://example.test/fn", { method: "POST" });
  const res = createInternalErrorResponse(new Error("secret detail"), req, logStep, "corr");
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(JSON.stringify(body).includes("secret detail"), false);
  assertEquals(calls.length, 1);
});

Deno.test("createInternalErrorResponse returns 500 without logging for MissingSecretError", () => {
  const { calls, logStep } = makeLogger();
  const req = new Request("https://example.test/fn", { method: "POST" });
  const res = createInternalErrorResponse(makeMissingSecretError(), req, logStep, "corr");
  assertEquals(res.status, 500);
  assertEquals(calls.length, 0);
});
