import { assertEquals } from "jsr:@std/assert@1";
import { isCaptchaEnforced } from "./hcaptcha-gate.ts";

Deno.test("captcha is skipped when the secret is missing (local E2E)", () => {
  assertEquals(isCaptchaEnforced(null), false);
  assertEquals(isCaptchaEnforced(""), false);
  assertEquals(isCaptchaEnforced("   "), false);
});

Deno.test("captcha is required when a secret exists (preview/prod fail-closed)", () => {
  assertEquals(isCaptchaEnforced("secret-from-env"), true);
});
