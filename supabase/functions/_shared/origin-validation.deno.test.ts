import { assertEquals } from "jsr:@std/assert@1";
import { isAllowedOrigin } from "./origin-validation.ts";

Deno.test("isAllowedOrigin accepts equipqr Vercel preview hostnames", () => {
  assertEquals(
    isAllowedOrigin("https://equipqr-abc123-columbia-cloudworks-llc.vercel.app"),
    true,
  );
});

Deno.test("isAllowedOrigin accepts legacy equip-qr Vercel preview hostnames", () => {
  assertEquals(
    isAllowedOrigin("https://equip-qr-abc123-columbia-cloudworks-llc.vercel.app"),
    true,
  );
});

Deno.test("isAllowedOrigin rejects unrelated Vercel preview hostnames", () => {
  assertEquals(isAllowedOrigin("https://evil-project-abc123.vercel.app"), false);
});
