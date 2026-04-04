import { assertEquals } from "jsr:@std/assert@1";
import { __testables, resolveExportFolderPath } from "./google-drive-folder-routing.ts";

const { sanitizeFolderName } = __testables;

Deno.test("sanitizeFolderName strips control characters", () => {
  assertEquals(sanitizeFolderName("Hello\x00World"), "HelloWorld");
});

Deno.test("sanitizeFolderName replaces slashes with dashes", () => {
  assertEquals(sanitizeFolderName("Team/Sub\\Name"), "Team - Sub - Name");
});

Deno.test("sanitizeFolderName trims whitespace", () => {
  assertEquals(sanitizeFolderName("  My Folder  "), "My Folder");
});

Deno.test("sanitizeFolderName returns Unnamed for empty input", () => {
  assertEquals(sanitizeFolderName(""), "Unnamed");
  assertEquals(sanitizeFolderName("   "), "Unnamed");
});

Deno.test("sanitizeFolderName preserves normal readable names", () => {
  assertEquals(sanitizeFolderName("Acme Corp"), "Acme Corp");
  assertEquals(sanitizeFolderName("Excavator CAT-320"), "Excavator CAT-320");
});

Deno.test("resolveExportFolderPath is a function", () => {
  assertEquals(typeof resolveExportFolderPath, "function");
});
