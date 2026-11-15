import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { createOAuthCallbackLogStep } from "./oauth-callback-validation.ts";
import { decodeOAuthStateParam, parseOAuthStateTimestamp } from "./oauth-state.ts";

Deno.test("createOAuthCallbackLogStep redacts tokens and nonce", () => {
  const original = console.log;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.join(" "));
  };
  try {
    const logStep = createOAuthCallbackLogStep("TEST-CALLBACK");
    logStep("step", {
      nonce: "n-secret",
      access_token: "a-secret",
      refresh_token: "r-secret",
      keep: "visible",
    });
    logStep("bare");
  } finally {
    console.log = original;
  }
  assertEquals(lines, ['[TEST-CALLBACK] step - {"keep":"visible"}', "[TEST-CALLBACK] bare"]);
});

Deno.test("decodeOAuthStateParam decodes base64 JSON and rejects garbage", () => {
  const encoded = btoa(JSON.stringify({ sessionToken: "s", nonce: "n", timestamp: 1 }));
  assertEquals(decodeOAuthStateParam(encoded), { sessionToken: "s", nonce: "n", timestamp: 1 });
  assertThrows(() => decodeOAuthStateParam("%%%not-base64"), Error, "Invalid state parameter");
  assertThrows(() => decodeOAuthStateParam(btoa("not json")), Error, "Invalid state parameter");
});

Deno.test("parseOAuthStateTimestamp coerces numerics and rejects NaN", () => {
  assertEquals(
    parseOAuthStateTimestamp({ sessionToken: "s", nonce: "n", timestamp: 42 }),
    42,
  );
  assertThrows(
    () => parseOAuthStateTimestamp({ sessionToken: "s", nonce: "n", timestamp: NaN }),
    Error,
    "Invalid timestamp in state parameter",
  );
});
