import { assertEquals } from "jsr:@std/assert@1";
import { resolvePublicSiteUrl } from "./public-site-url.ts";

Deno.test("resolvePublicSiteUrl prefers PUBLIC_SITE_URL over PRODUCTION_URL", () => {
  const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
  const prevProduction = Deno.env.get("PRODUCTION_URL");
  try {
    Deno.env.set("PUBLIC_SITE_URL", "https://preview.equipqr.app");
    Deno.env.set("PRODUCTION_URL", "https://equipqr.app");
    assertEquals(resolvePublicSiteUrl(), "https://preview.equipqr.app");
  } finally {
    if (prevPublic === undefined) {
      Deno.env.delete("PUBLIC_SITE_URL");
    } else {
      Deno.env.set("PUBLIC_SITE_URL", prevPublic);
    }
    if (prevProduction === undefined) {
      Deno.env.delete("PRODUCTION_URL");
    } else {
      Deno.env.set("PRODUCTION_URL", prevProduction);
    }
  }
});

Deno.test("resolvePublicSiteUrl falls back to PRODUCTION_URL then default", () => {
  const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
  const prevProduction = Deno.env.get("PRODUCTION_URL");
  try {
    Deno.env.delete("PUBLIC_SITE_URL");
    Deno.env.set("PRODUCTION_URL", "https://preview.equipqr.app");
    assertEquals(resolvePublicSiteUrl(), "https://preview.equipqr.app");

    Deno.env.delete("PRODUCTION_URL");
    assertEquals(resolvePublicSiteUrl(), "https://equipqr.app");
  } finally {
    if (prevPublic === undefined) {
      Deno.env.delete("PUBLIC_SITE_URL");
    } else {
      Deno.env.set("PUBLIC_SITE_URL", prevPublic);
    }
    if (prevProduction === undefined) {
      Deno.env.delete("PRODUCTION_URL");
    } else {
      Deno.env.set("PRODUCTION_URL", prevProduction);
    }
  }
});
