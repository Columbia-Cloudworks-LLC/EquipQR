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

Deno.test("isAllowedOrigin rejects equipqr hostnames outside EquipQR Vercel team", () => {
  assertEquals(isAllowedOrigin("https://equipqr-abc123.vercel.app"), false);
  assertEquals(isAllowedOrigin("https://equipqr-abc123-evil-team.vercel.app"), false);
});

Deno.test("isAllowedOrigin trims VERCEL_TEAM_SLUG override", () => {
  const key = "VERCEL_TEAM_SLUG";
  const prior = Deno.env.get(key);
  try {
    Deno.env.set(key, "  columbia-cloudworks-llc  ");
    assertEquals(
      isAllowedOrigin("https://equipqr-abc123-columbia-cloudworks-llc.vercel.app"),
      true,
    );
  } finally {
    if (prior === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, prior);
    }
  }
});
