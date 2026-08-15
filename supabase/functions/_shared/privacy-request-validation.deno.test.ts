import { assertEquals } from "jsr:@std/assert@1";
import {
  PRIVACY_REQUEST_DETAILS_MAX_LENGTH,
  privacyRequestSizeError,
} from "./privacy-request-validation.ts";

Deno.test("oversized details is rejected before captcha", () => {
  const error = privacyRequestSizeError("Jane Doe", "x".repeat(PRIVACY_REQUEST_DETAILS_MAX_LENGTH + 1));
  assertEquals(typeof error, "string");
  assertEquals(error?.includes("Details"), true);
});

Deno.test("valid name and details pass size checks", () => {
  assertEquals(privacyRequestSizeError("Jane Doe", "Please delete my account."), null);
  assertEquals(privacyRequestSizeError("Jane Doe", undefined), null);
});
