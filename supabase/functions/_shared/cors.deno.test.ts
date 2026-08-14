import { assertEquals } from "jsr:@std/assert@1";
import { corsHeaders, getFallbackCorsHeaders } from "./cors.ts";

Deno.test("static CORS headers do not use a wildcard origin", () => {
  assertEquals(corsHeaders["Access-Control-Allow-Origin"] === "*", false);
  assertEquals(getFallbackCorsHeaders()["Access-Control-Allow-Origin"] === "*", false);
});
