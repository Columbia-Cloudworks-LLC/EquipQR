import { assertEquals } from "jsr:@std/assert@1";
import { getFallbackCorsHeaders } from "./cors.ts";

Deno.test("fallback CORS headers do not use a wildcard origin", () => {
  assertEquals(getFallbackCorsHeaders()["Access-Control-Allow-Origin"] === "*", false);
});
