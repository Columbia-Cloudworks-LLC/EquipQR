import { assertEquals } from "jsr:@std/assert@1";
import { createGoogleDocInFolder, batchUpdateGoogleDoc } from "./google-docs-api.ts";

Deno.test("createGoogleDocInFolder is a function", () => {
  assertEquals(typeof createGoogleDocInFolder, "function");
});

Deno.test("batchUpdateGoogleDoc is a function", () => {
  assertEquals(typeof batchUpdateGoogleDoc, "function");
});
