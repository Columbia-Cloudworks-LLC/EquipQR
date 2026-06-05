import { assertEquals } from "jsr:@std/assert@1";
import { escapeCSVValue } from "./csv-export.ts";

Deno.test("escapeCSVValue neutralizes spreadsheet formula prefixes", () => {
  assertEquals(escapeCSVValue("=1+1"), "'=1+1");
  assertEquals(escapeCSVValue("+cmd|'/c calc'!A0"), "'+cmd|'/c calc'!A0");
  assertEquals(escapeCSVValue("-2+3"), "'-2+3");
  assertEquals(escapeCSVValue("@SUM(A1:A2)"), "'@SUM(A1:A2)");
});

Deno.test("escapeCSVValue neutralizes formula prefixes after leading whitespace", () => {
  assertEquals(escapeCSVValue("  =1+1"), "'  =1+1");
});

Deno.test("escapeCSVValue still escapes commas, quotes, and newlines", () => {
  assertEquals(escapeCSVValue('hello, "world"'), '"hello, ""world"""');
  assertEquals(escapeCSVValue("line1\nline2"), '"line1\nline2"');
});

Deno.test("escapeCSVValue returns empty string for null and undefined", () => {
  assertEquals(escapeCSVValue(null), "");
  assertEquals(escapeCSVValue(undefined), "");
});
